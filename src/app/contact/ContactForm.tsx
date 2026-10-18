"use client";

import { useState } from "react";
import { submitContactMessage } from "@/lib/queries";
import { MapPin, Envelope, Clock, WhatsappLogo, InstagramLogo, YoutubeLogo, FacebookLogo, TwitterLogo, MusicNotes } from "@/components/Icons";
import { CSSFadeIn } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import type { PublicBrand } from "@/lib/settings";

export default function ContactForm({ brand }: { brand: PublicBrand }) {
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
      {/* Hero */}
      <PageHero
        variant="compact"
        title="Hubungi Kami"
        description="Kami siap membantu Anda. Kirim pesan atau hubungi langsung."
        icon={MapPin}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Kontak" }]}
      />

      {/* Main Content */}
      <section className="bg-[#f4f7fb]" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: Form */}
            <CSSFadeIn>
              <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm md:p-8">
                <h2 className="text-xl font-bold text-[var(--brand-primary)]">Kirim Pesan</h2>
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
                    <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                        placeholder="email@contoh.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">Telepon</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                        placeholder="08xxx"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">Subjek</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                      placeholder="Perihal pesan"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">Pesan *</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full resize-none rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                      placeholder="Tulis pesan Anda..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 disabled:opacity-50"
                  >
                    {status === "loading" ? "Mengirim..." : "Kirim Pesan"}
                  </button>
                </form>
              </div>
            </CSSFadeIn>

            {/* Right: Info */}
            <div className="space-y-5">
              {/* Map */}
              <CSSFadeIn>
                <div className="overflow-hidden rounded-2xl border border-[#dce3ed]">
                  <iframe
                    src="https://www.google.com/maps?q=-8.1519069,113.4547709&z=16&output=embed"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lokasi SMP Muhammadiyah 4 Tanggul"
                  />
                </div>
              </CSSFadeIn>

              {/* Quick Info */}
              <CSSFadeIn delay={0.1}>
                <div className="rounded-2xl border border-[#dce3ed] bg-white p-5">
                  <h3 className="text-sm font-bold text-[var(--brand-primary)]">Informasi Sekolah</h3>
                  <div className="mt-3 space-y-2.5">
                    <a href="https://www.google.com/maps/search/?api=1&query=MBS+TANGGUL+JEMBER&query_place_id=ChIJ4U5j9O2L1i0RHVhDHWhtwi8" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-[#f4f7fb] px-4 py-2.5 transition-colors hover:bg-[var(--brand-primary)]/5">
                      <MapPin className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Alamat</p>
                        <p className="truncate text-sm text-slate-600">{brand.address}</p>
                      </div>
                    </a>
                    <a href={`mailto:${brand.email}`}
                      className="flex items-center gap-3 rounded-xl bg-[#f4f7fb] px-4 py-2.5 transition-colors hover:bg-[var(--brand-primary)]/5">
                      <Envelope className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                        <p className="truncate text-sm text-slate-600">{brand.email}</p>
                      </div>
                    </a>
                    <div className="flex items-center gap-3 rounded-xl bg-[#f4f7fb] px-4 py-2.5">
                      <Clock className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Jam Operasional</p>
                        <p className="text-sm text-slate-600">Senin - Sabtu, 07:00 - 15:00 WIB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CSSFadeIn>

              {/* Contact Persons */}
              <CSSFadeIn delay={0.15}>
                <div className="rounded-2xl border border-[#dce3ed] bg-white p-5">
                  <h3 className="text-sm font-bold text-[var(--brand-primary)]">Contact Person SPMB</h3>
                  <div className="mt-3 space-y-2.5">
                    {[
                      ["Ustadzah Azizah", "6285259341209", "0852-5934-1209"],
                      ["Ustadzah Lusi", "6282302326820", "0823-0232-6820"],
                      ["Ustadz Arif", "6285806738160", "0858-0673-8160"],
                    ].map(([name, wa, display]) => (
                      <div key={name} className="flex items-center justify-between rounded-xl bg-[#f4f7fb] px-4 py-2.5">
                        <span className="text-sm text-slate-600">{name}</span>
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]"
                        >
                          <WhatsappLogo className="h-4 w-4" weight="fill" />
                          {display}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </CSSFadeIn>

              {/* Social Media */}
              <CSSFadeIn delay={0.2}>
                <div className="rounded-2xl border border-[#dce3ed] bg-white p-5">
                  <h3 className="text-sm font-bold text-[var(--brand-primary)]">Ikuti Kami</h3>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {([
                      [InstagramLogo, brand.social.instagram, "Instagram"],
                      [YoutubeLogo, brand.social.youtube, "YouTube"],
                      [FacebookLogo, brand.social.facebook, "Facebook"],
                      [MusicNotes, brand.social.tiktok, "TikTok"],
                      [TwitterLogo, brand.social.x, "X"],
                    ] as [typeof InstagramLogo, string, string][])
                      // Tautan kosong / tidak valid disembunyikan otomatis.
                      .filter(([, href]) => /^https?:\/\//.test(href))
                      .map(([Icon, href, label]) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]/40 transition-all hover:bg-[var(--brand-primary)] hover:text-white"
                          aria-label={label}
                        >
                          <Icon className="h-5 w-5" weight="fill" />
                        </a>
                      ))}
                  </div>
                </div>
              </CSSFadeIn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
