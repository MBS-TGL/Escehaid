"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import { FadeIn } from "@/components/animations";

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

function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#dce3ed]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-[#1767b1] group"
      >
        <span className="text-base font-semibold text-[#082b59] group-hover:text-[#1767b1]">{q}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <CaretDown className="h-5 w-5 shrink-0 text-[#1767b1]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
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
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Pertanyaan yang sering diajukan</h2>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mx-auto max-w-3xl">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
