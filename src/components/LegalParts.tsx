"use client";

import type { ReactNode } from "react";

export function PrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)] print:hidden"
        >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M5 2a1 1 0 00-1 1v3H3a2 2 0 00-2 2v5a2 2 0 002 2h1v3a1 1 0 001 1h10a1 1 0 001-1v-3h1a2 2 0 002-2V8a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H5zm1 4V4h8v2H6zm0 7h8v4H6v-4z" />
            </svg>
            Cetak / Simpan PDF
        </button>
    );
}

const TONES = {
    info: "border-sky-200 bg-sky-50 text-sky-900 [&_svg]:text-sky-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 [&_svg]:text-emerald-600",
    warning: "border-amber-200 bg-amber-50 text-amber-900 [&_svg]:text-amber-600",
} as const;

/** Kotak penekanan untuk pernyataan penting di dalam isi legal. */
export function Callout({
    tone = "info",
    children,
}: {
    tone?: keyof typeof TONES;
    children: ReactNode;
}) {
    return (
        <div className={`mt-4 flex gap-3 rounded-xl border p-4 text-[15px] leading-relaxed ${TONES[tone]}`}>
            <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>{children}</div>
        </div>
    );
}