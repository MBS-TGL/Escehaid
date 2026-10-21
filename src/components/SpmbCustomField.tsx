"use client";

import { Input, Select, DatePicker } from "@/components/ui";
import { spmbAnswerKey } from "@/lib/helpers";
import { SPMB_CHECK_SEP } from "@/lib/spmb-registration";
import type { SpmbFormField } from "@/lib/supabase";

/**
 * Renderer satu pertanyaan tambahan (custom) sesuai tipenya — gaya konsisten
 * dengan langkah bawaan form SPMB. Dipakai form publik (/admission/register)
 * dan panel admin "Tambah Pendaftar" agar tipe baru dari builder cukup
 * ditambah di satu tempat.
 */
export function SpmbCustomField({
  field: f,
  value,
  error,
  onChange,
}: {
  field: SpmbFormField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const key = spmbAnswerKey(f.id);
  const help = f.help ? <p className="mt-1 text-xs text-slate-400">{f.help}</p> : null;
  const err = error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null;
  const labelReq = (
    <span className="text-sm font-semibold text-slate-700">
      {f.label} {f.required && <span className="text-red-500">*</span>}
    </span>
  );

  switch (f.type) {
    case "textarea":
      return (
        <div>
          <label htmlFor={key} className="mb-1.5 block">{labelReq}</label>
          <textarea
            id={key}
            rows={4}
            value={value}
            placeholder={f.placeholder || ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            className={`w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 ${error ? "border-red-300" : "border-slate-200"}`}
          />
          {help}
          {err}
        </div>
      );
    case "date":
      return (
        <div>
          <DatePicker label={f.label} required={f.required} value={value}
            onChange={(val) => onChange(val)} error={error} />
          {help}
        </div>
      );
    case "select":
      return (
        <div>
          <Select label={f.label} required={f.required} options={f.options || []} value={value}
            onChange={(val) => onChange(val)} placeholder={f.placeholder || "Pilih jawaban"} error={error} />
          {help}
        </div>
      );
    case "radio":
      return (
        <div>
          <p className="mb-1.5">{labelReq}</p>
          <div className="space-y-2">
            {(f.options || []).map((opt) => (
              <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${value === opt ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/5" : "border-[#dce3ed] hover:border-[var(--brand-accent)]/30"}`}>
                <input type="radio" name={key} value={opt} checked={value === opt}
                  onChange={() => onChange(opt)} className="accent-[var(--brand-accent)]" />
                <span className="text-sm font-medium text-[var(--brand-primary)]">{opt}</span>
              </label>
            ))}
          </div>
          {help}
          {err}
        </div>
      );
    case "checkbox": {
      const selected = value ? value.split(SPMB_CHECK_SEP) : [];
      return (
        <div>
          <p className="mb-1.5">{labelReq}</p>
          <div className="space-y-2">
            {(f.options || []).map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${checked ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/5" : "border-[#dce3ed] hover:border-[var(--brand-accent)]/30"}`}>
                  <input type="checkbox" checked={checked}
                    onChange={() => {
                      const next = checked ? selected.filter((s) => s !== opt) : [...selected, opt];
                      onChange(next.join(SPMB_CHECK_SEP));
                    }}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-accent)]" />
                  <span className="text-sm font-medium text-[var(--brand-primary)]">{opt}</span>
                </label>
              );
            })}
          </div>
          {help}
          {err}
        </div>
      );
    }
    default:
      return (
        <div>
          <Input
            label={f.label}
            required={f.required}
            type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
            placeholder={f.placeholder || ""}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
          {help}
        </div>
      );
  }
}

/**
 * Validasi jawaban pertanyaan tambahan: wajib isi + pola per tipe jawaban.
 * Return map key (spmbAnswerKey) → pesan error; kosong bila valid.
 */
export function validateSpmbCustomAnswers(
  fields: SpmbFormField[],
  answers: Record<string, string>
): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of fields) {
    const key = spmbAnswerKey(f.id);
    const val = (answers[key] || "").trim();
    if (!val) {
      if (f.required) e[key] = `${f.label} wajib diisi`;
      continue;
    }
    if (f.type === "number" && !/^-?\d{1,10}(\.\d{1,4})?$/.test(val)) {
      e[key] = `${f.label} harus berupa angka`;
    } else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      e[key] = `${f.label} tidak valid`;
    } else if (f.type === "tel" && !/^[\d\s+()-]{6,20}$/.test(val)) {
      e[key] = `${f.label} tidak valid (6–20 karakter angka)`;
    } else if (f.type === "date" && Number.isNaN(Date.parse(val))) {
      e[key] = `${f.label} tidak valid`;
    } else if ((f.type === "select" || f.type === "radio") && f.options?.length && !f.options.includes(val)) {
      e[key] = `${f.label} tidak valid`;
    }
  }
  return e;
}
