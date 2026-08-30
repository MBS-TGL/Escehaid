"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { FadeIn } from "@/components/Animations";

const faqs = [
  {
    q: "Bagaimana cara mendaftarkan anak ke SMP Muhammadiyah 4 Tanggul?",
    a: "Pendaftaran dapat dilakukan secara online melalui halaman SPMB kami. Isi data calon peserta didik, lengkapi dokumen yang diperlukan, dan ikuti tahapan seleksi yang akan diinformasikan oleh panitia.",
  },
  {
    q: "Apa saja program unggulan yang tersedia?",
    a: "Kami memiliki 2 program unggulan: Boarding School (program asrama) dan Full-day School (pembelajaran sehari penuh dengan pembiasaan ibadah).",
  },
  {
    q: "Berapa biaya masuk dan SPP per bulan?",
    a: "Informasi lengkap mengenai biaya pendidikan dapat dilihat di halaman SPMB atau menghubungi bagian administrasi sekolah. Kami juga menyediakan beasiswa bagi siswa berprestasi.",
  },
  {
    q: "Apakah tersedia fasilitas asrama?",
    a: "Ya, kami menyediakan fasilitas asrama yang nyaman dan aman bagi siswa program Boarding School. Asrama dilengkapi dengan fasilitas penunjang pembelajaran dan pembiasaan ibadah.",
  },
  {
    q: "Bagaimana dengan kurikulum yang diterapkan?",
    a: "Kami menggunakan Kurikulum Merdeka yang dipadukan dengan ISMUBA (Al-Islam, Kemuhammadiyahan, dan Bahasa Arab) sebagai kurikulum khas Muhammadiyah. Pembelajaran terintegrasi antara sains, teknologi, dan nilai-nilai keislaman.",
  },
  {
    q: "Apakah ada kegiatan ekstrakurikuler?",
    a: "Tentu! Kami menyediakan berbagai kegiatan ekstrakurikuler seperti Sepak Bola, Futsal, Bulu Tangkis, Hizbul Wathan, Catur, Qiroah, dan masih banyak lagi untuk mengembangkan bakat siswa.",
  },
];

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
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className={`shrink-0 transition-colors duration-300 ${
            isOpen ? "text-[#1767b1]" : "text-[#082b59]/30 group-hover:text-[#1767b1]"
          }`}
        >
          <CaretDown className="h-5 w-5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-17">
              <div className="border-l-2 border-[#f4d21f] pl-4">
                <p className="text-sm leading-relaxed text-slate-600">{a}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <section className="bg-[#f4f7fb]">
      <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
        <FadeIn>
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
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-1">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
