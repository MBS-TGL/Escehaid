"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { CaretDown, Checks } from "@/components/Icons";

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

export const STATUS_META: Record<
  PortalStatus,
  { label: string; hint: string; activeClass: string; dotClass: string }
> = {
  live: {
    label: "Tayang",
    hint: "Tampil biasa di portal",
    activeClass: "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200/70",
    dotClass: "bg-emerald-500",
  },
  soon: {
    label: "Segera hadir",
    hint: "Tile ditandai akan datang",
    activeClass: "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200/70",
    dotClass: "bg-amber-500",
  },
  hidden: {
    label: "Disembunyikan",
    hint: "Tidak tampil di portal",
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

/** Kontrol segmented 3 status — dipakai di form buat/edit (kolom tabel memakai StatusPill). */
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
        sm ? "rounded-md" : "flex-wrap gap-1 rounded-xl"
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
            title={meta.hint}
            onClick={() => onChange(status)}
            className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-md font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1767b1] disabled:opacity-50 ${
              sm
                ? "min-w-0 flex-1 px-0.5 py-1.5 text-[10px] leading-none tracking-tight"
                : "flex-auto px-2 py-2 text-xs"
            } ${active ? meta.activeClass : "text-slate-500 hover:bg-white/70 hover:text-slate-700"}`}
          >
            {!sm && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`} />}
            <span className={sm ? "truncate" : undefined}>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Deskripsi satu baris untuk tiap opsi di menu status. */
const STATUS_DESC: Record<PortalStatus, string> = {
  live: 'Tampil di portal dan bisa dibuka',
  soon: 'Tampil sebagai "segera hadir"',
  hidden: "Tidak tampil di portal",
};

const TITLE_CLASS: Record<PortalStatus, string> = {
  live: "text-emerald-700",
  soon: "text-amber-700",
  hidden: "text-slate-600",
};

const PILL_CLASS: Record<PortalStatus, string> = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  soon: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  hidden: "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200/70",
};

/** Perkiraan tinggi menu (3 opsi) sampai tinggi nyata terukur — hanya untuk posisi awal. */
const MENU_EST_H = 168;
const MENU_MIN_W = 240;

/**
 * Pill status untuk baris tabel: titik warna + label + panah, membuka menu
 * tiga opsi (deskripsi satu baris, centang pada status aktif) yang langsung
 * menyimpan lewat onChange — pemetaan is_active/is_coming_soon tetap di
 * flagsOf(), dan halaman menyimpan + revalidate lewat applyStatus.
 *
 * Menu diposisikan `fixed` dari getBoundingClientRect() supaya tidak
 * terpotong overflow-x pembungkus tabel, otomatis membuka ke atas bila ruang
 * di bawah tidak cukup, dan tutup dengan Esc/klik luar; panah atas-bawah
 * berpindah antar opsi (ARIA: aria-haspopup="menu", role="menu"/"menuitem").
 */
export function StatusPill({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: PortalStatus;
  /** Boleh async — dipakai untuk indikator menyimpan. */
  onChange: (status: PortalStatus) => Promise<void> | void;
  /** Label baris (a11izabilitas) — mis. "Status E-Learning". */
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const meta = STATUS_META[value];

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  /** Posisi fixed dari rect trigger; arah buka dihitung dari sisa ruang. */
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? MENU_EST_H;
    // clientHeight/clientWidth = ICB tempat position:fixed diukur (viewport
    // MINUS scrollbar); innerHeight/innerWidth menyertakan scrollbar sehingga
    // keputusan arah buka & clamp kiri-kanan bisa meleset ~15px.
    const vh = document.documentElement.clientHeight;
    const vw = document.documentElement.clientWidth;
    const spaceBelow = vh - r.bottom - 8;
    const up = spaceBelow < height && r.top - 8 > spaceBelow;
    const width = Math.max(r.width, MENU_MIN_W);
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    setPos({ left, top: up ? r.top - height - 6 : r.bottom + 6, width, up });
  }, []);

  function toggle() {
    if (open) {
      close();
      return;
    }
    place();
    setOpen(true);
  }

  // Saat terbuka: koreksi posisi dengan tinggi nyata, fokuskan opsi aktif,
  // lalu pasang penutup (klik luar / Esc) dan reposisi saat scroll/resize.
  useEffect(() => {
    if (!open) return;
    place();
    menuRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus();

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const reposition = () => place();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onDocKeyDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onDocKeyDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, place, close]);

  async function choose(status: PortalStatus) {
    if (status === value || saving) {
      close();
      return;
    }
    setSaving(true);
    try {
      await onChange(status);
    } finally {
      setSaving(false);
      close();
      triggerRef.current?.focus();
    }
  }

  function onMenuKeyDown(e: ReactKeyboardEvent) {
    if (e.key === "Tab") {
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
    else next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || saving}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label} — ${meta.label}`}
        aria-busy={saving}
        onClick={toggle}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:opacity-60 ${PILL_CLASS[value]}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`} />
        <span className="truncate">{meta.label}</span>
        {saving ? (
          <span
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          <CaretDown
            className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width }}
          className="z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          {ORDER.map((status) => {
            const item = STATUS_META[status];
            const active = value === status;
            return (
              <button
                key={status}
                type="button"
                role="menuitem"
                aria-current={active ? "true" : undefined}
                data-active={active}
                disabled={saving}
                onClick={() => choose(status)}
                className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1767b1] disabled:opacity-60"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-semibold ${TITLE_CLASS[status]}`}>
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                    {STATUS_DESC[status]}
                  </span>
                </span>
                {active && <Checks className="mt-0.5 h-4 w-4 shrink-0 text-[#1767b1]" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
