import { MagnifyingGlass } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import { groupSearchResults, searchAllContent } from "@/lib/queries/search";
import { pageOpenGraph } from "@/lib/seo";
import SearchView from "./SearchView";
import type { Metadata } from "next";

const SEARCH_DESCRIPTION =
  "Cari halaman situs, berita, artikel, kegiatan, prestasi, dan ekstrakurikuler SMP Muhammadiyah 4 Tanggul dalam satu kotak pencarian.";

export const metadata: Metadata = {
  title: "Pencarian",
  description: SEARCH_DESCRIPTION,
  alternates: { canonical: "/search" },
  // og:url wajib eksplisit — lihat catatan di src/lib/seo.ts.
  openGraph: pageOpenGraph({
    title: "Pencarian",
    description: SEARCH_DESCRIPTION,
    url: "/search",
  }),
  // Halaman hasil pencarian jangan diindeks mesin pencari: isinya duplikat
  // konten asli dan tak punya nilai indeks sendiri. `noindex` TIDAK memengaruhi
  // kartu pratinjau saat tautan dibagikan (og:* tetap dibaca).
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialQuery = (q ?? "").trim().slice(0, 60);
  // Hasil awal dihitung di server: tautan ?q= bisa dibagikan dan tanpa JS pun
  // kotak GET di SearchView tetap menampilkan hasil.
  const initialResults = initialQuery ? await searchAllContent(initialQuery) : [];
  const initialGroups = groupSearchResults(initialResults);
  const initialCount = initialResults.length;

  return (
    <div>
      <PageHero
        variant="compact"
        title="Pencarian"
        description="Satu kotak untuk mencari halaman situs, berita, artikel, kegiatan, prestasi, dan ekstrakurikuler."
        icon={MagnifyingGlass}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Pencarian" }]}
      />

      <SearchView initialQuery={initialQuery} initialGroups={initialGroups} initialCount={initialCount} />
    </div>
  );
}
