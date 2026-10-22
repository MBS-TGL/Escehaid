import { CSSStagger } from "@/components/CSSAnimations";
import SectionHeading from "@/components/public/SectionHeading";
import { BookOpen, Clock } from "@/components/Icons";
import { QURAN_SECTION_META, QURAN_PILLARS } from "@/lib/data/mbs-quran";
import type { QuranPillarView } from "@/lib/queries/program";

/**
 * Section "Pembelajaran Al-Qur'an Metode Wafa" — 5 kartu pilar harian.
 * Server component. Data dari tabel `quran_pillars` (supabase/program.sql)
 * dipasok sebagai prop; bila kosong (SQL belum jalan) → fallback statis.
 * Target (`target`) hanya dirender bila terisi.
 */
export default function QuranPillars({
  pillars,
}: {
  pillars?: QuranPillarView[];
} = {}) {
  const list: QuranPillarView[] =
    pillars && pillars.length > 0
      ? pillars
      : QURAN_PILLARS.map((pillar) => ({
          number: pillar.number,
          title: pillar.title,
          description: pillar.description,
          time: pillar.time,
          target: pillar.target || "",
        }));
  return (
    <div>
      <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
        <span className="h-px w-6 bg-[var(--brand-accent)]" aria-hidden="true" />
        {QURAN_SECTION_META.eyebrow}
      </p>
      <SectionHeading
        title={QURAN_SECTION_META.heading}
        description={QURAN_SECTION_META.subheading}
        className="md:mb-8"
      />

      <CSSStagger
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        stagger={60}
      >
        {list.map((pillar) => (
          <article
            key={pillar.number}
            className="flex h-full flex-col rounded-2xl border border-[#dce3ed] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-lg font-black text-white tabular-nums"
            >
              {pillar.number}
            </span>
            <h3 className="mt-3 text-base font-bold leading-snug text-[var(--brand-primary)]">
              {pillar.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{pillar.description}</p>
            <hr aria-hidden="true" className="my-3 mt-auto border-t border-[#e5ebf2]" />
            <dl className="text-[13px]">
              <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                Waktu
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-[var(--brand-primary)]">{pillar.time}</dd>
              {pillar.target && (
                <dd className="mt-0.5 text-slate-500 tabular-nums">{pillar.target}</dd>
              )}
            </dl>
          </article>
        ))}
      </CSSStagger>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-500">
        <BookOpen className="h-3.5 w-3.5 text-[var(--brand-accent)]" aria-hidden="true" />
        Bekerja sama dengan Wafa Indonesia
      </p>
    </div>
  );
}
