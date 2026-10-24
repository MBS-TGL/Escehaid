import type { ReactNode } from "react";
import { tokenizeSearch } from "@/lib/queries/shared";

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

/**
 * Murni (tanpa regex — input pengguna tidak masuk RegExp): pecah `text`
 * menjadi segmen { text, matched } untuk tiap bagian yang memuat SALAH SATU
 * token pencarian (case-insensitive). Token yang lebih panjang menang bila
 * tumpang tindih pada posisi yang sama. Segmen dirender oleh React — TIDAK
 * memakai dangerouslySetInnerHTML.
 */
export function splitHighlight(text: string, tokens: string[]): HighlightSegment[] {
  if (!text) return [];
  const unique = [...new Set(tokens.map((token) => token.trim().toLowerCase()).filter(Boolean))];

  const segments: HighlightSegment[] = [];
  let rest = text;
  while (rest.length) {
    const lower = rest.toLowerCase();
    let bestIdx = -1;
    let bestLen = 0;
    for (const token of unique) {
      const idx = lower.indexOf(token);
      if (idx === -1) continue;
      if (
        bestIdx === -1 ||
        idx < bestIdx ||
        (idx === bestIdx && token.length > bestLen)
      ) {
        bestIdx = idx;
        bestLen = token.length;
      }
    }
    if (bestIdx === -1) {
      segments.push({ text: rest, matched: false });
      break;
    }
    if (bestIdx > 0) segments.push({ text: rest.slice(0, bestIdx), matched: false });
    segments.push({ text: rest.slice(bestIdx, bestIdx + bestLen), matched: true });
    rest = rest.slice(bestIdx + bestLen);
  }
  return segments;
}

/**
 * Tandai bagian teks yang cocok dengan token pencarian (case-insensitive,
 * multi-token sesuai perilaku pencarian). Tanpa dependensi/regex — dipakai di
 * judul & cuplikan hasil pencarian overlay maupun halaman /search.
 */
export default function Highlight({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}): ReactNode {
  const segments = splitHighlight(text, tokenizeSearch(query));
  if (!segments.length) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.matched ? (
          <mark
            key={i}
            className="rounded-[3px] bg-[var(--brand-accent)]/35 px-0.5 text-inherit"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </span>
  );
}
