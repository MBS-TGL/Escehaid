import { getAchievementList } from "@/lib/queries";
import PrestasiClient from "./AchievementsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prestasi",
  description: "Prestasi siswa dan sekolah SMP Muhammadiyah 4 Tanggul - Juara lomba akademik dan non-akademik tingkat kabupaten hingga nasional.",
};

export default async function PrestasiPage() {
  const achievements = await getAchievementList();

  return <PrestasiClient achievements={achievements} />;
}
