"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarBlank } from "@/components/Icons";
import { getActiveAgendaEvents } from "@/lib/queries";
import type { AgendaEvent } from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function calcTimeLeft(target: string, now: number) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    ended: false,
  };
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(":", ".");
  return `${datePart} · ${timePart} WIB`;
}

/* ------------------------------------------------------------------ */
/*  Countdown (isolated per-second re-renders)                         */
/* ------------------------------------------------------------------ */

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold tabular-nums text-white md:h-16 md:w-16 md:backdrop-blur-sm md:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </span>
    </div>
  );
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Interval pertama menyala dalam ≤1 detik setelah target berubah —
    // sinkronisasi langsung tidak wajib dan melanggar aturan set-state-in-effect.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const time = calcTimeLeft(target, now);

  // Static sr-only text updated at most per minute (not per second)
  const srText = useMemo(() => {
    if (time.ended) return "Acara telah dimulai";
    const parts: string[] = [];
    if (time.days > 0) parts.push(`${time.days} hari`);
    if (time.hours > 0) parts.push(`${time.hours} jam`);
    if (time.minutes > 0) parts.push(`${time.minutes} menit`);
    if (parts.length === 0) parts.push("kurang dari 1 menit");
    return `${parts.join(" ")} lagi`;
  }, [time.ended, time.days, time.hours, time.minutes]);

  if (time.ended) {
    return (
      <div className="mt-8 flex items-center justify-center">
        <p className="text-lg font-semibold text-white/80">Acara telah dimulai</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <span className="sr-only">{srText}</span>
      <div className="flex items-center justify-center gap-3 md:gap-4" aria-hidden="true">
        <Unit value={time.days} label="Hari" />
        <span className="mt-[-12px] text-2xl font-bold text-white/40">:</span>
        <Unit value={time.hours} label="Jam" />
        <span className="mt-[-12px] text-2xl font-bold text-white/40">:</span>
        <Unit value={time.minutes} label="Menit" />
        <span className="mt-[-12px] text-2xl font-bold text-white/40">:</span>
        <Unit value={time.seconds} label="Detik" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                       */
/* ------------------------------------------------------------------ */

export default function CountdownEvent() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  /* ---------- Fetch & filter past events ---------- */
  useEffect(() => {
    getActiveAgendaEvents()
      .then((items) => {
        const upcoming = items.filter(
          (e) => new Date(e.event_date).getTime() > Date.now(),
        );
        setEvents(upcoming);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  /* ---------- Auto-rotate (8 s) ---------- */
  useEffect(() => {
    if (events.length <= 1 || paused) return;

    // Respect prefers-reduced-motion: no auto-rotate
    const mql = window.matchMedia(MOTION_QUERY);
    if (mql.matches) return;

    const cycle = setInterval(() => {
      setActive((prev) => (prev + 1) % events.length);
    }, 8000);

    // Re-subscribe in case preference changes mid-session
    const onMotionChange = () => {
      if (mql.matches) clearInterval(cycle);
    };
    mql.addEventListener("change", onMotionChange);

    return () => {
      clearInterval(cycle);
      mql.removeEventListener("change", onMotionChange);
    };
  }, [events.length, active, paused]);

  /* ---------- Pause helpers ---------- */
  const handleMouseEnter = useCallback(() => setPaused(true), []);
  const handleMouseLeave = useCallback(() => setPaused(false), []);
  const handleFocus = useCallback(() => setPaused(true), []);
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      // Only unpause if focus leaves the section entirely
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setPaused(false);
      }
    },
    [],
  );

  /* ---------- Early returns ---------- */
  if (loading) return null;
  if (events.length === 0) return null;

  const current = events[active];

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] py-14 md:py-14"
      aria-label="Agenda penting"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute -left-32 -top-32 hidden h-80 w-80 rounded-full bg-[var(--brand-highlight)]/8 blur-[100px] md:block" />
        <div className="absolute -bottom-20 -right-20 hidden h-60 w-60 rounded-full bg-[var(--brand-highlight)]/20 blur-[80px] md:block" />
        <div className="absolute left-1/2 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <CalendarBlank className="absolute -right-8 -top-8 h-48 w-48 rotate-12 text-white/[0.03]" weight="fill" />
        <CalendarBlank className="absolute -bottom-10 -left-10 h-40 w-40 -rotate-12 text-white/[0.03]" weight="fill" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-highlight)]/30 bg-[var(--brand-highlight)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-highlight)]">
          <CalendarBlank className="h-3 w-3" weight="fill" />
          Agenda Penting
        </span>

        {/* Event title + date — keyed for fade animation */}
        <div key={active} className="countdown-fade-in">
          <h2 className="mt-4 text-xl font-bold text-white md:text-2xl">
            {current.title}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {formatEventDate(current.event_date)}
          </p>
        </div>

        {/* Countdown (isolated re-renders) */}
        <Countdown target={current.event_date} />

        {/* Dots indicator */}
        {events.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {events.map((ev, i) => (
              <button
                key={ev.id}
                onClick={() => setActive(i)}
                aria-label={`Agenda ${i + 1}: ${ev.title}`}
                aria-current={i === active}
                className="flex items-center justify-center p-2"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${
                    i === active
                      ? "w-6 bg-[var(--brand-highlight)]"
                      : "w-2 bg-white/30"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}