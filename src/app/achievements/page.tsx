import { cache } from "react";
import { getAchievementList } from "@/lib/queries";
import { ACHIEVEMENT_LEVELS } from "@/lib/site-config";
import PrestasiClient from "./AchievementsClient";
import type { Metadata } from "next";

/** Satu query untuk metadata + render (React cache, tanpa mengubah isi query). */
const getAchievements = cache(getAchievementList);

export async function generateMetadata(): Promise<Metadata> {
  const achievements = await getAchievements();
  const alternates = { canonical: "/achievements" };

  // Data kosong → jangan diindeks, deskripsi netral
  if (achievements.length === 0) {
    return {
      title: "Prestasi",
      description: "Pencapaian siswa dan SMP Muhammadiyah 4 Tanggul.",
      alternates,
      robots: { index: false, follow: true },
    };
  }

  // Tingkat tertinggi yang BENAR-BENAR ada di data (klaim harus didukung data)
  const used = new Set(achievements.map((a) => (a.level || "").trim().toLowerCase()).filter(Boolean));
  const highest = [...ACHIEVEMENT_LEVELS].reverse().find((l) => used.has(l.toLowerCase()));

  return {
    title: "Prestasi",
    description:
      `${achievements.length} prestasi siswa SMP Muhammadiyah 4 Tanggul` +
      (highest ? `, dengan capaian hingga tingkat ${highest}.` : "."),
    alternates,
  };
}

export const revalidate = 300;

export default async function PrestasiPage() {
  const achievements = await getAchievements();

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Prestasi", item: "https://www.smpmuh4tanggul.sch.id/achievements" },
          ],
        })
      }} />
      <PrestasiClient achievements={achievements} />
    </div>
  );
}
