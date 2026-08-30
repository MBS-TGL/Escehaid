"use client";

import { useState } from "react";
import { Trophy, MedalMilitary, Medal, Star } from "@/components/Icons";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";

const iconMap: Record<string, typeof Trophy> = {
  Akademik: Trophy,
  Keagamaan: Medal,
  Sekolah: Star,
  Olahraga: MedalMilitary,
};

const categories = ["Semua", "Akademik", "Keagamaan", "Sekolah", "Olahraga"];

type Achievement = { id: string; title: string; category: string; year: number; description: string };

export default function PrestasiClient({ achievements }: { achievements: Achievement[] }) {
  const [active, setActive] = useState("Semua");

  const filtered = active === "Semua" ? achievements : achievements.filter((a) => a.category === active);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <Trophy className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Medal className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Prestasi</h1>
            <p className="mt-3 text-base text-white/70">Pencapaian terbaik siswa dan sekolah</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {/* Category Tabs */}
        <FadeIn>
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  active === cat
                    ? "bg-[#082b59] text-white shadow-lg shadow-[#082b59]/20"
                    : "bg-[#f4f7fb] text-slate-500 hover:bg-[#082b59]/10 hover:text-[#082b59]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Bento Grid */}
        {achievements.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <Trophy className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">Prestasi masih kosong.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan pencapaian terbaik dari siswa kami.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerChildren stagger={0.08} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, i) => {
              const Icon = iconMap[item.category] || Trophy;
              const isLarge = i === 0;
              return (
                <StaggerItem key={item.id}>
                  <div
                    className={`group flex flex-col rounded-2xl border border-[#dce3ed] bg-white p-6 transition-all hover:border-[#1767b1]/30 hover:shadow-lg hover:shadow-[#082b59]/5 ${
                      isLarge ? "sm:col-span-2 sm:flex-row sm:items-center sm:gap-6" : ""
                    }`}
                  >
                    <div
                      className={`mb-4 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#f4d21f]/20 to-[#f4d21f]/5 text-[#f4d21f] ${
                        isLarge ? "h-20 w-20 shrink-0 sm:mb-0" : "mb-4 h-12 w-12"
                      }`}
                    >
                      <Icon weight="fill" className={isLarge ? "h-10 w-10" : "h-6 w-6"} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#1767b1]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-400">{item.year}</span>
                      </div>
                      <h3 className={`mt-2 font-semibold text-[#082b59] ${isLarge ? "text-xl" : "text-base"}`}>
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        )}
      </section>
    </div>
  );
}
