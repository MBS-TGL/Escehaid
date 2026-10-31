"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Envelope, CheckCircle } from "@/components/Icons";
import { broadcastSpmbWhatsAppAction, type BroadcastRecipient } from "./actions";
import type { SpmbRegistration } from "@/lib/supabase";

export function BroadcastWaModal({
  isOpen,
  onClose,
  registrations,
  onFinished,
}: {
  isOpen: boolean;
  onClose: () => void;
  registrations: SpmbRegistration[];
  onFinished?: () => void;
}) {
  const [templateKey, setTemplateKey] = useState("info");
  const [customMsg, setCustomMsg] = useState(
    "Assalamu'alaikum {nama}, pendaftaran SPMB Anda di SMP Muhammadiyah 4 Tanggul saat ini sedang diproses panitia. Harap pantau berkas pendaftaran Anda."
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sentCount: number; failedCount: number; skippedCount: number } | null>(null);

  // Ambil hanya yang memiliki nomor telepon
  const validRecipients = registrations.filter((r) => r.phone && r.phone.replace(/[^0-9]/g, "").length >= 9);

  const handleSend = async () => {
    if (validRecipients.length === 0) return;
    if (!confirm(`Kirim broadcast WhatsApp ke ${validRecipients.length} pendaftar via Fonnte?`)) return;

    setSending(true);
    setResult(null);

    const payload: BroadcastRecipient[] = validRecipients.map((r) => {
      const nisnVal = (r.documents as Record<string, string> | null)?.nisn || "";
      const compiled = customMsg
        .replace(/{nama}/g, r.full_name)
        .replace(/{nisn}/g, nisnVal)
        .replace(/{jalur}/g, r.registration_path || "");

      return {
        registrationId: r.id,
        name: r.full_name,
        phone: r.phone!,
        message: compiled,
        templateKey,
      };
    });

    const res = await broadcastSpmbWhatsAppAction(payload);
    setSending(false);

    if (res.success && res.data) {
      setResult(res.data);
      if (onFinished) onFinished();
    } else {
      alert(res.error || "Gagal mengirim broadcast.");
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Broadcast WhatsApp (Fonnte API)">
      <div className="space-y-4 text-xs text-slate-600">
        <p className="text-slate-500">
          Kirim pengumuman atau instruksi berkas massal ke pendaftar terpilih. Pengiriman dilakukan berurutan dengan jeda aman anti-spam Fonnte.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between font-semibold">
          <span>Target Penerima Valid:</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-800 tabular-nums">
            {validRecipients.length} dari {registrations.length} pendaftar
          </span>
        </div>

        <div>
          <label htmlFor="wa-template-select" className="block font-semibold text-slate-700">Jenis Pesan</label>
          <select
            id="wa-template-select"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none"
          >
            <option value="info">Pemberitahuan Umum</option>
            <option value="berkas">Pengingat Kelengkapan Berkas</option>
            <option value="wawancara">Undangan Wawancara</option>
          </select>
        </div>

        <div>
          <label htmlFor="wa-message-textarea" className="block font-semibold text-slate-700">Template Pesan</label>
          <textarea
            id="wa-message-textarea"
            rows={4}
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)] font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Variabel otomatis: <code>{`{nama}`}</code>, <code>{`{nisn}`}</code>, <code>{`{jalur}`}</code>.
          </p>
        </div>

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Pengiriman Selesai!
            </p>
            <p className="text-[11px]">
              Terkirim: {result.sentCount} · Gagal: {result.failedCount} · Dilewati (Opt-out): {result.skippedCount}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 font-semibold text-slate-500 hover:bg-slate-100"
          >
            {result ? "Tutup" : "Batal"}
          </button>
          {!result && (
            <button
              type="button"
              disabled={sending || validRecipients.length === 0}
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <Envelope className="h-3.5 w-3.5" />
              {sending ? "Mengirim ke Fonnte…" : `Kirim ke ${validRecipients.length} Penerima`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
