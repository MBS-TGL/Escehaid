import type { ReactNode } from "react";

/**
 * Komposisi geometris-editorial untuk hero publik — pengganti foto, murni SVG
 * inline (tanpa berkas gambar, tanpa dependensi). Semua warna lewat
 * `var(--brand-*)` sehingga ikut tema yang diubah admin.
 *
 * Tiap halaman punya komposisi khas supaya tak ada dua hero yang sama:
 *   berita   → pita diagonal (lipatan koran) + titik + lingkar
 *   artikel  → busur konsentris (riak gagasan) + kolom teks
 *   kegiatan → mosaik kotak/lingkaran (grid agenda)
 *   ppdb     → arch bertingkat (gerbang) + pancaran
 *   profil   → cincin konsentris (orbit) + titik + arch kecil
 *
 * Dua varian latar: komposisi di atas kertas putih (hero "split") memakai
 * primary+accent transparan; komposisi di atas latar gelap (hero "photo")
 * memakai accent+putih agar tetap kontras.
 */

export type HeroGraphicName = "berita" | "artikel" | "kegiatan" | "ppdb" | "profil";

function Frame({
  viewBox,
  className = "",
  children,
}: {
  viewBox: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ── Hero split (latar terang) ─────────────────────────────────────── */

function Berita({ className }: { className?: string }) {
  return (
    <Frame viewBox="0 0 640 320" className={className}>
      <defs>
        <pattern
          id="hgBeritaStripes"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="11" height="26" fill="var(--brand-accent)" opacity="0.16" />
        </pattern>
        <pattern id="hgBeritaDots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="2.2" fill="var(--brand-primary)" opacity="0.28" />
        </pattern>
      </defs>
      <rect width="640" height="320" fill="url(#hgBeritaStripes)" />
      <rect x="0" y="160" width="210" height="160" fill="url(#hgBeritaDots)" />
      <circle cx="120" cy="62" r="58" stroke="var(--brand-accent)" strokeWidth="12" opacity="0.5" />
      <path
        d="M640 320 V170 A150 150 0 0 0 490 320 Z"
        fill="var(--brand-accent)"
        opacity="0.9"
      />
    </Frame>
  );
}

function Artikel({ className }: { className?: string }) {
  return (
    <Frame viewBox="0 0 640 320" className={className}>
      <defs>
        <pattern id="hgArtikelDots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="2" fill="var(--brand-primary)" opacity="0.14" />
        </pattern>
      </defs>
      <rect width="640" height="320" fill="url(#hgArtikelDots)" />
      <g fill="var(--brand-primary)" opacity="0.08">
        <rect x="470" y="34" width="34" height="252" rx="10" />
        <rect x="520" y="34" width="34" height="252" rx="10" />
        <rect x="570" y="34" width="34" height="252" rx="10" />
      </g>
      <g stroke="var(--brand-accent)" fill="none">
        <circle cx="86" cy="308" r="66" strokeWidth="14" opacity="0.9" />
        <circle cx="86" cy="308" r="116" strokeWidth="14" opacity="0.55" />
        <circle cx="86" cy="308" r="166" strokeWidth="14" opacity="0.3" />
        <circle cx="86" cy="308" r="216" strokeWidth="14" opacity="0.14" />
      </g>
      <circle cx="86" cy="308" r="15" fill="var(--brand-accent)" />
    </Frame>
  );
}

function Kegiatan({ className }: { className?: string }) {
  return (
    <Frame viewBox="0 0 640 320" className={className}>
      <defs>
        <pattern id="hgKegiatanDots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.8" fill="var(--brand-primary)" opacity="0.16" />
        </pattern>
      </defs>
      <rect width="640" height="320" fill="url(#hgKegiatanDots)" />
      <rect x="54" y="54" width="92" height="92" rx="20" fill="var(--brand-accent)" opacity="0.9" />
      <rect
        x="166"
        y="54"
        width="92"
        height="92"
        rx="20"
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="11"
        opacity="0.3"
      />
      <circle cx="356" cy="100" r="48" fill="var(--brand-primary)" opacity="0.85" />
      <rect x="446" y="54" width="140" height="92" rx="20" fill="var(--brand-accent)" opacity="0.25" />
      <rect x="54" y="166" width="92" height="92" rx="20" fill="none" stroke="var(--brand-accent)" strokeWidth="11" opacity="0.5" />
      <circle cx="212" cy="212" r="48" fill="var(--brand-accent)" opacity="0.35" />
      <rect x="300" y="166" width="92" height="92" rx="20" fill="var(--brand-primary)" opacity="0.16" />
      <circle cx="504" cy="212" r="48" fill="var(--brand-accent)" opacity="0.8" />
    </Frame>
  );
}

/* ── Hero photo (latar gelap) — accent + putih ─────────────────────── */

function PPDB({ className }: { className?: string }) {
  const rays = Array.from({ length: 9 }, (_, i) => -92 + i * 9);
  return (
    <Frame viewBox="0 0 1200 400" className={className}>
      <g transform="translate(0 400)" fill="#fff" opacity="0.14">
        {rays.map((a) => (
          <path key={a} d="M0 0 L540 -15 L540 15 Z" transform={`rotate(${a})`} />
        ))}
      </g>
      <g fill="none" stroke="var(--brand-accent)">
        <path d="M700 400 V232 A118 118 0 0 1 936 232 V400" strokeWidth="14" opacity="0.9" />
        <path d="M642 400 V216 A176 176 0 0 1 994 216 V400" strokeWidth="14" opacity="0.5" />
        <path d="M584 400 V200 A234 234 0 0 1 1052 200 V400" strokeWidth="14" opacity="0.25" />
      </g>
      <circle cx="818" cy="214" r="18" fill="var(--brand-accent)" opacity="0.9" />
    </Frame>
  );
}

function Profil({ className }: { className?: string }) {
  return (
    <Frame viewBox="0 0 1200 400" className={className}>
      <defs>
        <pattern id="hgProfilDots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="2" fill="#fff" opacity="0.2" />
        </pattern>
      </defs>
      <rect x="70" y="90" width="230" height="230" fill="url(#hgProfilDots)" />
      <g fill="none" stroke="var(--brand-accent)">
        <circle cx="950" cy="200" r="62" strokeWidth="13" opacity="0.95" />
        <circle cx="950" cy="200" r="112" strokeWidth="13" opacity="0.6" />
        <circle cx="950" cy="200" r="162" strokeWidth="13" opacity="0.36" />
        <circle cx="950" cy="200" r="212" strokeWidth="13" opacity="0.18" />
      </g>
      <circle cx="950" cy="200" r="26" fill="var(--brand-accent)" />
      <path
        d="M392 400 V300 A52 52 0 0 1 496 300 V400"
        fill="none"
        stroke="var(--brand-accent)"
        strokeWidth="12"
        opacity="0.4"
      />
    </Frame>
  );
}

const GRAPHICS: Record<HeroGraphicName, (p: { className?: string }) => ReactNode> = {
  berita: Berita,
  artikel: Artikel,
  kegiatan: Kegiatan,
  ppdb: PPDB,
  profil: Profil,
};

export default function HeroGraphic({
  name,
  className = "",
}: {
  name: HeroGraphicName;
  className?: string;
}) {
  const Graphic = GRAPHICS[name];
  return <>{Graphic({ className })}</>;
}
