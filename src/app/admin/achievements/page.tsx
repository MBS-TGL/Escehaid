import type { Metadata } from "next";
import AchievementsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Prestasi",
};

export default function AchievementsPage() {
  return <AchievementsClientPage />;
}
