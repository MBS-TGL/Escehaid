import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import { BookOpen } from "@/components/Icons";
import QuranPillars from "@/components/program/QuranPillars";
import DailyAgenda from "@/components/program/DailyAgenda";
import ThreeOrnament from "@/components/three/ThreeOrnament";
import { getSiteSettings } from "@/lib/settings";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";
import {
  getAgendaBlocksList,
  getAgendaSlotsList,
  getQuranPillarsList,
  blockRowToView,
  pillarRowToView,
  slotRowToSlot,
} from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Program",
    description:
      "Pembelajaran Al-Qur'an Metode Wafa dan agenda harian santri SMP Muhammadiyah 4 Tanggul - ibadah, belajar, dan kemandirian setiap hari.",
    alternates: { canonical: "/program" },
    openGraph: pageOpenGraph({
      title: "Program",
      url: "/program",
      image: await ogImageOverride(),
    }),
  };
}

/**
 * Konten dari tabel program (supabase/program.sql, panel /admin/program).
 * Bila SQL belum dijalankan, getter mengembalikan [] dan komponen masing-masing
 * fallback ke data statis (mbs-quran.ts / mbs-schedule.ts) — aman dua-duanya.
 * ISR `revalidate = 86400`; admin men-trigger revalidate "/program" saat simpan.
 */
export const revalidate = 86400;

export default async function ProgramPage() {
  const [pillarRows, blockRows, slotRows, settings] = await Promise.all([
    getQuranPillarsList(),
    getAgendaBlocksList(),
    getAgendaSlotsList(),
    getSiteSettings(),
  ]);
  const pillars = pillarRows.map(pillarRowToView);

  // Ornamen 3D — butuh saklar induk + saklar /program sama-sama aktif.
  const threeOn =
    settings.values.three_enabled === "true" &&
    settings.values.three_program_enabled === "true";
  const threeProps = {
    enabled: threeOn,
    color: settings.values.three_color,
    accentColor: settings.values.three_accent_color,
  };
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

      {/* Section 1 — 5 pilar Al-Qur'an (latar terang → NormalBlending) */}
      <section id="al-quran" className="relative overflow-hidden mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <ThreeOrnament {...threeProps} className="absolute inset-0 -z-10" blending="normal" />
        <QuranPillars pillars={pillars} />
      </section>

      {/* Section 2 — Agenda hari santri (section ber-bg putih: ornamen tanpa
          -z-10 agar tak tertutup latar; konten dibuat relative agar di atasnya) */}
      <section id="agenda" className="relative overflow-hidden border-t border-[#dce3ed] bg-white py-10 sm:px-6 md:py-14" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <ThreeOrnament {...threeProps} className="absolute inset-0" blending="normal" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <DailyAgenda
            blocks={blockRows.map(blockRowToView)}
            slots={slotRows.map(slotRowToSlot)}
          />
        </div>
      </section>
    </div>
  );
}
