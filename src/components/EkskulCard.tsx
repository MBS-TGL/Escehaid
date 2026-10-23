import Image from "next/image";
import Link from "next/link";
import { Clock } from "./Icons";
import EkskulGlyph from "./EkskulIcon";
import { formatEkskulSchedule } from "@/app/ekskul-data";
import type { Ekskul } from "@/lib/supabase";

/**
 * Kartu ekskul bersama (beranda & halaman Profil). Data dari tabel
 * `public.ekskuls` (panel admin /admin/ekskul). Klik → halaman detail
 * `/ekskul/[slug]` (ikon + nama + jadwal + pembina tampil; hover tetap
 * halus tanpa efek press kuat).
 *
 * Perubahan: slot gambar selalu dirender (aspect-[4/3]) agar semua
 * kartu punya tinggi yang sama di grid. Bila ekskul belum punya foto,
 * ditampilkan placeholder gradient dengan ikon besar di tengah.
 */
export default function EkskulCard({ item }: { item: Ekskul }) {
  const schedule = formatEkskulSchedule(item.schedule_day, item.schedule_time, item.schedule_note);

  return (
    <Link
      href={`/ekskul/${item.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white text-center transition-colors hover:border-[var(--brand-accent)]/40"
    >
      {/* ── Slot gambar — selalu ada agar tinggi kartu seragam ── */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)]">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.image_alt || item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Placeholder: ikon besar di tengah area gradient */
          <span className="absolute inset-0 flex items-center justify-center opacity-25">
            <EkskulGlyph slug={item.slug} iconKey={item.icon} className="h-16 w-16 text-white" />
          </span>
        )}
      </div>

      {/* ── Konten teks ── */}
      <div className="flex flex-1 flex-col items-center px-3 pt-4 pb-4 sm:px-4">
        {/* Ikon kecil branded — selalu tampil */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] text-white shadow-lg shadow-[var(--brand-primary)]/20">
          <EkskulGlyph slug={item.slug} iconKey={item.icon} />
        </span>

        <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-[var(--brand-primary)]">{item.name}</h3>

        {schedule && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {schedule}
          </p>
        )}

        {item.coach && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-400">Pembina: {item.coach}</p>
        )}

        <div className="mt-auto pt-4">
          <span className="mx-auto block h-0.5 w-8 rounded-full bg-[var(--brand-highlight)] opacity-40 transition-all duration-300 group-hover:h-1 group-hover:w-12 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}
