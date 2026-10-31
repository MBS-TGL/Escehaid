"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { dispatchNotification, type NotifyChannel } from "@/lib/notify";
import { ALERT_METRIC_MAP } from "@/lib/alerts/catalog";

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface AlertRuleInput {
  name: string;
  metric_key: string;
  comparator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  threshold: number;
  channel: NotifyChannel;
  recipients?: string[];
  cooldown_minutes?: number;
  enabled?: boolean;
}

export async function saveAlertRuleAction(
  id: string | null,
  input: AlertRuleInput
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!ALERT_METRIC_MAP.has(input.metric_key)) {
    return { success: false, error: "Metrik tidak valid atau belum terdaftar di katalog." };
  }

  const payload = {
    name: input.name.trim(),
    metric_key: input.metric_key,
    comparator: input.comparator,
    threshold: Number(input.threshold),
    channel: input.channel,
    recipients: input.recipients || [],
    cooldown_minutes: Number(input.cooldown_minutes || 60),
    enabled: input.enabled !== undefined ? input.enabled : true,
    updated_at: new Date().toISOString(),
  };

  try {
    if (id) {
      const { error } = await supabase
        .from("alert_rules")
        .update(payload)
        .eq("id", id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("alert_rules").insert(payload);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/admin/automation");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function toggleAlertRuleAction(id: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("alert_rules")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/automation");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteAlertRuleAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from("alert_rules").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/automation");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function testAlertRuleAction(
  channel: NotifyChannel,
  recipients?: string[]
): Promise<ActionResult> {
  const res = await dispatchNotification(channel, {
    title: "Tes Pengiriman Alert Esceha.id",
    message: "Ini adalah pesan uji coba dari panel otomatisasi. Pengaturan kanal berhasil terhubung!",
    level: "info",
    recipients,
  });

  if (!res.success) {
    return { success: false, error: res.error || "Gagal mengirim tes." };
  }
  return { success: true, data: res.detail };
}
