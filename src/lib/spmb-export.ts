/**
 * Bangun isi ekspor SPMB (CSV + XLSX multi-sheet) dari baris pendaftaran.
 * Dipakai API route /api/admin/spmb/export (server) — sel CSV tetap
 * mengikuti aturan anti-injeksi & forceText seperti handleExportCsv lama.
 */
import type { SpmbAdminListRow } from "./queries/spmb-list";
import type { SpmbFormField } from "./supabase";
import type { XlsxSheet } from "./spmb-xlsx";
import { normalizeName, normalizeSchool } from "./format-name";
import { spmbGenderLabel, SPMB_NO_PROGRAM } from "./spmb-filter";
import { spmbAnswerKey } from "./helpers";
import { SPMB_DOCUMENT_KEYS } from "./spmb-registration";

export interface SpmbExportContext {
  waveNames: Map<string, string>;
  formFields: SpmbFormField[];
  docSummary: Record<string, { total: number; verified: number; rejected: number }>;
  statusLabels: Record<string, string>;
  pathLabels: Record<string, string>;
  /** "YYYY-MM-DD" — dipakai nama berkas. */
  today: string;
}

/** Anti CSV-injection + jaga angka ber-nol-depan (telepon/NISN/NIK). */
export function spmbCsvCell(v: unknown, forceText = false): string {
  let s = String(v ?? "");
  if (forceText || /^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function dateId(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function docCompleteOf(row: SpmbAdminListRow): string {
  const count = SPMB_DOCUMENT_KEYS.filter((k) => {
    const v = row.documents?.[k];
    return typeof v === "string" && v.length > 0;
  }).length;
  return `${count}/${SPMB_DOCUMENT_KEYS.length}`;
}

export function docVerifiedOf(row: SpmbAdminListRow, ctx: SpmbExportContext): string {
  const ds = ctx.docSummary[row.id];
  if (!ds || ds.total === 0) return "-";
  return `${ds.verified}/${SPMB_DOCUMENT_KEYS.length}${ds.rejected ? ` (${ds.rejected} ditolak)` : ""}`;
}

export function spmbExportHeaders(ctx: SpmbExportContext): string[] {
  return [
    "No", "Nama Lengkap", "Jenis Kelamin", "NISN", "NIK", "Email", "Telepon",
    "Orang Tua/Wali", "Asal Sekolah", "Program", "Jalur", "Gelombang", "Status",
    "Tanggal Daftar", "Berkas Lengkap", "Berkas Terverifikasi", "Catatan Admin",
    ...ctx.formFields.map((f) => f.label),
  ];
}

export function spmbExportRow(
  row: SpmbAdminListRow,
  i: number,
  ctx: SpmbExportContext
): (string | number)[] {
  return [
    i + 1,
    normalizeName(row.full_name),
    spmbGenderLabel(row.gender),
    row.documents?.nisn ?? "",
    row.documents?.nik ?? "",
    row.email,
    row.phone,
    normalizeName(row.parent_name),
    normalizeSchool(row.previous_school),
    row.documents?.program ?? "",
    ctx.pathLabels[row.registration_path] || row.registration_path,
    (row.wave_id && ctx.waveNames.get(row.wave_id)) || "-",
    ctx.statusLabels[row.status] || row.status,
    dateId(row.created_at),
    docCompleteOf(row),
    docVerifiedOf(row, ctx),
    row.admin_notes ?? "",
    ...ctx.formFields.map((f) => (row.documents?.[spmbAnswerKey(f.id)] ?? "").toString()),
  ];
}

const TEXT_COLS = new Set([3, 4, 6]); // NISN, NIK, Telepon (index: NISN=3 NIK=4 Telp=6)

export function buildSpmbCsv(rows: SpmbAdminListRow[], ctx: SpmbExportContext): string {
  const headers = spmbExportHeaders(ctx);
  const lines = [headers.map((h) => spmbCsvCell(h)).join(";")];
  rows.forEach((r, i) => {
    lines.push(
      spmbExportRow(r, i, ctx)
        .map((v, ci) => spmbCsvCell(v, TEXT_COLS.has(ci)))
        .join(";")
    );
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

/** Rekap per bulan: total/menunggu/diterima/ditolak. */
export function spmbMonthlyRows(rows: SpmbAdminListRow[]): (string | number)[][] {
  const m = new Map<string, { total: number; pending: number; accepted: number; rejected: number }>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const e = m.get(k) ?? { total: 0, pending: 0, accepted: 0, rejected: 0 };
    e.total += 1;
    if (r.status === "pending") e.pending += 1;
    else if (r.status === "accepted") e.accepted += 1;
    else if (r.status === "rejected") e.rejected += 1;
    m.set(k, e);
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, e]) => [k, e.total, e.pending, e.accepted, e.rejected]);
}

function groupRows(
  rows: SpmbAdminListRow[],
  key: (r: SpmbAdminListRow) => string
): (string | number)[][] {
  const m = new Map<string, { total: number; pending: number; accepted: number; rejected: number }>();
  for (const r of rows) {
    const k = key(r) || "-";
    const e = m.get(k) ?? { total: 0, pending: 0, accepted: 0, rejected: 0 };
    e.total += 1;
    if (r.status === "pending") e.pending += 1;
    else if (r.status === "accepted") e.accepted += 1;
    else if (r.status === "rejected") e.rejected += 1;
    m.set(k, e);
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, e]) => [k, e.total, e.pending, e.accepted, e.rejected]);
}

const RECAP_HEADER = ["Kelompok", "Total", "Menunggu", "Diterima", "Ditolak"];

export function buildSpmbSheets(rows: SpmbAdminListRow[], ctx: SpmbExportContext): XlsxSheet[] {
  const sheets: XlsxSheet[] = [
    {
      name: "Pendaftar",
      rows: [spmbExportHeaders(ctx), ...rows.map((r, i) => spmbExportRow(r, i, ctx))],
    },
    {
      name: "Rekap Bulanan",
      rows: [["Bulan", "Total", "Menunggu", "Diterima", "Ditolak"], ...spmbMonthlyRows(rows)],
    },
    {
      name: "Per Gelombang",
      rows: [
        RECAP_HEADER,
        ...groupRows(rows, (r) => (r.wave_id && ctx.waveNames.get(r.wave_id)) || "Tanpa gelombang"),
      ],
    },
    {
      name: "Per Jalur",
      rows: [RECAP_HEADER, ...groupRows(rows, (r) => ctx.pathLabels[r.registration_path] || r.registration_path)],
    },
    {
      name: "Per Program",
      rows: [RECAP_HEADER, ...groupRows(rows, (r) => r.documents?.program || "Tanpa program")],
    },
    {
      name: "Per Sekolah",
      rows: [RECAP_HEADER, ...groupRows(rows, (r) => normalizeSchool(r.previous_school) || "-").slice(0, 200)],
    },
    {
      name: "Verifikasi Berkas",
      rows: [
        ["Nama", "KK", "Akta", "Surat Sekolah", "KTP Ortu", "Bukti Transfer"],
        ...rows.map((r) => [
          normalizeName(r.full_name),
          ...SPMB_DOCUMENT_KEYS.map((k) => {
            const v = r.documents?.[k];
            return typeof v === "string" && v.length > 0 ? "Ada" : "-";
          }),
        ]),
      ],
    },
  ];
  const interviews = rows.filter((r) => r.interview_at);
  if (interviews.length > 0) {
    sheets.push({
      name: "Wawancara",
      rows: [
        ["Nama", "Telepon", "Jadwal", "Catatan"],
        ...interviews.map((r) => [
          normalizeName(r.full_name),
          r.phone,
          new Date(r.interview_at as string).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
          r.interview_note || "",
        ]),
      ],
    });
  }
  return sheets;
}

export function spmbNoProgramLabel(key: string): string {
  return key === SPMB_NO_PROGRAM ? "Tanpa program" : key;
}
