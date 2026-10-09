"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectBaseProps {
  label: string;
  required?: boolean;
  error?: string;
}

interface CustomSelectProps extends SelectBaseProps {
  options: (string | SelectOption)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

const chevron = (open: boolean) => (
  <svg className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const baseInputClass = "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:ring-2";
const normalClass = `${baseInputClass} border-[#dce3ed] focus:border-[#1767b1] focus:ring-[#1767b1]/10`;
const errorClass = `${baseInputClass} border-red-400 focus:border-red-500 focus:ring-red-500/10`;

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function normalizeOption(opt: string | SelectOption): SelectOption {
  return typeof opt === "string" ? { label: opt, value: opt } : opt;
}

/* ── Geometri dropdown floating ───────────────────────────────────────────
 * Daftar opsi di-portal ke document.body dengan position:fixed sehingga:
 *  1) tidak ter-clipping oleh wadah overflow (Modal/SlideOver punya
 *     overflow-y-auto — dropdown inline dulu ikut ter-scroll/terpotong);
 *  2) posisinya dinamis: turun bila ruang bawah cukup, naik ke atas trigger
 *     bila ruang bawah sempit (mis. dekat bawah modal/viewport);
 *  3) mengikuti trigger saat scroll (capture — menangkap scroll container
 *     mana pun, termasuk di dalam modal) dan resize.
 * Penempatan "ke atas" memakai properti `bottom` (bukan top) sehingga tidak
 * perlu mengukur tinggi konten lebih dulu — posisi benar sejak render pertama.
 */
const GAP = 6;
const VIEWPORT_PAD = 12;
const MAX_H = 240;
/** Ruang bawah minimal agar dropdown bebas turun tanpa perlu dipertimbangkan. */
const MIN_FIT = 160;

interface ListPos {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

function CustomSelect({ label, required, error, options, value, onChange, placeholder, searchable }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<ListPos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const normalized = options.map(normalizeOption);
  const filtered = searchable
    ? normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;

  const selectedLabel = normalized.find((o) => o.value === value)?.label || "";

  /** Hitung posisi fixed dari rect trigger — dipanggil saat buka & re-posisi. */
  const computePos = useCallback((): ListPos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    // Turun bila ruang bawah lega; kalau sempit, naik — kecuali ruang atas
    // justru lebih sempit (maka sisi paling lapang yang dipakai).
    const useBottom = spaceBelow >= MIN_FIT || spaceBelow >= spaceAbove;
    const space = useBottom ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(MAX_H, Math.max(80, space));
    return useBottom
      ? { top: rect.bottom + GAP, left: rect.left, width: rect.width, maxHeight }
      : { bottom: window.innerHeight - rect.top + GAP, left: rect.left, width: rect.width, maxHeight };
  }, []);

  const openList = useCallback(() => {
    const next = computePos();
    if (!next) return;
    setPos(next);
    setOpen(true);
  }, [computePos]);

  // Re-posisi saat scroll (capture: menangkap scroll di container mana pun,
  // termasuk overflow-y modal) & resize viewport. Listener = callback async,
  // bukan setState sinkron di body effect.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const next = computePos();
      if (next) setPos(next);
      else setOpen(false); // trigger hilang (mis. step berpindah) → tutup
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, computePos]);

  // Klik di luar trigger DAN di luar dropdown (portal) → tutup. Tanpa ref
  // listRef, klik opsi di portal dianggap "di luar" dan menutup sebelum
  // click-nya sempat memilih.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Esc → tutup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle() {
    if (open) setOpen(false);
    else openList();
  }

  const list = open && pos
    ? createPortal(
        <div
          ref={listRef}
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            // Di atas overlay Modal (z-[9999]) karena konten di-portal keluar.
            zIndex: 10000,
          }}
          className="overflow-auto rounded-xl border border-[#dce3ed] bg-white shadow-lg"
        >
          {searchable && (
            <div className="sticky top-0 border-b border-[#dce3ed] bg-white p-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className="w-full rounded-lg border border-[#dce3ed] bg-[#f4f7fb] px-3 py-2 text-sm outline-none focus:border-[#1767b1]"
              />
            </div>
          )}
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#f4f7fb] ${value === opt.value ? "bg-[#1767b1]/10 font-medium text-[#082b59]" : "text-[#172033]"}`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400">Tidak ditemukan</div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapRef} className="relative">
      <Label label={label} required={required} />
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        data-field-type="select"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${error ? errorClass : normalClass} relative w-full cursor-pointer text-left`}
      >
        <span className={selectedLabel ? "text-[#172033]" : "text-slate-400"}>
          {selectedLabel || placeholder || "Pilih..."}
        </span>
        {chevron(open)}
      </button>
      {list}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Select(props: CustomSelectProps) {
  return <CustomSelect {...props} />;
}
