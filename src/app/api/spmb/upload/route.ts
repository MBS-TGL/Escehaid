import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { storageFrom } from "@/lib/storage";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Endpoint upload dokumen SPMB untuk pendaftar publik. Pengganti akses
 * storage langsung dari browser (SPMBForm) — file dikirim ke server, server
 * yang memanggil Supabase Storage supaya kredensial tidak menyentuh browser.
 *
 * Autentikasi: TANPA sesi — dipakai pengunjung baru. Keamanan mengandalkan:
 * 1. RLS bucket `spmb-documents` di Supabase (anon hanya boleh insert ke
 *    folder SPMB).
 * 2. Path WAJIB memuat token rahasia 16 karakter acak yang hanya diketahui
 *    browser pendaftar (disimpan di draft localStorage): pola
 *    `spmb-<tahun>/<nisn>-<token>/<organ>.<ext>`. Tanpa token, pendaftar lain
 *    tidak bisa menebak path dokumen orang lain — menggantikan verifikasi
 *    kepemilikan berbasis sesi yang tidak mungkin untuk pendaftar anon.
 * 3. Ekstensi menentukan Content-Type yang diupload ke Storage (MIME klien
 *    TIDAK dipercaya) — berkas HTML bernama *.pdf tetap tercatat sebagai PDF.
 * 4. Rate limit per-IP 40 upload / 10 menit (in-memory, ter-prune).
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Ekstensi → MIME yang diperbolehkan dari peramban + MIME final yang dipaksa
 * saat upload (diputuskan server dari ekstensi, bukan dari `file.type` klien).
 */
const EXT_MIME: Record<string, { accepted: string[]; final: string }> = {
  pdf: { accepted: ["application/pdf"], final: "application/pdf" },
  jpg: { accepted: ["image/jpeg", "image/pjpeg", "image/jpg"], final: "image/jpeg" },
  jpeg: { accepted: ["image/jpeg", "image/pjpeg", "image/jpg"], final: "image/jpeg" },
  png: { accepted: ["image/png"], final: "image/png" },
  webp: { accepted: ["image/webp"], final: "image/webp" },
};

/** Nama organ dokumen final — kalau form menambah slot dokumen, tambah di sini. */
const ALLOWED_ORGS = new Set(["kk", "akta", "surat", "ktp", "transfer"]);

/**
 * Pola path: `spmb-<tahun4>/<identitas>-<token16>/<organ>.<ext>`.
 * - Identitas: nisn / penanda bebas (huruf-angka-titik-garis, 4-32 karakter).
 * - Token: 16 karakter [0-9a-z] acak — bagian rahasia yang membuat folder
 *   tidak bisa ditebak oleh pendaftar lain.
 */
const PATH_RE =
  /^spmb-\d{4}\/[A-Za-z0-9._-]{4,32}-[A-Za-z0-9]{16}\/(kk|akta|surat|ktp|transfer)\.(pdf|jpg|jpeg|png|webp)$/;

/** Rate limit per IP: 40 upload / 10 menit. */
const rateLimit = createRateLimiter(40, 10 * 60 * 1000);

/** Klien anon di sisi server — mirip kebiasaan proxy.ts (no session). */
function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan upload. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Pengiriman tidak valid." }, { status: 400 });
  }

  const file = form.get("file");
  const path = String(form.get("path") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }

  if (!PATH_RE.test(path) || path.includes("..")) {
    return NextResponse.json({ error: "Path upload tidak valid." }, { status: 400 });
  }

  const filename = path.split("/").pop()!;
  const ext = filename.split(".").pop()!.toLowerCase();
  const mime = EXT_MIME[ext];
  if (!ALLOWED_ORGS.has(filename.split(".")[0]) || !mime) {
    return NextResponse.json({ error: "Jenis/sekor file tidak dikenal." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File "${file.name}" terlalu besar. Maksimal 10 MB.` },
      { status: 413 }
    );
  }

  // MIME klien hanya dipercaya bila cocok dengan ekstensi. Tipe kosong/aneh
  // tetap boleh — Storage akan menyimpannya dengan MIME final dari ekstensi,
  // jadi berkas teks bernama ktp.pdf TIDAK akan terekspos sebagai text/html.
  if (file.type && !mime.accepted.includes(file.type)) {
    return NextResponse.json(
      { error: `Format file "${file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.` },
      { status: 415 }
    );
  }

  const supabase = storageClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Konfigurasi storage belum diset di server." },
      { status: 500 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // upsert tetap true — pendaftar boleh mengganti berkasnya sendiri di folder
  // ber-token miliknya; folder orang lain tidak bisa ditebak.
  const { data, error } = await storageFrom("spmb-documents", supabase).upload(path, bytes, {
    contentType: mime.final,
    upsert: true,
  });

  if (error) {
    if (error.message?.includes("size")) {
      return NextResponse.json(
        { error: `File "${file.name}" terlalu besar. Maksimal 10 MB.` },
        { status: 413 }
      );
    }
    if (error.message?.includes("mime") || error.message?.includes("tipe")) {
      return NextResponse.json(
        { error: `Format file "${file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.` },
        { status: 415 }
      );
    }
    console.error("spmb upload gagal:", error.message);
    return NextResponse.json(
      { error: `Gagal upload "${file.name}". Coba lagi.` },
      { status: 502 }
    );
  }

  return NextResponse.json({ path: data?.path ?? null });
}
