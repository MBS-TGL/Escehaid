import Link from "next/link";
import type { ComponentType } from "react";
import { CSSFadeIn } from "@/components/CSSAnimations";

/**
 * Empty state publik — mengganti blok ikon-orang-tapi-tengah yang ditulis
 * manual di ~10 halaman. Kondisi (kosong / hasil pencarian / kategori / halaman
 * lewat) perlu logika halaman yang mengisi teksnya.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ComponentType<{ className?: string; weight?: "fill" | "regular" }>;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  /** true → tanpa kartu, cukup blok tengah (dipakai di kolom sempit). */
  compact?: boolean;
}) {
  return (
    <CSSFadeIn>
      <div
        className={compact
          ? "flex flex-col items-center py-14 text-center"
          : "flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm"}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" weight="fill" />
        </div>
        <p className="mt-4 text-base font-semibold text-slate-600">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>}
        {action && (
          <Link
            href={action.href}
            className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
          >
            {action.label}
          </Link>
        )}
      </div>
    </CSSFadeIn>
  );
}
