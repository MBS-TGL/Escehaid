"use client";

import { useState, useEffect } from "react";
import { CalendarBlank } from "@/components/Icons";
import { getActiveAgendaEvents } from "@/lib/queries";
import type { AgendaEvent } from "@/lib/queries";

function calcTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold tabular-nums text-white backdrop-blur-sm md:h-16 md:w-16 md:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">{label}</span>
    </div>
  );
}

export default function CountdownEvent() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    getActiveAgendaEvents().then((items) => {
      setEvents(items);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const target = events[active]?.event_date;
    if (!target) return;
    setTime(calcTimeLeft(target));
    const timer = setInterval(() => {
      setTime(calcTimeLeft(target));
    }, 1000);
    return () => clearInterval(timer);
  }, [active, events]);

  useEffect(() => {
    if (events.length <= 1) return;
    const cycle = setInterval(() => {
      setActive((prev) => (prev + 1) % events.length);
    }, 8000);
    return () => clearInterval(cycle);
  }, [events.length]);

  if (loading) return null;

  if (events.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 md:py-16">
      <div className="absolute inset-0 opacity-10">
        <CalendarBlank className="absolute -right-8 -top-8 h-48 w-48 rotate-12" weight="fill" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f4d21f]/30 bg-[#f4d21f]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#f4d21f]">
          <CalendarBlank className="h-3 w-3" weight="fill" />
          Agenda Penting
        </span>

        {/* Event title */}
        <h2 className="mt-4 text-xl font-bold text-white md:text-2xl">{events[active].title}</h2>
        <p className="mt-1 text-sm text-white/50">
          {new Date(events[active].event_date).toLocaleDateString("id-ID", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>

        {/* Countdown */}
        <div className="mt-6 flex items-center justify-center gap-3 md:gap-4">
          <Unit value={time.days} label="Hari" />
          <span className="mt-[-12px] text-2xl font-bold text-white/40">:</span>
          <Unit value={time.hours} label="Jam" />
          <span className="mt-[-12px] text-2xl font-bold text-white/40">:</span>
          <Unit value={time.minutes} label="Menit" />
          <span className="mt-[-12px] text-2xl font-bold text-white/40">:</span>
          <Unit value={time.seconds} label="Detik" />
        </div>

        {/* Dots indicator */}
        {events.length > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {events.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-[#f4d21f]" : "w-2 bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}