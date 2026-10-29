import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Warning,
  GraduationCap,
  MagnifyingGlass,
} from "@/components/Icons";
import { CSSFadeIn } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import { checkSpmbStatus } from "@/lib/queries/spmb-status";
import { getSchoolProfile } from "@/lib/queries/profile";
import { waLink } from "@/lib/site-config";
import { normalizeName } from "@/lib/format-name";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";
import PrintButton from "./PrintButton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cek Status Pendaftaran",
    description:
      "Cek status pendaftaran dan hasil seleksi SPMB SMP Muhammadiyah 4 Tanggul menggunakan NISN dan tanggal lahir calon murid.",
    alternates: { canonical: "/admission/status" },
    openGraph: pageOpenGraph({
      title: "Cek Status Pendaftaran",
      url: "/admission/status",
      image: await ogImageOverride(),
    }),
  };
}

export const revalidate = 120;

/**
 * Normalisasi input tanggal lahir dari <input type="date"> ("YYYY-MM-DD")
 * → "YYYY-MM-DD" yang valid, atau "" bila tidak valid (kolom date di DB).
 */
function normalizeDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return "";
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return "";
  }
  return `${y}-${mo}-${d}`;
}

/** NISN layak dicari: 1–30 karakter angka/dash (aman untuk RPC). */
function normalizeNisn(value: string): string {
  const nisn = value.trim().replace(/[^0-9-]/g, "").slice(0, 30);
  return nisn;
}

/** ISO → "Senin, 20 Oktober 2026" untuk tampilan. */
function formatDateId(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CekStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ nisn?: string; dob?: string }>;
}) {
  const { nisn: nisnParam, dob: dobParam } = await searchParams;
  const nisn = normalizeNisn(nisnParam || "");
  const dob = normalizeDate(dobParam || "");
  const submitted = nisn.length > 0 && dob !== "";

  // Profil hanya untuk nomor kontak panitia pada pesan hasil.
  const [profile, result] = await Promise.all([
    getSchoolProfile(),
    submitted
      ? checkSpmbStatus(nisn, dob)
      : Promise.resolve(null),
  ]);

  const spmbPhone = profile?.spmb_contact_phone?.trim() || "";
  const waHref = spmbPhone ? `https://wa.me/${waLink(spmbPhone)}` : null;

  // Hasil seleksi hanya ditampilkan bila gelombang pendaftar sudah
  // mempublikasikan hasilnya — sebelum itu accepted/rejected tampil
  // sebagai "Dalam Proses" agar tidak bocor sebelum pengumuman resmi.
  const found = result?.kind === "found" ? result.data : null;
  const showResult =
    found !== null &&
    found.result_published &&
    (found.status === "accepted" || found.status === "rejected");
  const isAccepted = showResult && found?.status === "accepted";

  return (
    <div className="min-h-[70vh] bg-slate-50">
      {/* Hero */}
      <PageHero
        variant="compact"
        title="Cek Status Pendaftaran"
        description="Masukkan NISN dan tanggal lahir sesuai data yang Anda isi saat mendaftar SPMB."
        icon={GraduationCap}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "SPMB", href: "/admission" },
          { label: "Status" },
        ]}
      />

      <section className="mx-auto max-w-2xl px-6 py-10 md:py-14">
        {/* Form pencarian (GET tanpa JS) */}
        <form
          action="/admission/status"
          method="GET"
          className="print:hidden rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm md:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status-nisn" className="mb-1.5 block text-sm font-semibold text-slate-700">
                NISN <span className="text-red-500">*</span>
              </label>
              <input
                id="status-nisn"
                name="nisn"
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                required
                defaultValue={nisn || ""}
                placeholder="10 digit angka"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              />
            </div>
            <div>
              <label htmlFor="status-dob" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <input
                id="status-dob"
                name="dob"
                type="date"
                required
                defaultValue={dob || ""}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-accent)]"
          >
            <MagnifyingGlass className="h-4 w-4" />
            Cek Status
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            Data dipakai hanya untuk mencocokkan pendaftaran Anda dan tidak disimpan oleh halaman ini.
          </p>
        </form>

        {/* Hasil */}
        {submitted && result && (
          <CSSFadeIn>
            <div className="mt-6">
              {result.kind === "unavailable" && (
                <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <Info className="h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-blue-800">Layanan cek status belum aktif</p>
                    <p className="mt-1 text-sm text-blue-700">
                      Fitur ini memerlukan pengaturan database. Silakan coba lagi nanti atau hubungi panitia
                      {waHref ? (
                        <> melalui <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a></>
                      ) : null}
                      .
                    </p>
                  </div>
                </div>
              )}

              {result.kind === "not_found" && (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <Warning className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Data tidak ditemukan</p>
                    <p className="mt-1 text-sm text-amber-700">
                      Pastikan NISN dan tanggal lahir persis seperti yang diisi saat mendaftar. Bila tetap tidak
                      ditemukan
                      {waHref ? (
                        <> silakan hubungi panitia via <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a></>
                      ) : (
                        " silakan hubungi panitia"
                      )}
                      .
                    </p>
                  </div>
                </div>
              )}

              {found && !showResult && (
                <div className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
                  <div className="border-b border-[#dce3ed] bg-[#f4f7fb] px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-accent)]">Data Pendaftaran</p>
                    <h2 className="mt-1 text-lg font-bold text-[var(--brand-primary)]">{normalizeName(found.full_name)}</h2>
                  </div>
                  <dl className="grid gap-x-6 gap-y-3 px-5 py-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Status</dt>
                      <dd className="mt-1 flex items-center gap-1.5 font-semibold text-amber-600">
                        <Clock className="h-4 w-4" />
                        Dalam Proses
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Gelombang</dt>
                      <dd className="mt-1 text-slate-700">{found.wave_name || "Tanpa gelombang"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Tanggal Mendaftar</dt>
                      <dd className="mt-1 text-slate-700">{formatDateId(found.registered_at)}</dd>
                    </div>
                  </dl>
                  {!found.result_published && (
                    <p className="mx-5 mb-5 rounded-xl bg-[#f4f7fb] px-4 py-3 text-xs text-slate-500">
                      {found.doc_total !== null && found.doc_total > 0 ? (
                        <>
                          Berkas terverifikasi: <strong>{found.doc_verified ?? 0}/{found.doc_total}</strong>
                          {found.doc_rejected ? ` · ${found.doc_rejected} ditolak` : ""}
                          {found.doc_pending ? ` · ${found.doc_pending} menunggu` : ""}.{" "}
                        </>
                      ) : null}
                      Hasil seleksi akan tampil di halaman ini setelah pengumuman resmi sesuai jadwal panitia.
                    </p>
                  )}
                </div>
              )}

              {found && showResult && (
                <div className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
                  {isAccepted ? (
                    <div className="border-b-4 border-[var(--brand-accent)] bg-emerald-50 px-5 py-8 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle className="h-8 w-8 text-emerald-600" weight="fill" />
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-emerald-700">Selamat, Anda Dinyatakan LULUS!</h2>
                      <p className="mt-2 text-sm text-emerald-700/80">
                        Anda diterima di SMP Muhammadiyah 4 Tanggul. Silakan lakukan daftar ulang sesuai jadwal
                        yang disampaikan panitia.
                      </p>
                    </div>
                  ) : (
                    <div className="border-b-4 border-[var(--brand-accent)] bg-red-50 px-5 py-8 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="h-8 w-8 text-red-500" weight="fill" />
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-red-700">Belum Lolos Seleksi</h2>
                      <p className="mt-2 text-sm text-red-700/80">
                        Terima kasih telah mendaftar. Jangan berkecil hati, kami menunggu Anda pada kesempatan
                        berikutnya.
                      </p>
                    </div>
                  )}

                  <dl className="grid gap-x-6 gap-y-3 px-5 py-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Nama</dt>
                      <dd className="mt-1 font-semibold text-[var(--brand-primary)]">{normalizeName(found.full_name)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Gelombang</dt>
                      <dd className="mt-1 text-slate-700">{found.wave_name || "Tanpa gelombang"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Tanggal Mendaftar</dt>
                      <dd className="mt-1 text-slate-700">{formatDateId(found.registered_at)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-3 border-t border-[#dce3ed] bg-[#f4f7fb] px-5 py-4">
                    <PrintButton className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]" />
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Hubungi Panitia
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CSSFadeIn>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          Belum mendaftar?{" "}
          <Link href="/admission" className="font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]">
            Lihat jadwal & cara daftar SPMB
          </Link>
        </p>
      </section>
    </div>
  );
}
