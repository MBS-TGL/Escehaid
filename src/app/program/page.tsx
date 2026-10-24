import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import { BookOpen } from "@/components/Icons";
import QuranPillars from "@/components/program/QuranPillars";
import DailyAgenda from "@/components/program/DailyAgenda";
import { pageOpenGraph } from "@/lib/seo";
import {
  getAgendaBlocksList,
  getAgendaSlotsList,
  getQuranPillarsList,
  blockRowToView,
  pillarRowToView,
  slotRowToSlot,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Program",
  description:
    "Pembelajaran Al-Qur'an Metode Wafa dan agenda harian santri SMP Muhammadiyah 4 Tanggul - ibadah, belajar, dan kemandirian setiap hari.",
  alternates: { canonical: "/program" },
  openGraph: pageOpenGraph({
    title: "Program",
    url: "/program",
  }),
};

/**
 * Konten dari tabel program (supabase/program.sql, panel /admin/program).
 * Bila SQL belum dijalankan, getter mengembalikan [] dan komponen masing-masing
 * fallback ke data statis (mbs-quran.ts / mbs-schedule.ts) — aman dua-duanya.
 * ISR `revalidate = 86400`; admin men-trigger revalidate "/program" saat simpan.
 */
export const revalidate = 86400;

export default async function ProgramPage() {
  const [pillarRows, blockRows, slotRows] = await Promise.all([
    getQuranPillarsList(),
    getAgendaBlocksList(),
    getAgendaSlotsList(),
  ]);
  const pillars = pillarRows.map(pillarRowToView);
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
        <QuranPillars pillars={pillars} />
      </section>

      {/* Section 2 — Agenda hari santri */}
      <section id="agenda" className="border-t border-[#dce3ed] bg-white py-10 sm:px-6 md:py-14" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <DailyAgenda
            blocks={blockRows.map(blockRowToView)}
            slots={slotRows.map(slotRowToSlot)}
          />
        </div>
      </section>
    </div>
  );
}
