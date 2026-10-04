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
      className={`group rounded-xl border transition-all duration-300 ${
        isOpen
          ? "border-[#1767b1]/30 bg-white shadow-lg shadow-[#082b59]/5"
          : "border-transparent hover:border-[#dce3ed] hover:bg-white/60"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors duration-300 ${
            isOpen
              ? "bg-[#1767b1] text-white"
              : "bg-[#082b59]/5 text-[#082b59]/40 group-hover:bg-[#1767b1]/10 group-hover:text-[#1767b1]"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`flex-1 text-[15px] font-semibold transition-colors duration-300 ${
            isOpen ? "text-[#1767b1]" : "text-[#082b59] group-hover:text-[#1767b1]"
          }`}
        >
          {q}
        </span>
        <div
          className={`shrink-0 transition-colors duration-300 ${
            isOpen ? "text-[#1767b1]" : "text-[#082b59]/30 group-hover:text-[#1767b1]"
          }`}
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}
        >
          <CaretDown className="h-5 w-5" />
        </div>
      </button>

      <div
        className="overflow-hidden"
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-5 pl-17">
            <div className="border-l-2 border-[#f4d21f] pl-4">
              <p className="text-sm leading-relaxed text-slate-600">{a}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section className="bg-[#f4f7fb]" style={{ contentVisibility: "auto" } as React.CSSProperties}>
      <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
        <CSSFadeIn>
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">
              Pertanyaan yang sering diajukan
            </h2>
            <p className="mt-4 text-sm text-slate-500">
              Belum menemukan jawaban?{" "}
              <Link href="/contact" className="font-semibold text-[#1767b1] hover:text-[#082b59] transition-colors">
                Hubungi kami
              </Link>
            </p>
          </div>
        </CSSFadeIn>

        <CSSFadeIn delay={0.15}>
          <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-1">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </CSSFadeIn>
      </div>
    </section>
  );
}
