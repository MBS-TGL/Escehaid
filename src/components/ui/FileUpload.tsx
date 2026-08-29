"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
  label: string;
  required?: boolean;
  error?: string;
  accept?: string;
  maxSize?: number; // in MB
  value: File | null;
  onChange: (file: File | null) => void;
}

export function FileUpload({ label, required, error, accept = ".pdf,.jpg,.jpeg,.png", maxSize = 1, value, onChange }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) {
      onChange(null);
      return;
    }
    if (file.size > maxSize * 1024 * 1024) {
      alert(`Ukuran file maksimal ${maxSize} MB`);
      return;
    }
    onChange(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-800">{value.name}</p>
            <p className="text-xs text-emerald-600">{formatSize(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors ${
            dragOver
              ? "border-[#1767b1] bg-[#1767b1]/5"
              : error
              ? "border-red-400 bg-red-50"
              : "border-[#dce3ed] bg-[#f4f7fb] hover:border-[#1767b1]/50 hover:bg-[#1767b1]/5"
          }`}
        >
          <svg className={`h-8 w-8 ${dragOver ? "text-[#1767b1]" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-[#082b59]">Klik atau drag file ke sini</p>
            <p className="mt-0.5 text-xs text-slate-400">PDF, JPG, PNG (maks. {maxSize} MB)</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
