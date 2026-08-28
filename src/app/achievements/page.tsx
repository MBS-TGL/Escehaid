import { getAchievementList } from "@/lib/queries";
import PrestasiClient from "./AchievementsClient";

export default async function PrestasiPage() {
  const achievements = await getAchievementList();

  return <PrestasiClient achievements={achievements} />;
}
