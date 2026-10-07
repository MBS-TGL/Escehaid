"use client";

/**
 * Status tiga keadaan aplikasi portal — menggantikan dua toggle terpisah
 * ("Aktif" + "Segera Hadir") supaya hanya satu dari tiga kondisi yang valid:
 *
 *   live   → Tayang         (is_active=true,  is_coming_soon=false)
 *   soon   → Segera hadir   (is_active=true,  is_coming_soon=true)
 *   hidden → Disembunyikan  (is_active=false, is_coming_soon=false)
 *
 * Baris lama dengan kombinasi tidak valid (is_active=false + is_coming_soon=true)
 * ikut terbaca sebagai "hidden" — lihat statusOf().
 */
export type PortalStatus = "live" | "soon" | "hidden";

export const STATUS_META: Record<PortalStatus, { label: string; activeClass: string; dotClass: string }> = {
  live: {
    label: "Tayang",
    activeClass: "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200/70",
    dotClass: "bg-emerald-500",
  },
  soon: {
    label: "Segera hadir",
    activeClass: "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200/70",
    dotClass: "bg-amber-500",
  },
  hidden: {
    label: "Disembunyikan",
    activeClass: "bg-white text-slate-600 shadow-sm ring-1 ring-slate-300",
    dotClass: "bg-slate-400",
  },
};

const ORDER: PortalStatus[] = ["live", "soon", "hidden"];

/** Ubah dua kolom boolean menjadi satu status. Kombinasi tidak valid → "hidden". */
export function statusOf(item: { is_active: boolean; is_coming_soon: boolean }): PortalStatus {
  if (!item.is_active) return "hidden";
  return item.is_coming_soon ? "soon" : "live";
}

/** Kebalikan statusOf(): pasangan kolom yang disimpan ke tabel portal_apps. */
export function flagsOf(status: PortalStatus): { is_active: boolean; is_coming_soon: boolean } {
  if (status === "live") return { is_active: true, is_coming_soon: false };
  if (status === "soon") return { is_active: true, is_coming_soon: true };
  return { is_active: false, is_coming_soon: false };
}

/** Kontrol segmented 3 status — dipakai di form dan di kolom Status tabel. */
export function StatusControl({
  value,
  onChange,
  label,
  size = "md",
  disabled = false,
}: {
  value: PortalStatus;
  onChange: (status: PortalStatus) => void;
  /** Label aksesibilitas (screen reader) — wajib diisi. */
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const sm = size === "sm";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex w-full border border-slate-200 bg-slate-100/70 p-0.5 ${
        sm ? "rounded-md" : "gap-1 rounded-xl"
      }`}
    >
      {ORDER.map((status) => {
        const active = value === status;
        const meta = STATUS_META[status];
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={meta.label}
            onClick={() => onChange(status)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1767b1] disabled:opacity-50 ${
              sm ? "px-0.5 py-1.5 text-[10px] leading-none tracking-tight" : "px-2 py-2 text-xs"
            } ${active ? meta.activeClass : "text-slate-500 hover:bg-white/70 hover:text-slate-700"}`}
          >
            {!sm && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`} />}
            <span className="truncate">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
