"use client";

import { useState } from "react";
import { Download, X, Eye } from "@/components/Icons";
import { attachmentKind } from "@/lib/queries";

/**
 * Kartu lampiran berita (PDF dsb.) dengan pratinjau tertanam.
 * PDF dimuat lazy — baru diambil saat panel masuk layar.
 */
export default function AttachmentPanel({
  url,
  name,
}: {
  url: string;
  name?: string | null;
}) {
  const [open, setOpen] = useState(true);

  if (!url) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-[#1767b1]/20 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#082b59]/10 text-[11px] font-black text-[#082b59]">
            {attachmentKind(name)}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lampiran
            </p>
            <p className="truncate text-sm font-semibold text-slate-700">
              {name || "Dokumen"}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {open ? (
              <>
                <X className="h-4 w-4" /> Tutup
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Pratinjau
              </>
            )}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#082b59] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1767b1]"
          >
            <Download className="h-4 w-4" /> Unduh
          </a>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-3">
          <iframe
            src={url}
            title={name ? `Pratinjau: ${name}` : "Pratinjau lampiran"}
            loading="lazy"
            className="h-[70vh] min-h-[480px] w-full border-0 bg-slate-100"
          />
        </div>
      )}
    </div>
  );
}
