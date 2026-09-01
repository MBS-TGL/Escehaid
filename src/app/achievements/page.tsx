import { getAchievementList } from "@/lib/queries";
import PrestasiClient from "./AchievementsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prestasi",
};

export default async function PrestasiPage() {
  const achievements = await getAchievementList();

  return <PrestasiClient achievements={achievements} />;
}
