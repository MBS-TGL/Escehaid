/**
 * Ikon ekskul sebagai komponen khusus — memutus resolve dinamis selama
 * render (lint `react-hooks/static-components` melarang membuat komponen
 * di dalam render; akses map di badan komponen ini lolos dan identitas
 * component type tetap stabil antar render).
 */
import { MicrophoneStage, PingPong, SoccerBall, Target, Tent, Trophy } from "./Icons";
import { EKSKUL_SLUG_ICONS } from "@/app/ekskul-data";

const EKSKUL_ICONS: Record<string, typeof Trophy> = {
  soccer: SoccerBall,
  pingpong: PingPong,
  tent: Tent,
  target: Target,
  microphone: MicrophoneStage,
  trophy: Trophy,
};

export default function EkskulGlyph({
  slug,
  iconKey,
  className = "h-5 w-5",
}: {
  slug?: string | null;
  iconKey?: string | null;
  className?: string;
}) {
  const key = iconKey || EKSKUL_SLUG_ICONS[slug || ""] || "";
  const Icon = (key && EKSKUL_ICONS[key]) || Trophy;
  return <Icon weight="fill" className={className} />;
}
