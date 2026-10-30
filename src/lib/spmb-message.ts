/**
 * Utilitas template pesan SPMB (WhatsApp) — fungsi murni supaya mudah diuji.
 *
 * Template disimpan di tabel `spmb_message_templates` (migrasi 0015) dan
 * memakai placeholder `{nama}`, `{orang_tua}`, `{gelombang}`, `{jalur}`,
 * `{program}`, `{nisn}`. Placeholder yang tidak punya nilai diganti tanda
 * "-" agar pesan tidak menyisakan kurung kurawal yang membingungkan penerima.
 */
import { waLink } from "./site-config";

export interface SpmbTemplateVars {
  nama?: string | null;
  orang_tua?: string | null;
  gelombang?: string | null;
  jalur?: string | null;
  program?: string | null;
  nisn?: string | null;
}

/** Isi placeholder `{nama}` / `{orang_tua}` / `{gelombang}` / `{jalur}` / `{program}` / `{nisn}` pada template. */
export function fillSpmbTemplate(body: string, vars: SpmbTemplateVars): string {
  const values: Record<keyof SpmbTemplateVars, string> = {
    nama: (vars.nama ?? "").trim() || "-",
    orang_tua: (vars.orang_tua ?? "").trim() || "-",
    gelombang: (vars.gelombang ?? "").trim() || "-",
    jalur: (vars.jalur ?? "").trim() || "-",
    program: (vars.program ?? "").trim() || "-",
    nisn: (vars.nisn ?? "").trim() || "-",
  };
  return body.replace(/\{(nama|orang_tua|gelombang|jalur|program|nisn)\}/g, (_m, key: keyof SpmbTemplateVars) => values[key]);
}

/**
 * Tautan WhatsApp berisi pesan siap kirim; `null` bila nomor tidak tersedia.
 * Nomor dinormalisasi lewat `waLink` (08… → 628…).
 */
export function spmbWhatsappHref(phone: string | null | undefined, message: string): string | null {
  const number = waLink((phone ?? "").trim());
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
