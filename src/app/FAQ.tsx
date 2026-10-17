"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { CSSFadeIn } from "@/components/CSSAnimations";
import { faqs } from "./faq-data";

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
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
            <div className="border-l-2 border-[#f4d21f] pl-3 sm:pl-4">
              <p className="text-[13px] leading-relaxed text-slate-600 sm:text-sm">{a}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section
      className="bg-[#f4f7fb]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 640px" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1296px] px-6 py-10 sm:py-14 md:px-10 md:py-20">
        <CSSFadeIn>
          <div className="mb-8 sm:mb-12 md:mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">FAQ</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--brand-primary)] sm:text-3xl md:text-4xl">
              Pertanyaan yang sering diajukan
            </h2>
            <p className="mt-4 text-sm text-slate-500">
              Belum menemukan jawaban?{" "}
              <Link href="/contact" className="font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors">
                Hubungi kami
              </Link>
            </p>
          </div>
        </CSSFadeIn>

        <CSSFadeIn delay={0.15}>
          <div className="mx-auto grid max-w-4xl gap-2 sm:gap-3 md:grid-cols-1">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </CSSFadeIn>
      </div>
    </section>
  );
}
