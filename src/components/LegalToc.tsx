"use client";

import { useEffect, useState } from "react";

type Item = { id: string; title: string };

/** Daftar isi halaman legal: sticky di desktop (scroll-spy), dropdown di mobile. */
export default function LegalToc({ items }: { items: Item[] }) {
    const [active, setActive] = useState(items[0]?.id ?? "");

    useEffect(() => {
        const els = items
            .map((i) => document.getElementById(i.id))
            .filter((el): el is HTMLElement => !!el);
        if (!els.length) return;

        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActive(visible[0].target.id);
            },
            { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [items]);

    const list = (
        <ol className="space-y-1">
            {items.map((it, i) => {
                const on = active === it.id;
                return (
                    <li key={it.id}>
                        <a
                            href={`#${it.id}`}
                            aria-current={on ? "true" : undefined}
                            className={`flex items-baseline gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${on
                                    ? "bg-[var(--brand-primary)]/[0.07] font-semibold text-[var(--brand-primary)]"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                }`}
                        >
                            <span className="w-5 shrink-0 text-xs tabular-nums opacity-60">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{it.title}</span>
                        </a>
                    </li>
                );
            })}
        </ol>
    );

    return (
        <nav aria-label="Di halaman ini" className="print:hidden">
            {/* Mobile */}
            <details className="group rounded-xl border border-slate-200 bg-white lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--brand-primary)]">
                    Di halaman ini
                    <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                    </svg>
                </summary>
                <div className="border-t border-slate-100 p-2">{list}</div>
            </details>

            {/* Desktop */}
            <div className="sticky top-28 hidden lg:block">
                <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Di halaman ini</p>
                {list}
            </div>
        </nav>
    );
}