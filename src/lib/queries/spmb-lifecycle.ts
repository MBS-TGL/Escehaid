import { supabase } from "../supabase";
import type { SpmbRegistration } from "../supabase";

/**
 * Siklus hidup SPMB pasca-pendaftaran (migrasi 0022/0024 + 0020):
 * daftar ulang, pembayaran, wawancara massal, log pesan WA, opt-out,
 * pengaturan otomatisasi, dan riwayat eksekusi job.
 *
 * Semua mutasi memakai policy RLS `spmb:update` yang sudah ada; audit
 * trigger mencatat perubahan spmb_registrations otomatis.
 */

// ── Daftar ulang ─────────────────────────────────────────────────────────────

export type ReregStatus = "not_started" | "invited" | "submitted" | "verified" | "declined";

export async function updateReregistration(
  id: string,
  status: ReregStatus,
  note?: string
): Promise<{ error?: string }> {
  const patch: Partial<SpmbRegistration> & { updated_at: string } = {
    reregistration_status: status,
    reregistration_at:
      status === "verified" || status === "declined" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (note !== undefined) patch.reregistration_note = note;
  const { error } = await supabase.from("spmb_registrations").update(patch).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/** Ubah status daftar ulang banyak pendaftar sekaligus. */
export async function updateReregistrationBulk(
  ids: string[],
  status: ReregStatus
): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await supabase
    .from("spmb_registrations")
    .update({
      reregistration_status: status,
      reregistration_at:
        status === "verified" || status === "declined" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);
  if (error) return { error: error.message };
  return {};
}

// ── Pembayaran ───────────────────────────────────────────────────────────────

export type PaymentStatus = "unpaid" | "pending" | "verified" | "rejected";

export async function updatePayment(
  id: string,
  input: { status: PaymentStatus; amount?: number | null; note?: string }
): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = {
    payment_status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.amount !== undefined) patch.payment_amount = input.amount;
  if (input.note !== undefined) patch.payment_note = input.note;
  if (input.status === "verified" || input.status === "rejected") {
    patch.payment_verified_by = userData.user?.id ?? null;
    patch.payment_verified_at = new Date().toISOString();
  }
  const { error } = await supabase.from("spmb_registrations").update(patch).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ── Wawancara massal ─────────────────────────────────────────────────────────

/** Jadwalkan wawancara banyak pendaftar ke waktu yang sama (undangan individu tetap via WA). */
export async function scheduleInterviewBulk(
  ids: string[],
  interviewAt: string,
  note?: string
): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("spmb_registrations")
    .update({
      interview_at: interviewAt,
      interview_note: note || "",
      interviewed_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);
  if (error) return { error: error.message };
  return {};
}

// ── Log pesan WA ─────────────────────────────────────────────────────────────

export interface SpmbMessageLog {
  id: string;
  registration_id: string | null;
  template_key: string;
  phone: string;
  provider: string;
  status: string;
  error: string;
  sent_by: string | null;
  sent_queued_at: string;
  delivered_at: string | null;
  created_at: string;
}

export async function getSpmbMessageLogs(
  registrationId?: string,
  limit = 50
): Promise<SpmbMessageLog[]> {
  let query = supabase
    .from("spmb_message_log")
    .select("*")
    .order("sent_queued_at", { ascending: false })
    .limit(limit);
  if (registrationId) query = query.eq("registration_id", registrationId);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
    console.error("Error fetching SPMB message logs:", error);
    return [];
  }
  return (data ?? []) as SpmbMessageLog[];
}

/** Ringkasan kirim per pendaftar — dipakai timeline & badge "terakhir dihubungi". */
export async function getSpmbMessageLogSummary(): Promise<
  Record<string, { sent: number; failed: number; lastAt: string | null; lastKey: string | null }>
> {
  const { data, error } = await supabase
    .from("spmb_message_log")
    .select("registration_id, template_key, status, sent_queued_at")
    .order("sent_queued_at", { ascending: false })
    .limit(5000);
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return {};
    throw new Error(error.message);
  }
  const map: Record<string, { sent: number; failed: number; lastAt: string | null; lastKey: string | null }> = {};
  for (const row of (data ?? []) as { registration_id: string | null; template_key: string; status: string; sent_queued_at: string }[]) {
    if (!row.registration_id) continue;
    const entry = (map[row.registration_id] ??= { sent: 0, failed: 0, lastAt: null, lastKey: null });
    if (row.status === "sent" || row.status === "delivered") entry.sent += 1;
    else if (row.status === "failed") entry.failed += 1;
    if (!entry.lastAt) {
      entry.lastAt = row.sent_queued_at;
      entry.lastKey = row.template_key;
    }
  }
  return map;
}

// ── Opt-out ──────────────────────────────────────────────────────────────────

export interface SpmbWaOptout {
  phone: string;
  note: string;
  created_at: string;
}

export async function getSpmbWaOptouts(): Promise<SpmbWaOptout[]> {
  const { data, error } = await supabase
    .from("spmb_wa_optout")
    .select("phone, note, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
    console.error("Error fetching SPMB opt-outs:", error);
    return [];
  }
  return (data ?? []) as SpmbWaOptout[];
}

export async function addSpmbWaOptout(phone: string, note?: string): Promise<{ error?: string }> {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length < 9) return { error: "Nomor tidak valid." };
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("spmb_wa_optout").upsert(
    { phone: clean, note: note || "", created_by: userData.user?.id ?? null },
    { onConflict: "phone" }
  );
  if (error) return { error: error.message };
  return {};
}

export async function removeSpmbWaOptout(phone: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("spmb_wa_optout").delete().eq("phone", phone);
  if (error) return { error: error.message };
  return {};
}

// ── Pengaturan otomatisasi ───────────────────────────────────────────────────

export interface SpmbAutomationSettings {
  spmb_auto_publish_results: boolean;
  spmb_reminder_enabled: boolean;
  spmb_reminder_days: number;
  spmb_digest_enabled: boolean;
}

export async function setSpmbAutomationSettings(
  settings: Partial<SpmbAutomationSettings>
): Promise<{ error?: string }> {
  const { data: profile, error: profileErr } = await supabase
    .from("school_profile")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (profileErr || !profile?.id) return { error: "Profil sekolah tidak ditemukan." };
  const { data, error } = await supabase
    .from("school_profile")
    .update(settings)
    .eq("id", profile.id)
    .select("id");
  if (error) {
    if (error.code === "PGRST204" || /does not exist|42703|schema cache/i.test(error.message || "")) {
      return { error: "Kolom otomatisasi belum ada — jalankan migrasi 0024." };
    }
    return { error: error.message };
  }
  if (!data || data.length === 0) return { error: "Tidak tersimpan — cek policy RLS." };
  return {};
}

export interface SpmbJobRun {
  id: string;
  job: string;
  run_at: string;
  counts: Record<string, unknown>;
  error: string;
}

export async function getSpmbJobRuns(limit = 10): Promise<SpmbJobRun[]> {
  const { data, error } = await supabase
    .from("spmb_job_runs")
    .select("id, job, run_at, counts, error")
    .order("run_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
    console.error("Error fetching SPMB job runs:", error);
    return [];
  }
  return (data ?? []) as SpmbJobRun[];
}
