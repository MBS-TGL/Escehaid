"use client";

import { useState, useRef, useEffect } from "react";

interface SelectBaseProps {
  label: string;
  required?: boolean;
  error?: string;
}

interface SelectProps extends SelectBaseProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  searchable?: false;
  children: React.ReactNode;
}

interface SearchableSelectProps extends SelectBaseProps {
  searchable: true;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

type Props = SelectProps | SearchableSelectProps;

const chevron = (
  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
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

function NativeSelect({ label, required, error, children, ...props }: SelectProps) {
  return (
    <div>
      <Label label={label} required={required} />
      <div className="relative">
        <select
          {...props}
          className={`${error ? errorClass : normalClass} w-full appearance-none pr-10`}
        >
          {children}
        </select>
        {chevron}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SearchableSelect({ label, required, error, options, value, onChange, placeholder }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

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
      <input
        type="text"
        readOnly
        value={value || ""}
        placeholder={placeholder || "Pilih atau ketik..."}
        onClick={() => setOpen(true)}
        className={`${error ? errorClass : normalClass} cursor-pointer`}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[#dce3ed] bg-white shadow-lg">
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
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); setQuery(""); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#f4f7fb] ${value === opt ? "bg-[#1767b1]/10 font-medium text-[#082b59]" : "text-[#172033]"}`}
              >
                {opt}
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

export function Select(props: Props) {
  if (props.searchable) {
    return <SearchableSelect {...props} />;
  }
  return <NativeSelect {...(props as SelectProps)} />;
}
