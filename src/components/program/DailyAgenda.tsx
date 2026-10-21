import { CSSStagger } from "@/components/CSSAnimations";
import { MoonStars, CalendarBlank, Clock } from "@/components/Icons";
import { AGENDA_SECTION_META } from "@/lib/data/mbs-quran";
import { BLOCKS } from "@/lib/data/mbs-schedule";
import WeeklySchedule from "./WeeklySchedule";

const DAILY_BLOCKS = BLOCKS.map((b) => ({
  key: b.key,
  title: b.title,
  timeLabel: b.timeLabel,
  summary: b.summary,
}));

/** Server section: heading + 4 kartu ringkas + jadwal lengkap (client). */
export default function DailyAgenda() {
  return (
    <div>
      <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
        <span className="h-px w-6 bg-[var(--brand-accent)]" aria-hidden="true" />
        {AGENDA_SECTION_META.eyebrow}
      </p>
      <h2 className="text-2xl font-black tracking-tight text-[var(--brand-primary)] md:text-3xl">
        {AGENDA_SECTION_META.heading}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
        {AGENDA_SECTION_META.subheading}
      </p>

      {/* 4 kartu ringkas — chip + jam tak boleh pecah baris di lebar sempit */}
      <CSSStagger className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={70}>
        {DAILY_BLOCKS.map((block) => (
          <article
            key={block.key}
            className="flex h-full flex-col rounded-2xl border border-[#dce3ed] bg-slate-50/60 p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3 py-1 text-[11px] font-semibold text-white">
                <MoonStars className="h-3 w-3" aria-hidden="true" />
                {block.title}
              </span>
              <span className="whitespace-nowrap rounded-full border border-[#dce3ed] bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--brand-primary)]">
                <Clock className="mr-1 inline h-3 w-3 align-[-1px] text-[var(--brand-accent)]" aria-hidden="true" />
                {block.timeLabel}
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{block.summary}</p>
          </article>
        ))}
      </CSSStagger>

      <div className="mt-10">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-[var(--brand-primary)]">
          <CalendarBlank className="h-5 w-5 text-[var(--brand-accent)]" aria-hidden="true" />
          Jadwal Lengkap Sepekan
        </h3>
        <p className="mb-5 text-sm text-slate-500">
          Pilih hari untuk melihat rangkaian kegiatan; tampilan tabel menampilkan seluruh sepekan.
        </p>
        <WeeklySchedule />
      </div>
    </div>
  );
}
