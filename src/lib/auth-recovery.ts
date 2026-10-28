export type RecoveryCredentials =
  | { access_token: string; refresh_token: string }
  | { token_hash: string };

/**
 * Ambil kredensial dari fragment tautan recovery.
 *
 * Dua bentuk didukung:
 *  - `token_hash` — tautan yang KITA bangun dari `generateLink().properties
 *    .hashed_token`. Dipakai panel admin agar tidak bergantung pada redirect
 *    Supabase (Site URL/allowlist bisa salah) dan tidak lewat email.
 *  - `access_token`+`refresh_token` — implicit flow dari tautan email
 *    Supabase (`/auth/v1/verify` → `redirect_to#access_token=…`).
 *
 * Fragment tidak pernah dikirim ke server — parsing harus di browser.
 */
export function parseRecoveryHash(hash: string): RecoveryCredentials | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;

  const params = new URLSearchParams(raw);

  const tokenHash = params.get("token_hash");
  if (tokenHash) return { token_hash: tokenHash };

  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (!access || !refresh) return null;

  return { access_token: access, refresh_token: refresh };
}

/**
 * Bangun tautan recovery milik kita sendiri dari `hashed_token`.
 *
 * Token ditaruh di FRAGMENT (bukan query) agar tidak ikut terkirim ke server
 * log/referrer. Base URL dinormalkan supaya tidak muncul `//auth/recovery`.
 */
export function buildRecoveryLink(baseUrl: string, tokenHash: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({ token_hash: tokenHash, type: "recovery" });
  return `${base}/auth/recovery#${params.toString()}`;
}
