import { MagnifyingGlass } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
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
      <PageHero
        variant="compact"
        title="Pencarian"
        description="Satu kotak untuk mencari berita, artikel, kegiatan, dan prestasi."
        icon={MagnifyingGlass}
      />

      <SearchView initialQuery={initialQuery} initialResults={initialResults} />
    </div>
  );
}
