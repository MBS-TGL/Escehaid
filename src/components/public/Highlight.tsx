import type { ReactNode } from "react";

/** Hindari karakter regex dari input pengguna (bukan security, sekedar aman). */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tandai bagian teks yang cocok dengan kata kunci pencarian (case-insensitive).
 * Tanpa JS tambahan — dipakai di hasil pencarian agar istilah yang dicari
 * terlihat langsung di judul & cuplikan.
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
  const term = query.trim();
  if (!term) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-[3px] bg-[var(--brand-accent)]/35 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
