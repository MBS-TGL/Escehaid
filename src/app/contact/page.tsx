"use client";

import { useState } from "react";
import { submitContactMessage } from "@/lib/queries";
import { MapPin, Phone, Envelope, Clock, WhatsappLogo, InstagramLogo, YoutubeLogo, FacebookLogo } from "@/components/Icons";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";

export default function KontakPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const result = await submitContactMessage(form);
    if (result.success) {
      setStatus("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Gagal mengirim pesan.");
    }
  };

  return (
    <div>
      <title>Kontak | SMP Muhammadiyah 4 Tanggul</title>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <MapPin className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Phone className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Hubungi Kami</h1>
            <p className="mt-3 text-base text-white/70">Kami siap membantu Anda. Kirim pesan atau hubungi langsung.</p>
          </FadeIn>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: Form */}
            <FadeIn>
              <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm md:p-8">
                <h2 className="text-xl font-bold text-[#082b59]">Kirim Pesan</h2>
                <p className="mt-1.5 text-sm text-slate-500">Isi form di bawah ini, kami akan merespons secepat mungkin.</p>

                {status === "success" && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    Pesan berhasil dikirim. Kami akan segera merespons.
                  </div>
                )}
                {status === "error" && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                        placeholder="email@contoh.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Telepon</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                        placeholder="08xxx"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Subjek</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                      placeholder="Perihal pesan"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Pesan *</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full resize-none rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                      placeholder="Tulis pesan Anda..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="rounded-xl bg-[#082b59] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#1767b1] hover:shadow-lg hover:shadow-[#082b59]/20 disabled:opacity-50"
                  >
                    {status === "loading" ? "Mengirim..." : "Kirim Pesan"}
                  </button>
                </form>
              </div>
            </FadeIn>

            {/* Right: Info */}
            <div className="space-y-5">
              {/* Map */}
              <FadeIn direction="left">
                <div className="overflow-hidden rounded-2xl border border-[#dce3ed]">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3947.8!2d113.455!3d-8.1515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd6fb0000000001%3A0x0!2sSMP%20Muhammadiyah%204%20Tanggul!5e0!3m2!1sid!2sid!4v1"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lokasi SMP Muhammadiyah 4 Tanggul"
                  />
                </div>
              </FadeIn>

              {/* Quick Info Cards */}
              <FadeIn direction="left" delay={0.1}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <a
                    href="https://maps.app.goo.gl/v5AwkkHae5poMRWR9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-[#dce3ed] bg-white p-5 transition-all hover:border-[#1767b1]/30 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1] transition-colors group-hover:bg-[#082b59] group-hover:text-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#082b59]">Alamat</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Jl. Pemandian No. 88, Patemon, Tanggul, Jember 68155</p>
                  </a>

                  <a
                    href="https://wa.me/6285852004008"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-[#dce3ed] bg-white p-5 transition-all hover:border-[#1767b1]/30 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1] transition-colors group-hover:bg-[#082b59] group-hover:text-white">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#082b59]">Telepon SPMB</h3>
                    <p className="mt-1 text-xs text-slate-500">0858-5200-4008</p>
                  </a>

                  <a
                    href="mailto:smpm4tangguljember@gmail.com"
                    className="group rounded-2xl border border-[#dce3ed] bg-white p-5 transition-all hover:border-[#1767b1]/30 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1] transition-colors group-hover:bg-[#082b59] group-hover:text-white">
                      <Envelope className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#082b59]">Email</h3>
                    <p className="mt-1 text-xs text-slate-500">smpm4tangguljember@gmail.com</p>
                  </a>

                  <div className="rounded-2xl border border-[#dce3ed] bg-white p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#082b59]">Jam Operasional</h3>
                    <p className="mt-1 text-xs text-slate-500">Senin - Sabtu, 07:00 - 15:00 WIB</p>
                  </div>
                </div>
              </FadeIn>

              {/* Contact Persons */}
              <FadeIn direction="left" delay={0.15}>
                <div className="rounded-2xl border border-[#dce3ed] bg-white p-5">
                  <h3 className="text-sm font-bold text-[#082b59]">Contact Person SPMB</h3>
                  <div className="mt-3 space-y-2.5">
                    {[
                      ["Bu Azizah", "0852-5934-1209"],
                      ["Bu Lusi", "0823-0232-6820"],
                      ["Pak Arif", "0858-0673-8160"],
                    ].map(([name, phone]) => (
                      <div key={name} className="flex items-center justify-between rounded-xl bg-[#f4f7fb] px-4 py-2.5">
                        <span className="text-sm text-slate-600">{name}</span>
                        <a
                          href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1767b1] transition-colors hover:text-[#082b59]"
                        >
                          <WhatsappLogo className="h-4 w-4" weight="fill" />
                          {phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Social Media */}
              <FadeIn direction="left" delay={0.2}>
                <div className="rounded-2xl border border-[#dce3ed] bg-white p-5">
                  <h3 className="text-sm font-bold text-[#082b59]">Ikuti Kami</h3>
                  <div className="mt-3 flex gap-3">
                    {([
                      [InstagramLogo, "https://instagram.com/mbstanggul", "Instagram"],
                      [YoutubeLogo, "https://youtube.com/@MBSTANGGUL", "YouTube"],
                      [FacebookLogo, "https://facebook.com/mbs.tanggul", "Facebook"],
                    ] as [typeof InstagramLogo, string, string][]).map(([Icon, href, label]) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#082b59]/40 transition-all hover:bg-[#082b59] hover:text-white"
                        aria-label={label}
                      >
                        <Icon className="h-5 w-5" weight="fill" />
                      </a>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
