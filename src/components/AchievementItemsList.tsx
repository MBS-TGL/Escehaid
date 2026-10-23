"use client";

import { Trophy, Medal } from "@/components/Icons";
import {
  parseAchievementDescription,
  type MedalType,
} from "@/lib/achievement-parser";

const medalColors: Record<MedalType, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  gold: {
    bg: "bg-amber-50/70",
    border: "border-amber-200/80",
    text: "text-amber-900",
    badge: "bg-amber-400 text-amber-950",
    icon: "text-amber-500",
  },
  silver: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-800",
    badge: "bg-slate-300 text-slate-800",
    icon: "text-slate-400",
  },
  bronze: {
    bg: "bg-orange-50/60",
    border: "border-orange-200/70",
    text: "text-orange-900",
    badge: "bg-orange-300 text-orange-950",
    icon: "text-orange-500",
  },
  award: {
    bg: "bg-sky-50/60",
    border: "border-sky-200/70",
    text: "text-sky-900",
    badge: "bg-sky-200 text-sky-900",
    icon: "text-sky-500",
  },
  general: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    icon: "text-slate-400",
  },
};

/**
 * Tampilan detail lengkap di Modal / Detail Prestasi
 */
export function AchievementItemsDetail({ description }: { description?: string | null }) {
  const parsed = parseAchievementDescription(description);

  if (!parsed.rawText) return null;

  if (!parsed.hasItems) {
    // Paragraf biasa dengan preserving linebreaks
    return (
      <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
        {parsed.rawText}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {parsed.introText && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {parsed.introText}
        </p>
      )}

      {/* Box Rincian Kejuaraan */}
      <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" weight="fill" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
              Rincian Perolehan Kejuaraan
            </h4>
          </div>
          <span className="rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
            {parsed.items.length} Prestasi
          </span>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {parsed.items.map((item, idx) => {
            const style = medalColors[item.medalType];
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${style.bg} my-1 border ${style.border}`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs">
                  <Medal className={`h-4 w-4 ${style.icon}`} weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs sm:text-sm font-bold leading-snug ${style.text}`}>
                    {item.text}
                  </p>
                </div>
                {item.number && (
                  <span className="shrink-0 text-[10px] font-mono font-semibold text-slate-400">
                    #{item.number}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Tampilan ringkas di Card Prestasi
 */
export function AchievementItemsCardPreview({ description }: { description?: string | null }) {
  const parsed = parseAchievementDescription(description);

  if (!parsed.rawText) return null;

  if (!parsed.hasItems) {
    return (
      <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">
        {parsed.rawText}
      </p>
    );
  }

  const previewItems = parsed.items.slice(0, 2);
  const remainingCount = parsed.items.length - previewItems.length;

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-800">
          <Trophy className="h-3 w-3 text-amber-600" weight="fill" />
          {parsed.items.length} Gelar Juara
        </span>
      </div>

      <div className="space-y-1">
        {previewItems.map((item, idx) => {
          const style = medalColors[item.medalType];
          return (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600 line-clamp-1">
              <Medal className={`h-3.5 w-3.5 shrink-0 ${style.icon}`} weight="fill" />
              <span className="truncate font-medium">{item.text}</span>
            </div>
          );
        })}
      </div>

      {remainingCount > 0 && (
        <p className="text-[11px] font-semibold text-[var(--brand-accent)]">
          +{remainingCount} kejuaraan lainnya...
        </p>
      )}
    </div>
  );
}
