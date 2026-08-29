"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretLeft, CaretRight, Quotes } from "@phosphor-icons/react";
import { FadeIn } from "./animations";

const testimonials = [
  {
    name: "Budi Santoso",
    role: "Orang tua siswa kelas 9",
    text: "Alhamdulillah, anak saya berkembang pesat tidak hanya dari segi akademik tapi juga akhlaknya. Guru-gurunya sangat peduli dan selalu komunikatif dengan orang tua.",
    avatar: "BS",
  },
  {
    name: "Siti Aminah",
    role: "Orang tua siswa kelas 7",
    text: "Pilihan terbaik untuk pendidikan anak. Program tahfidz dan bimbingan akademiknya sangat terstruktur. Lingkungan sekolah juga sangat mendukung.",
    avatar: "SA",
  },
  {
    name: "Ahmad Fauzi",
    role: "Orang tua siswa kelas 8",
    text: "Anak saya tadinya malas belajar, sekarang jadi semangat. Terima kasih MUH4TA atas pendampingannya. Program 3M-nya benar-benar berbeda dari sekolah lain.",
    avatar: "AF",
  },
  {
    name: "Rina Wati",
    role: "Orang tua siswa kelas 7",
    text: "Fasilitas lengkap, guru ramah, dan yang paling penting anak saya merasa nyaman belajar di sini. SPMB-nya juga mudah dan transparan.",
    avatar: "RW",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-[#f4d21f] blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-[#1767b1] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
        <FadeIn>
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4d21f]">Testimoni</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Kata mereka tentang MUH4TA</h2>
          </div>
        </FadeIn>

        <div className="relative mx-auto max-w-3xl">
          <Quotes className="absolute -left-4 -top-4 h-16 w-16 text-[#f4d21f]/20 md:-left-8 md:-top-6 md:h-24 md:w-24" />

          <div className="relative min-h-[220px] md:min-h-[180px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <p className="text-lg leading-relaxed text-white/80 md:text-xl md:leading-relaxed">
                  &ldquo;{testimonials[current].text}&rdquo;
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4d21f] text-sm font-bold text-[#082b59]">
                    {testimonials[current].avatar}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{testimonials[current].name}</p>
                    <p className="text-sm text-white/50">{testimonials[current].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-[#f4d21f] hover:text-[#f4d21f]"
            >
              <CaretLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? "w-8 bg-[#f4d21f]" : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-[#f4d21f] hover:text-[#f4d21f]"
            >
              <CaretRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
