/** Jenis tautan Auth yang boleh diproses halaman /auth/recovery. */
export type RecoveryLinkType = "recovery" | "invite" | "magiclink";

export type RecoveryCredentials =
  | { access_token: string; refresh_token: string }
  | { token_hash: string; type: RecoveryLinkType };

/**
 * Ambil kredensial dari fragment tautan Auth.
 *
 * Dua bentuk didukung:
 *  - `token_hash` (+ opsional `type`) — tautan yang KITA bangun dari
 *    `generateLink().properties.hashed_token`. Dipakai panel admin agar tidak
 *    bergantung pada redirect Supabase (Site URL/allowlist bisa salah) dan
 *    tidak lewat email. `type` = `recovery` (reset), `invite` (akun baru),
 *    atau `magiclink` (undangan untuk akun yang SUDAH dibuat tanpa email).
 *  - `access_token`+`refresh_token` — implicit flow dari tautan email
 *    Supabase (`/auth/v1/verify` → `redirect_to#access_token=…`); selalu
 *    diperlakukan sebagai `recovery`.
 *
 * Fragment tidak pernah dikirim ke server — parsing harus di browser.
 */
export function parseRecoveryHash(hash: string): RecoveryCredentials | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;

  const params = new URLSearchParams(raw);

  const tokenHash = params.get("token_hash");
  if (tokenHash) {
    const rawType = params.get("type");
    const type: RecoveryLinkType =
      rawType === "invite" || rawType === "magiclink" ? rawType : "recovery";
    return { token_hash: tokenHash, type };
  }

  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (!access || !refresh) return null;

  return { access_token: access, refresh_token: refresh };
}

/**
 * Bangun tautan Auth milik kita sendiri dari `hashed_token`.
 *
 * Token ditaruh di FRAGMENT (bukan query) agar tidak ikut terkirim ke server
 * log/referrer. Base URL dinormalkan supaya tidak muncul `//auth/recovery`.
 */
export function buildRecoveryLink(
  baseUrl: string,
  tokenHash: string,
  type: RecoveryLinkType = "recovery"
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  return `${base}/auth/recovery#${params.toString()}`;
}
