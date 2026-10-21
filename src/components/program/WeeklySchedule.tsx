"use client";

/**
 * Jadwal lengkap sepekan — interaksi tab hari (WAI-ARIA tablist, navigasi panah)
 * + toggle "Per Hari | Sepekan" (desktop, default Sepekan). Mobile/tablet selalu
 * mode tab.
 *
 * Aturan hydration: server merender dengan tab "Senin", tanpa badge; setelah
 * mount, tab otomatis pindah ke hari ini (Asia/Jakarta) dan badge "Sedang
 * berlangsung" baru dirender — data waktu tidak pernah ikut HTML awal.
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

const TAB_KEYS_TO_FOCUS: Record<string, (i: number) => number> = {
  ArrowRight: (i) => (i + 1) % DAYS.length,
  ArrowLeft: (i) => (i - 1 + DAYS.length) % DAYS.length,
  Home: () => 0,
  End: () => DAYS.length - 1,
};

export default function WeeklySchedule() {
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
    () => (mounted ? activeSlotNowJakarta(new Date()) : null),
    [mounted]
  );

  const slots = useMemo(() => slotsForDay(activeDay), [activeDay]);

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
          className="flex max-w-full flex-wrap gap-1.5 lg:flex-nowrap"
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
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
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

      {/* Panel per hari — selalu tampil di mobile/tablet; di desktop hanya mode "Per Hari" */}
      <div
        id="mbs-day-panel"
        role="tabpanel"
        aria-labelledby={`mbs-tab-${activeDay}`}
        className={`mt-4 ${listVisible ? "" : "lg:hidden"}`}
      >
        <ol className="relative space-y-3 border-l border-[#dce3ed] pl-6">
          {slots.map((slot) => {
            const isNow = currentSlot?.slot?.id === slot.id;
            return (
              <li key={`${slot.id}-${activeDay}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[calc(1.5rem+5px)] top-2 h-2.5 w-2.5 rounded-full bg-[var(--brand-accent)]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-[var(--brand-primary)]/10 px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--brand-primary)]">
                    {formatSlotTime(slot)}
                  </span>
                  {isSlotCrossingMidnight(slot) && (
                    <span className="text-[11px] font-medium text-slate-500">
                      berlanjut hingga pagi
                    </span>
                  )}
                  {isNow && (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Sedang berlangsung
                    </span>
                  )}
                </div>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {itemsForDay(slot, activeDay).map((item) => (
                    <li
                      key={item.label}
                      className="rounded-lg border border-[#e5ebf2] bg-white px-2.5 py-1 text-[13px] font-medium text-slate-700"
                    >
                      {item.label}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
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
          <caption className="px-4 py-3 text-left text-xs font-medium text-slate-500">
            Jadwal harian MBS sepekan (waktu WIB; slot 21:00 berlanjut hingga 03:00).
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
            {SLOTS.map((slot) => {
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
                        {badgeHere && currentSlot && (
                          <span
                            className="mb-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white"
                            title={activeDayCol === ownerCol ? undefined : `Sedang berjalan pada ${DAYS[ownerCol]}`}
                          >
                            Sedang berlangsung
                          </span>
                        )}
                        {dayItems.length > 0 ? (
                          <ul className="space-y-0.5">
                            {dayItems.map((item) => (
                              <li key={`${day}-${item.label}`} className="text-slate-700">
                                {item.label}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span aria-hidden="true" className="text-slate-300">&ndash;</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
