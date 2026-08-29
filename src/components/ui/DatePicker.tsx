"use client";

import { useState, useRef, useEffect } from "react";

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

export function DatePicker({ label, required, error, value, onChange, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parsed = parseDate(value);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : now.getMonth());
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : now.getFullYear());
  const [selecting, setSelecting] = useState<"day" | "month" | "year">("day");

  useEffect(() => {
    if (open && parsed) {
      setViewMonth(parsed.month);
      setViewYear(parsed.year);
    } else if (open) {
      setViewMonth(now.getMonth());
      setViewYear(now.getFullYear());
    }
    setSelecting("day");
  }, [open]);

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
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-left text-sm transition-colors focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
            : "border-[#dce3ed] focus:border-[#1767b1] focus:ring-[#1767b1]/10"
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
        <div className="absolute z-50 mt-1 w-72 rounded-xl border border-[#dce3ed] bg-white p-3 shadow-lg">
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#f4f7fb] hover:text-[#082b59]"
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
                  selecting === "month" ? "bg-[#082b59] text-white" : "text-[#082b59] hover:bg-[#f4f7fb]"
                }`}
              >
                {MONTHS[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setSelecting("year")}
                className={`rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                  selecting === "year" ? "bg-[#082b59] text-white" : "text-[#082b59] hover:bg-[#f4f7fb]"
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#f4f7fb] hover:text-[#082b59]"
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
                          ? "bg-[#1767b1] font-bold text-white"
                          : isToday
                          ? "font-semibold text-[#1767b1]"
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
                      ? "bg-[#1767b1] font-bold text-white"
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
                        ? "bg-[#1767b1] font-bold text-white"
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
              className="w-full rounded-lg py-1.5 text-center text-sm font-medium text-[#1767b1] hover:bg-[#f4f7fb]"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
