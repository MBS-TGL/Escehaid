"use client";

import { useState } from "react";
import { refineDraft, type RefineData } from "@/lib/queries/ai";
import { aiPermissionsFor } from "@/lib/ai-refine";
import type { ImportTarget } from "@/lib/gemini";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { ConfirmModal } from "@/components/ui";
import { Sparkle, Warning, ArrowsCounterClockwise, Lightbulb } from "@/components/Icons";

/**
 * Panel isi-otomatis AI untuk form admin (Berita/Artikel/Kegiatan/Pengumuman):
 * tempel catatan mentah → Gemini merapikan → parent memetakan hasil ke form
 * via `onApply`. Bila form sudah berisi, konfirmasi dulu; hasil apply bisa
 * diurungkan via `onRestore` (snapshot dipegang panel ini).
 *
 * Saling-kunci izin: panel disembunyikan bila user tak punya izin
 * create/update modul tujuan (penegakan sesungguhnya tetap di route API).
 */

const MAX_CHARS = 4000;

interface AiFillPanelProps {
  /** Target konten — menentukan endpoint & izin modul. */
  target: ImportTarget;
  /** Nilai form yang berpotensi ditimpa AI — snapshot untuk tombol Undo. */
  current: Record<string, string>;
  /** Form sudah terisi (ada field inti) → minta konfirmasi sebelum menimpa. */
  hasContent: boolean;
  /** Isi form dengan hasil AI (parent men-set penanda sumber panel-ai). */
  onApply: (f: RefineData) => void;
  /** Kembalikan field ke nilai sebelum AI (dipakai tombol Undo). */
  onRestore: (snapshot: Record<string, string>) => void;
  disabled?: boolean;
}

export default function AiFillPanel({
  target,
  current,
  hasContent,
  onApply,
  onRestore,
  disabled = false,
}: AiFillPanelProps) {
  const { can, ready } = usePermissions();
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Snapshot field form sebelum ditimpa AI — ada isinya → tombol Undo tampil.
  const [undoSnap, setUndoSnap] = useState<Record<string, string> | null>(null);

  // Panel disembunyikan bila izin sudah dimuat tapi tak punya hak create/update.
  const allowed = aiPermissionsFor(target).some((p) => can(p));
  if (ready && !allowed) return null;

  async function run() {
    const text = rawText.trim();
    if (!text) { setError("Tempel dulu catatan mentahnya."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await refineDraft(target, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUndoSnap({ ...current });
      onApply(result.data);
    } finally {
      setLoading(false);
    }
  }

  function handleRefine() {
    if (!rawText.trim()) { setError("Tempel dulu catatan mentahnya."); return; }
    setError("");
    // Form sudah berisi (mis. mode edit) → minta konfirmasi agar tidak
    // menimpa suntingan pengguna secara diam-diam.
    if (hasContent) { setConfirmOpen(true); return; }
    run();
  }

  function handleUndo() {
    if (!undoSnap) return;
    onRestore(undoSnap);
    setUndoSnap(null);
  }

  const nearLimit = rawText.length > MAX_CHARS - 400;

  return (
    <div className="rounded-xl border border-[var(--brand-primary)]/25 bg-gradient-to-br from-[var(--brand-primary)]/[0.04] to-transparent p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
          <Sparkle weight="fill" className="h-4 w-4 text-[var(--brand-accent)]" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800">Isi otomatis dengan AI</p>
          <p className="text-[11px] leading-snug text-[#64748b] md:text-xs md:text-slate-500">
            Tempel catatan mentah — AI merapikan tanpa menambah fakta baru.
          </p>
        </div>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        disabled={loading || disabled}
        rows={4}
        maxLength={MAX_CHARS}
        aria-label="Catatan mentah untuk AI"
        placeholder="Contoh: hari ini siswa kelas 7 lomba pidato di aula, juara 1 bernama Anisa, dst."
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
      />
      <div
        className={`mt-1 text-right text-[10px] md:text-[11px] ${
          nearLimit ? "font-semibold text-amber-600" : "text-slate-400"
        }`}
      >
        {rawText.length}/{MAX_CHARS}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button data-solid data-busy={loading ? "" : undefined}
          type="button"
          onClick={handleRefine}
          disabled={loading || disabled}
          className="flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Sparkle weight="fill" className="h-4 w-4" />
          )}
          {loading ? "Merapikan…" : "Rapikan dengan AI"}
        </button>
        {rawText.trim() && !loading && (
          <button
            type="button"
            onClick={() => { setRawText(""); setError(""); }}
            disabled={disabled}
            className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600"
          >
            Kosongkan catatan
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {undoSnap && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
          <Lightbulb className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Form terisi hasil AI — periksa dulu, boleh disunting.</span>
          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <ArrowsCounterClockwise className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); run(); }}
        title="Timpa isi form?"
        description="Field yang sudah terisi akan diganti hasil AI. Bisa diurungkan lewat tombol Undo setelahnya."
        confirmLabel="Ya, Rapikan"
        cancelLabel="Lanjut mengedit"
        variant="warning"
        loading={loading}
      />
    </div>
  );
}
