"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";

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

/* Geometri dropdown floating (portal ke body, flip atas/bawah, re-posisi
 * saat scroll/resize, kunci maxHeight ke ruang tersedia) kini dihook bersama
 * useFloatingPanel — lihat komentar lengkap di sana. */

function CustomSelect({ label, required, error, options, value, onChange, placeholder, searchable }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    onTriggerLost: () => setOpen(false),
  });

  const normalized = options.map(normalizeOption);
  const filtered = searchable
    ? normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;

  const selectedLabel = normalized.find((o) => o.value === value)?.label || "";

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
    if (open) {
      setOpen(false);
      return;
    }
    // Trigger hilang → jangan buka (padanan "computePos null → return" lama).
    if (!triggerRef.current) return;
    // Hitung posisi dalam batch yang sama dengan setOpen — daftar tampil sudah
    // pada posisi benar sejak render pertama (tanpa frame kosong).
    reposition();
    setOpen(true);
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
