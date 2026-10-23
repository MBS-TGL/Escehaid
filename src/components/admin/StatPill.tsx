"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@/components/Icons";

export type StatTone = "neutral" | "success" | "warning" | "danger" | "info" | "purple";

// Class ditulis utuh (bukan dirakit dari string) supaya Tailwind tidak membuangnya.
const TONES: Record<StatTone, string> = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
    info: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
};

type StatPillProps = {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: ReactNode;
    tone?: StatTone;
    loading?: boolean;
    active?: boolean;
    onClick?: () => void;
};

export function StatPill({
    icon: Icon,
    label,
    value,
    tone = "neutral",
    loading = false,
    active = false,
    onClick,
}: StatPillProps) {
    const base =
        "flex h-8 sm:h-9 shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg border pl-1.5 pr-2.5 sm:pr-3 transition-colors";
    const state = active
        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
        : "border-slate-200 bg-white";

    const content = (
        <>
            <span className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md ${TONES[tone]}`}>
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tabular-nums text-slate-800">
                {loading ? "–" : value}
            </span>
            <span className="whitespace-nowrap text-xs sm:text-[13px] text-slate-500">{label}</span>
        </>
    );

    if (!onClick) {
        return <div className={`${base} ${state}`}>{content}</div>;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`${base} ${state} cursor-pointer ${active ? "" : "hover:border-slate-300 hover:bg-slate-50"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]`}
        >
            {content}
        </button>
    );
}

export function StatPillGroup({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        setCanScrollLeft(el.scrollLeft > 6);
        setCanScrollRight(maxScroll > 6 && el.scrollLeft < maxScroll - 6);
    };

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;

        const observer =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => updateScrollState())
                : null;

        observer?.observe(el);
        window.addEventListener("resize", updateScrollState);

        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", updateScrollState);
        };
    }, [children]);

    const scroll = (direction: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        const offset = direction === "left" ? -140 : 140;
        el.scrollBy({ left: offset, behavior: "smooth" });
    };

    return (
        <div className={`relative mb-4 ${className}`}>
            {/* Scroll Track */}
            <div
                ref={scrollRef}
                onScroll={updateScrollState}
                className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap after:content-[''] after:w-4 after:shrink-0 sm:after:hidden"
            >
                {children}
            </div>

            {/* Left arrow indicator (mobile only) */}
            {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent pl-1 pr-4 sm:hidden pointer-events-none">
                    <button
                        type="button"
                        onClick={() => scroll("left")}
                        aria-label="Geser ke kiri"
                        className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-md text-slate-600 transition-all active:scale-90 hover:text-[var(--brand-primary)]"
                    >
                        <CaretLeft className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Right arrow indicator (mobile only) */}
            {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent pl-4 pr-1 sm:hidden pointer-events-none">
                    <button
                        type="button"
                        onClick={() => scroll("right")}
                        aria-label="Geser ke kanan"
                        className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-md text-slate-600 transition-all active:scale-90 hover:text-[var(--brand-primary)]"
                    >
                        <CaretRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}