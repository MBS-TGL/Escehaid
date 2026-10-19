import Link from "next/link";
import { CSSFadeIn } from "@/components/CSSAnimations";
import { CaretRight } from "@/components/Icons";

/**
 * Heading seksi yang konsisten: garis aksen + judul + deskripsi opsional
 * + tautan "Lihat semua" opsional di kanan.
 */
export default function SectionHeading({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <CSSFadeIn className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <div aria-hidden="true" className="mb-3 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
        <h2 className="text-2xl font-black tracking-tight text-[var(--brand-primary)] md:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]"
        >
          {action.label}
          <CaretRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </CSSFadeIn>
  );
}
