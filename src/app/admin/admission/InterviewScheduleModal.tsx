"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { CalendarBlank } from "@/components/Icons";

/**
 * Modal jadwal wawancara: datetime-local (WIB) + catatan.
 * Konversi ke ISO UTC saat simpan; tampil balik sebagai WIB saat edit.
 */

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Geser ke WIB untuk input datetime-local (tanpa detik).
  const wib = new Date(d.getTime() + 7 * 3600000);
  return wib.toISOString().slice(0, 16);
}

export function InterviewScheduleModal({
  open,
  title,
  subtitle,
  initialAt,
  initialNote,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  initialAt?: string | null;
  initialNote?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (interviewAtIso: string, note: string) => void;
}) {
  const [at, setAt] = useState(() => toLocalInput(initialAt));
  const [note, setNote] = useState(initialNote || "");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!at) {
      setError("Tanggal & jam wawancara wajib diisi.");
      return;
    }
    const local = new Date(`${at}:00+07:00`);
    if (Number.isNaN(local.getTime())) {
      setError("Tanggal & jam tidak valid.");
      return;
    }
    setError(null);
    onSave(local.toISOString(), note.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={subtitle}>
      <div className="space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
          <CalendarBlank className="h-6 w-6 text-[var(--brand-primary)]" />
        </div>
        <div>
          <label htmlFor="interview-at" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Tanggal & Jam (WIB) <span className="text-red-500">*</span>
          </label>
          <input
            id="interview-at"
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="interview-note" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Catatan (opsional)
          </label>
          <textarea
            id="interview-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
            placeholder="Mis. bawa rapor asli, datang 15 menit lebih awal…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
          />
        </div>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            data-solid
            data-busy
            onClick={handleSave}
            disabled={saving || !at}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Simpan Jadwal"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
