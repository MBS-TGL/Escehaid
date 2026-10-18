"use client";

import { useState } from "react";
import { CaretDown } from "@/components/Icons";

export type FaqEntry = { q: string; a: string };

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`group rounded-xl border transition-[border-color,background-color,box-shadow] duration-300 ${
        isOpen
          ? "border-[var(--brand-accent)]/30 bg-white shadow-lg shadow-[var(--brand-primary)]/5"
          : "border-transparent hover:border-[#dce3ed] hover:bg-white/60"
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-5 sm:py-4"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors duration-300 sm:h-8 sm:w-8 sm:text-xs ${
            isOpen
              ? "bg-[var(--brand-accent)] text-white"
              : "bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]/40 group-hover:bg-[var(--brand-accent)]/10 group-hover:text-[var(--brand-accent)]"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`flex-1 text-sm leading-snug font-semibold transition-colors duration-300 sm:text-[15px] sm:leading-normal ${
            isOpen ? "text-[var(--brand-accent)]" : "text-[var(--brand-primary)] group-hover:text-[var(--brand-accent)]"
          }`}
        >
          {q}
        </span>
        <div
          className={`shrink-0 transition-colors duration-300 ${
            isOpen ? "text-[var(--brand-accent)]" : "text-[var(--brand-primary)]/30 group-hover:text-[var(--brand-accent)]"
          }`}
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}
        >
          <CaretDown className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </button>

      <div
        id={`faq-panel-${index}`}
        aria-hidden={!isOpen}
        className="overflow-hidden"
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4 sm:px-5 sm:pb-5 sm:pl-17">
            <div className="border-l-2 border-[var(--brand-accent)] pl-3 sm:pl-4">
              <p className="text-[13px] leading-relaxed text-slate-600 sm:text-sm">{a}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Daftar FAQ kanonik — accordion bernomor dengan animasi tinggi CSS (grid-rows),
 * satu gaya untuk beranda (/FAQ) dan halaman SPMB (/admission).
 */
export default function FaqList({ items, className = "" }: { items: FaqEntry[]; className?: string }) {
  return (
    <div className={`grid gap-2 sm:gap-3 md:grid-cols-1 ${className}`}>
      {items.map((item, i) => (
        <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
      ))}
    </div>
  );
}
