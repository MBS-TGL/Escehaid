/**
 * URL publik admin — satu sumber untuk tautan yang dikirim/ditampilkan.
 *
 * Kenapa tidak langsung `process.env.SITE_URL`:
 *  - di `.env.local` variabelnya bisa kosong, sehingga
 *    `${SITE_URL}/admin/login` menjadi path relatif dan Supabase menolaknya
 *    (email reset gagal dengan pesan menyesatkan "Email address ... is invalid").
 *  - beberapa halaman menggunakan `www.`, jadi fallback harus konsisten.
 */
export const DEFAULT_SITE_URL = "https://www.smpmuh4tanggul.sch.id";

/**
 * Normalisasi origin: ambil scheme + host saja, buang path/query/hash.
 * Mengembalikan null bila nilai bukan URL absolut yang valid.
 */
export function normalizeOrigin(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Bentuk minimal env yang dibutuhkan — sengaja longgar agar `process.env` cocok. */
export interface SiteEnv {
  SITE_URL?: string | null;
  [key: string]: string | undefined | null;
}

/**
 * Origin untuk tautan Auth (email reset, redirect login).
 *
 * Prioritas: `preferred` (mis. origin request) → `SITE_URL` → default.
 * Nilai non-absolut diabaikan, bukan digabung — mencegah URL setengah jadi.
 */
export function siteOrigin(
  preferred?: string | null,
  env: SiteEnv = process.env
): string {
  return normalizeOrigin(preferred) ?? normalizeOrigin(env.SITE_URL) ?? DEFAULT_SITE_URL;
}

/**
 * Origin untuk redirect Auth yang dikirim ke Supabase.
 *
 * Beda dengan `siteOrigin`: `SITE_URL` (domain kanonik yang terdaftar di
 * allowlist Supabase) MENANG atas origin request. Panel bisa dibuka dari
 * domain/preview lain, tetapi tautan email harus selalu mendarat di domain
 * yang diizinkan. Request origin hanya fallback saat SITE_URL kosong.
 */
export function authOrigin(
  requestOrigin?: string | null,
  env: SiteEnv = process.env
): string {
  return normalizeOrigin(env.SITE_URL) ?? normalizeOrigin(requestOrigin) ?? DEFAULT_SITE_URL;
}

/** URL absolut halaman login admin (target redirect Auth). */
export function adminLoginUrl(
  preferred?: string | null,
  env: SiteEnv = process.env
): string {
  return `${siteOrigin(preferred, env)}/admin/login`;
}

/**
 * Origin dari header request (proxy/Vercel).
 *
 * `origin` menang; jika tidak ada, susun dari `x-forwarded-*`/`host`.
 * Dipakai server action & route handler agar redirect tidak bergantung pada
 * `SITE_URL` yang bisa kosong.
 */
export function originFromHeaders(get: (name: string) => string | null): string | null {
  const direct = get("origin");
  if (normalizeOrigin(direct)) return direct;

  const host = get("x-forwarded-host") ?? get("host");
  if (!host) return null;

  const proto = (get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}
