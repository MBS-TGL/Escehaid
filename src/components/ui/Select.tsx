"use client";

import { useState, useRef, useEffect } from "react";

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

const chevron = (
  <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

function CustomSelect({ label, required, error, options, value, onChange, placeholder, searchable }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const normalized = options.map(normalizeOption);
  const filtered = searchable
    ? normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;

  const selectedLabel = normalized.find((o) => o.value === value)?.label || "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Label label={label} required={required} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-field-type="select"
        className={`${error ? errorClass : normalClass} w-full cursor-pointer text-left`}
      >
        <span className={selectedLabel ? "text-[#172033]" : "text-slate-400"}>
          {selectedLabel || placeholder || "Pilih..."}
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[#dce3ed] bg-white shadow-lg">
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
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Select(props: CustomSelectProps) {
  return <CustomSelect {...props} />;
}
