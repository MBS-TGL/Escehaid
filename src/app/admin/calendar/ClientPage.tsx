"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Megaphone,
  Note,
  CalendarCheck,
  Users,
} from "@/components/Icons";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: "news" | "article" | "agenda" | "spmb";
  href: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarClientPage({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Hitung hari awal & total hari dalam bulan
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Padding hari bulan lalu
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Hari-hari bulan ini
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Padding hari bulan depan (agar genap kelipatan 7)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }
  }

  // Map event per tanggal
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of initialEvents) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const badgeColor = {
    news: "bg-blue-50 text-blue-700 border-blue-200",
    article: "bg-purple-50 text-purple-700 border-purple-200",
    agenda: "bg-emerald-50 text-emerald-700 border-emerald-200",
    spmb: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const badgeIcon = {
    news: Megaphone,
    article: Note,
    agenda: CalendarCheck,
    spmb: Users,
  };

  const nowStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarBlank className="h-5 w-5 text-[var(--brand-accent)]" />
            Kalender Redaksi &amp; Agenda
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Jadwal publikasi berita, artikel, agenda kegiatan, dan gelombang pendaftaran SPMB.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={today}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hari Ini
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="p-2 text-slate-500 hover:text-slate-800"
            >
              <CaretLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[8rem] text-center text-xs font-bold text-slate-800">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Bulan berikutnya"
              className="p-2 text-slate-500 hover:text-slate-800"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Kalender Grid */}
      <div className="rounded-2xl border border-[#dce3ed] bg-white shadow-sm overflow-hidden">
        {/* Header hari */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-2.5">
          {DAY_NAMES.map((name, i) => (
            <div key={name} className={i === 0 ? "text-red-500" : ""}>
              {name}
            </div>
          ))}
        </div>

        {/* Kotak tanggal */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {days.map((d) => {
            const evs = eventsByDate.get(d.dateStr) || [];
            const isToday = d.dateStr === nowStr;

            return (
              <div
                key={d.dateStr}
                className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 transition-colors ${
                  !d.isCurrentMonth
                    ? "bg-slate-50/40 text-slate-300"
                    : isToday
                      ? "bg-[var(--brand-primary)]/5"
                      : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? "bg-[var(--brand-primary)] text-white"
                        : d.isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-300"
                    }`}
                  >
                    {d.dayNum}
                  </span>
                  {evs.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 sm:hidden">
                      {evs.length}
                    </span>
                  )}
                </div>

                {/* Event list */}
                <div className="space-y-1">
                  {evs.slice(0, 3).map((ev) => {
                    const Icon = badgeIcon[ev.type] || CalendarCheck;
                    return (
                      <Link
                        key={ev.id}
                        href={ev.href}
                        title={ev.title}
                        className={`hidden sm:flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium truncate transition-transform hover:scale-[1.02] ${badgeColor[ev.type]}`}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </Link>
                    );
                  })}
                  {evs.length > 3 && (
                    <span className="hidden sm:block text-[10px] font-semibold text-slate-400 pl-1">
                      +{evs.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
