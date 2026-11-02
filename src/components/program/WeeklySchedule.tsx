"use client";

/**
 * Jadwal lengkap sepekan — interaksi tab hari (WAI-ARIA tablist, navigasi panah)
 * + toggle "Per Hari | Sepekan" (desktop, default Sepekan). Mobile/tablet selalu
 * mode tab.
 *
 * Mode "Per Hari" = timeline vertikal 1 kolom, dikelompokkan per fase waktu
 * (Dini hari, Pagi, Siang, Sore, Malam). Jam di kiri, garis + titik di tengah,
 * kegiatan di kanan.
 *
 * Aturan hydration: server merender dengan tab "Senin", tanpa badge; setelah
 * mount, tab otomatis pindah ke hari ini (Asia/Jakarta) dan badge "Berlangsung"
 * baru dirender — data waktu tidak pernah ikut HTML awal.
 */
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  DAYS,
  SLOTS,
  activeSlotNowJakarta,
  dayIndexNowJakarta,
  formatSlotTime,
  isSlotCrossingMidnight,
  itemsForDay,
  slotsForDay,
  slotOwnerDayIndex,
  type Day,
  type Slot,
} from "@/lib/data/mbs-schedule";

/** Sinkronisasi "sudah mount?" tanpa setState di effect (pola CSSAnimations). */
function subscribeNoop(): () => void {
  return () => {};
}

function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

/**
 * Dot hijau berkedip — penanda slot yang sedang berlangsung (dot solid +
 * gelombang animate-ping). Teks "Berlangsung" tetap ada untuk screen reader;
 * motion-reduce mematikan kedipan sesuai preferensi pengguna.
 */
function LiveDot({ title }: { title?: string }) {
  return (
    <span title={title} className="relative inline-flex h-2.5 w-2.5 shrink-0">
      <span
        aria-hidden="true"
        className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:animate-none"
      />
      <span
        aria-hidden="true"
        className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"
      />
      <span className="sr-only">Berlangsung</span>
    </span>
  );
}

/* ── Pengelompokan fase waktu untuk timeline ─────────────────────────── */

/** Menit sejak 00:00 dari label seperti "03.00-05.30" (ambil jam mulai). */
function startMinutes(timeLabel: string): number {
  const m = timeLabel.match(/(\d{1,2})[.:](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/** Pecah "03.00-05.30" jadi [mulai, selesai]; selesai null bila format tak dikenali. */
function splitTime(timeLabel: string): [string, string | null] {
  const parts = timeLabel.split(/\s*[-–—]\s*/);
  return parts.length === 2 ? [parts[0], parts[1]] : [timeLabel, null];
}

const PHASES: Array<{ label: string; until: number }> = [
  { label: "Dini hari", until: 6 * 60 },
  { label: "Pagi", until: 11 * 60 + 45 },
  { label: "Siang", until: 15 * 60 },
  { label: "Sore", until: 18 * 60 },
  { label: "Malam", until: 24 * 60 },
];

function phaseOf(slot: Slot): string {
  const start = startMinutes(formatSlotTime(slot));
  return (PHASES.find((p) => start < p.until) ?? PHASES[PHASES.length - 1]).label;
}

function groupByPhase(slots: Slot[]): Array<{ label: string; slots: Slot[] }> {
  const groups: Array<{ label: string; slots: Slot[] }> = [];
  for (const slot of slots) {
    const label = phaseOf(slot);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.slots.push(slot);
    else groups.push({ label, slots: [slot] });
  }
  return groups;
}

const TAB_KEYS_TO_FOCUS: Record<string, (i: number) => number> = {
  ArrowRight: (i) => (i + 1) % DAYS.length,
  ArrowLeft: (i) => (i - 1 + DAYS.length) % DAYS.length,
  Home: () => 0,
  End: () => DAYS.length - 1,
};

export default function WeeklySchedule({ slots = SLOTS }: { slots?: Slot[] } = {}) {
  const mounted = useMounted();
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [mode, setMode] = useState<"per-hari" | "sepekan">("sepekan");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // Tab efektif: pilihan user > hari ini (WIB, setelah mount) > "Senin".
  const activeDay: Day =
    selectedDay ??
    (mounted ? (DAYS[dayIndexNowJakarta(new Date())] ?? "Senin") : "Senin");

  const todayIndex = mounted ? dayIndexNowJakarta(new Date()) : -1;
  const currentSlot = useMemo(
    () => (mounted ? activeSlotNowJakarta(slots, new Date()) : null),
    [mounted, slots]
  );

  const slotsOfDay = useMemo(() => slotsForDay(slots, activeDay), [slots, activeDay]);
  const phaseGroups = useMemo(() => groupByPhase(slotsOfDay), [slotsOfDay]);

  const onTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const compute = TAB_KEYS_TO_FOCUS[e.key];
      if (!compute) return;
      e.preventDefault();
      const next = compute(index);
      // Tab tidak auto-aktif; seleksi tetap manual (klik/Enter/Space).
      if (DAYS[next] !== activeDay) setSelectedDay(DAYS[next]);
      tabsRef.current[next]?.focus();
    },
    [activeDay]
  );

  const listVisible = mode === "per-hari";
  const tableVisible = mode === "sepekan";

  // Kolom pemilik slot berjalan (badge kecil di tabel); -1 saat SSR/badge belum sedia.
  const ownerCol =
    currentSlot && currentSlot.slot
      ? slotOwnerDayIndex(currentSlot.slot, currentSlot.time, currentSlot.dayIndex)
      : -1;
  const activeDayCol = DAYS.indexOf(activeDay);

  return (
    <div data-testid="weekly-schedule">
      {/* Satu row: tab hari di kiri + toggle mode di kanan (desktop). Mobile hanya tab. */}
      <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
        <div
          role="tablist"
          aria-label="Pilih hari"
          className="flex max-w-full flex-nowrap gap-1 overflow-x-hidden sm:gap-1.5"
        >
          {DAYS.map((day, index) => (
            <button
              key={day}
              ref={(el) => {
                tabsRef.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`mbs-tab-${day}`}
              aria-selected={day === activeDay}
              aria-controls="mbs-day-panel"
              tabIndex={day === activeDay ? 0 : -1}
              onClick={() => setSelectedDay(day)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={`min-w-0 flex-1 shrink-0 whitespace-nowrap rounded-lg px-1.5 py-2 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:flex-none sm:px-3 sm:text-xs ${
                day === activeDay
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-white text-slate-600 hover:bg-[var(--brand-accent)]/10"
              }`}
            >
              {day}
              {index === todayIndex && <span className="sr-only"> (hari ini)</span>}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Mode tampilan jadwal"
          className="hidden shrink-0 lg:inline-flex"
        >
          <div className="inline-flex rounded-xl border border-[#dce3ed] bg-slate-50 p-1">
            <button
              type="button"
              aria-pressed={listVisible}
              onClick={() => setMode("per-hari")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                listVisible
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Per Hari
            </button>
            <button
              type="button"
              aria-pressed={tableVisible}
              onClick={() => setMode("sepekan")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tableVisible
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Sepekan
            </button>
          </div>
        </div>
      </div>

      {/* Panel per hari — timeline 1 kolom. Selalu tampil di mobile/tablet;
          di desktop hanya mode "Per Hari". */}
      <div
        id="mbs-day-panel"
        role="tabpanel"
        aria-labelledby={`mbs-tab-${activeDay}`}
        className={`mt-5 ${listVisible ? "" : "lg:hidden"}`}
      >
        <div className="lg:columns-2 lg:gap-x-12">
          {phaseGroups.map((group) => (
            <section key={group.label} aria-label={group.label} className="mb-5 break-inside-avoid rounded-2xl border border-[#dce3ed] bg-white p-4 sm:p-5">
              <h4 className="mb-4 text-sm font-bold text-[var(--brand-primary)]">
                {group.label}
              </h4>
              <ol>
                {group.slots.map((slot, i) => {
                  const isNow = currentSlot?.slot?.id === slot.id;
                  const isLast = i === group.slots.length - 1;
                  const [start, end] = splitTime(formatSlotTime(slot));
                  return (
                    <li
                      key={`${slot.id}-${activeDay}`}
                      className="flex"
                    >
                      {/* Jam */}
                      <div className="w-[3.25rem] shrink-0 pt-1.5 text-right leading-tight sm:w-14">
                        <span className="block text-sm font-bold tabular-nums text-[var(--brand-primary)]">
                          {start}
                        </span>
                        {end && (
                          <span className="block text-[11px] tabular-nums text-slate-400">
                            {end}
                          </span>
                        )}
                      </div>

                      {/* Garis + titik */}
                      <div className="relative flex w-6 shrink-0 justify-center sm:w-7">
                        {!isLast && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-0 top-3 w-px bg-[#dce3ed]"
                          />
                        )}
                        <span className="relative z-10 mt-[0.6rem] flex h-3 w-3 items-center justify-center bg-white">
                          {isNow ? (
                            <LiveDot />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 rounded-full border-2 border-[var(--brand-primary)]/50 bg-white"
                            />
                          )}
                        </span>
                      </div>

                      {/* Kegiatan */}
                      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
                        <div
                          className={`rounded-xl px-3 py-2 ${
                            isNow ? "bg-emerald-50" : ""
                          }`}
                        >
                          <ul className="flex flex-wrap gap-1.5">
                            {itemsForDay(slot, activeDay).map((item) => (
                              <li
                                key={item.label}
                                className={`rounded-lg border px-2.5 py-1 text-[13px] font-medium text-slate-700 ${
                                  isNow
                                    ? "border-emerald-200 bg-white"
                                    : "border-[#e5ebf2] bg-slate-50/60"
                                }`}
                              >
                                {item.label}
                              </li>
                            ))}
                          </ul>
                          {isSlotCrossingMidnight(slot) && (
                            <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                              berlanjut hingga pagi
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </div>

      {/* Tabel sepekan — desktop (mode Sepekan). Baris slot aktif + kolom hari
          aktif di-tint; badge hanya 1x di perpotongan slot-aktif x hari pemilik. */}
      <div
        className={`mt-2 hidden overflow-x-auto rounded-2xl border border-[#dce3ed] bg-white lg:block ${
          tableVisible ? "" : "lg:hidden"
        }`}
      >
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-[13px]">
          <colgroup>
            <col className="w-[110px]" />
            {DAYS.map((day) => (
              <col key={day} />
            ))}
          </colgroup>
          <caption className="sr-only">
            Jadwal harian MBS sepekan, waktu dalam WIB; slot 21:00 berlanjut hingga 03:00.
          </caption>
          <thead>
            <tr className="border-b border-[#e5ebf2] bg-slate-50">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold text-slate-600"
              >
                Waktu
              </th>
              {DAYS.map((day, col) => (
                <th
                  scope="col"
                  key={day}
                  className={`px-3 py-2 font-semibold ${
                    col === activeDayCol
                      ? "bg-[var(--brand-highlight)]/10 text-[var(--brand-primary)]"
                      : "text-slate-600"
                  }`}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const rowActive = currentSlot?.slot?.id === slot.id;
              return (
                <tr
                  key={slot.id}
                  className={`border-b border-[#eef3f8] last:border-b-0 ${
                    rowActive ? "bg-emerald-50/50" : "hover:bg-slate-50/70"
                  }`}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 whitespace-nowrap px-3 py-2 align-middle font-semibold tabular-nums text-[var(--brand-primary)] ${
                      rowActive ? "bg-emerald-50" : "bg-white"
                    }`}
                  >
                    {formatSlotTime(slot)}
                  </th>
                  {DAYS.map((day, col) => {
                    const badgeHere = rowActive && col === ownerCol;
                    const colTint = col === activeDayCol;
                    const dayItems = itemsForDay(slot, day);
                    return (
                      <td
                        key={day}
                        className={`px-3 py-2 align-top ${
                          colTint ? "bg-[var(--brand-highlight)]/[0.07]" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {badgeHere && currentSlot && (
                            <span className="flex h-[1lh] shrink-0 items-center">
                              <LiveDot
                                title={
                                  activeDayCol === ownerCol
                                    ? "Berlangsung"
                                    : `Sedang berjalan pada ${DAYS[ownerCol]}`
                                }
                              />
                            </span>
                          )}
                          {dayItems.length > 0 ? (
                            <ul className="min-w-0 space-y-0.5">
                              {dayItems.map((item) => (
                                <li key={`${day}-${item.label}`} className="text-slate-700">
                                  {item.label}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span aria-hidden="true" className="text-slate-300">&ndash;</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footnote waktu — berlaku untuk kedua mode (per hari & sepekan). */}
      <p className="mt-3 text-xs text-slate-400">
        Waktu dalam WIB; slot 21:00 berlanjut hingga 03:00.
      </p>
    </div>
  );
}
