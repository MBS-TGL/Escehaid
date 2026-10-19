import Image from "next/image";
import { Clock, MicrophoneStage, PingPong, SoccerBall, Target, Tent, Trophy } from "./Icons";
import type { Ekskul } from "@/app/ekskul-data";

/**
 * Ikon per ekskul — hanya pemetaan tampilan (bukan data), dipilih dari ikon
 * Phosphor yang sudah tersedia lewat src/components/Icons. Fallback: Trophy.
 */
const EKSKUL_ICONS: Record<string, React.ElementType> = {
  "sepak-bola": SoccerBall,
  futsal: SoccerBall,
  "bulu-tangkis": PingPong,
  "hizbul-wathan": Tent,
  panahan: Target,
  qiroah: MicrophoneStage,
};

/**
 * Kartu ekskul bersama (beranda & halaman Profil). Bukan link/tombol: tanpa
 * cursor-pointer maupun efek press. Foto/deskripsi/jadwal hanya tampil bila
 * datanya tersedia; item tanpa data cukup menampilkan ikon + nama.
 */
export default function EkskulCard({ item }: { item: Ekskul }) {
  const Icon = EKSKUL_ICONS[item.slug] || Trophy;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white text-center transition-colors hover:border-[var(--brand-accent)]/40">
      {item.imageUrl && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f4f7fb]">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 216px"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] text-white shadow-lg shadow-[var(--brand-primary)]/20">
          <Icon weight="fill" className="h-5 w-5" />
        </span>
        <h3 className="mt-4 line-clamp-2 text-sm font-semibold leading-snug text-[var(--brand-primary)]">{item.name}</h3>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
        )}

        {item.schedule && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {item.schedule}
          </p>
        )}

        <div className="mt-auto pt-5">
          <span className="mx-auto block h-0.5 w-8 rounded-full bg-[var(--brand-highlight)] opacity-40 transition-all duration-300 group-hover:h-1 group-hover:w-12 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
}
