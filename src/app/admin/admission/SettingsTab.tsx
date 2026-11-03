"use client";

import { ExternalIcon } from "./shared";
import type { SpmbMessageTemplate } from "@/lib/queries";

/** Tab Pengaturan — dokumen SPMB + template pesan WhatsApp. */
export function SettingsTab({
  docBrochure,
  docBrochureErr,
  docOffline,
  docOfflineErr,
  docPhone,
  docPhoneErr,
  docHighlight,
  docSaving,
  docDirty,
  waTemplates,
  waDrafts,
  waSavingKey,
  permUpdate,
  onDocBrochureChange,
  onDocOfflineChange,
  onDocPhoneChange,
  onDocHighlightChange,
  onSaveDocs,
  onWaDraftChange,
  onSaveTemplate,
}: {
  docBrochure: string;
  docBrochureErr: string | null;
  docOffline: string;
  docOfflineErr: string | null;
  docPhone: string;
  docPhoneErr: string | null;
  docHighlight: string;
  docSaving: boolean;
  docDirty: boolean;
  waTemplates: SpmbMessageTemplate[];
  waDrafts: Record<string, string>;
  waSavingKey: string | null;
  permUpdate: boolean;
  onDocBrochureChange: (v: string) => void;
  onDocOfflineChange: (v: string) => void;
  onDocPhoneChange: (v: string) => void;
  onDocHighlightChange: (v: string) => void;
  onSaveDocs: () => void;
  onWaDraftChange: (key: string, v: string) => void;
  onSaveTemplate: (key: string) => void;
}) {
  return (
    <>
      {/* ── PENGATURAN SPMB (DOKUMEN + KONTAK + SOROTAN) ──── */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--brand-primary)]">Pengaturan SPMB</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tautan dokumen, nomor WhatsApp panitia, dan sorotan yang tampil di halaman SPMB.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="doc-brochure" className="mb-1 block text-xs font-semibold text-slate-700">Link brosur SPMB</label>
            <div className="flex gap-2">
              <input id="doc-brochure" type="url" inputMode="url" maxLength={500} value={docBrochure}
                onChange={(e) => onDocBrochureChange(e.target.value)}
                aria-invalid={!!docBrochureErr} aria-describedby="doc-brochure-desc"
                placeholder="https://drive.google.com/file/d/..." disabled={docSaving}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 md:text-sm" />
              {docBrochure.trim().startsWith("https://") && (
                <a href={docBrochure.trim()} target="_blank" rel="noopener noreferrer"
                  aria-label="Buka link di tab baru" title="Buka link di tab baru"
                  className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-500 transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">
                  <ExternalIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {docBrochureErr ? (
              <p id="doc-brochure-desc" className="mt-1 text-xs font-medium text-red-600">{docBrochureErr}</p>
            ) : (
              <p id="doc-brochure-desc" className="mt-1 text-xs text-slate-400">
                Dipakai pada tautan &ldquo;brosur resmi sekolah&rdquo; di halaman SPMB. Kosongkan untuk memakai halaman info SPMB di website sekolah.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="doc-offline" className="mb-1 block text-xs font-semibold text-slate-700">Link formulir offline</label>
            <div className="flex gap-2">
              <input id="doc-offline" type="url" inputMode="url" maxLength={500} value={docOffline}
                onChange={(e) => onDocOfflineChange(e.target.value)}
                aria-invalid={!!docOfflineErr} aria-describedby="doc-offline-desc"
                placeholder="https://drive.google.com/file/d/..." disabled={docSaving}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 md:text-sm" />
              {docOffline.trim().startsWith("https://") && (
                <a href={docOffline.trim()} target="_blank" rel="noopener noreferrer"
                  aria-label="Buka link di tab baru" title="Buka link di tab baru"
                  className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-500 transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">
                  <ExternalIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {docOfflineErr ? (
              <p id="doc-offline-desc" className="mt-1 text-xs font-medium text-red-600">{docOfflineErr}</p>
            ) : (
              <p id="doc-offline-desc" className="mt-1 text-xs text-slate-400">
                Kosongkan untuk menyembunyikan tombol Formulir Offline. Link Google Drive otomatis diubah menjadi link unduh langsung saat disimpan.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="doc-phone" className="mb-1 block text-xs font-semibold text-slate-700">Nomor WhatsApp panitia</label>
            <input id="doc-phone" type="tel" inputMode="tel" maxLength={20} value={docPhone}
              onChange={(e) => onDocPhoneChange(e.target.value)}
              aria-invalid={!!docPhoneErr} aria-describedby="doc-phone-desc"
              placeholder="0858-0673-8160" disabled={docSaving}
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 md:text-sm" />
            {docPhoneErr ? (
              <p id="doc-phone-desc" className="mt-1 text-xs font-medium text-red-600">{docPhoneErr}</p>
            ) : (
              <p id="doc-phone-desc" className="mt-1 text-xs text-slate-400">
                Dipakai pada tautan Hubungi Panitia dan footer. Contoh: 0858-0673-8160.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="doc-highlight" className="mb-1 block text-xs font-semibold text-slate-700">Sorotan hasil seleksi</label>
            <textarea id="doc-highlight" rows={2} value={docHighlight}
              onChange={(e) => onDocHighlightChange(e.target.value)}
              aria-describedby="doc-highlight-desc" disabled={docSaving}
              placeholder="Pada SPMB Indent 2027/2028, 35 calon murid telah dinyatakan diterima."
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 md:text-sm" />
            <p id="doc-highlight-desc" className="mt-1 text-xs text-slate-400">
              Tampil di halaman SPMB. Kosongkan untuk menyembunyikan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button data-solid data-busy={docSaving ? "" : undefined} onClick={onSaveDocs} disabled={docSaving || !docDirty}
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
            {docSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </div>

      {/* ── TEMPLATE PESAN WHATSAPP ─────────────────── */}
      {permUpdate && (
        <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--brand-primary)]">Template Pesan WhatsApp</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Pesan siap pakai untuk menghubungi wali/pendaftar. Placeholder yang didukung:{" "}
              <code className="rounded bg-slate-100 px-1">{"{orang_tua}"}</code>{" "}
              <code className="rounded bg-slate-100 px-1">{"{nama}"}</code>{" "}
              <code className="rounded bg-slate-100 px-1">{"{gelombang}"}</code>{" "}
              <code className="rounded bg-slate-100 px-1">{"{jalur}"}</code>{" "}
              <code className="rounded bg-slate-100 px-1">{"{program}"}</code>{" "}
              <code className="rounded bg-slate-100 px-1">{"{nisn}"}</code>.
            </p>
          </div>
          {waTemplates.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-400">
              Template belum tersedia — jalankan migrasi SQL 0015.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {waTemplates.map((t) => {
                const draft = waDrafts[t.key] ?? "";
                const dirty = draft !== t.body;
                return (
                  <div key={t.key} className="rounded-xl border border-slate-100 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor={`wa-${t.key}`} className="text-xs font-semibold text-slate-700">{t.label}</label>
                      <button
                        type="button"
                        onClick={() => onSaveTemplate(t.key)}
                        disabled={!dirty || waSavingKey === t.key}
                        className="rounded-lg bg-[var(--brand-primary)] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-40"
                      >
                        {waSavingKey === t.key ? "Menyimpan…" : "Simpan"}
                      </button>
                    </div>
                    <textarea
                      id={`wa-${t.key}`}
                      rows={3}
                      value={draft}
                      onChange={(e) => onWaDraftChange(t.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base leading-relaxed focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 md:text-sm"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
