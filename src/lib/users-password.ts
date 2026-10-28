/**
 * Validasi password untuk aksi admin "Set Password Langsung".
 *
 * Murni (tanpa DB/network) supaya bisa diuji dan dipakai server + UI dengan
 * aturan yang sama. Server tetap sumber kebenaran: UI hanya menyaring dulu.
 */
export const MIN_PASSWORD_LENGTH = 8;
/** Batas atas wajar — mencegah payload raksasa; bcrypt/argon2 membatasi 72 byte. */
export const MAX_PASSWORD_LENGTH = 72;

export type PasswordValidation =
  | { ok: true }
  | { ok: false; error: string };

/** Validasi satu password baru. */
export function validateNewPassword(password: string): PasswordValidation {
  if (!password) return { ok: false, error: "Password wajib diisi." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.` };
  }
  if (password.trim() !== password) {
    return { ok: false, error: "Password tidak boleh diawali/diakhiri spasi." };
  }
  return { ok: true };
}

/** Validasi password + konfirmasi (dipakai form). */
export function validateNewPasswordPair(
  password: string,
  confirm: string
): PasswordValidation {
  const single = validateNewPassword(password);
  if (!single.ok) return single;
  if (password !== confirm) return { ok: false, error: "Konfirmasi password tidak cocok." };
  return { ok: true };
}
