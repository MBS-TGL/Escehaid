import { CalendarBlank, FileText, Newspaper, Trophy } from "@/components/Icons";
import type { SearchKind } from "@/lib/queries";

/**
 * Ikon + warna lencana per jenis konten pencarian — sumber bersama untuk
 * halaman /search (SearchView) dan overlay pencarian di topbar (SearchOverlay)
 * agar tampilan hasil selalu sinkron. Kelas ditulis utuh agar terbaca JIT.
 */
export const KIND_META: Record<SearchKind, { icon: typeof Newspaper; chip: string }> = {
  berita: { icon: Newspaper, chip: "border-blue-200 bg-blue-50 text-blue-700" },
  artikel: { icon: FileText, chip: "border-[#1767b1]/20 bg-[#1767b1]/10 text-[#1767b1]" },
  kegiatan: { icon: CalendarBlank, chip: "border-purple-200 bg-purple-50 text-purple-700" },
  prestasi: { icon: Trophy, chip: "border-amber-200 bg-amber-50 text-amber-700" },
};

/** Tanggal ISO → "12 Okt 2026"; string rusak/kosong → "" (tampilan menyembunyikan). */
export function formatSearchDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
