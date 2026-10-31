/**
 * Sisi server beacon analitik internal (fase 1).
 *
 * Prinsip privasi: TANPA IP, TANPA cookie, TANPA UA mentah. Yang tersimpan
 * hanya path publik, host perujuk, dan kelas perangkat. `DNT: 1` dihormati
 * di sisi klien (AnalyticsBeacon tidak mengirim); di sini tetap divalidasi.
 *
 * Semua fungsi murni agar bisa di-unit test tanpa Next runtime.
 */
import { createClient } from "@supabase/supabase-js";

export const MAX_PATH_LEN = 300;
export const MAX_HOST_LEN = 200;

export interface TrackedEvent {
  path: string;
  referrer_host: string | null;
  device_class: "mobile" | "tablet" | "desktop";
}

/** Host perujuk: hanya hostname (tanpa scheme/query); hentikan jika self. */
export function hostFromReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.slice(0, MAX_HOST_LEN) || null;
  } catch {
    return null;
  }
}

/**
 * Kelas perangkat dari UA — heuristik ringan (cukup untuk agregat).
 * UA dimelempar setelah ini, tidak pernah disimpan.
 */
export function deviceClassFrom(ua: string | null): "mobile" | "tablet" | "desktop" {
  if (!ua) return "desktop";
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|kindle/i.test(s)) return "tablet";
  if (/mobi|android|iphone|windows phone|bb10|blackberry/i.test(s)) return "mobile";
  return "desktop";
}

const EXCLUDED_PREFIXES = ["/admin", "/api", "/_next", "/sw.js", "/service-worker", "/worksites"];
const EXCLUDED_FILES = /\.(?:css|js|mjs|map|ico|png|jpg|jpeg|webp|avif|gif|svg|woff2?|ttf|txt|xml|json|webmanifest)$/i;

/**
 * Path yang boleh dicatat: halaman publik saja.
 *  - Tolak admin/API/_next/berkas statis.
 *  - Buang query & fragment (kita hanya peduli halaman), batas panjang,
 *    wajib mulai "/".
 */
export function sanitizePublicPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Normalkan multiple slash di awal menjadi single slash agar new URL tidak
  // menganggap segmen pertama sebagai authority/hostname (mis. "///news").
  const cleanRaw = raw.replace(/^\/{2,}/, "/");
  let p: string;
  try {
    p = new URL(cleanRaw, "http://placeholder.local").pathname;
  } catch {
    return null;
  }
  if (!p.startsWith("/") || p === "/robots.txt" || p === "/sitemap.xml" || p === "/rss.xml") return null;
  if (EXCLUDED_PREFIXES.some((pre) => p === pre || p.startsWith(`${pre}/`) || p === `/${pre.slice(1)}`)) return null;
  if (EXCLUDED_FILES.test(p)) return null;
  if (p.length > MAX_PATH_LEN) p = p.slice(0, MAX_PATH_LEN);
  // Urai // beruntun yang sering buatan client salah menuliskan path.
  p = p.replace(/\/{2,}/g, "/");
  return p || null;
}

/** Rapikan (path, referrer, ua) → event yang VALID, atau null (skip). */
export function buildTrackedEvent(input: {
  path?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}): TrackedEvent | null {
  const path = sanitizePublicPath(input.path ?? null);
  if (!path) return null;
  const refHost = hostFromReferrer(input.referrer ?? null);
  // Perujuk yang sama domain situs bukan "sumber" — kosong.
  return {
    path: path || "/",
    referrer_host: refHost,
    device_class: deviceClassFrom(input.userAgent ?? null),
  };
}

/** Klien service-role untuk insert beacon: env kosong → null (dry-run bebas). */
export function analyticsServiceClient(): ReturnType<typeof createClient> | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
