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
 * halus tanpa efek press kuat). Foto/deskripsi/jadwal/pembina hanya tampil
 * bila datanya tersedia; item polos cukup ikon + nama.
 */
export default function EkskulCard({ item }: { item: Ekskul }) {
  const schedule = formatEkskulSchedule(item.schedule_day, item.schedule_time, item.schedule_note);

  return (
    <Link
      href={`/ekskul/${item.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white text-center transition-colors hover:border-[var(--brand-accent)]/40"
    >
      {item.image_url && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f4f7fb]">
          <Image
            src={item.image_url}
            alt={item.image_alt || item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 216px"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] text-white shadow-lg shadow-[var(--brand-primary)]/20">
          <EkskulGlyph slug={item.slug} iconKey={item.icon} />
        </span>
        <h3 className="mt-4 line-clamp-2 text-sm font-semibold leading-snug text-[var(--brand-primary)]">{item.name}</h3>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
        )}

        {schedule && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {schedule}
          </p>
        )}

        {item.coach && (
          <p className="mt-1.5 text-xs text-slate-400">Pembina: {item.coach}</p>
        )}

        <div className="mt-auto pt-5">
          <span className="mx-auto block h-0.5 w-8 rounded-full bg-[var(--brand-highlight)] opacity-40 transition-all duration-300 group-hover:h-1 group-hover:w-12 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}
