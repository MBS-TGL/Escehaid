"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { sendFonnteNotification } from "@/lib/notify/fonnte";

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Menyimpan jadwal & catatan wawancara pendaftar (Fase 5, migrasi 0020).
 */
export async function scheduleInterviewAction(input: {
  registrationId: string;
  interviewAt: string;
  note?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  try {
    const { error } = await supabase
      .from("spmb_registrations")
      .update({
        interview_at: input.interviewAt,
        interview_note: input.note || "",
        interviewed_by: userId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.registrationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/admission");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Deteksi pendaftar ganda (duplikat) berdasarkan NISN atau Nomor Telepon.
 */
export async function findDuplicateRegistrationsAction(): Promise<
  ActionResult<{ nisnDuplicates: string[]; phoneDuplicates: string[] }>
> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("spmb_registrations")
      .select("id, full_name, phone, documents")
      .limit(500);

    if (error || !data) return { success: false, error: error?.message };

    const phoneCounts = new Map<string, number>();
    const nisnCounts = new Map<string, number>();

    type DupeRow = { id: string; full_name: string; phone: string | null; documents: Record<string, unknown> | null };
    for (const r of (data || []) as DupeRow[]) {
      if (r.phone) {
        const p = r.phone.replace(/[^0-9]/g, "");
        if (p.length >= 8) phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
      }
      const nisn = r.documents?.nisn;
      if (nisn && typeof nisn === "string" && nisn.trim()) {
        const clean = nisn.trim();
        nisnCounts.set(clean, (nisnCounts.get(clean) || 0) + 1);
      }
    }

    const phoneDuplicates = Array.from(phoneCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([phone]) => phone);

    const nisnDuplicates = Array.from(nisnCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([nisn]) => nisn);

    return {
      success: true,
      data: { phoneDuplicates, nisnDuplicates },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export interface BroadcastRecipient {
  registrationId: string;
  name: string;
  phone: string;
  message: string;
  templateKey: string;
}

/**
 * Mengirim pesan massal (broadcast) ke pendaftar SPMB melalui Fonnte WhatsApp.
 * Melakukan pengecekan opt-out dan mencatat per-penerima ke spmb_message_log.
 */
export async function broadcastSpmbWhatsAppAction(
  recipients: BroadcastRecipient[]
): Promise<ActionResult<{ sentCount: number; failedCount: number; skippedCount: number }>> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (recipients.length === 0) {
    return { success: false, error: "Tidak ada penerima." };
  }

  // Batas keamanan pengiriman per batch
  const BATCH_LIMIT = 50;
  const batch = recipients.slice(0, BATCH_LIMIT);

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  try {
    // Ambil daftar nomor opt-out
    const { data: optouts } = await supabase
      .from("spmb_wa_optout")
      .select("phone");
    const optoutSet = new Set(((optouts || []) as { phone: string }[]).map((o) => o.phone));

    for (const item of batch) {
      const cleanPhone = item.phone.replace(/[^0-9]/g, "");

      if (optoutSet.has(cleanPhone)) {
        skippedCount++;
        await supabase.from("spmb_message_log").insert({
          registration_id: item.registrationId,
          template_key: item.templateKey,
          phone: cleanPhone,
          status: "skipped_opt_out",
          error: "Nomor terdaftar dalam daftar opt-out penolakan pesan.",
          sent_by: userId || null,
        });
        continue;
      }

      // Kirim via Fonnte
      const res = await sendFonnteNotification({
        title: "Pemberitahuan SPMB SMP Muhammadiyah 4 Tanggul",
        message: item.message,
        recipients: [cleanPhone],
      });

      if (res.success) {
        sentCount++;
        await supabase.from("spmb_message_log").insert({
          registration_id: item.registrationId,
          template_key: item.templateKey,
          phone: cleanPhone,
          status: "sent",
          sent_by: userId || null,
          delivered_at: new Date().toISOString(),
        });
      } else {
        failedCount++;
        await supabase.from("spmb_message_log").insert({
          registration_id: item.registrationId,
          template_key: item.templateKey,
          phone: cleanPhone,
          status: "failed",
          error: res.error || "Gagal mengirim ke gateway",
          sent_by: userId || null,
        });
      }
    }

    revalidatePath("/admin/admission");
    return {
      success: true,
      data: { sentCount, failedCount, skippedCount },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
