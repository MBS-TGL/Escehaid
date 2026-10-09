import { CSSFadeIn } from "@/components/CSSAnimations";
import { searchAllContent } from "@/lib/queries";
import SearchView from "./SearchView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pencarian",
  description:
    "Cari berita, artikel, kegiatan, dan prestasi SMP Muhammadiyah 4 Tanggul dalam satu kotak pencarian.",
  alternates: { canonical: "/search" },
  // Halaman hasil pencarian jangan diindeks mesin pencari.
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialQuery = (q ?? "").trim().slice(0, 80);
  // Hasil awal dihitung di server: tautan ?q= bisa dibagikan dan tanpa JS pun
  // kotak GET di SearchView tetap menampilkan hasil.
  const initialResults = initialQuery ? await searchAllContent(initialQuery) : [];

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-14 text-white md:py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#1767b1] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold text-balance md:text-4xl">Pencarian</h1>
            <p className="mt-3 text-base text-white/70 text-balance">
              Satu kotak untuk mencari berita, artikel, kegiatan, dan prestasi
            </p>
          </CSSFadeIn>
        </div>
      </section>

      <SearchView initialQuery={initialQuery} initialResults={initialResults} />
    </div>
  );
}
