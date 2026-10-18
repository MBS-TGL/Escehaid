"use client";

import { parseVideoUrl, videoProviderLabel } from "@/lib/video-embed";
import { InstagramLogo, YoutubeLogo, Video, Cloud } from "@/components/Icons";

/**
 * Field "URL Video (opsional)" admin — dipakai Berita, Artikel, Kegiatan, dan
 * Prestasi: input tautan + chip penyedia hasil deteksi. PENYIMPANAN hanya URL
 * (teks) — video tetap berada di platform asal, tidak membebani Storage.
 */

type IconType = typeof Video;

export const VIDEO_PROVIDER_ICON: Record<string, IconType> = {
  youtube: YoutubeLogo,
  instagram: InstagramLogo,
  vimeo: Video,
  googledrive: Cloud,
  tiktok: Video,
  unknown: Video,
};

/** Chip kecil penyedia terdeteksi dari URL video (admin form & modal lihat). */
export function VideoProviderChip({ url, className = "" }: { url: string; className?: string }) {
  const parsed = parseVideoUrl(url);
  const Icon = VIDEO_PROVIDER_ICON[parsed.provider] ?? Video;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {videoProviderLabel(parsed)}
    </span>
  );
}

interface VideoUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  /** Teks bantuan tambahan di bawah input (mengganti bawaan bila diisi). */
  hint?: string | null;
}

export default function VideoUrlField({ value, onChange, disabled = false, id, hint }: VideoUrlFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        URL Video (opsional)
      </label>
      <input
        id={id}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-xl border px-4 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 ${
          value.trim() && !/^https?:\/\//i.test(value.trim())
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-slate-200 focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/20"
        }`}
        placeholder="https://youtube.com/watch?v=..."
      />
      <p className="mt-1.5 text-xs text-slate-400">
        {hint ?? "Tautan YouTube, Instagram, TikTok, Vimeo, atau Google Drive dapat diputar langsung di halaman (click-to-load). Platform lain tampil sebagai tombol \u201CTonton di \u2026\u201D."}
      </p>
      {value.trim() && <VideoProviderChip url={value} className="mt-2" />}
    </div>
  );
}
