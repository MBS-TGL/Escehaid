import Link from "next/link";
import { CaretLeft, CaretRight } from "@/components/Icons";
import { CSSFadeIn } from "@/components/CSSAnimations";

/**
 * Pagination bernomor dengan elipsis — satu sumber kebenaran untuk
 * /news, /articles, /activities (sebelumnya diduplikasi inline 3×).
 *
 * `makeHref` menyusun URL untuk mempertahankan ?search/?category aktif.
 */
export default function Pagination({
  page,
  totalPages,
  total,
  unit = "artikel",
  makeHref,
  className = "",
}: {
  page: number;
  totalPages: number;
  total?: number;
  unit?: string;
  makeHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <CSSFadeIn delay={150} className={className}>
      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-400">
          Halaman {page} dari {totalPages}
          {total !== undefined ? ` · ${total} ${unit}` : ""}
        </p>
        <div className="flex items-center gap-1">
          <Link
            href={makeHref(Math.max(1, page - 1))}
            aria-label="Halaman sebelumnya"
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${
              page === 1
                ? "pointer-events-none border-slate-100 text-slate-300"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CaretLeft className="h-4 w-4" />
          </Link>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-slate-400">…</span>
              ) : (
                <Link
                  key={p}
                  href={makeHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    p === page
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </Link>
              )
            )}
          <Link
            href={makeHref(Math.min(totalPages, page + 1))}
            aria-label="Halaman berikutnya"
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${
              page === totalPages
                ? "pointer-events-none border-slate-100 text-slate-300"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CaretRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </CSSFadeIn>
  );
}
