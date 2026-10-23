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
