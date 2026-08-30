"use client";

import { useState } from "react";
import { Users } from "@/components/icons";
import { StaggerChildren, StaggerItem } from "@/components/Animations";
import type { Teacher } from "@/lib/supabase";

const CATEGORY_ALL = "Semua";

export default function TeacherGrid({ teachers }: { teachers: Teacher[] }) {
  const [active, setActive] = useState(CATEGORY_ALL);

  const allCategories = Array.from(
    new Set(teachers.flatMap((t) => t.categories ?? []))
  );
  const tabs = [CATEGORY_ALL, ...allCategories];

  const filtered =
    active === CATEGORY_ALL
      ? teachers
      : teachers.filter((t) => (t.categories ?? []).includes(active));

  return (
    <div>
      {/* Tabs */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {tabs.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              active === cat
                ? "bg-[#082b59] text-white shadow-md shadow-[#082b59]/20"
                : "bg-white text-slate-600 border border-[#dce3ed] hover:border-[#1767b1] hover:text-[#1767b1]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-16 text-center">
          <Users className="h-12 w-12 text-[#082b59]/20" />
          <p className="mt-4 text-sm text-slate-500">Tidak ada guru di kategori ini.</p>
        </div>
      ) : (
        <StaggerChildren stagger={0.08} className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {filtered.map((t) => (
            <StaggerItem key={t.id}>
              <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-3 border-[#f4f7fb] bg-white">
                  <span className="text-2xl font-bold text-[#082b59]/30">{t.name.charAt(0)}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#082b59]">{t.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{t.position || t.subject}</p>
                {(t.categories ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {t.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-[#1767b1]/10 px-2 py-0.5 text-[10px] font-medium text-[#1767b1]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
