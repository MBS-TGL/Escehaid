"use client";

import { useState, useMemo } from "react";
import { Users, MagnifyingGlass } from "@/components/Icons";
import { CSSStagger } from "@/components/CSSAnimations";
import type { Teacher } from "@/lib/supabase";
import TeacherCard from "../TeacherCard";

const INITIAL_VISIBLE = 10;

export default function TeacherGrid({ teachers }: { teachers: Teacher[] }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.position.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const searching = search.trim().length > 0;
  const visible =
    searching || showAll || filtered.length <= INITIAL_VISIBLE
      ? filtered
      : filtered.slice(0, INITIAL_VISIBLE);

  return (
    <div>
      {/* Search */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-full max-w-md">
          <MagnifyingGlass className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 sm:text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f0f4fa] py-16 text-center">
          <Users className="h-12 w-12 text-[var(--brand-primary)]/20" />
          <p className="mt-4 text-sm text-[var(--brand-primary)]/60">Tidak ada guru ditemukan.</p>
          {search && (
            <p className="mt-1 text-xs text-[var(--brand-primary)]/40">Coba kata kunci lain</p>
          )}
        </div>
      ) : (
        <>
          <CSSStagger stagger={80} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {visible.map((t) => (
              <TeacherCard key={t.id} teacher={t} />
            ))}
          </CSSStagger>

          {!searching && filtered.length > INITIAL_VISIBLE && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                aria-expanded={showAll}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#dce3ed] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--brand-primary)] shadow-sm transition-transform hover:border-[var(--brand-primary)]/40 active:scale-[0.99]"
              >
                {showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua ${filtered.length} guru`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}