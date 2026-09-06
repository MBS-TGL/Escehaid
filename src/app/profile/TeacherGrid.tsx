"use client";

import { useState, useMemo } from "react";
import { Users, MagnifyingGlass } from "@/components/Icons";
import { StaggerChildren, StaggerItem } from "@/components/Animations";
import type { Teacher } from "@/lib/supabase";
import TeacherCard from "../TeacherCard";

export default function TeacherGrid({ teachers }: { teachers: Teacher[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.position.toLowerCase().includes(q)
    );
  }, [teachers, search]);

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
            className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f0f4fa] py-16 text-center">
          <Users className="h-12 w-12 text-[#082b59]/20" />
          <p className="mt-4 text-sm text-[#082b59]/60">Tidak ada guru ditemukan.</p>
          {search && (
            <p className="mt-1 text-xs text-[#082b59]/40">Coba kata kunci lain</p>
          )}
        </div>
      ) : (
        <StaggerChildren stagger={0.08} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((t) => (
            <StaggerItem key={t.id}>
              <TeacherCard teacher={t} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}