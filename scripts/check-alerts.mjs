#!/usr/bin/env node

/**
 * Runner pemeriksaan alert otomatis (Fase 4).
 * Dijalankan terjadwal oleh GitHub Actions cron (misal setiap 30 menit).
 *
 * Menggunakan client Supabase service-role atau koneksi database untuk
 * mengevaluasi ambang batas alert dan mengirim pesan bila melanggar.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("ℹ️ SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak diset. Pemeriksaan alert dilewati.");
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔍 Menjalankan pemeriksaan alert otomatis...");

  // Ambil semua aturan aktif
  const { data: rules, error: rulesErr } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("enabled", true);

  if (rulesErr) {
    if (rulesErr.code === "42P01" || /does not exist/i.test(rulesErr.message)) {
      console.log("ℹ️ Tabel alert_rules belum dibuat (migrasi 0019 belum jalan). Selesai.");
      process.exit(0);
    }
    console.error("Gagal membaca alert_rules:", rulesErr.message);
    process.exit(1);
  }

  if (!rules || rules.length === 0) {
    console.log("✅ Tidak ada aturan alert aktif.");
    process.exit(0);
  }

  console.log(`📋 Memeriksa ${rules.length} aturan...`);
  let triggeredCount = 0;

  for (const rule of rules) {
    let observedValue = 0;

    // Evaluasi metrik sederhana
    if (rule.metric_key === "unread_messages_count") {
      const { count } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      observedValue = count ?? 0;
    } else if (rule.metric_key === "spmb_pending_oldest_days") {
      const { data } = await supabase
        .from("spmb_registrations")
        .select("created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);
      if (data && data.length > 0) {
        observedValue = Math.max(0, Math.floor((Date.now() - new Date(data[0].created_at).getTime()) / 86400000));
      }
    } else if (rule.metric_key === "audit_delete_count") {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { count } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "delete")
        .gte("created_at", since);
      observedValue = count ?? 0;
    } else if (rule.metric_key === "draft_news_backlog") {
      const { count } = await supabase
        .from("news")
        .select("id", { count: "exact", head: true })
        .eq("is_published", false);
      observedValue = count ?? 0;
    }

    // Periksa kondisi
    let isViolated = false;
    if (rule.comparator === "gte") isViolated = observedValue >= rule.threshold;
    else if (rule.comparator === "gt") isViolated = observedValue > rule.threshold;
    else if (rule.comparator === "lte") isViolated = observedValue <= rule.threshold;
    else if (rule.comparator === "lt") isViolated = observedValue < rule.threshold;
    else if (rule.comparator === "eq") isViolated = observedValue === rule.threshold;

    if (!isViolated) continue;

    // Cek cooldown dari alert terakhir yang berhasil dikirim
    const cooldownMs = (rule.cooldown_minutes || 60) * 60000;
    const { data: lastEvent } = await supabase
      .from("alert_events")
      .select("created_at")
      .eq("rule_id", rule.id)
      .eq("delivery_status", "sent")
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastEvent && lastEvent.length > 0) {
      const elapsed = Date.now() - new Date(lastEvent[0].created_at).getTime();
      if (elapsed < cooldownMs) {
        console.log(`⏳ Aturan "${rule.name}" terpicu tapi masih dalam jeda cooldown (${Math.round((cooldownMs - elapsed)/60000)}m tersisa).`);
        continue;
      }
    }

    triggeredCount++;
    console.log(`🚨 Aturan "${rule.name}" terpicu! Nilai teramati: ${observedValue} (Ambang: ${rule.threshold})`);

    const alertMessage = `Aturan "${rule.name}" terpicu dengan nilai teramati ${observedValue} (${rule.comparator} ${rule.threshold}).`;

    // Kirim pesan sesuai kanal yang dipilih
    let deliveryStatus = "sent";
    let deliveryError = "";

    try {
      if (rule.channel === "telegram" && process.env.TELEGRAM_BOT_TOKEN) {
        const chatId = rule.recipients?.[0] || process.env.TELEGRAM_CHAT_ID;
        if (chatId) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🚨 <b>[ALERT ESCEHA] ${rule.name}</b>\n\n${alertMessage}`,
              parse_mode: "HTML",
            }),
          });
        }
      } else if (rule.channel === "webhook" && process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `🚨 **[ALERT ESCEHA] ${rule.name}**\n${alertMessage}` }),
        });
      }
    } catch (err) {
      deliveryStatus = "failed";
      deliveryError = err instanceof Error ? err.message : String(err);
    }

    // Catat ke alert_events
    await supabase.from("alert_events").insert({
      rule_id: rule.id,
      rule_name: rule.name,
      metric_key: rule.metric_key,
      observed_value: observedValue,
      message: alertMessage,
      delivery_status: deliveryStatus,
      delivery_error: deliveryError,
      delivered_at: new Date().toISOString(),
    });
  }

  console.log(`🏁 Selesai. Total alert terkirim: ${triggeredCount}`);
}

main().catch((err) => {
  console.error("Fatal error check-alerts:", err);
  process.exit(1);
});
