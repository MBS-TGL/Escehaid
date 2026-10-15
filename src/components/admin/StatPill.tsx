import type { ComponentType, ReactNode } from "react";

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
        "flex h-9 shrink-0 items-center gap-2 rounded-lg border pl-1.5 pr-3 transition-colors";
    const state = active
        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
        : "border-slate-200 bg-white";

    const content = (
        <>
            <span className={`flex h-6 w-6 items-center justify-center rounded-md ${TONES[tone]}`}>
                <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-800">
                {loading ? "–" : value}
            </span>
            <span className="whitespace-nowrap text-[13px] text-slate-500">{label}</span>
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

export function StatPillGroup({ children }: { children: ReactNode }) {
    return <div className="mb-4 flex flex-wrap gap-2">{children}</div>;
}