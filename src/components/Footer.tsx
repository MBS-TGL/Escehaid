import Link from "next/link";
import { MapPin, Phone, Envelope, MusicNotes, TwitterLogo, ArrowSquareOut, Certificate, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { waLink } from "@/lib/site-config";
import type { SchoolProfile } from "@/lib/supabase";
import type { PublicBrand } from "@/lib/settings";
import BrandLogo from "@/components/BrandLogo";

/** Navigasi dikelompokkan menurut tujuan pengunjung, bukan urutan menu header. */
const NAV_GROUPS: { title: string; links: [href: string, label: string][] }[] = [
  {
    title: "Sekolah",
    links: [
      ["/profile", "Profil sekolah"],
      ["/program", "Program"],
      ["/achievements", "Prestasi"],
      ["/activities", "Kegiatan"],
      ["/gallery", "Galeri"],
    ],
  },
  {
    title: "Informasi",
    links: [
      ["/news", "Berita"],
      ["/articles", "Artikel"],
      ["/downloads", "Unduhan"],
    ],
  },
  {
    title: "Layanan",
    links: [
      ["/admission", "SPMB online"],
      ["/portal", "Portal"],
      ["/contact", "Kontak"],
    ],
  },
];

/** Hapus entri yang halamannya belum ada. */
const LEGAL_LINKS: [href: string, label: string][] = [
  ["/privacy", "Kebijakan privasi"],
  ["/terms", "Syarat dan ketentuan"],
];

const MAIN_SOCIAL = [
  {
    key: "instagram",
    label: "Instagram",
    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    key: "youtube",
    label: "YouTube",
    d: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    key: "facebook",
    label: "Facebook",
    d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
] as const;

/** Ikon sosial tambahan (TikTok/X) memakai Phosphor. */
const EXTRA_SOCIAL = [
  { key: "tiktok", label: "TikTok", Icon: MusicNotes },
  { key: "x", label: "X", Icon: TwitterLogo },
] as const;

/** Draf teks; sesuaikan dengan profil resmi sekolah. */
const DEFAULT_DESCRIPTION =
  "Sekolah menengah pertama Muhammadiyah di Tanggul, Jember, dengan kampus putra dan putri. Kami mengembangkan bakat dan prestasi siswa dengan landasan nilai-nilai Islam.";

const badge =
  "inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs text-white/85";

const linkHover =
  "transition-colors hover:text-[var(--brand-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-highlight)]";

const socialBtn = `flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-white/75 ${linkHover}`;

export default function Footer({
  profile,
  brand,
  description = DEFAULT_DESCRIPTION,
  accreditation,
  npsn,
}: {
  profile: SchoolProfile | null;
  brand: PublicBrand;
  /** Paragraf singkat tentang sekolah (2-3 kalimat). */
  description?: string;
  /** Contoh: 'Terakreditasi "A"'. Kosongkan jika tidak ingin ditampilkan. */
  accreditation?: string;
  /** Contoh: "69982310". Kosongkan jika tidak ingin ditampilkan. */
  npsn?: string;
}) {
  // Nomor WhatsApp: prioritas Pengaturan Situs, lalu nomor panitia SPMB profil sekolah.
  const waNumber = brand.whatsapp.trim() || profile?.spmb_contact_phone?.trim() || "";
  const mapsHref = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const campuses = [
    { label: "Kampus putra", address: brand.address },
    { label: "Kampus putri", address: brand.addressPutri },
  ].filter((c): c is { label: string; address: string } => Boolean(c.address));

  return (
    <footer className="print:hidden bg-[var(--brand-primary)] pb-[calc(env(safe-area-inset-bottom)_+_76px)] text-white md:pb-0">
      <div className="mx-auto max-w-[1296px] px-6 py-10 md:px-10 md:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Identitas */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <BrandLogo src={brand.logo} alt={`Logo ${brand.name}`} className="w-11 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-white">{brand.shortName}</span>
                <span className="text-sm text-white/70">{brand.city}</span>
              </div>
            </div>
            {brand.tagline && <p className="mt-4 text-sm font-medium text-white/85">{brand.tagline}</p>}
            {description && (
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{description}</p>
            )}
            {(accreditation || npsn) && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {accreditation && (
                  <li className={badge}>
                    <Certificate className="h-4 w-4 text-[var(--brand-highlight)]" aria-hidden="true" />
                    Terakreditasi: {accreditation}
                  </li>
                )}
                {npsn && (
                  <li className={badge}>
                    <SealCheck className="h-4 w-4 text-[var(--brand-highlight)]" aria-hidden="true" />
                    NPSN: {npsn}
                  </li>
                )}
              </ul>
            )}
            <ul className="mt-5 flex flex-wrap items-center gap-2">
              {MAIN_SOCIAL.filter(({ key }) => brand.social[key]).map(({ key, label, d }) => (
                <li key={key}>
                  <a href={brand.social[key]} target="_blank" rel="noopener noreferrer" className={socialBtn} aria-label={label}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={d} />
                    </svg>
                  </a>
                </li>
              ))}
              {EXTRA_SOCIAL.filter(({ key }) => brand.social[key]).map(({ key, label, Icon }) => (
                <li key={key}>
                  <a href={brand.social[key]} target="_blank" rel="noopener noreferrer" className={socialBtn} aria-label={label}>
                    <Icon className="h-5 w-5" weight="fill" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigasi: 3 kolom di semua ukuran layar (hemat tinggi di mobile) */}
          <nav aria-label="Navigasi footer" className="grid grid-cols-3 gap-x-4 gap-y-6 sm:gap-x-6 lg:col-span-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                <ul className="mt-3 space-y-2">
                  {group.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className={`text-sm text-white/70 ${linkHover}`}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Lokasi dan kontak */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-semibold text-white">Lokasi dan kontak</h3>
            <ul className="mt-4 grid gap-4">
              {campuses.map(({ label, address }) => (
                <li key={label}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--brand-highlight)]" aria-hidden="true" />
                    <span className="text-sm font-medium text-white">{campuses.length > 1 ? label : "Alamat"}</span>
                  </div>

                  {/* Mobile: seluruh alamat adalah tautan ke Google Maps */}
                  <a
                    href={mapsHref(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-1.5 block text-sm leading-snug text-white/70 md:hidden ${linkHover}`}
                  >
                    <address className="not-italic">{address}</address>
                  </a>

                  {/* Desktop: alamat + tautan eksplisit */}
                  <address className="mt-1.5 hidden text-sm not-italic leading-snug text-white/70 md:block">
                    {address}
                  </address>
                  <a
                    href={mapsHref(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-1.5 hidden w-fit items-center gap-1 text-sm font-medium text-white/85 md:inline-flex ${linkHover}`}
                  >
                    Buka di Google Maps
                    <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <ul className="mt-5 space-y-2.5">
              {waNumber && (
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--brand-highlight)]" aria-hidden="true" />
                  <a
                    href={`https://wa.me/${waLink(waNumber)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm text-white/70 ${linkHover}`}
                  >
                    {waNumber} <span className="text-white/50">(WhatsApp)</span>
                  </a>
                </li>
              )}
              {brand.email && (
                <li className="flex items-center gap-3">
                  <Envelope className="h-4 w-4 shrink-0 text-[var(--brand-highlight)]" aria-hidden="true" />
                  <a href={`mailto:${brand.email}`} className={`text-sm text-white/70 ${linkHover}`}>
                    {brand.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Kiri: copyright. Kanan: tautan legal. */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1296px] flex-col gap-2 px-6 py-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between md:px-10 md:pr-20">
          <p>
            &copy; {new Date().getFullYear()} {brand.name}. {brand.copyright}
          </p>
          {LEGAL_LINKS.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {LEGAL_LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className={linkHover}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
