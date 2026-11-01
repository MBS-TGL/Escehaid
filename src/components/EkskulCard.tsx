import Image from "next/image";
import Link from "next/link";
import { Clock } from "./Icons";
import EkskulGlyph from "./EkskulIcon";
import { formatEkskulSchedule } from "@/app/ekskul-data";
import type { Ekskul } from "@/lib/supabase";

/**
 * Kartu ekskul halaman Profil (grid statis). Data dari tabel
 * `public.ekskuls` (panel admin /admin/ekskul). Klik → halaman detail
 * `/ekskul/[slug]`.
 *
 * Bahasa visual disamakan dengan kartu carousel beranda
 * (`EkskulCarousel`): foto full-card portrait 9:16 + scrim sinematik +
 * teks overlay (nama + jadwal + pembina). Bila belum ada foto →
 * placeholder gradient + ikon besar.
 */
export default function EkskulCard({ item }: { item: Ekskul }) {
  const schedule = formatEkskulSchedule(item.schedule_day, item.schedule_time, item.schedule_note);

  return (
    <Link
      href={`/ekskul/${item.slug}`}
      className="group relative block h-full aspect-[9/16] overflow-hidden rounded-2xl bg-[var(--brand-primary)] shadow-md transition-shadow duration-500 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
    >
      {/* Foto portrait 9:16 atau placeholder gradient */}
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.image_alt || item.name}
          fill
          sizes="(max-width: 640px) 44vw, (max-width: 1024px) 23vw, (max-width: 1336px) 19vw, 234px"
          className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[var(--brand-primary-light)] via-[var(--brand-primary)] to-[var(--brand-primary)]">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--brand-highlight)] blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[var(--brand-accent)] blur-3xl" />
          </div>
          <span className="relative z-10 opacity-30">
            <EkskulGlyph slug={item.slug} iconKey={item.icon} className="h-20 w-20 text-white" />
          </span>
        </div>
      )}

      {/* Cinematic scrim gradient bawah — panjang 2/3 karena foto portrait */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--brand-primary)] via-[var(--brand-primary)]/60 to-transparent" />

      {/* Badge ikon ekskul di pojok kiri atas */}
      <div className="absolute left-2.5 top-2.5 z-10">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-sm transition-transform duration-300 group-hover:scale-110">
          <EkskulGlyph slug={item.slug} iconKey={item.icon} className="h-4 w-4" />
        </span>
      </div>

      {/* Teks nama + jadwal + pembina di bawah */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
        <h3
          className="line-clamp-2 text-sm font-semibold leading-tight text-white drop-shadow-sm"
          title={item.name}
        >
          {item.name}
        </h3>
        {schedule && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/70">
            <Clock className="h-3 w-3 shrink-0" />
            {schedule}
          </p>
        )}
        {item.coach && (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-white/60">
            {item.coach}
          </p>
        )}
      </div>
    </Link>
  );
}
