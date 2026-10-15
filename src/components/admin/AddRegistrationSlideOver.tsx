"use client";

import { useMemo, useState } from "react";
import { SlideOver, Input, InputRupiah, Select, DatePicker, FileUpload } from "@/components/ui";
import { SpmbCustomField, validateSpmbCustomAnswers } from "@/components/SpmbCustomField";
import {
  adminCreateRegistration,
  findDuplicateRegistrations,
  getWaveStatus,
  spmbAnswerKey,
  type SpmbRegistrationDuplicate,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import {
  KOTA_KABUPATEN,
  SPMB_PROGRAMS,
  SPMB_EMPTY_DOCUMENT_FILES,
  buildSpmbDocuments,
  createEmptySpmbRegistrationData,
  spmbDatePickerToIso,
  spmbParentName,
  type SpmbDocumentFiles,
  type SpmbRegistrationData,
} from "@/lib/spmb-registration";
import type { SpmbFormField, SpmbWave } from "@/lib/supabase";
import { FloppyDisk, Warning } from "@/components/Icons";

/** Tab panel "Tambah Pendaftar". */
type AddTab = "pendaftaran" | "siswa" | "orangtua" | "tambahan" | "berkas";

type RegistrationPath = "reguler" | "prestasi" | "beasiswa";

/** Berkas yang bisa diunggah admin — kunci sama dengan form publik. */
const DOC_FIELDS: { key: keyof SpmbDocumentFiles; label: string; base: string }[] = [
  { key: "kk", label: "Scan Kartu Keluarga", base: "kk" },
  { key: "akta", label: "Scan Akta Kelahiran", base: "akta" },
  { key: "surat_sekolah", label: "Scan Surat Keterangan Aktif dari Sekolah Asal", base: "surat" },
  { key: "ktp_ortu", label: "Scan KTP Ayah dan Ibu", base: "ktp" },
  { key: "bukti_transfer", label: "Bukti Transfer Pendaftaran", base: "transfer" },
];

/** Kunci data → tab tempat ia divalidasi (untuk lompat + penanda error). */
const ORTU_KEYS: string[] = [
  "father_name", "father_birth_place", "father_birth_date", "father_education", "father_job", "father_income",
  "mother_name", "mother_birth_place", "mother_birth_date", "mother_education", "mother_job", "mother_income",
  "phone", "email",
];
const SISWA_KEYS: string[] = [
  "full_name", "nickname", "gender", "blood_type", "birth_place", "birth_date", "nisn", "nik",
  "height", "weight", "language", "hobby", "ambition", "child_order", "siblings", "orphan_status",
  "previous_school", "address",
];

const PATH_OPTIONS: { label: string; value: RegistrationPath }[] = [
  { label: "Reguler", value: "reguler" },
  { label: "Prestasi", value: "prestasi" },
  { label: "Beasiswa", value: "beasiswa" },
];

const STATUS_OPTIONS = [
  { label: "Menunggu", value: "pending" },
  { label: "Diterima", value: "accepted" },
];

const WAVE_STATUS_LABEL: Record<string, string> = {
  upcoming: "Akan Datang",
  open: "Dibuka",
  closed: "Ditutup",
};

/** Tab tempat sebuah kunci error berada (untuk lompat + penanda di label tab). */
function tabOf(key: string, hasCustom: boolean): AddTab {
  if (key.startsWith("cf_")) return hasCustom ? "tambahan" : "pendaftaran";
  if (ORTU_KEYS.includes(key)) return "orangtua";
  if (SISWA_KEYS.includes(key)) return "siswa";
  return "pendaftaran";
}

/**
 * SlideOver input manual pendaftar SPMB oleh admin/panitia (pendaftar offline
 * atau dibantu via WA). Bentuk data yang disimpan SAMA dengan form publik —
 * memakai buildSpmbDocuments/spmbParentName dari modul bersama — supaya modal
 * detail, pencarian, dan Export CSV tetap bekerja.
 *
 * Validasi longgar: hanya nama lengkap wajib; NISN/NIK/HP/email divalidasi
 * formatnya hanya bila diisi; pertanyaan custom tervalidasi sesuai skema.
 * Duplikat NISN/NIK hanya PERINGATAN (banner kuning), tidak memblokir.
 *
 * Selalu di-mount ulang tiap dibuka ({addOpen && <… />}) → isian selalu kosong.
 */
export function AddRegistrationSlideOver({
  open,
  onClose,
  onCreated,
  waves,
  formFields,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Semua gelombang (termasuk disembunyikan/ditutup) — admin boleh memilih apa pun. */
  waves: SpmbWave[];
  /** Skema pertanyaan tambahan dari builder (hanya yang aktif yang ditampilkan). */
  formFields: SpmbFormField[];
}) {
  const [tab, setTab] = useState<AddTab>("pendaftaran");
  const [data, setData] = useState<SpmbRegistrationData>(createEmptySpmbRegistrationData);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<SpmbDocumentFiles>(SPMB_EMPTY_DOCUMENT_FILES);
  const [path, setPath] = useState<RegistrationPath>("reguler");
  const [status, setStatus] = useState<"pending" | "accepted">("pending");
  /** "" = tanpa gelombang. Default: gelombang published yang sedang "open" (sama dengan submitRegistration). */
  const [waveId, setWaveId] = useState<string>(
    () => waves.find((w) => w.is_published && getWaveStatus(w) === "open")?.id ?? ""
  );
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Peringatan duplikat (null = belum dicek / bersih). */
  const [dupes, setDupes] = useState<SpmbRegistrationDuplicate[] | null>(null);
  /** true setelah peringatan tampil — klik Simpan berikutnya lanjut ("Tetap simpan"). */
  const [dupAcknowledged, setDupAcknowledged] = useState(false);

  const customFields = useMemo(() => formFields.filter((f) => f.active), [formFields]);
  const hasCustom = customFields.length > 0;
  const tabs: { key: AddTab; label: string }[] = useMemo(
    () => [
      { key: "pendaftaran", label: "Pendaftaran" },
      { key: "siswa", label: "Siswa" },
      { key: "orangtua", label: "Orang Tua" },
      ...(hasCustom ? [{ key: "tambahan" as const, label: "Tambahan" }] : []),
      { key: "berkas", label: "Berkas" },
    ],
    [hasCustom]
  );

  const errorTabs = useMemo(() => {
    const s = new Set<AddTab>();
    for (const [k, v] of Object.entries(errors)) if (v) s.add(tabOf(k, hasCustom));
    return s;
  }, [errors, hasCustom]);

  /**
   * Tab yang sudah berisi isian (penanda titik di label tab).
   * Nilai default yang selalu terisi (gender "L", orphan_status "tidak",
   * jalur/status/gelombang) tidak dihitung supaya penandanya bermakna.
   */
  const filledTabs = useMemo(() => {
    const s = new Set<AddTab>();
    const has = (k: string) => ((data as Record<string, string>)[k] ?? "").trim() !== "";
    if (data.program.trim() || notes.trim()) s.add("pendaftaran");
    if (SISWA_KEYS.some((k) => k !== "gender" && k !== "orphan_status" && has(k))) s.add("siswa");
    if (ORTU_KEYS.some(has)) s.add("orangtua");
    if (customFields.some((f) => (custom[spmbAnswerKey(f.id)] || "").trim())) s.add("tambahan");
    if (DOC_FIELDS.some(({ key }) => docs[key])) s.add("berkas");
    return s;
  }, [data, notes, custom, customFields, docs]);

  /** Tab berikutnya (untuk tombol "Selanjutnya" di footer); null = sudah tab terakhir. */
  const nextTab = useMemo(() => {
    const i = tabs.findIndex((t) => t.key === tab);
    return i >= 0 && i < tabs.length - 1 ? tabs[i + 1] : null;
  }, [tabs, tab]);

  function update<K extends keyof SpmbRegistrationData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  /** Ubah NISN/NIK → peringatan duplikat lama tidak berlaku lagi. */
  function updateNisnNik(key: "nisn" | "nik", value: string) {
    update(key, value);
    setDupes(null);
    setDupAcknowledged(false);
  }

  function updateCustom(key: string, value: string) {
    setCustom((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function updateDoc(key: keyof SpmbDocumentFiles, file: File | null) {
    setDocs((prev) => ({ ...prev, [key]: file }));
  }

  /** Validasi longgar: hanya nama wajib; format dicek bila diisi; custom sesuai skema. */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!data.full_name.trim()) e.full_name = "Nama lengkap wajib diisi";
    if (data.nisn && !/^\d{10}$/.test(data.nisn)) e.nisn = "NISN harus 10 digit angka";
    if (data.nik && !/^\d{16}$/.test(data.nik)) e.nik = "NIK harus 16 digit angka";
    if (data.phone && !/^[\d\s+()-]{6,20}$/.test(data.phone)) e.phone = "No. HP tidak valid (6–20 karakter angka)";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Email tidak valid";
    Object.assign(e, validateSpmbCustomAnswers(customFields, custom));
    return e;
  }

  async function handleSave() {
    if (saving) return;

    const e = validate();
    setErrors(e);
    const firstError = Object.keys(e).find((k) => e[k]);
    if (firstError) {
      // Lompat ke tab berisi error pertama — penanda merah ikut tampil di labelnya.
      setTab(tabOf(firstError, hasCustom));
      setSubmitError(null);
      return;
    }

    // Peringatan duplikat (NISN/NIK sama) — tidak memblokir, klik kedua lanjut.
    if (!dupAcknowledged) {
      const found = await findDuplicateRegistrations({ nisn: data.nisn, nik: data.nik });
      if (found.length > 0) {
        setDupes(found);
        setDupAcknowledged(true);
        return;
      }
      setDupes(null);
    }

    setSaving(true);
    setSubmitError(null);

    // Folder unik PER INPUT — jangan memakai pola folder form publik
    // (spmb-<tahun>/<nisn>) karena NISN duplikat akan menimpa berkas pendaftar lain.
    const idPart = data.nisn.trim() || "manual";
    const folder = `spmb-${new Date().getFullYear()}/${idPart}-${Date.now()}`;
    const uploaded: string[] = [];

    try {
      const filePaths: Partial<Record<keyof SpmbDocumentFiles, string | null>> = {};
      for (const { key, base } of DOC_FIELDS) {
        const file = docs[key];
        if (!file) {
          filePaths[key] = null;
          continue;
        }
        const path = `${folder}/${base}.${file.name.split(".").pop()}`;
        const { error } = await supabase.storage
          .from("spmb-documents")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          throw new Error(
            error.message?.includes("file_size")
              ? `File "${file.name}" terlalu besar. Maksimal 10 MB.`
              : error.message?.includes("mime")
                ? `Format file "${file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.`
                : `Gagal upload "${file.name}". ${error.message}`
          );
        }
        uploaded.push(path);
        filePaths[key] = path;
      }

      const documents = buildSpmbDocuments(data, filePaths);
      // Jawaban pertanyaan tambahan (kunci cf_<id>) — hanya nilai non-kosong.
      for (const f of customFields) {
        const val = (custom[spmbAnswerKey(f.id)] || "").trim();
        if (val) documents[spmbAnswerKey(f.id)] = val;
      }
      // Penanda input manual — dibaca badge "Manual" di daftar pendaftar.
      documents.input_source = "admin";

      const result = await adminCreateRegistration({
        full_name: data.full_name,
        birth_place: data.birth_place,
        birth_date: spmbDatePickerToIso(data.birth_date),
        gender: data.gender === "P" ? "P" : "L",
        address: data.address,
        phone: data.phone,
        email: data.email,
        parent_name: spmbParentName(data),
        parent_occupation: data.father_job,
        previous_school: data.previous_school,
        registration_path: path,
        status,
        wave_id: waveId || null,
        admin_notes: notes,
        documents,
      });
      if (!result.success) {
        throw new Error(result.error || "Gagal menyimpan pendaftar.");
      }
      onCreated();
    } catch (err) {
      // Insert/upload gagal → bersihkan berkas yang sudah terunggah (best-effort).
      if (uploaded.length > 0) {
        supabase.storage.from("spmb-documents").remove(uploaded).catch(() => {});
      }
      setSubmitError(err instanceof Error && err.message ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={() => !saving && onClose()}
      title="Tambah Pendaftar"
      description="Input manual oleh admin (pendaftar offline / dibantu via WhatsApp)"
      wrapperClassName="md:max-w-3xl"
      toolbar={
        /* Bar tab DI LUAR area scroll (prop toolbar SlideOver) — selalu
           terlihat pada form panjang, tanpa celah padding seperti sticky.
           Penanda: merah = ada error validasi, hijau = tab sudah terisi. */
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-3">
          {/* Catatan wajib — ditulis sekali, digeser sejajar kanan baris tab
              agar panel lebih compact (hemat satu baris tinggi). */}
          <p className="text-xs font-medium text-slate-500">
            Hanya <span className="font-semibold text-[var(--brand-primary)]">Nama Lengkap</span> yang wajib.
          </p>
          <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {tabs.map((t) => {
              const hasError = errorTabs.has(t.key);
              const isActive = tab === t.key;
              return (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    isActive ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}>
                  {t.label}
                  {hasError && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-red-300" : "bg-red-500"}`}
                      title="Ada error validasi" aria-label="ada error validasi" />
                  )}
                  {!hasError && filledTabs.has(t.key) && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-emerald-500"}`}
                      title="Sudah terisi" aria-label="sudah terisi" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button onClick={onClose} disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            Batal
          </button>
          <div className="flex items-center gap-2">
            {/* Opsional: pindah ke tab berikutnya tanpa menyimpan —
                tab tetap bisa diklik langsung kapan pun. */}
            {nextTab && (
              <button type="button" onClick={() => setTab(nextTab.key)} disabled={saving}
                className="rounded-xl border border-[var(--brand-primary)]/25 px-4 py-2.5 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 disabled:opacity-40">
                Selanjutnya
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-70">
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FloppyDisk className="h-4 w-4" />
                  {dupes && dupes.length > 0 ? "Tetap simpan" : "Simpan"}
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {submitError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Peringatan duplikat — tidak memblokir; "Tetap simpan" melanjutkan. */}
        {dupes && dupes.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-semibold">
              <Warning className="h-4 w-4 shrink-0" />
              Kemungkinan pendaftar sudah terdaftar
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {dupes.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.full_name}</span>
                  {" — NISN/NIK sama ("}
                  {d.matched.map((m) => (m === "nisn" ? "NISN" : "NIK")).join(", ")}
                  {")"}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-amber-700">
              Periksa kembali NISN/NIK, atau klik &ldquo;Tetap simpan&rdquo; bila memang pendaftar berbeda.
            </p>
          </div>
        )}

        {/* Tab dipindah ke prop `toolbar` SlideOver (di luar area scroll). */}

        {/* ── Tab: Pendaftaran ───────────────────────────── */}
        {tab === "pendaftaran" && (
          <div className="space-y-4">
            <Select label="Program" options={SPMB_PROGRAMS} value={data.program}
              onChange={(val) => update("program", val)} placeholder="Pilih program" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select label="Jalur" options={PATH_OPTIONS} value={path}
                onChange={(val) => setPath(val as RegistrationPath)} />
              <Select label="Status Awal" options={STATUS_OPTIONS} value={status}
                onChange={(val) => setStatus(val as "pending" | "accepted")} />
              <Select label="Gelombang" value={waveId} onChange={setWaveId}
                options={[
                  { label: "Tanpa gelombang", value: "" },
                  ...waves.map((w) => ({
                    label: `${w.name} — ${WAVE_STATUS_LABEL[getWaveStatus(w)] || "?"}${w.is_published ? "" : " · disembunyikan"}`,
                    value: w.id,
                  })),
                ]} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">Catatan Admin</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="cth: didaftarkan via WA, berkas fisik diserahkan ke panitia"
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
            </div>
          </div>
        )}

        {/* ── Tab: Siswa (dikelompokkan seperti tab Orang Tua) ── */}
        {tab === "siswa" && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Identitas</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Nama Lengkap" required placeholder="Nama Lengkap Siswa"
                    value={data.full_name} onChange={(e) => update("full_name", e.target.value)} error={errors.full_name} />
                  <Input label="Nama Panggilan" placeholder="Nama Panggilan"
                    value={data.nickname} onChange={(e) => update("nickname", e.target.value)} error={errors.nickname} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select label="Jenis Kelamin" required options={["Laki-Laki", "Perempuan"]}
                    value={data.gender === "L" ? "Laki-Laki" : "Perempuan"}
                    onChange={(val) => update("gender", val === "Laki-Laki" ? "L" : "P")} />
                  <Input label="Golongan Darah" placeholder="(contoh: A/B/AB/O)"
                    value={data.blood_type} onChange={(e) => update("blood_type", e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Kelahiran &amp; Identitas Resmi</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select searchable label="Tempat Lahir" options={KOTA_KABUPATEN} value={data.birth_place}
                    onChange={(val) => update("birth_place", val)} placeholder="Pilih kota/kabupaten" error={errors.birth_place} />
                  <DatePicker label="Tanggal Lahir" value={data.birth_date}
                    onChange={(val) => update("birth_date", val)} error={errors.birth_date} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="NISN" placeholder="10 digit angka"
                    value={data.nisn} onChange={(e) => updateNisnNik("nisn", e.target.value)} error={errors.nisn} />
                  <Input label="NIK" placeholder="16 digit angka"
                    value={data.nik} onChange={(e) => updateNisnNik("nik", e.target.value)} error={errors.nik} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Fisik &amp; Minat</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Tinggi Badan (cm)" placeholder="Contoh: 150"
                    value={data.height} onChange={(e) => update("height", e.target.value)} />
                  <Input label="Berat Badan (kg)" placeholder="Contoh: 40"
                    value={data.weight} onChange={(e) => update("weight", e.target.value)} />
                </div>
                <Input label="Bahasa Sehari-hari" placeholder="Contoh: Bahasa Indonesia, Bahasa Jawa, Bahasa Inggris"
                  value={data.language} onChange={(e) => update("language", e.target.value)} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Hobi" placeholder="Contoh: Membaca, Olahraga"
                    value={data.hobby} onChange={(e) => update("hobby", e.target.value)} />
                  <Input label="Cita-cita" placeholder="Contoh: Guru, Dokter"
                    value={data.ambition} onChange={(e) => update("ambition", e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Keluarga</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Anak Ke-" placeholder="Contoh: 2"
                    value={data.child_order} onChange={(e) => update("child_order", e.target.value)} />
                  <Input label="Jumlah Saudara" placeholder="Contoh: 3"
                    value={data.siblings} onChange={(e) => update("siblings", e.target.value)} />
                </div>
                <Select label="Yatim/Piatu" options={["Tidak", "Yatim", "Piatu", "Yatim Piatu"]}
                  value={data.orphan_status === "tidak" ? "Tidak" : data.orphan_status === "yatim" ? "Yatim" : data.orphan_status === "piatu" ? "Piatu" : "Yatim Piatu"}
                  onChange={(val) => update("orphan_status", val === "Tidak" ? "tidak" : val === "Yatim" ? "yatim" : val === "Piatu" ? "piatu" : "yatim_piatu")} />
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Sekolah &amp; Alamat</h4>
              <div className="space-y-4">
                <Input label="Asal Sekolah" placeholder="Nama Sekolah Asal"
                  value={data.previous_school} onChange={(e) => update("previous_school", e.target.value)} />
                <Input label="Alamat Lengkap" placeholder="Alamat Domisili"
                  value={data.address} onChange={(e) => update("address", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Orang Tua ─────────────────────────────── */}
        {tab === "orangtua" && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Data Ayah</h4>
              <div className="space-y-4">
                <Input label="Nama Ayah Kandung" placeholder="Nama Ayah"
                  value={data.father_name} onChange={(e) => update("father_name", e.target.value)} error={errors.father_name} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select searchable label="Tempat Lahir" options={KOTA_KABUPATEN} value={data.father_birth_place}
                    onChange={(val) => update("father_birth_place", val)} placeholder="Pilih kota/kabupaten" error={errors.father_birth_place} />
                  <DatePicker label="Tanggal Lahir" value={data.father_birth_date}
                    onChange={(val) => update("father_birth_date", val)} error={errors.father_birth_date} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Pendidikan Terakhir" placeholder="Contoh: SMA, SMK, S1"
                    value={data.father_education} onChange={(e) => update("father_education", e.target.value)} />
                  <Input label="Pekerjaan" placeholder="Contoh: Wiraswasta, Karyawan"
                    value={data.father_job} onChange={(e) => update("father_job", e.target.value)} />
                </div>
                <InputRupiah label="Penghasilan (Perbulan)" placeholder="0"
                  value={data.father_income} onChange={(val) => update("father_income", val)} />
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Data Ibu</h4>
              <div className="space-y-4">
                <Input label="Nama Ibu Kandung" placeholder="Nama Ibu"
                  value={data.mother_name} onChange={(e) => update("mother_name", e.target.value)} error={errors.mother_name} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select searchable label="Tempat Lahir" options={KOTA_KABUPATEN} value={data.mother_birth_place}
                    onChange={(val) => update("mother_birth_place", val)} placeholder="Pilih kota/kabupaten" error={errors.mother_birth_place} />
                  <DatePicker label="Tanggal Lahir" value={data.mother_birth_date}
                    onChange={(val) => update("mother_birth_date", val)} error={errors.mother_birth_date} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Pendidikan Terakhir" placeholder="Contoh: SMA, SMK, S1"
                    value={data.mother_education} onChange={(e) => update("mother_education", e.target.value)} />
                  <Input label="Pekerjaan" placeholder="Contoh: Ibu Rumah Tangga, Guru"
                    value={data.mother_job} onChange={(e) => update("mother_job", e.target.value)} />
                </div>
                <InputRupiah label="Penghasilan (Perbulan)" placeholder="0"
                  value={data.mother_income} onChange={(val) => update("mother_income", val)} />
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">Kontak Orang Tua</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="No. HP/WA" placeholder="08xxxxxxxxxx"
                  value={data.phone} onChange={(e) => update("phone", e.target.value)} error={errors.phone} />
                <Input label="Email" type="email" placeholder="email@contoh.com"
                  value={data.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Tambahan (hanya bila ada pertanyaan custom aktif) ── */}
        {tab === "tambahan" && hasCustom && (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">Pertanyaan tambahan dari builder form pendaftaran.</p>
            {customFields.map((f) => (
              <div key={f.id} className="rounded-xl border border-[#dce3ed] bg-[#f4f7fb]/60 p-4">
                <SpmbCustomField
                  field={f}
                  value={custom[spmbAnswerKey(f.id)] || ""}
                  error={errors[spmbAnswerKey(f.id)]}
                  onChange={(val) => updateCustom(spmbAnswerKey(f.id), val)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Berkas (semua opsional; tidak ada fitur unggah
               menyusul — dokumen hanya bisa dipilih saat menyimpan) ── */}
        {tab === "berkas" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Semua berkas opsional. Format: PDF, JPG, PNG, WebP. Maksimal 10 MB per file.
            </p>
            <div className="space-y-3">
              {DOC_FIELDS.map(({ key, label }) => (
                <FileUpload key={key} label={label} compact value={docs[key]}
                  onChange={(file) => updateDoc(key, file)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  );
}
