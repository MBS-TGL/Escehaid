"use client";

import { useState, useRef, useEffect } from "react";
import { nearestScroller } from "@/components/ui/useFloatingPanel";

interface DatePickerProps {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function parseDate(val: string): { day: number; month: number; year: number } | null {
  if (!val) return null;
  const parts = val.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  return { day, month, year };
}

function formatDate(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
}

/** Perkiraan tinggi kalender penuh (header + grid + tombol "Hari Ini"), px. */
const CAL_H = 336;
/** Ruang minimum agar flip ke atas/bawah tetap memakai sisi itu (px). */
const CAL_MIN = 160;

export function DatePicker({ label, required, error, value, onChange, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  /** `up` = buka ke atas; `maxH` dikunci ke ruang tersedia (lihat computePlace). */
  const [place, setPlace] = useState<{ up: boolean; maxH: number }>({ up: false, maxH: CAL_H });

  /**
   * Tentukan arah buka & tinggi maks kalender dari ruang yang benar-benar
   * tersedia — memakai wadah scroll terdekat (nearestScroller) sebagai batas,
   * persis seperti useFloatingPanel untuk Select: kalender tidak pernah
   * keluar area scroll modal / menutupi footer, dan tidak kepotong di tepi.
   */
  const computePlace = () => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = document.documentElement.clientHeight;
    const scRect = nearestScroller(el)?.getBoundingClientRect() ?? null;
    const boundTop = Math.max(12, scRect ? scRect.top + 12 : 12);
    const boundBottom = Math.min(vh - 12, scRect ? scRect.bottom - 12 : vh - 12);
    const spaceBelow = boundBottom - rect.bottom - 6;
    const spaceAbove = rect.top - boundTop - 6;
    const up = spaceBelow < CAL_H && spaceBelow < spaceAbove;
    const space = up ? spaceAbove : spaceBelow;
    setPlace({ up, maxH: Math.max(CAL_MIN, Math.min(CAL_H, space)) });
  };

  // Re-posisi saat scroll (capture — menangkap scroll container mana pun,
  // termasuk di dalam modal) dan resize, selama kalender terbuka.
  useEffect(() => {
    if (!open) return;
    const onMove = () => computePlace();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const parsed = parseDate(value);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : now.getMonth());
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : now.getFullYear());
  const [selecting, setSelecting] = useState<"day" | "month" | "year">("day");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectDay(day: number) {
    onChange(formatDate(day, viewMonth, viewYear));
    setOpen(false);
  }

  function selectMonth(month: number) {
    setViewMonth(month);
    setSelecting("day");
  }

  function selectYear(year: number) {
    setViewYear(year);
    setSelecting("month");
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const today = new Date();

  const yearStart = Math.floor(viewYear / 12) * 12;

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
      <button
        type="button"
        ref={btnRef}
        onClick={() => {
          if (!open) {
            // Reset tampilan ke nilai yang sudah dipilih (atau hari ini) dan kembali
            // ke mode "hari" — dilakukan di event handler, bukan di useEffect.
            setViewMonth(parsed ? parsed.month : now.getMonth());
            setViewYear(parsed ? parsed.year : now.getFullYear());
            setSelecting("day");
            // Hitung arah & tinggi SEBELUM render terbuka (satu render, tanpa
            // frame kalender terpotong dulu).
            computePlace();
          }
          setOpen(!open);
        }}
        data-field-type="datepicker"
        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-left text-sm transition-colors focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
            : "border-[#dce3ed] focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/10"
        }`}
      >
        <span className={value ? "text-[#172033]" : "text-slate-400"}>
          {value || placeholder || "Pilih tanggal..."}
        </span>
        <svg className="pointer-events-none h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div
          /* `up` = buka ke atas: jangkar `bottom` 6px di atas tinggi tombol
             (wrapper kini hanya memuat tombol); selain itu ikut alur (di bawah
             tombol, seperti sebelumnya). */
          style={place.up ? { bottom: "calc(100% + 6px)", maxHeight: place.maxH } : { maxHeight: place.maxH }}
          className={`absolute left-0 z-50 w-72 overflow-y-auto rounded-xl border border-[#dce3ed] bg-white p-3 shadow-lg ${
            place.up ? "" : "mt-1"
          }`}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (selecting === "day") {
                  setViewMonth((m) => (m === 0 ? 11 : m - 1));
                } else if (selecting === "month") {
                  setViewYear((y) => y - 1);
                } else {
                  setViewYear((y) => y - 12);
                }
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#f4f7fb] hover:text-[var(--brand-primary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSelecting("month")}
                className={`rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                  selecting === "month" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-primary)] hover:bg-[#f4f7fb]"
                }`}
              >
                {MONTHS[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setSelecting("year")}
                className={`rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                  selecting === "year" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-primary)] hover:bg-[#f4f7fb]"
                }`}
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selecting === "day") {
                  setViewMonth((m) => (m === 11 ? 0 : m + 1));
                } else if (selecting === "month") {
                  setViewYear((y) => y + 1);
                } else {
                  setViewYear((y) => y + 12);
                }
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#f4f7fb] hover:text-[var(--brand-primary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day view */}
          {selecting === "day" && (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAYS.map((d) => (
                  <div key={d} className="py-1 text-center text-xs font-medium text-slate-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = parsed?.day === day && parsed?.month === viewMonth && parsed?.year === viewYear;
                  const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-[var(--brand-accent)] font-bold text-white"
                          : isToday
                          ? "font-semibold text-[var(--brand-accent)]"
                          : "text-[#172033] hover:bg-[#f4f7fb]"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Month view */}
          {selecting === "month" && (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMonth(i)}
                  className={`rounded-lg py-2 text-sm transition-colors ${
                    viewMonth === i
                      ? "bg-[var(--brand-accent)] font-bold text-white"
                      : "text-[#172033] hover:bg-[#f4f7fb]"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Year view */}
          {selecting === "year" && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const y = yearStart + i;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`rounded-lg py-2 text-sm transition-colors ${
                      viewYear === y
                        ? "bg-[var(--brand-accent)] font-bold text-white"
                        : "text-[#172033] hover:bg-[#f4f7fb]"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Today button */}
          <div className="mt-3 border-t border-[#dce3ed] pt-2">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                onChange(formatDate(t.getDate(), t.getMonth(), t.getFullYear()));
                setOpen(false);
              }}
              className="w-full rounded-lg py-1.5 text-center text-sm font-medium text-[var(--brand-accent)] hover:bg-[#f4f7fb]"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
