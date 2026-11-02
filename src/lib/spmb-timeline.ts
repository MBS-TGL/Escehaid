/**
 * Timeline riwayat satu pendaftar — gabungan audit_logs + verifikasi berkas
 * + log pesan WA menjadi event terurut (terbaru dulu). Fungsi murni.
 */

export type TimelineTone = "neutral" | "success" | "danger" | "warning" | "info";

export interface TimelineEvent {
  /** ISO timestamp — dipakai pengurutan. */
  at: string;
  title: string;
  detail?: string;
  actor?: string | null;
  tone: TimelineTone;
}

export interface AuditLike {
  action: string;
  actor_name: string | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  rejected: "Ditolak",
};

function statusFromDetail(detail: Record<string, unknown> | null | undefined): string | null {
  if (!detail || typeof detail !== "object") return null;
  const after = (detail as { after?: unknown }).after;
  if (after && typeof after === "object" && "status" in (after as object)) {
    const s = (after as { status?: unknown }).status;
    return typeof s === "string" ? s : null;
  }
  if ("status" in detail && typeof (detail as { status?: unknown }).status === "string") {
    return (detail as { status: string }).status;
  }
  return null;
}

/** Render ringkas before→after untuk perubahan status (tanpa dump JSON penuh). */
function describeChange(detail: Record<string, unknown> | null | undefined): string | undefined {
  if (!detail || typeof detail !== "object") return undefined;
  const d = detail as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  if (d.before && d.after && typeof d.before === "object" && typeof d.after === "object") {
    const parts: string[] = [];
    const keys = new Set([...Object.keys(d.before), ...Object.keys(d.after)]);
    for (const k of keys) {
      const b = d.before[k];
      const a = d.after[k];
      if (JSON.stringify(b) === JSON.stringify(a)) continue;
      if (k === "status") {
        parts.push(`Status: ${STATUS_LABEL[String(b)] || b} → ${STATUS_LABEL[String(a)] || a}`);
      } else if (k === "updated_at") {
        continue;
      } else {
        parts.push(`${k}: ${short(b)} → ${short(a)}`);
      }
      if (parts.length >= 4) break;
    }
    return parts.length > 0 ? parts.join(" · ") : undefined;
  }
  return undefined;
}

function short(v: unknown): string {
  const s = v === null || v === undefined ? "-" : String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export interface VerifLike {
  document_key: string;
  status: string;
  note?: string;
  verified_at?: string | null;
}

export interface MsgLike {
  template_key: string;
  status: string;
  error?: string;
  sent_queued_at: string;
}

const DOC_LABEL: Record<string, string> = {
  kk: "Kartu Keluarga",
  akta: "Akta",
  surat_sekolah: "Surat sekolah",
  ktp_ortu: "KTP orang tua",
  bukti_transfer: "Bukti transfer",
};

export function buildSpmbTimeline(input: {
  audits: AuditLike[];
  verifs: VerifLike[];
  messages: MsgLike[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const a of input.audits) {
    const st = statusFromDetail(a.detail ?? null);
    const tone: TimelineTone =
      a.action === "delete" ? "danger" : st === "accepted" ? "success" : st === "rejected" ? "danger" : "neutral";
    events.push({
      at: a.created_at,
      title:
        a.action === "create"
          ? "Pendaftaran dibuat"
          : a.action === "delete"
            ? "Pendaftaran dihapus"
            : st
              ? `Status diubah (${STATUS_LABEL[st] || st})`
              : "Data diubah",
      detail: a.action === "update" ? describeChange(a.detail ?? null) : undefined,
      actor: a.actor_name,
      tone,
    });
  }

  for (const v of input.verifs) {
    events.push({
      at: v.verified_at || "",
      title: `Berkas ${DOC_LABEL[v.document_key] || v.document_key}: ${
        v.status === "verified" ? "valid" : v.status === "rejected" ? "ditolak" : "direset"
      }`,
      detail: v.note || undefined,
      tone: v.status === "verified" ? "success" : v.status === "rejected" ? "danger" : "warning",
    });
  }

  for (const m of input.messages) {
    events.push({
      at: m.sent_queued_at,
      title: `Pesan WA "${m.template_key}": ${m.status}`,
      detail: m.error || undefined,
      tone: m.status === "sent" || m.status === "delivered" ? "info" : m.status === "failed" ? "danger" : "warning",
    });
  }

  return events
    .filter((e) => e.at)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
