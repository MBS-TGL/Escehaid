/**
 * Kartu "Cyka" (InsightCard) & baris insight — komponen server-component (tanpa
 * client state) supaya dipakai langsung dari section async di /admin/analytics
 * sebagai bagian dari stream.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/Icons";

type InsightTone = "info" | "ok" | "warn" | "idle";

const TONE_STYLES: Record<InsightTone, string> = {
  info: "border-blue-200 bg-blue-50/60",
  ok: "border-emerald-200 bg-emerald-50/60",
  warn: "border-amber-200 bg-amber-50/60",
  idle: "border-slate-200/80 bg-slate-50",
};

const TONE_LABEL: Record<InsightTone, string> = {
  info: "text-blue-700",
  ok: "text-emerald-700",
  warn: "text-amber-700",
  idle: "text-slate-500",
};

export function InsightCard({
  title,
  body,
  tone = "idle",
  href,
  hrefLabel = "Buka",
  icon,
  className = "",
}: {
  title: string;
  /** Satu dua kalimat insight (tanpa markup). */
  body: string;
  tone?: InsightTone;
  href?: string;
  hrefLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const inner = (
    <div className={`flex flex-col rounded-xl border p-4 shadow-sm transition-colors ${TONE_STYLES[tone]} ${href ? "hover:bg-white" : ""} ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={`text-sm font-bold ${TONE_LABEL[tone]}`}>{title}</h3>
        {href && <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" />}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
      {href && <p className="mt-2 text-[11px] font-semibold text-slate-400">{hrefLabel}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] rounded-xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Grid insight cards — jumlah kolom diset via `cols` kelas lengkap agar
 *  Tailwind tetap mendeteksi literalnya. */
export function InsightGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>{children}</div>;
}
