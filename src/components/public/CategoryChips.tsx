import Link from "next/link";

export type CategoryChip = { key: string; label: string; href: string; active: boolean };

/**
 * Chip kategori (satu gaya kanonik untuk /news, /articles, /activities, /gallery).
 * Tanpa JS — tiap chip adalah tautan GET. Dipakai `FilterBar` maupun halaman
 * yang hanya butuh filter tanpa kotak pencarian.
 */
export default function CategoryChips({
  chips,
  label = "Filter kategori",
  className = "",
}: {
  chips: CategoryChip[];
  label?: string;
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <nav aria-label={label} className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chips.map((c) => (
        <Link
          key={c.key || "all"}
          href={c.href}
          aria-current={c.active ? "page" : undefined}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            c.active
              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}
