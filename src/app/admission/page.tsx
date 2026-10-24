import { FileText, GraduationCap, BookOpen, House, Download, CheckCircle, Trophy, HandCoins, CaretRight } from "@/components/Icons";
import Link from "next/link";
import { CSSFadeIn } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import FaqList from "@/components/public/FaqList";
import { getPublishedWaves, getWaveStatus, getSchoolProfile, registrationHref, getActiveFaqs } from "@/lib/queries";
import { SITE, waLink } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `SPMB Online ${SITE.spmb.academicYear}`,
  description: "Sistem Penerimaan Murid Baru (SPMB) SMP Muhammadiyah 4 Tanggul - jadwal gelombang, jalur pendaftaran, dan cara mendaftar.",
  alternates: { canonical: "/admission" },
  openGraph: {
    title: `SPMB Online ${SITE.spmb.academicYear}`,
    description: "Jadwal gelombang, jalur pendaftaran, dan cara mendaftar SPMB SMP Muhammadiyah 4 Tanggul secara online.",
    url: "/admission",
    type: "website",
  },
};

export const revalidate = 3600;

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]";
const container = "mx-auto max-w-7xl px-6";
const DEFAULT_BROCHURE_URL = "https://www.smpmuh4tanggul.sch.id/info-spmb/";

const waveStatusBadges: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Akan dibuka", cls: "border border-blue-100 bg-blue-50 text-[var(--brand-accent)]" },
  open: { label: "Dibuka", cls: "border border-emerald-100 bg-emerald-50 text-emerald-700" },
  closed: { label: "Ditutup", cls: "border border-slate-200 bg-slate-100 text-slate-500" },
};

/** "YYYY-MM-DD" → "20 Oktober 2026", tanpa geser zona waktu. */
function formatWaveDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Sisa hari sampai tanggal selesai (inklusif), dihitung berdasarkan tanggal WIB. */
function daysLeft(endDate: string): number {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const utc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(endDate) - utc(today)) / 86400000);
}

function SectionHeading({ title, desc, compact }: { title: string; desc?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`${compact ? "mb-5" : "mb-6"} max-w-2xl`}>
      <h2 className={`font-bold text-[var(--brand-primary)] ${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`}>{title}</h2>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-slate-500 md:text-base">{desc}</p>}
    </div>
  );
}

export default async function SPMBPage() {
  const [waves, profile, faqItems] = await Promise.all([
    getPublishedWaves(),
    getSchoolProfile(),
    // FAQ dari tabel `faqs` (scope 'spmb'); null (tabel kosong/error) →
    // section FAQ tidak dirender.
    getActiveFaqs("spmb"),
  ]);
  const spmbFaqItems = faqItems ?? [];
  const registerHref = registrationHref(profile);
  const brochureHref = profile?.spmb_brochure_url || DEFAULT_BROCHURE_URL;
  const offlineFormHref = profile?.spmb_offline_form_url ?? null;
  const spmbPhone = profile?.spmb_contact_phone?.trim() || "";
  const highlightText = profile?.spmb_highlight_text?.trim() || "";
  const accreditation = profile?.accreditation?.trim() || "";

  const openWave = waves.find((w) => getWaveStatus(w) === "open");
  const remaining = openWave ? daysLeft(openWave.end_date) : null;
  const nextUpcomingWave = waves
    .filter((w) => getWaveStatus(w) === "upcoming")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const jalur = [
    { icon: FileText, color: "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]", title: "Jalur Reguler", desc: "Pendaftaran terbuka untuk semua calon murid." },
    { icon: Trophy, color: "bg-[var(--brand-accent)]/25 text-[var(--brand-primary)]", title: "Jalur Prestasi", desc: "Untuk calon murid berprestasi di bidang akademik maupun non-akademik." },
    { icon: HandCoins, color: "bg-emerald-100 text-emerald-700", title: "Jalur Beasiswa", desc: "Untuk calon murid dari keluarga dengan keterbatasan ekonomi." },
  ];

  const alur = [
    { title: "Daftar online", desc: "Isi formulir pendaftaran pada gelombang yang sedang dibuka." },
    { title: "Pengumuman hasil", desc: "Hasil penerimaan diumumkan melalui website sekolah." },
    { title: "Daftar ulang", desc: "Calon murid yang diterima melakukan daftar ulang dan pembayaran sesuai jadwal pada pengumuman." },
  ];

  const program = [
    { icon: House, title: "SMP Boarding", desc: "Program asrama penuh sejak 2018/2019. Siswa dibimbing 24 jam oleh ustadz kompeten.", color: "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" },
    { icon: GraduationCap, title: "SMP Reguler", desc: "Pembelajaran penuh hari (full day) Senin-Sabtu pukul 07.00-15.00, meliputi mapel umum dan keagamaan.", color: "bg-[var(--brand-accent)]/20 text-[var(--brand-primary)]" },
    { icon: BookOpen, title: "SMA Boarding", desc: "Program asrama penuh untuk jenjang SMA dengan kurikulum Tahfidz dan keunggulan akademik.", color: "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" },
  ];

  const alasan = [
    ...(accreditation
      ? [{ icon: CheckCircle, title: `Terakreditasi ${accreditation}`, desc: `Mutu pendidikan sekolah diakui dengan akreditasi ${accreditation}.` }]
      : []),
    { icon: BookOpen, title: "Pembinaan kepesantrenan", desc: "Program kepesantrenan di lingkungan boarding, termasuk tahfidz Al-Qur'an." },
    { icon: House, title: "Dua kampus terpisah", desc: "Kampus putra di Patemon dan kampus putri di Asrama Tahfidz Al-Qur'an Bambu Kuning." },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "SPMB Online", item: "https://www.smpmuh4tanggul.sch.id/admission" },
          ],
        })
      }} />
      {spmbFaqItems.length > 0 && (
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: spmbFaqItems.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })
      }} />
      )}
      {/* Hero — compact */}
      <PageHero
        variant="compact"
        eyebrow="SPMB Online"
        title="Penerimaan Murid Baru"
        description={`Jadwal gelombang, jalur pendaftaran, dan cara mendaftar ${SITE.spmb.academicYear}.`}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "SPMB" }]}
      >
        {registerHref && (
          <Link
            href={registerHref}
            className={`inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-95 ${focusRing}`}
          >
            Daftar Sekarang
          </Link>
        )}
      </PageHero>

      {/* Jadwal */}
      <section id="schedule" className="scroll-mt-28 py-10 md:py-12">
        <div className={container}>
          <CSSFadeIn>
            <SectionHeading compact title="Jadwal Pendaftaran" desc="Pilih gelombang yang sedang dibuka, lalu daftar secara online." />
            <div className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
              {waves.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">Jadwal gelombang pendaftaran akan segera diumumkan.</p>
              ) : (
                <ul className="divide-y divide-[#dce3ed]">
                  {waves.map((wave) => {
                    const status = getWaveStatus(wave);
                    const badge = waveStatusBadges[status] || waveStatusBadges.closed;
                    const isCurrent = wave.id === openWave?.id;
                    return (
                      <li
                        key={wave.id}
                        className={`flex flex-col gap-1 border-l-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${status === "open" ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/[0.04]" : "border-transparent"
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`font-semibold ${status === "closed" ? "text-slate-600" : "text-[var(--brand-primary)]"}`}>{wave.name}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                          </div>
                          {wave.note && <p className={`mt-0.5 text-sm ${status === "closed" ? "text-slate-600" : "text-slate-500"}`}>{wave.note}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                          <p className="text-sm text-slate-600 sm:text-right">
                            <time dateTime={wave.start_date}>{formatWaveDate(wave.start_date)}</time>
                            {" - "}
                            <time dateTime={wave.end_date}>{formatWaveDate(wave.end_date)}</time>
                            {isCurrent && remaining !== null && remaining <= 30 && (
                              <span className="mt-0.5 block text-xs font-semibold text-amber-600">
                                {remaining <= 0 ? "Hari terakhir" : `Tersisa ${remaining} hari`}
                              </span>
                            )}
                          </p>
                          {isCurrent && (
                            <Link
                              href={registerHref}
                              className={`inline-flex w-full items-center justify-center rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-95 sm:w-auto ${focusRing}`}
                            >
                              Daftar Sekarang
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t border-[#dce3ed] bg-[#f6f8fb] px-5 py-3 text-sm text-slate-500">
                Rincian biaya pendidikan, boarding, dan kegiatan ada pada{" "}
                <a
                  href={brochureHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}
                >
                  brosur resmi sekolah
                </a>
                .
              </div>
            </div>

            {/* Cek status: bagi yang sudah mendaftar */}
            <p className="mt-4 text-center text-sm text-slate-500">
              Sudah mendaftar?{" "}
              <Link
                href="/admission/status"
                className={`font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}
              >
                Cek status pendaftaran & hasil seleksi
              </Link>
            </p>
          </CSSFadeIn>
        </div>
      </section>

      {/* Jalur + Alur (satu baris, dua kolom) */}
      <section className="bg-[#f6f8fb] py-10 md:py-12">
        <div className={container}>
          <CSSFadeIn>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              <div>
                <SectionHeading
                  compact
                  title="Jalur Pendaftaran"
                  desc={
                    <>
                      Syarat lengkap tiap jalur ada di{" "}
                      <a
                        href={brochureHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}
                      >
                        brosur resmi sekolah
                      </a>
                      .
                    </>
                  }
                />
                <div className="space-y-3">
                  {jalur.map((j) => (
                    <div key={j.title} className="flex items-start gap-4 rounded-xl border border-[#dce3ed] bg-white p-4 transition-shadow hover:shadow-md">
                      <div className={`${j.color} flex h-10 w-10 shrink-0 items-center justify-center rounded-lg`}>
                        <j.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--brand-primary)]">{j.title}</h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{j.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionHeading compact title="Alur Pendaftaran" desc="Tiga langkah hingga resmi menjadi murid." />
                <ol className="rounded-xl border border-[#dce3ed] bg-white p-5">
                  {alur.map((step, i) => (
                    <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < alur.length - 1 && <span className="absolute left-[17px] top-9 bottom-1 w-px bg-[#dce3ed]" aria-hidden="true" />}
                      <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-bold text-white" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-[var(--brand-primary)]">{step.title}</h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </CSSFadeIn>
        </div>
      </section>

      {/* Program + Mengapa (satu baris, dua kolom) */}
      <section className="py-10 md:py-12">
        <div className={container}>
          <CSSFadeIn>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              <div>
                <SectionHeading compact title="Pilihan Program Pendidikan" desc="Sesuaikan dengan kebutuhan keluarga." />
                <div className="space-y-3">
                  {program.map((item) => (
                    <div key={item.title} className="flex items-start gap-4 rounded-xl border border-[#dce3ed] bg-white p-4 transition-shadow hover:shadow-md">
                      <div className={`${item.color} flex h-10 w-10 shrink-0 items-center justify-center rounded-lg`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--brand-primary)]">{item.title}</h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionHeading compact title="Mengapa SMP Muhammadiyah 4 Tanggul" desc="Di bawah naungan Pimpinan Cabang Muhammadiyah Tanggul." />
                <div className="rounded-xl border border-[#dce3ed] bg-white p-5">
                  <div className="space-y-4">
                    {alasan.map((a) => (
                      <div key={a.title} className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]">
                          <a.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--brand-primary)]">{a.title}</h3>
                          <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {highlightText && (
                    <p className="mt-4 border-t border-[#dce3ed] pt-4 text-sm text-slate-600">
                      {highlightText}{" "}
                      <Link href="/news" className={`whitespace-nowrap font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}>
                        Lihat pengumuman
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CSSFadeIn>
        </div>
      </section>

      {/* FAQ — satu gaya accordion dengan beranda (FaqList); hanya bila ada isinya */}
      {spmbFaqItems.length > 0 && (
      <section className="py-10 md:py-12">
        <div className={container}>
          <CSSFadeIn>
            <SectionHeading compact title="Pertanyaan yang Sering Diajukan" desc="Hal-hal yang paling sering ditanyakan calon murid dan orang tua." />
            <FaqList items={spmbFaqItems} className="mx-auto max-w-3xl" />
            <p className="mt-4 text-center text-sm text-slate-500">
              Masih ada pertanyaan?{" "}
              {spmbPhone ? (
                <a
                  href={`https://wa.me/${waLink(spmbPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}
                >
                  Hubungi Panitia
                </a>
              ) : (
                <Link
                  href="/contact"
                  className={`font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}
                >
                  Hubungi Panitia
                </Link>
              )}
              {" · "}
              <a
                href={brochureHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-semibold text-[var(--brand-accent)] underline underline-offset-4 hover:text-[var(--brand-primary)] ${focusRing}`}
              >
                Brosur resmi sekolah
              </a>
            </p>
          </CSSFadeIn>
        </div>
      </section>
      )}

      {/* CTA penutup (ramping) */}
      <section className="bg-[#f6f8fb] py-10 md:py-12">
        <div className={container}>
          <div className="flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] px-6 py-8 text-white md:flex-row md:px-10">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold md:text-2xl">Siap mendaftarkan putra-putri Anda?</h2>
              <p className="mt-1 text-sm text-white/70">Daftar online hanya beberapa menit. Formulir offline dikumpulkan di {SITE.spmb.submitLocation}.</p>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {openWave ? (
                <Link
                  href={registerHref}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] px-6 py-3 text-sm font-bold text-white transition-colors hover:brightness-95 ${focusRing}`}
                >
                  Daftar Sekarang
                  <CaretRight className="h-4 w-4" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className={`inline-flex cursor-not-allowed select-none items-center justify-center rounded-xl bg-[var(--brand-accent)]/60 px-6 py-3 text-sm font-bold text-white/85 ${focusRing}`}
                >
                  {nextUpcomingWave ? `Dibuka ${formatWaveDate(nextUpcomingWave.start_date)}` : "Pendaftaran belum dibuka"}
                </span>
              )}
              {offlineFormHref && (
                <a
                  href={offlineFormHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`}
                >
                  <Download className="h-4 w-4" />
                  Formulir Offline
                </a>
              )}
              {spmbPhone ? (
                <a href={`https://wa.me/${waLink(spmbPhone)}`} target="_blank" rel="noopener noreferrer" className={`text-sm font-semibold text-white/90 underline underline-offset-4 hover:text-white ${focusRing}`}>
                  Hubungi Panitia
                </a>
              ) : (
                <Link href="/contact" className={`text-sm font-semibold text-white/90 underline underline-offset-4 hover:text-white ${focusRing}`}>
                  Hubungi Panitia
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}