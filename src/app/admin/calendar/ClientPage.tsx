"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Megaphone,
  Note,
  CalendarCheck,
  Users,
} from "@/components/Icons";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { FilterBar } from "@/components/admin/FilterBar";
import { MobileFilterBar, MobileListRow } from "@/components/admin/mobile";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: "news" | "article" | "agenda" | "spmb";
  href: string;
}

/** Label tampilan tipe event (dipakai chip daftar mobile). */
const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  news: "Berita",
  article: "Artikel",
  agenda: "Kegiatan",
  spmb: "SPMB",
};

/** Tanggal manusiawi untuk daftar mobile — "Senin, 3 Nov 2026". */
function dateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarClientPage({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<"all" | "news" | "article" | "agenda" | "spmb">("all");
  const [search, setSearch] = useState("");

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

  // Filter event sesuai pilihan (jenis + kata kunci judul)
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return initialEvents.filter((ev) => {
      const matchType = typeFilter === "all" || ev.type === typeFilter;
      const matchSearch = !term || ev.title.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [initialEvents, typeFilter, search]);

  // Statistik event bulan aktif
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const stats = useMemo(() => {
    const thisMonth = initialEvents.filter((e) => e.date.startsWith(currentMonthPrefix));
    return {
      total: thisMonth.length,
      news: thisMonth.filter((e) => e.type === "news").length,
      article: thisMonth.filter((e) => e.type === "article").length,
      agenda: thisMonth.filter((e) => e.type === "agenda").length,
      spmb: thisMonth.filter((e) => e.type === "spmb").length,
    };
  }, [initialEvents, currentMonthPrefix]);

  // Daftar agenda bulan aktif untuk mobile — grid kalender di layar kecil
  // hanya menampung badge jumlah, jadi daftar inilah yang membuat event
  // tetap bisa dibuka dari HP (urut tanggal).
  const monthEvents = useMemo(
    () =>
      filteredEvents
        .filter((ev) => ev.date.startsWith(currentMonthPrefix))
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    [filteredEvents, currentMonthPrefix]
  );

  // Map event per tanggal
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of filteredEvents) {
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
      {/* ── Page Header Standar esceha ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <CalendarBlank className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kalender Redaksi</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Jadwal publikasi berita, artikel, agenda kegiatan, dan gelombang SPMB
            </p>
          </div>
        </div>

        {/* Kontrol Bulan — kanonis: full-width di HP, auto di desktop */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={today}
            className="flex min-h-11 sm:min-h-0 flex-1 sm:flex-none items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Bulan Ini
          </button>
          <div className="flex flex-1 sm:flex-none items-center justify-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <CaretLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7.5rem] text-center text-sm font-bold text-slate-800 sm:text-xs">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Bulan berikutnya"
              className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Metrik Cepat (StatPillGroup) ── */}
      <StatPillGroup>
        <StatPill icon={CalendarBlank} label={`Agenda ${MONTH_NAMES[month]}`} value={stats.total} tone="neutral" />
        <StatPill icon={Megaphone} label="Berita" value={stats.news} tone="info" />
        <StatPill icon={Note} label="Artikel" value={stats.article} tone="neutral" />
        <StatPill icon={CalendarCheck} label="Kegiatan" value={stats.agenda} tone="success" />
        <StatPill icon={Users} label="Gelombang SPMB" value={stats.spmb} tone="warning" />
      </StatPillGroup>

      {/* ── Filter jenis + pencarian — komponen bersama (desktop FilterBar,
          mobile MobileFilterBar), konsisten dengan halaman admin lain ── */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari judul agenda…"
          searchLabel="Cari agenda"
          query={search}
          onQueryChange={setSearch}
          filters={[
            {
              value: typeFilter,
              options: [
                { key: "all", label: "Semua Jenis" },
                { key: "news", label: "Berita" },
                { key: "article", label: "Artikel" },
                { key: "agenda", label: "Kegiatan" },
                { key: "spmb", label: "SPMB" },
              ],
              onChange: (k) => setTypeFilter(k as "all" | "news" | "article" | "agenda" | "spmb"),
              menuLabel: "Filter jenis",
            },
          ]}
        />
      </div>
      <MobileFilterBar
        placeholder="Cari judul agenda…"
        searchLabel="Cari agenda"
        query={search}
        onQueryChange={setSearch}
        filter={{
          value: typeFilter,
          options: [
            { key: "all", label: "Semua Jenis" },
            { key: "news", label: "Berita" },
            { key: "article", label: "Artikel" },
            { key: "agenda", label: "Kegiatan" },
            { key: "spmb", label: "SPMB" },
          ],
          onChange: (k) => setTypeFilter(k as "all" | "news" | "article" | "agenda" | "spmb"),
          menuLabel: "Filter jenis",
        }}
      />

      {/* ── Kalender Grid ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Header hari */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600 py-3">
          {DAY_NAMES.map((name, i) => (
            <div key={name} className={i === 0 ? "text-rose-600" : ""}>
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
                className={`min-h-[92px] sm:min-h-[115px] p-2 transition-colors ${
                  !d.isCurrentMonth
                    ? "bg-slate-50/40 text-slate-300"
                    : isToday
                      ? "bg-[var(--brand-primary)]/[0.04]"
                      : "bg-white hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? "bg-[var(--brand-primary)] text-white shadow-2xs"
                        : d.isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-300"
                    }`}
                  >
                    {d.dayNum}
                  </span>
                  {evs.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-500 sm:hidden">
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
                        className={`hidden sm:flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium truncate transition-transform hover:scale-[1.01] ${badgeColor[ev.type]}`}
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

      {/* ── Daftar agenda bulan aktif (mobile) ── */}
      <div className="mt-4 md:hidden">
        <h2 className="mb-2 text-sm font-bold text-slate-800">
          Agenda {MONTH_NAMES[month]} {year}
        </h2>
        {monthEvents.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400 shadow-xs">
            Tidak ada agenda pada bulan ini.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {monthEvents.map((ev) => {
              const Icon = badgeIcon[ev.type] || CalendarCheck;
              return (
                <MobileListRow
                  key={ev.id}
                  thumb={
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e4ecf6]">
                      <Icon className="h-5 w-5 text-[var(--brand-primary)]" />
                    </span>
                  }
                  title={<span className="break-words">{ev.title}</span>}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold ${badgeColor[ev.type]}`}
                      >
                        {TYPE_LABEL[ev.type]}
                      </span>
                      <span>{dateLabel(ev.date)}</span>
                    </span>
                  }
                  onClick={() => router.push(ev.href)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
