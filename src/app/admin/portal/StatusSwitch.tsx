"use client";

/**
 * Switch dua keadaan generik untuk halaman portal.
 *
 * Dipakai untuk boolean tunggal di bagian "Lanjutan" form (mis. "Buka di tab
 * baru"). Status tiga keadaan (Tayang / Segera hadir / Disembunyikan) memakai
 * `StatusControl` di StatusControl.tsx.
 */
export function StatusSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Label aksesibilitas (screen reader) — wajib diisi. */
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:opacity-50 ${checked ? "bg-[#1767b1]" : "bg-slate-300"} ${track}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 rounded-full bg-white shadow-sm transition-transform ${knob} ${checked ? shift : "translate-x-0"}`}
      />
    </button>
  );
}
