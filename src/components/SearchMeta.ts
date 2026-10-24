import { CalendarBlank, FileText, House, Newspaper, Trophy, Users } from "@/components/Icons";
import type { SearchKind } from "@/lib/queries";

/**
 * Ikon + warna lencana per jenis konten pencarian — sumber bersama untuk
 * halaman /search (SearchView) dan overlay pencarian di topbar (SearchOverlay)
 * agar tampilan hasil selalu sinkron. Kelas ditulis utuh agar terbaca JIT.
 */
export const KIND_META: Record<SearchKind, { icon: typeof Newspaper; chip: string }> = {
  halaman: { icon: House, chip: "border-slate-200 bg-slate-50 text-slate-600" },
  berita: { icon: Newspaper, chip: "border-blue-200 bg-blue-50 text-blue-700" },
  artikel: { icon: FileText, chip: "border-[#1767b1]/20 bg-[#1767b1]/10 text-[#1767b1]" },
  kegiatan: { icon: CalendarBlank, chip: "border-purple-200 bg-purple-50 text-purple-700" },
  prestasi: { icon: Trophy, chip: "border-amber-200 bg-amber-50 text-amber-700" },
  ekskul: { icon: Users, chip: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

/**
 * Label jenis konten yang bisa dibaca manusia — dipakai lencana kecil pada
 * kartu hasil (KIND_META hanya menyimpan ikon + warna).
 */
export const KIND_LABEL: Record<SearchKind, string> = {
  halaman: "Halaman",
  berita: "Berita",
  artikel: "Artikel",
  kegiatan: "Kegiatan",
  prestasi: "Prestasi",
  ekskul: "Ekstrakurikuler",
};

/**
 * Tautan cepat pada halaman kosong (tidak ada hasil) — sumber bersama agar
 * overlay dan halaman /search menawarkan tujuan yang sama tanpa mengetik ulang.
 */
export const EMPTY_STATE_LINKS: { label: string; href: string }[] = [
  { label: "SPMB", href: "/admission" },
  { label: "Profil", href: "/profile" },
  { label: "Kontak", href: "/contact" },
];

/** Tanggal ISO → "12 Okt 2026"; string rusak/kosong → "" (tampilan menyembunyikan). */
export function formatSearchDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Tanggal ISO → label ramah waktu ("2 minggu lalu"); di atas setahun atau
 * tanggal rusak → tanggal absolut (`formatSearchDate`). `now` bisa disuntik
 * agar hasil uji deterministik.
 */
export function formatRelativeDate(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = now - time;
  if (diff < 0) return formatSearchDate(iso); // tanggal masa depan → absolut
  if (diff < MINUTE) return "baru saja";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} menit lalu`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} jam lalu`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)} hari lalu`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)} minggu lalu`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)} bulan lalu`;
  return formatSearchDate(iso);
}

/**
 * Kamus kata kunci untuk saran "mungkin maksud Anda" saat pencarian kosong.
 * Sumber bersama overlay & halaman /search agar sarannya konsisten.
 */
export const SUGGEST_DICTIONARY: string[] = [
  "spmb", "pendaftaran", "daftar", "ppdb", "biaya", "penerimaan",
  "berita", "informasi", "artikel", "kegiatan", "agenda", "prestasi",
  "penghargaan", "profil", "sejarah", "guru", "fasilitas", "ekstrakurikuler",
  "ekskul", "program", "tahfidz", "keunggulan", "galeri", "foto", "unduhan",
  "download", "formulir", "brosur", "kontak", "hubungi", "alamat", "telepon",
  "email", "portal", "siswa", "login", "beranda", "pramuka", "tapak suci",
  "muhadharah", "ustadzah", "lomba", "osis", "ipm",
];
