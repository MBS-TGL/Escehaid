/**
 * Validasi murni formulir kontak publik (tanpa efek samping, tanpa DB —
 * mudah diuji unit test). Dipakai route server `POST /api/contact`.
 *
 * Tiga lapis anti-spam tanpa layanan eksternal:
 * 1. Honeypot `website` — field tak terlihat manusia; bot yang mengisi
 *    ditolak DIAM-DIAM (sukses palsu agar bot tidak belajar).
 * 2. Jeda minimum pengisian — submit < 3 detik sejak form dirender = bot.
 * 3. Rate-limit per IP & per email — di route (butuh state), bukan di sini.
 */

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  /** Honeypot — wajib kosong bila diisi manusia. */
  website?: string;
  /** Epoch ms saat form dirender (untuk jeda minimum). */
  filledAt?: number;
}

export interface ContactValidation {
  ok: boolean;
  /** Pesan error untuk manusia (tampil di form). */
  error?: string;
  /** true = terindikasi bot → route mengembalikan sukses PALSU tanpa insert. */
  bot?: boolean;
}

/** Jeda minimum render → submit (bot biasanya < 1 detik). */
export const CONTACT_MIN_FILL_MS = 3000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+().\-\s]*$/;

export function validateContactPayload(
  p: ContactPayload,
  nowMs: number = Date.now()
): ContactValidation {
  // Honeypot terisi → bot. Sukses palsu, tanpa pesan error.
  if ((p.website ?? "").trim() !== "") {
    return { ok: true, bot: true };
  }

  // Submit terlalu cepat → bot. Sukses palsu juga.
  if (typeof p.filledAt === "number" && nowMs - p.filledAt < CONTACT_MIN_FILL_MS) {
    return { ok: true, bot: true };
  }

  const name = (p.name ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Nama minimal 2 karakter." };
  if (name.length > 100) return { ok: false, error: "Nama maksimal 100 karakter." };

  const email = (p.email ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: "Alamat email tidak valid." };
  }

  const phone = (p.phone ?? "").trim();
  if (phone.length > 20 || !PHONE_RE.test(phone)) {
    return { ok: false, error: "Nomor telepon tidak valid." };
  }

  const subject = (p.subject ?? "").trim();
  if (subject.length > 200) return { ok: false, error: "Subjek maksimal 200 karakter." };

  const message = (p.message ?? "").trim();
  if (message.length < 10) return { ok: false, error: "Pesan minimal 10 karakter." };
  if (message.length > 5000) return { ok: false, error: "Pesan maksimal 5000 karakter." };

  return { ok: true };
}
