"use client";

import {
  X,
  FileText,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  MapPin,
  GraduationCap,
  CalendarBlank,
  PencilSimple,
  WhatsappLogo,
  Envelope,
  FloppyDisk,
  MagnifyingGlass,
  Eye,
  ArrowUp,
  ArrowDown,
  Warning,
} from "@/components/Icons";
import { normalizeName, normalizeSchool } from "@/lib/format-name";
import { SPMB_DOCUMENT_KEYS, SPMB_DOCUMENT_LABELS } from "@/lib/spmb-registration";
import type { SpmbDocumentKey, SpmbDocumentVerification, SpmbRegistration } from "@/lib/supabase";
import type { SpmbMessageTemplate } from "@/lib/queries";
import { statusConfig, pathLabels, InfoRow, BerkasItem } from "./shared";
import type { SpmbDetailTab } from "./types";

export interface CustomAnswer {
  key: string;
  label: string;
  value: string;
}

export interface SpmbDetailModalProps {
  item: SpmbRegistration;
  viewTab: SpmbDetailTab;
  customAnswers: CustomAnswer[];
  signedUrls: Record<string, string>;
  docVerifs: Record<string, SpmbDocumentVerification>;
  docVerifSaving: string | null;
  waTemplates: SpmbMessageTemplate[];
  waveName: string;
  canEdit: boolean;
  canVerify: boolean;
  canSeeSensitive: boolean;
  onClose: () => void;
  onTabChange: (t: SpmbDetailTab) => void;
  onVerifyDoc: (key: SpmbDocumentKey, status: "pending" | "verified" | "rejected") => void;
  onSendWa: (t: SpmbMessageTemplate) => void;
  onEdit: () => void;
  onScheduleInterview: () => void;
  onConfirmStatus: (id: string, status: "accepted" | "rejected") => void;
}

/** Modal detail pendaftar: header profil + tab + berkas + WA + footer aksi. */
export function SpmbDetailModal(props: SpmbDetailModalProps) {
  const {
    item: viewItem, viewTab, customAnswers, signedUrls, docVerifs, docVerifSaving,
    waTemplates, waveName, canEdit, canVerify, canSeeSensitive,
    onClose, onTabChange, onVerifyDoc, onSendWa, onEdit, onScheduleInterview, onConfirmStatus,
  } = props;

  const tabs = [
    { key: "siswa" as const, label: "Siswa" },
    { key: "kontak" as const, label: "Kontak" },
    { key: "ayah" as const, label: "Ayah" },
    { key: "ibu" as const, label: "Ibu" },
    // Hanya tampil bila pendaftar mengisi pertanyaan tambahan.
    ...(customAnswers.length > 0 ? [{ key: "tambahan" as const, label: "Tambahan" }] : []),
    // Berkas = dokumen pribadi (KK, akta, KTP ortu) → data sensitif.
    ...(canSeeSensitive ? [{ key: "berkas" as const, label: "Berkas" }] : []),
  ];
  const docCount = viewItem.documents
    ? [viewItem.documents.kk, viewItem.documents.akta, viewItem.documents.surat_sekolah, viewItem.documents.ktp_ortu, viewItem.documents.bukti_transfer].filter((v) => typeof v === "string" && v.length > 0).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary-light)] to-[var(--brand-accent)] px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
              {normalizeName(viewItem.full_name).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{normalizeName(viewItem.full_name)}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                {viewItem.documents?.nisn && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{viewItem.documents.nisn}</span>}
                {viewItem.documents?.nisn && viewItem.phone && <span>&middot;</span>}
                {viewItem.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{viewItem.phone}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig[viewItem.status]?.bg} ${statusConfig[viewItem.status]?.color}`}>
                  {(() => { const SI = statusConfig[viewItem.status]?.icon; return SI ? <SI className="h-2.5 w-2.5" /> : null; })()}
                  {statusConfig[viewItem.status]?.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {pathLabels[viewItem.registration_path] || viewItem.registration_path}
                </span>
                {waveName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <CalendarBlank className="h-2.5 w-2.5" />
                    {waveName}
                  </span>
                )}
                {viewItem.documents?.program && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white" title="Pilihan program">
                    {viewItem.documents.program}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="ml-auto shrink-0 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-slate-100 px-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => onTabChange(t.key)}
              className={`relative whitespace-nowrap px-4 py-2.5 text-xs font-semibold transition-colors ${viewTab === t.key ? "text-[var(--brand-primary)]" : "text-slate-400 hover:text-slate-600"}`}>
              {t.label}
              {t.key === "berkas" && docCount > 0 && <span className="ml-1 rounded-full bg-[var(--brand-primary)]/10 px-1.5 text-[10px] text-[var(--brand-primary)]">{docCount}</span>}
              {t.key === "tambahan" && <span className="ml-1 rounded-full bg-[var(--brand-primary)]/10 px-1.5 text-[10px] text-[var(--brand-primary)]">{customAnswers.length}</span>}
              {viewTab === t.key && <div className="absolute inset-x-2 -bottom-px h-0.5 bg-[var(--brand-primary)]" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {viewTab === "siswa" && (
            <div className="space-y-1">
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.birth_place || "-"} />
                <InfoRow icon={Clock} label="Tanggal Lahir" value={viewItem.birth_date ? new Date(viewItem.birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
                <InfoRow icon={Users} label="Jenis Kelamin" value={viewItem.gender === "L" ? "Laki-laki" : "Perempuan"} />
                <InfoRow icon={GraduationCap} label="Program" value={viewItem.documents?.program || "-"} />
                <InfoRow icon={GraduationCap} label="Jalur" value={pathLabels[viewItem.registration_path] || viewItem.registration_path} />
              </div>
              <div className="my-3 h-px bg-slate-100" />
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={Users} label="Nama Panggilan" value={normalizeName(viewItem.documents?.nickname) || "-"} />
                <InfoRow icon={CheckCircle} label="Golongan Darah" value={viewItem.documents?.blood_type || "-"} />
                <InfoRow icon={FileText} label="NISN" value={viewItem.documents?.nisn || "-"} />
                <InfoRow icon={FileText} label="NIK" value={viewItem.documents?.nik || "-"} />
                <InfoRow icon={ArrowUp} label="Tinggi Badan" value={viewItem.documents?.height ? `${viewItem.documents.height} cm` : "-"} />
                <InfoRow icon={ArrowDown} label="Berat Badan" value={viewItem.documents?.weight ? `${viewItem.documents.weight} kg` : "-"} />
                <InfoRow icon={MagnifyingGlass} label="Bahasa Sehari-hari" value={viewItem.documents?.language || "-"} />
                <InfoRow icon={Eye} label="Hobi" value={viewItem.documents?.hobby || "-"} />
                <InfoRow icon={GraduationCap} label="Cita-cita" value={viewItem.documents?.ambition || "-"} />
                <InfoRow icon={Users} label="Anak Ke-" value={viewItem.documents?.child_order ? `${viewItem.documents.child_order} dari ${viewItem.documents.siblings || "?"} bersaudara` : "-"} />
                <InfoRow icon={Warning} label="Yatim/Piatu" value={viewItem.documents?.orphan_status === "tidak" ? "Tidak" : viewItem.documents?.orphan_status === "yatim" ? "Yatim" : viewItem.documents?.orphan_status === "piatu" ? "Piatu" : viewItem.documents?.orphan_status === "yatim_piatu" ? "Yatim Piatu" : "-"} />
              </div>
            </div>
          )}

          {viewTab === "kontak" && (
            <div className="space-y-1">
              <InfoRow icon={MapPin} label="Alamat" value={viewItem.address || "-"} />
              <InfoRow icon={Phone} label="Telepon" value={viewItem.phone || "-"} />
              <InfoRow icon={Envelope} label="Email" value={viewItem.email || "-"} />
              <div className="my-3 h-px bg-slate-100" />
              <InfoRow icon={GraduationCap} label="Asal Sekolah" value={normalizeSchool(viewItem.previous_school) || "-"} />
            </div>
          )}

          {viewTab === "ayah" && (
            <div className="space-y-1">
              <InfoRow icon={Users} label="Nama" value={normalizeName(viewItem.parent_name?.split(" / ")[0]) || "-"} />
              <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.documents?.father_birth_place || "-"} />
              <InfoRow icon={Clock} label="Tanggal Lahir" value={viewItem.documents?.father_birth_date ? new Date(viewItem.documents.father_birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
              <InfoRow icon={GraduationCap} label="Pendidikan Terakhir" value={viewItem.documents?.father_education || "-"} />
              <InfoRow icon={FileText} label="Pekerjaan" value={viewItem.parent_occupation || "-"} />
              <InfoRow icon={FloppyDisk} label="Penghasilan/bulan" value={viewItem.documents?.father_income ? `Rp ${Number(viewItem.documents.father_income).toLocaleString("id-ID")}` : "-"} />
            </div>
          )}

          {viewTab === "ibu" && (
            <div className="space-y-1">
              <InfoRow icon={Users} label="Nama" value={normalizeName(viewItem.parent_name?.split(" / ")[1]) || "-"} />
              <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.documents?.mother_birth_place || "-"} />
              <InfoRow icon={Clock} label="Tanggal Lahir" value={viewItem.documents?.mother_birth_date ? new Date(viewItem.documents.mother_birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
              <InfoRow icon={GraduationCap} label="Pendidikan Terakhir" value={viewItem.documents?.mother_education || "-"} />
              <InfoRow icon={FileText} label="Pekerjaan" value={viewItem.documents?.mother_job || "-"} />
              <InfoRow icon={FloppyDisk} label="Penghasilan/bulan" value={viewItem.documents?.mother_income ? `Rp ${Number(viewItem.documents.mother_income).toLocaleString("id-ID")}` : "-"} />
            </div>
          )}

          {viewTab === "tambahan" && customAnswers.length > 0 && (
            <div className="space-y-1">
              {customAnswers.map((a) => (
                <InfoRow key={a.key} icon={FileText} label={a.label} value={a.value} />
              ))}
            </div>
          )}

          {viewTab === "berkas" && canSeeSensitive && (
            <div className="space-y-2">
              {SPMB_DOCUMENT_KEYS.map((key) => {
                const label = SPMB_DOCUMENT_LABELS[key];
                const url = signedUrls[key];
                const hasFile = !!url;
                const ext = hasFile ? url.split(".").pop()?.split("?")[0]?.toLowerCase() || "" : "";
                const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
                const isPdf = ext === "pdf";
                const v = docVerifs[key];
                return (
                  <div key={key} className="rounded-xl border border-slate-100 p-2">
                    <BerkasItem label={label} url={hasFile ? url : null} isImage={isImage} isPdf={isPdf} />
                    {canVerify && hasFile && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                        {v?.status === "verified" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Valid
                          </span>
                        ) : v?.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            <XCircle className="h-3 w-3" /> Ditolak
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Belum diverifikasi
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={docVerifSaving === key}
                          onClick={() => onVerifyDoc(key, "verified")}
                          className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          Valid
                        </button>
                        <button
                          type="button"
                          disabled={docVerifSaving === key}
                          onClick={() => onVerifyDoc(key, "rejected")}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-semibold text-red-700 disabled:opacity-50"
                        >
                          Tolak
                        </button>
                        {v && v.status !== "pending" && (
                          <button
                            type="button"
                            disabled={docVerifSaving === key}
                            onClick={() => onVerifyDoc(key, "pending")}
                            className="text-[10px] font-semibold text-slate-400 hover:underline disabled:opacity-50"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Catatan Admin */}
          {viewItem.admin_notes && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-semibold text-slate-400">Catatan Admin</p>
              <p className="text-sm text-slate-600">{viewItem.admin_notes}</p>
            </div>
          )}

          {/* Jadwal wawancara */}
          {(viewItem.interview_at || canVerify) && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-400">Wawancara</p>
              {viewItem.interview_at ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-purple-100 bg-purple-50/80 px-3 py-2 text-xs text-purple-700">
                  <CalendarBlank className="h-4 w-4 shrink-0 text-purple-500" />
                  <span className="font-semibold">
                    {new Date(viewItem.interview_at).toLocaleString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Jakarta",
                    })}
                  </span>
                  {viewItem.interview_note && <span className="w-full text-purple-600/80">{viewItem.interview_note}</span>}
                  {canVerify && (
                    <button
                      type="button"
                      onClick={onScheduleInterview}
                      className="ml-auto rounded-lg border border-purple-200 bg-white px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      Ubah Jadwal
                    </button>
                  )}
                </div>
              ) : (
                canVerify && (
                  <button
                    type="button"
                    onClick={onScheduleInterview}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                  >
                    <CalendarBlank className="h-3.5 w-3.5" />
                    Jadwalkan Wawancara
                  </button>
                )
              )}
            </div>
          )}

          {/* Kirim pesan WhatsApp memakai template (migrasi 0015) */}
          {canVerify && waTemplates.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-400">Kirim Pesan WhatsApp</p>
              <div className="flex flex-wrap gap-2">
                {waTemplates.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onSendWa(t)}
                    title={viewItem.phone ? `Kirim ke ${viewItem.phone}` : "Nomor kosong — pesan disalin"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <WhatsappLogo className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          {canEdit && (
            <button onClick={onEdit}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <PencilSimple className="h-4 w-4" /> Edit Data
            </button>
          )}
          {canVerify && viewItem.status === "pending" && (
            <>
              <button onClick={() => onConfirmStatus(viewItem.id, "rejected")}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                Tolak
              </button>
              <button onClick={() => onConfirmStatus(viewItem.id, "accepted")}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                Terima
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
