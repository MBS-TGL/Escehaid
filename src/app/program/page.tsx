import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import { BookOpen } from "@/components/Icons";
import QuranPillars from "@/components/program/QuranPillars";
import DailyAgenda from "@/components/program/DailyAgenda";

export const metadata: Metadata = {
  title: "Program",
  description:
    "Pembelajaran Al-Qur'an Metode Wafa dan agenda harian santri SMP Muhammadiyah 4 Tanggul - ibadah, belajar, dan kemandirian setiap hari.",
  alternates: { canonical: "/program" },
};

export const revalidate = 86400;

export default function ProgramPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageHero
        variant="compact"
        eyebrow="Program Sekolah"
        icon={BookOpen}
        title="Program"
        description="Pembelajaran Al-Qur'an dengan Metode Wafa dan jadwal harian santri MBS yang menuntun ibadah, belajar, dan kemandirian sepanjang hari."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Program" }]}
      />

      {/* Section 1 — 5 pilar Al-Qur'an */}
      <section id="al-quran" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <QuranPillars />
      </section>

      {/* Section 2 — Agenda hari santri */}
      <section id="agenda" className="border-t border-[#dce3ed] bg-white py-10 sm:px-6 md:py-14" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <DailyAgenda />
        </div>
      </section>
    </div>
  );
}
