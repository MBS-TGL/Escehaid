"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getRegistrationList,
  updateRegistrationStatus,
  updateRegistrationBulkStatus,
  deleteRegistration,
  deleteRegistrationBulk,
  getWavesAll,
  createWave,
  updateWave,
  deleteWave,
  getWaveStatus,
  getSchoolProfile,
  setRegistrationMode,
  setSpmbDocuments,
  setSpmbFormSchema,
  normalizeSpmbFormSchema,
  reorderWaves,
  spmbAnswerKey,
  spmbFieldNeedsOptions,
  SPMB_FIELD_TYPES,
  GOOGLE_FORM_URL,
  revalidatePaths,
} from "@/lib/queries";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { SortableList } from "@/components/admin/sortable/SortableList";
import { SortableRow } from "@/components/admin/sortable/SortableRow";
import { SortableGrip } from "@/components/admin/sortable/SortableGrip";
import { useReorder } from "@/lib/admin/useReorder";
import { normalizeName, normalizeSchool } from "@/lib/format-name";
import { formatRelativeTime, daysSince, PENDING_SLA_DAYS } from "@/lib/admin-display";
import type { SpmbRegistration, SpmbWave, SpmbFormField, SpmbFieldType } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import {
  MagnifyingGlass,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  X,
  FileText,
  Clock as CalendarIcon,
  Phone,
  Envelope,
  MapPin,
  GraduationCap,
  CaretLeft,
  CaretRight,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
  CalendarBlank,
  Upload,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  RowActionsMenu,
  StatusDot,
  QuietBadge,
  type RowAction,
  type StatusTone,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";
import { RegistrationFormSlideOver } from "@/components/admin/RegistrationFormSlideOver";
import { ImportRegistrationsModal } from "@/components/admin/ImportRegistrationsModal";

const PAGE_SIZE = 10;

/* Ikon "buka di tab baru" — SVG inline gaya file ini (sama dengan tombol Buka pada preview lampiran). */
const ExternalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: "Menunggu", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  accepted: { label: "Diterima", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "Ditolak", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
};

const pathLabels: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

/** Warna titik status pada avatar baris mobile: amber = menunggu,
 *  hijau = diterima, merah = ditolak. */
const DOT_TONE: Record<SpmbRegistration["status"], StatusTone> = {
  pending: "pending",
  accepted: "active",
  rejected: "danger",
};

const pathColors: Record<string, string> = {
  reguler: "bg-slate-100 text-slate-700",
  prestasi: "bg-blue-50 text-blue-700",
  beasiswa: "bg-purple-50 text-purple-700",
};

type SortField = "created_at" | "full_name" | "status" | "registration_path";
type SortDir = "asc" | "desc";

/** Tab utama halaman: daftar pendaftar atau pengelolaan gelombang. */
type MainTab = "registrations" | "waves";

/** State form tambah/edit gelombang pendaftaran. */
type WaveFormState = {
  name: string;
  start_date: string;
  end_date: string;
  note: string;
  is_published: boolean;
};

/** Draft form tambah/edit pertanyaan custom (builder alа Google Form). */
type FieldDraft = {
  label: string;
  type: SpmbFieldType;
  required: boolean;
  active: boolean;
  placeholder: string;
  help: string;
  /** Daftar opsi untuk select/radio/checkbox — satu opsi per baris. */
  optionsText: string;
};

/** Label tipe pertanyaan custom untuk badge daftar. */
const fieldTypeLabel = (t: SpmbFieldType): string =>
  SPMB_FIELD_TYPES.find((x) => x.value === t)?.label || t;

/** Batas jumlah pertanyaan custom (sinkron dengan normalizeSpmbFormSchema). */
const FIELD_MAX = 50;

const waveStatusConfig: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Akan Datang", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  open: { label: "Dibuka", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  closed: { label: "Ditutup", cls: "border-slate-200 bg-slate-100 text-slate-500" },
};

/** Format "YYYY-MM-DD" → "20 Okt 2026" (id-ID), tanpa geser zona waktu. */
function formatWaveDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminSPMBPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi SPMB — penegakan sesungguhnya di proxy.ts + RLS + trigger.
  // Sebelumnya halaman ini NOL pengecekan izin: siapa pun yang bisa membuka
  // /admin/admission bisa memverifikasi, mengekspor, dan menghapus pendaftar.
  const permCreate = can("spmb:create");
  const permUpdate = can("spmb:update");
  const permVerify = can("spmb:verify");
  const permImport = can("spmb:import");
  const permExport = can("spmb:export");
  const permDelete = can("spmb:delete");
  const permSensitive = can("spmb:view_sensitive");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [data, setData] = useState<SpmbRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile) — baris memakai checkbox, bar aksi massal sticky
  // muncul di atas bottom nav admin.
  const [pickMode, setPickMode] = useState(false);

  // Modals
  const [viewItem, setViewItem] = useState<SpmbRegistration | null>(null);
  const [viewTab, setViewTab] = useState<"siswa" | "kontak" | "ayah" | "ibu" | "berkas" | "tambahan">("siswa");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [deleteItem, setDeleteItem] = useState<SpmbRegistration | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: "accepted" | "rejected" } | null>(null);
  /** Panel "Tambah Pendaftar" (input manual admin) — mount ulang tiap dibuka. */
  const [addOpen, setAddOpen] = useState(false);
  /** Modal "Import Pendaftar" (massal dari ekspor Google Form). */
  const [importOpen, setImportOpen] = useState(false);

  // Edit panel — form penuh (RegistrationFormSlideOver mode "edit")
  const [editItem, setEditItem] = useState<SpmbRegistration | null>(null);

  // Gelombang pendaftaran
  const [mainTab, setMainTab] = useState<MainTab>("registrations");
  /** Mode sumber pendaftaran (kartu "Sumber Pendaftaran" di tab Gelombang). */
  const [regMode, setRegMode] = useState<"google_form" | "internal">("google_form");
  const [regModeSaving, setRegModeSaving] = useState(false);
  /** Link Google Form tersimpan + draft isi modal + status modal. */
  const [regUrl, setRegUrl] = useState(GOOGLE_FORM_URL);
  const [googleUrlDraft, setGoogleUrlDraft] = useState(GOOGLE_FORM_URL);
  const [googleModal, setGoogleModal] = useState(false);
  /** Kartu "Pengaturan SPMB": draft input, error per-input, status simpan. */
  const [docBrochure, setDocBrochure] = useState("");
  const [docOffline, setDocOffline] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docHighlight, setDocHighlight] = useState("");
  const [docBrochureErr, setDocBrochureErr] = useState<string | null>(null);
  const [docOfflineErr, setDocOfflineErr] = useState<string | null>(null);
  const [docPhoneErr, setDocPhoneErr] = useState<string | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  /** Nilai tersimpan — tombol Simpan hanya aktif bila draft berbeda (dirty). */
  const [docBrochureSaved, setDocBrochureSaved] = useState("");
  const [docOfflineSaved, setDocOfflineSaved] = useState("");
  const [docPhoneSaved, setDocPhoneSaved] = useState("");
  const [docHighlightSaved, setDocHighlightSaved] = useState("");
  const [waves, setWaves] = useState<SpmbWave[]>([]);
  const [wavesLoading, setWavesLoading] = useState(true);
  const [wavesError, setWavesError] = useState<string | null>(null);
  const [waveForm, setWaveForm] = useState<WaveFormState | null>(null);
  const [waveEditing, setWaveEditing] = useState<SpmbWave | null>(null);
  const [waveFormError, setWaveFormError] = useState<string | null>(null);
  const [waveSaving, setWaveSaving] = useState(false);
  const [deleteWaveItem, setDeleteWaveItem] = useState<SpmbWave | null>(null);
  const [waveDeleting, setWaveDeleting] = useState(false);
  /**
   * Gelombang yang hasil seleksinya akan dipublikasikan/ditarik.
   * Berupa modal konfirmasi — publikasi hasil bersifat sensitif (status
   * pendaftar langsung terlihat publik), jadi tidak boleh sekali klik.
   */
  const [resultWave, setResultWave] = useState<SpmbWave | null>(null);
  const [resultSaving, setResultSaving] = useState(false);

  // Builder pertanyaan tambahan form pendaftaran (ala Google Form)
  const [formFields, setFormFields] = useState<SpmbFormField[]>([]);
  const [fieldForm, setFieldForm] = useState<FieldDraft | null>(null);
  const [fieldEditingId, setFieldEditingId] = useState<string | null>(null);
  const [fieldFormError, setFieldFormError] = useState<string | null>(null);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [deleteFieldItem, setDeleteFieldItem] = useState<SpmbFormField | null>(null);

  const fetchData = useCallback(async () => {
    const registrations = await getRegistrationList();
    setData(registrations);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchData();
    })().catch(() => {});
  }, [fetchData]);

  const fetchWaves = useCallback(async () => {
    setWavesLoading(true);
    try {
      const list = await getWavesAll();
      setWaves(list);
      setWavesError(null);
    } catch (e) {
      setWavesError(e instanceof Error && e.message ? e.message : "Gagal memuat data gelombang");
    }
    setWavesLoading(false);
  }, []);

  // Selalu muat gelombang (dipakai tab Gelombang + label nama gelombang di detail pendaftar)
  useEffect(() => {
    (async () => {
      await fetchWaves();
    })().catch(() => {});
  }, [fetchWaves]);

  // Muat mode sumber pendaftaran + link Google Form tersimpan (kartu di tab Gelombang)
  useEffect(() => {
    let alive = true;
    getSchoolProfile().then((p) => {
      if (!alive) return;
      const savedUrl = p?.google_form_url?.trim() || GOOGLE_FORM_URL;
      setRegMode(p?.registration_mode === "internal" ? "internal" : "google_form");
      setRegUrl(savedUrl);
      setGoogleUrlDraft(savedUrl);
      const brochureVal = p?.spmb_brochure_url?.trim() || "";
      const offlineVal = p?.spmb_offline_form_url?.trim() || "";
      const phoneVal = p?.spmb_contact_phone?.trim() || "";
      const highlightVal = p?.spmb_highlight_text?.trim() || "";
      setDocBrochure(brochureVal);
      setDocBrochureSaved(brochureVal);
      setDocOffline(offlineVal);
      setDocOfflineSaved(offlineVal);
      setDocPhone(phoneVal);
      setDocPhoneSaved(phoneVal);
      setDocHighlight(highlightVal);
      setDocHighlightSaved(highlightVal);
      setFormFields(normalizeSpmbFormSchema(p?.spmb_form_schema));
    });
    return () => { alive = false; };
  }, []);

  /** Ganti mode ke Form Internal, lalu muat ulang halaman publik terkait. */
  const handleChangeRegMode = async (mode: "google_form" | "internal") => {
    if (mode === regMode || regModeSaving) return;
    setRegModeSaving(true);
    const { error } = await setRegistrationMode(mode);
    setRegModeSaving(false);
    if (error) {
      toast(error, "error");
      return;
    }
    setRegMode(mode);
    toast(
      mode === "internal"
        ? "Mode Form Internal — tombol Daftar kini menuju /admission/register"
        : "Mode Google Form — tombol Daftar kini menuju Google Form",
      "success"
    );
    revalidatePaths(["/", "/admission", "/admission/register"]).catch(() => { });
  };

  /** Simpan link Google Form dari modal, aktifkan mode Google Form, muat ulang halaman publik. */
  const handleSaveGoogleUrl = async () => {
    const url = googleUrlDraft.trim();
    if (url && !/^https:\/\/[^\s]+\.[^\s]+/.test(url)) {
      toast("Link tidak valid — harus diawali https://", "error");
      return;
    }
    setRegModeSaving(true);
    const { error } = await setRegistrationMode("google_form", url || null);
    setRegModeSaving(false);
    if (error) {
      toast(error, "error");
      return;
    }
    const saved = url || GOOGLE_FORM_URL;
    setRegMode("google_form");
    setRegUrl(saved);
    setGoogleUrlDraft(saved);
    setGoogleModal(false);
    toast(
      url ? "Link Google Form disimpan — tombol Daftar mengarah ke link tersebut" : "Mode Google Form aktif dengan link bawaan",
      "success"
    );
    revalidatePaths(["/", "/admission", "/admission/register"]).catch(() => { });
  };

  /** Benar bila draft pengaturan SPMB berbeda dari nilai tersimpan (tombol Simpan hanya aktif saat dirty). */
  const docDirty =
    docBrochure.trim() !== docBrochureSaved ||
    docOffline.trim() !== docOfflineSaved ||
    docPhone.trim() !== docPhoneSaved ||
    docHighlight.trim() !== docHighlightSaved;

  /** Simpan pengaturan SPMB (brosur, formulir offline, WA panitia, sorotan) ke school_profile, lalu revalidasi root layout. */
  const handleSaveDocs = async () => {
    const brochure = docBrochure.trim();
    const offlineRaw = docOffline.trim();
    const phone = docPhone.trim();
    const highlight = docHighlight.trim();
    // Validasi https:// (CHECK constraint di database) — pesan tampil di input, tidak dikirim ke DB.
    let valid = true;
    if (brochure && !brochure.startsWith("https://")) {
      setDocBrochureErr("Link harus diawali https://");
      valid = false;
    } else {
      setDocBrochureErr(null);
    }
    if (offlineRaw && !offlineRaw.startsWith("https://")) {
      setDocOfflineErr("Link harus diawali https://");
      valid = false;
    } else {
      setDocOfflineErr(null);
    }
    // Validasi nomor WA: hanya angka/spasi/"-"/"+", maksimal 20 karakter.
    if (phone && !/^[\d\s+-]+$/.test(phone)) {
      setDocPhoneErr("Hanya boleh angka, spasi, tanda - dan +");
      valid = false;
    } else if (phone.length > 20) {
      setDocPhoneErr("Maksimal 20 karakter");
      valid = false;
    } else {
      setDocPhoneErr(null);
    }
    if (!valid) return;
    // Share link Google Drive (file/d/<ID>/...) → link unduh langsung (khusus formulir offline).
    const driveId = offlineRaw.match(/^https:\/\/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1];
    const offline = driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : offlineRaw;

    setDocSaving(true);
    const { error } = await setSpmbDocuments({
      spmb_brochure_url: brochure || null,
      spmb_offline_form_url: offline || null,
      spmb_contact_phone: phone || null,
      spmb_highlight_text: highlight || null,
    });
    setDocSaving(false);
    if (error) {
      toast(error, "error");
      return;
    }
    setDocBrochure(brochure);
    setDocOffline(offline);
    setDocBrochureSaved(brochure);
    setDocOfflineSaved(offline);
    setDocPhone(phone);
    setDocPhoneSaved(phone);
    setDocHighlight(highlight);
    setDocHighlightSaved(highlight);
    toast("Pengaturan SPMB disimpan", "success");
    // Footer & banner ada di root layout → revalidate layout (ikut me-refresh semua halaman di bawahnya).
    revalidatePaths(["/"], "layout").catch(() => { });
  };

  // ── Builder pertanyaan tambahan form pendaftaran ────────

  /** Simpan seluruh daftar pertanyaan ke school_profile, lalu refresh halaman publik. */
  async function persistFields(next: SpmbFormField[], successMsg: string): Promise<boolean> {
    if (next.length > FIELD_MAX) {
      toast(`Maksimal ${FIELD_MAX} pertanyaan`, "error");
      return false;
    }
    const { error } = await setSpmbFormSchema(next);
    if (error) {
      toast(error, "error");
      return false;
    }
    setFormFields(next);
    toast(successMsg, "success");
    revalidatePaths(["/admission/register"]).catch(() => { });
    return true;
  }

  function openFieldForm(field?: SpmbFormField) {
    setFieldEditingId(field?.id ?? null);
    setFieldFormError(null);
    setFieldForm(
      field
        ? {
          label: field.label,
          type: field.type,
          required: field.required,
          active: field.active,
          placeholder: field.placeholder || "",
          help: field.help || "",
          optionsText: (field.options || []).join("\n"),
        }
        : { label: "", type: "text", required: false, active: true, placeholder: "", help: "", optionsText: "" }
    );
  }

  async function handleSaveField() {
    if (!fieldForm) return;
    const label = fieldForm.label.trim();
    if (!label) {
      setFieldFormError("Pertanyaan wajib diisi.");
      return;
    }
    const needsOptions = spmbFieldNeedsOptions(fieldForm.type);
    const options = needsOptions
      ? fieldForm.optionsText.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 30)
      : [];
    if (needsOptions && options.length === 0) {
      setFieldFormError("Tipe ini butuh minimal satu opsi — tulis satu opsi per baris.");
      return;
    }
    const draft: SpmbFormField = {
      id:
        fieldEditingId ||
        (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      label,
      type: fieldForm.type,
      required: fieldForm.required,
      active: fieldForm.active,
      placeholder: fieldForm.placeholder.trim(),
      help: fieldForm.help.trim(),
      options,
    };
    const next = fieldEditingId
      ? formFields.map((f) => (f.id === fieldEditingId ? draft : f))
      : [...formFields, draft];
    setFieldSaving(true);
    const ok = await persistFields(
      next,
      fieldEditingId ? "Pertanyaan berhasil diperbarui" : "Pertanyaan berhasil ditambahkan"
    );
    setFieldSaving(false);
    if (ok) {
      setFieldForm(null);
      setFieldEditingId(null);
    }
  }

  async function handleMoveField(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= formFields.length) return;
    const next = [...formFields];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    await persistFields(next, "Urutan pertanyaan diperbarui");
  }

  async function handleToggleField(field: SpmbFormField) {
    const next = formFields.map((f) => (f.id === field.id ? { ...f, active: !f.active } : f));
    await persistFields(
      next,
      field.active ? "Pertanyaan disembunyikan dari form pendaftaran" : "Pertanyaan ditampilkan di form pendaftaran"
    );
  }

  async function handleDeleteField() {
    if (!deleteFieldItem) return;
    const id = deleteFieldItem.id;
    setDeleteFieldItem(null);
    await persistFields(formFields.filter((f) => f.id !== id), "Pertanyaan berhasil dihapus");
  }

  /** Buka modal detail dengan tab selalu mulai dari "Siswa". */
  function openDetail(item: SpmbRegistration) {
    setViewItem(item);
    setViewTab("siswa");
  }

  /** Jawaban pertanyaan tambahan pendaftar — label dari skema, fallback utk field yg dihapus. */
  const customAnswers = useMemo(() => {
    if (!viewItem?.documents) return [];
    const docs = viewItem.documents;
    const entries: { key: string; label: string; value: string }[] = [];
    for (const f of formFields) {
      const k = spmbAnswerKey(f.id);
      const v = docs[k];
      if (typeof v === "string" && v.trim()) entries.push({ key: k, label: f.label, value: v });
    }
    for (const [k, v] of Object.entries(docs)) {
      if (k.startsWith("cf_") && typeof v === "string" && v.trim() && !entries.some((e) => e.key === k)) {
        entries.push({ key: k, label: "Pertanyaan (sudah dihapus dari form)", value: v });
      }
    }
    return entries;
  }, [viewItem, formFields]);

  /** Nama gelombang untuk wave_id; "" bila tidak ada / belum termuat. */
  const waveLabel = (id?: string | null): string => (id ? waves.find((w) => w.id === id)?.name || "" : "");

  // Generate signed URLs when viewItem changes
  useEffect(() => {
    const docKeys = ["kk", "akta", "surat_sekolah", "ktp_ortu", "bukti_transfer"];
    const docs = viewItem?.documents;
    const paths = docs
      ? docKeys
          .map((key) => ({ key, path: docs[key] }))
          .filter(
            (item): item is { key: string; path: string } =>
              typeof item.path === "string" && item.path.length > 0
          )
      : [];
    // Selalu tulis hasilnya — termasuk objek kosong saat tidak ada dokumen —
    // di dalam callback async, sehingga tidak ada setState sinkron dalam effect.
    (async () => {
      const urls: Record<string, string> = {};
      // Nilai http(s) (mis. unggahan Google Form saat import) adalah URL final
      // — langsung dipakai, tanpa createSignedUrl.
      const needSign = paths.filter((p) => !/^https?:\/\//i.test(p.path));
      paths.filter((p) => /^https?:\/\//i.test(p.path)).forEach(({ key, path }) => { urls[key] = path; });
      await Promise.all(needSign.map(async ({ key, path }) => {
        const res = await fetch("/api/admin/storage/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
        const j = (await res.json().catch(() => ({}))) as { signedUrl?: string };
        if (res.ok && j.signedUrl) urls[key] = j.signedUrl;
      }));
      setSignedUrls(urls);
    })();
  }, [viewItem]);

  // Filtered + Sorted
  const filtered = useMemo(() => {
    const result = data.filter((item) => {
      const q = search.toLowerCase();
      // Jawaban pertanyaan tambahan ikut dicari (kunci cf_<id> di documents).
      const customText = item.documents
        ? Object.keys(item.documents)
            .filter((k) => k.startsWith("cf_"))
            .map((k) => item.documents?.[k] || "")
            .join(" ")
            .toLowerCase()
        : "";
      const matchSearch =
        item.full_name.toLowerCase().includes(q) ||
        (item.previous_school && item.previous_school.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        customText.includes(q);
      const matchFilter = filter === "all" || item.status === filter;
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "full_name") cmp = a.full_name.localeCompare(b.full_name);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else if (sortField === "registration_path") cmp = (a.registration_path || "").localeCompare(b.registration_path || "");
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [data, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: data.length,
    pending: data.filter((d) => d.status === "pending").length,
    accepted: data.filter((d) => d.status === "accepted").length,
    rejected: data.filter((d) => d.status === "rejected").length,
  };

  // Opsi dropdown status — dipakai toolbar desktop & mobile agar seragam.
  const statusOptions = [
    { key: "all", label: "Semua", count: stats.total },
    { key: "pending", label: "Menunggu", count: stats.pending },
    { key: "accepted", label: "Diterima", count: stats.accepted },
    { key: "rejected", label: "Ditolak", count: stats.rejected },
  ];

  const allVisibleSelected = paginated.length > 0 && paginated.every((item) => selectedIds.has(item.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const s = new Set(selectedIds);
      paginated.forEach((item) => s.delete(item.id));
      setSelectedIds(s);
    } else {
      const s = new Set(selectedIds);
      paginated.forEach((item) => s.add(item.id));
      setSelectedIds(s);
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  }

  // ── Mode pilih (mobile) ─────────────────────────────────────
  /** Masuk mode pilih; bila `id` diisi (long-press), baris itu langsung tercentang. */
  function enterPickMode(id?: string) {
    setPickMode(true);
    if (id) {
      const s = new Set(selectedIds);
      s.add(id);
      setSelectedIds(s);
    }
  }

  /** Keluar mode pilih dan hapus semua centang. */
  function exitPickMode() {
    setPickMode(false);
    setSelectedIds(new Set());
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  /** Export daftar (mengikuti filter + pencarian aktif) ke CSV — bisa dibuka langsung di Excel. */
  function handleExportCsv() {
    const customCols = formFields.map((f) => ({ key: spmbAnswerKey(f.id), label: f.label }));
    const headers = [
      "No", "Nama Lengkap", "Email", "Telepon", "Asal Sekolah",
      "Jalur", "Gelombang", "Status", "Tanggal Daftar",
      ...customCols.map((c) => c.label),
    ];
    /**
     * Sel CSV:
     * - CSV injection: sel yang diawali = + - @ diberi awalan `'` agar
     *   tidak dieksekusi sebagai formula oleh Excel/Sheets.
     * - forceText (telepon): awalan `'` menahan angka sebagai teks supaya
     *   0 di depan tidak hilang saat dibuka di Excel.
     */
    const cell = (v: unknown, forceText = false) => {
      let s = String(v ?? "");
      if (forceText || /^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.map((h) => cell(h)).join(";")];
    filtered.forEach((r, i) => {
      lines.push(
        [
          i + 1,
          normalizeName(r.full_name),
          r.email,
          cell(r.phone, true),
          normalizeSchool(r.previous_school),
          pathLabels[r.registration_path] || r.registration_path,
          waveLabel(r.wave_id) || "-",
          statusConfig[r.status]?.label || r.status,
          new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
          ...customCols.map((c) => (r.documents?.[c.key] ?? "").toString()),
        ]
          .map((v) => cell(v))
          .join(";")
      );
    });
    // BOM agar Excel membaca UTF-8; pemisah ";" mengikuti lokalitas Excel Indonesia.
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pendaftar-spmb-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`${filtered.length} pendaftar diekspor ke CSV`, "success");
  }

  async function handleUpdateStatus(id: string, status: "accepted" | "rejected") {
    try {
      await updateRegistrationStatus(id, status);
      toast("Status berhasil diubah", "success");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal mengubah status", "error");
    }
    setConfirmAction(null);
    setViewItem(null);
    exitPickMode();
    fetchData();
  }

  async function handleBulkStatus(status: "accepted" | "rejected") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await updateRegistrationBulkStatus(ids, status);
      toast(`${ids.length} pendaftaran berhasil diubah statusnya`, "success");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal mengubah status", "error");
    }
    setConfirmAction(null);
    exitPickMode();
    fetchData();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteRegistration(deleteItem.id);
      toast("Pendaftaran berhasil dihapus", "success");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal menghapus pendaftaran", "error");
    }
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchData();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await deleteRegistrationBulk(ids);
      toast(`${ids.length} pendaftaran berhasil dihapus`, "success");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal menghapus pendaftaran", "error");
    }
    setBulkDelete(false);
    exitPickMode();
    fetchData();
  }

  async function handleToggleStatus(item: SpmbRegistration) {
    const nextStatus = item.status === "pending" ? "accepted" : item.status === "accepted" ? "rejected" : "pending";
    try {
      await updateRegistrationStatus(item.id, nextStatus as "accepted" | "rejected");
      toast("Status berhasil diubah", "success");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal mengubah status", "error");
    }
    fetchData();
  }

  /** Kembalikan pendaftar ke status Menunggu (tanpa modal — bukan aksi publik). */
  async function handleSetPending(item: SpmbRegistration) {
    if (item.status === "pending") return;
    try {
      await updateRegistrationStatus(item.id, "pending" as "accepted" | "rejected");
      toast("Status dikembalikan ke Menunggu", "success");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal mengubah status", "error");
    }
    fetchData();
  }

  // ── Gelombang pendaftaran: CRUD ─────────────────────────

  function openWaveForm(wave?: SpmbWave) {
    setWaveEditing(wave ?? null);
    setWaveFormError(null);
    setWaveForm(
      wave
        ? {
          name: wave.name,
          start_date: wave.start_date,
          end_date: wave.end_date,
          note: wave.note ?? "",
          is_published: wave.is_published,
        }
        : { name: "", start_date: "", end_date: "", note: "", is_published: true }
    );
  }

  async function handleSaveWave() {
    if (!waveForm) return;

    // Validasi
    const name = waveForm.name.trim();
    if (!name) { setWaveFormError("Nama gelombang wajib diisi."); return; }
    if (!waveForm.start_date || !waveForm.end_date) {
      setWaveFormError("Tanggal mulai dan tanggal selesai wajib diisi.");
      return;
    }
    if (waveForm.end_date < waveForm.start_date) {
      setWaveFormError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }

    const payload = {
      name,
      start_date: waveForm.start_date,
      end_date: waveForm.end_date,
      note: waveForm.note.trim() || null,
      is_published: waveForm.is_published,
      sort_order: waveEditing
        ? waveEditing.sort_order
        : (waves.length ? Math.max(...waves.map((w) => w.sort_order)) + 1 : 1),
    };

    setWaveSaving(true);
    const res = waveEditing ? await updateWave(waveEditing.id, payload) : await createWave(payload);
    setWaveSaving(false);

    if (res.error) {
      setWaveFormError(res.error);
      toast(res.error, "error");
      return;
    }

    toast(waveEditing ? "Gelombang berhasil diperbarui" : "Gelombang berhasil ditambahkan", "success");
    setWaveForm(null);
    setWaveEditing(null);
    fetchWaves();
    revalidatePaths(["/admission"]).catch(() => { });
  }

  async function handleToggleWave(wave: SpmbWave) {
    const res = await updateWave(wave.id, { is_published: !wave.is_published });
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast(wave.is_published ? "Gelombang disembunyikan dari website" : "Gelombang ditampilkan di website", "success");
    fetchWaves();
    revalidatePaths(["/admission"]).catch(() => { });
  }

  // ── Drag & drop urutan gelombang ────────────────────────
  const dragDisabled = !permUpdate || wavesLoading;
  const onReorderWaves = useReorder(waves, setWaves, {
    persist: reorderWaves,
    label: "gelombang",
    onSuccess: () => {
      revalidatePaths(["/admission"]).catch(() => { });
    },
  });

  /**
   * Publikasikan / tarik hasil seleksi sebuah gelombang (dipicu dari modal
   * konfirmasi `resultWave`). Saat dipublikasikan, status pendaftar
   * (Lulus/Tidak Lolos) tampil di halaman publik /admission/status untuk
   * pendaftar gelombang ini; saat ditarik kembali tampil "Dalam Proses".
   */
  async function handleToggleResultWave() {
    if (!resultWave) return;
    const publish = !resultWave.result_published_at;
    setResultSaving(true);
    const res = await updateWave(resultWave.id, {
      result_published_at: publish ? new Date().toISOString() : null,
    });
    setResultSaving(false);
    if (res.error) {
      // Kolom belum ada (migrasi belum dijalankan) → pesan yang menunjuk SQL.
      if (/result_published_at|42703|schema cache/i.test(res.error)) {
        toast("Kolom result_published_at belum ada di database — jalankan supabase/spmb_status_check.sql terlebih dahulu.", "error");
      } else {
        toast(res.error, "error");
      }
      setResultWave(null);
      return;
    }
    toast(publish ? "Hasil seleksi dipublikasikan" : "Hasil seleksi ditarik dari publik", "success");
    setResultWave(null);
    fetchWaves();
    revalidatePaths(["/admission", "/admission/status"]).catch(() => { });
  }

  async function handleDeleteWave() {
    if (!deleteWaveItem) return;
    setWaveDeleting(true);
    const res = await deleteWave(deleteWaveItem.id);
    setWaveDeleting(false);
    setDeleteWaveItem(null);
    if (res.error) {
      toast(res.error, "error");
      fetchWaves();
      return;
    }
    toast("Gelombang berhasil dihapus", "success");
    fetchWaves();
    revalidatePaths(["/admission"]).catch(() => { });
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[var(--brand-accent)]" />
      : <ArrowDown className="h-3 w-3 text-[var(--brand-accent)]" />;
  };

  // ── TAB: GELOMBANG PENDAFTARAN ──────────────────────────
  if (mainTab === "waves") {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header + Tab */}
        <PageHeader active={mainTab} onSelect={setMainTab} onExport={handleExportCsv} onAdd={() => setAddOpen(true)} onImport={() => setImportOpen(true)} canCreate={permCreate} canImport={permImport} canExport={permExport} />

        {/* ── MODAL LINK GOOGLE FORM ─────────────────────── */}
        {googleModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => !regModeSaving && setGoogleModal(false)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
                <GraduationCap className="h-6 w-6 text-[var(--brand-primary)]" />
              </div>
              <h3 className="text-center text-lg font-bold text-slate-800">Link Google Form</h3>
              <p className="mt-2 text-center text-sm text-slate-500">
                Tombol &ldquo;Daftar&rdquo; di website akan mengarah ke link ini. Kosongkan untuk kembali memakai link bawaan.
              </p>
              <input
                type="url"
                inputMode="url"
                maxLength={500}
                value={googleUrlDraft}
                onChange={(e) => setGoogleUrlDraft(e.target.value)}
                placeholder={GOOGLE_FORM_URL}
                disabled={regModeSaving}
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              />
              <div className="mt-5 flex gap-3">
                <button onClick={() => { setGoogleUrlDraft(regUrl); setGoogleModal(false); }} disabled={regModeSaving}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button data-solid data-busy onClick={handleSaveGoogleUrl} disabled={regModeSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]">
                  {regModeSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Simpan & Aktifkan"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Atur gelombang pendaftaran yang tampil di halaman Penerimaan Santri Baru.
          </p>
          <button onClick={() => openWaveForm()}
            className="flex min-h-11 sm:min-h-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" />
            Tambah Gelombang
          </button>
        </div>

        {/* Error memuat data */}
        {wavesError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="h-4 w-4 shrink-0" />
            {wavesError}
          </div>
        )}

        {/* Daftar gelombang */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          {wavesLoading ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
              <p className="text-sm text-slate-500">Memuat data gelombang...</p>
            </div>
          ) : waves.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CalendarBlank className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Belum ada gelombang pendaftaran</p>
                <p className="mt-1 text-xs text-slate-400">Klik &ldquo;Tambah Gelombang&rdquo; untuk membuat gelombang pertama.</p>
              </div>
            </div>
          ) : (
            <SortableList ids={waves.map((w) => w.id)} onReorder={onReorderWaves}>
            <ul className="divide-y divide-slate-100">
              {waves.map((w, index) => {
                const st = waveStatusConfig[getWaveStatus(w)] || waveStatusConfig.upcoming;
                return (
                  <SortableRow key={w.id} id={w.id} disabled={dragDisabled}>
                    {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                      <li
                        ref={setNodeRef}
                        style={style}
                        className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <SortableGrip
                              index={index}
                              label={w.name}
                              disabled={dragDisabled}
                              attributes={attributes}
                              listeners={listeners}
                            />
                            <span className="text-sm font-semibold text-slate-800">{w.name}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                            {!w.is_published && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Disembunyikan
                              </span>
                            )}
                            {w.result_published_at && (
                              <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                                Hasil Ditayangkan
                              </span>
                            )}
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {formatWaveDate(w.start_date)} &ndash; {formatWaveDate(w.end_date)}
                          </p>
                          {w.note && <p className="mt-1 text-xs text-slate-400">{w.note}</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {/* Toggle tampil di website */}
                          <button onClick={() => handleToggleWave(w)}
                            title={w.is_published ? "Sembunyikan dari website" : "Tampilkan di website"}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${w.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${w.is_published ? "bg-emerald-500" : "bg-slate-300"}`}>
                              <span className={`absolute left-0.5 top-1 h-2 w-2 rounded-full bg-white transition-transform ${w.is_published ? "translate-x-3" : ""}`} />
                            </span>
                            {w.is_published ? "Tampil" : "Sembunyi"}
                          </button>
                          {/* Publikasi hasil seleksi — lewat modal konfirmasi */}
                          <button onClick={() => setResultWave(w)}
                            title={w.result_published_at ? "Tarik hasil seleksi dari publik" : "Publikasikan hasil seleksi gelombang ini"}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${w.result_published_at ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            {w.result_published_at ? "Hasil: Tayang" : "Hasil: Belum"}
                          </button>
                          <button onClick={() => openWaveForm(w)} title="Edit Gelombang"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteWaveItem(w)} title="Hapus"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    )}
                  </SortableRow>
                );
              })}
            </ul>
            </SortableList>
          )}
        </div>

        {/* ── PENGATURAN PENDAFTARAN (SUMBER + DOKUMEN) ─── */}
        <h2 className="mb-3 mt-8 text-sm font-bold text-[var(--brand-primary)]">Pengaturan Pendaftaran</h2>

        {/* ── SUMBER PENDAFTARAN (MODE REGISTRASI) ─────────── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--brand-primary)]">Sumber Pendaftaran</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Pilih tujuan tombol Daftar di website. Klik Google Form untuk mengatur link formulir; mode ini juga mengalihkan halaman form bawaan ke Google Form.
            </p>
            {regMode === "google_form" && (
              <p className="mt-1 truncate text-[11px] text-slate-400" title={regUrl}>{regUrl}</p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={() => setGoogleModal(true)} disabled={regModeSaving}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${regMode === "google_form" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
              Google Form
            </button>
            <button onClick={() => handleChangeRegMode("internal")} disabled={regModeSaving}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${regMode === "internal" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
              Form Internal
            </button>
          </div>
        </div>

        {/* ── PENGATURAN SPMB (DOKUMEN + KONTAK + SOROTAN) ──── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
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
                  onChange={(e) => { setDocBrochure(e.target.value); setDocBrochureErr(null); }}
                  aria-invalid={!!docBrochureErr} aria-describedby="doc-brochure-desc"
                  placeholder="https://drive.google.com/file/d/..." disabled={docSaving}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
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
                  onChange={(e) => { setDocOffline(e.target.value); setDocOfflineErr(null); }}
                  aria-invalid={!!docOfflineErr} aria-describedby="doc-offline-desc"
                  placeholder="https://drive.google.com/file/d/..." disabled={docSaving}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
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
                onChange={(e) => { setDocPhone(e.target.value); setDocPhoneErr(null); }}
                aria-invalid={!!docPhoneErr} aria-describedby="doc-phone-desc"
                placeholder="0858-0673-8160" disabled={docSaving}
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
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
                onChange={(e) => setDocHighlight(e.target.value)}
                aria-describedby="doc-highlight-desc" disabled={docSaving}
                placeholder="Pada SPMB Indent 2027/2028, 35 calon murid telah dinyatakan diterima."
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              <p id="doc-highlight-desc" className="mt-1 text-xs text-slate-400">
                Tampil di halaman SPMB. Kosongkan untuk menyembunyikan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button data-solid data-busy={docSaving ? "" : undefined} onClick={handleSaveDocs} disabled={docSaving || !docDirty}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
              {docSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </div>

        {/* ── BUILDER PERTANYAAN TAMBAHAN (ALA GOOGLE FORM) ── */}
        <div className="mb-4 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--brand-primary)]">Pertanyaan Tambahan Formulir</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Susun pertanyaan custom untuk form pendaftaran (seperti Google Form). Pertanyaan aktif tampil
                sebagai langkah &ldquo;Pertanyaan Tambahan&rdquo; di halaman pendaftaran.
              </p>
            </div>
            <button onClick={() => openFieldForm()} disabled={formFields.length >= FIELD_MAX}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]">
              <Plus className="h-4 w-4" />
              Tambah Pertanyaan
            </button>
          </div>

          {formFields.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
              <FileText className="h-7 w-7 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Belum ada pertanyaan tambahan</p>
              <p className="max-w-md text-xs text-slate-400">
                Formulir pendaftar memakai langkah bawaan (Program, Data Siswa, Data Orang Tua, Upload Berkas).
                Klik &ldquo;Tambah Pertanyaan&rdquo; untuk membuat pertanyaan pertama.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200/80">
              {formFields.map((f, i) => (
                <li key={f.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[11px] font-bold text-[var(--brand-primary)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-sm font-semibold ${f.active ? "text-slate-800" : "text-slate-400"}`}>
                        {f.label}
                      </span>
                      <span className="rounded-full border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-accent)]">
                        {fieldTypeLabel(f.type)}
                      </span>
                      {f.required && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Wajib
                        </span>
                      )}
                      {!f.active && (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    {spmbFieldNeedsOptions(f.type) && !!f.options?.length && (
                      <p className="mt-0.5 truncate text-xs text-slate-400" title={f.options.join(", ")}>
                        Opsi: {f.options.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <button onClick={() => handleToggleField(f)}
                      title={f.active ? "Sembunyikan dari form" : "Tampilkan di form"}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${f.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                      <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${f.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <span className={`absolute left-0.5 top-1 h-2 w-2 rounded-full bg-white transition-transform ${f.active ? "translate-x-3" : ""}`} />
                      </span>
                      {f.active ? "Tampil" : "Sembunyi"}
                    </button>
                    <button onClick={() => handleMoveField(i, -1)} disabled={i === 0} title="Naik"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleMoveField(i, 1)} disabled={i === formFields.length - 1} title="Turun"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => openFieldForm(f)} title="Edit"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                      <PencilSimple className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteFieldItem(f)} title="Hapus"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── FORM TAMBAH/EDIT GELOMBANG (SLIDE-OVER) ─────── */}
        {waveForm && (
          <SlideOver
            open={true}
            onClose={() => !waveSaving && setWaveForm(null)}
            title={waveEditing ? "Edit Gelombang" : "Tambah Gelombang"}
            description={waveEditing ? waveEditing.name : "Gelombang pendaftaran baru"}
            footer={
              <div className="flex w-full items-center justify-between">
                <button onClick={() => setWaveForm(null)} disabled={waveSaving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button data-solid data-busy onClick={handleSaveWave} disabled={waveSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]">
                  {waveSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <FloppyDisk className="h-4 w-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div className="space-y-5">
              {waveFormError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                  {waveFormError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nama Gelombang <span className="text-red-500">*</span>
                </label>
                <input type="text" value={waveForm.name}
                  onChange={(e) => setWaveForm({ ...waveForm, name: e.target.value })}
                  placeholder="cth: Gelombang Inden"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={waveForm.start_date}
                    onChange={(e) => setWaveForm({ ...waveForm, start_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={waveForm.end_date} min={waveForm.start_date || undefined}
                    onChange={(e) => setWaveForm({ ...waveForm, end_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Keterangan (opsional)</label>
                <textarea value={waveForm.note} onChange={(e) => setWaveForm({ ...waveForm, note: e.target.value })}
                  rows={3} placeholder="cth: khusus pendaftar yang mendaftar lebih awal"
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm leading-relaxed focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tampil di Website</label>
                <button type="button" onClick={() => setWaveForm({ ...waveForm, is_published: !waveForm.is_published })}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${waveForm.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  <span>{waveForm.is_published ? "Tampil" : "Sembunyi"}</span>
                  <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${waveForm.is_published ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${waveForm.is_published ? "translate-x-5" : ""}`} />
                  </span>
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Gelombang dengan status &ldquo;Tampil&rdquo; akan ditampilkan di halaman Penerimaan Santri Baru.
              </p>
            </div>
          </SlideOver>
        )}

        {/* ── KONFIRMASI HAPUS GELOMBANG ─────────────────── */}
        {deleteWaveItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => !waveDeleting && setDeleteWaveItem(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
                <Warning className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-center text-lg font-bold text-slate-800">Hapus Gelombang?</h3>
              <p className="mt-2 text-center text-sm text-slate-500">&ldquo;{deleteWaveItem.name}&rdquo; akan dihapus permanen.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setDeleteWaveItem(null)} disabled={waveDeleting}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button data-solid="danger" onClick={handleDeleteWave} disabled={waveDeleting}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                  {waveDeleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── KONFIRMASI PUBLIKASI HASIL SELEKSI ──────────── */}
        {resultWave && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => !resultSaving && setResultWave(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full mx-auto ${resultWave.result_published_at ? "bg-amber-100" : "bg-purple-100"}`}>
                {resultWave.result_published_at ? <Warning className="h-6 w-6 text-amber-600" /> : <CheckCircle className="h-6 w-6 text-purple-600" />}
              </div>
              <h3 className="text-center text-lg font-bold text-slate-800">
                {resultWave.result_published_at ? "Tarik Hasil Seleksi?" : "Publikasikan Hasil Seleksi?"}
              </h3>
              {resultWave.result_published_at ? (
                <p className="mt-2 text-center text-sm text-slate-500">
                  Status pendaftar gelombang &ldquo;{resultWave.name}&rdquo; akan kembali tampil sebagai
                  &ldquo;Dalam Proses&rdquo; di halaman cek status.
                </p>
              ) : (
                <p className="mt-2 text-center text-sm text-slate-500">
                  Pendaftar gelombang &ldquo;{resultWave.name}&rdquo; yang sudah diverifikasi akan melihat hasil
                  (Lulus/Tidak Lolos) di halaman cek status publik beserta bukti yang bisa dicetak.
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setResultWave(null)} disabled={resultSaving}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button data-solid onClick={handleToggleResultWave} disabled={resultSaving}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${resultWave.result_published_at ? "bg-amber-500 hover:bg-amber-600" : "bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]"}`}>
                  {resultSaving ? "Menyimpan..." : resultWave.result_published_at ? "Ya, Tarik" : "Ya, Publikasikan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM TAMBAH/EDIT PERTANYAAN (SLIDE-OVER) ────── */}
        {fieldForm && (
          <SlideOver
            open={true}
            onClose={() => !fieldSaving && (setFieldForm(null), setFieldEditingId(null))}
            title={fieldEditingId ? "Edit Pertanyaan" : "Tambah Pertanyaan"}
            description="Pertanyaan tambahan pada form pendaftaran SPMB"
            footer={
              <div className="flex w-full items-center justify-between">
                <button onClick={() => { setFieldForm(null); setFieldEditingId(null); }} disabled={fieldSaving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button data-solid data-busy onClick={handleSaveField} disabled={fieldSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]">
                  {fieldSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <FloppyDisk className="h-4 w-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div className="space-y-5">
              {fieldFormError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                  {fieldFormError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Pertanyaan <span className="text-red-500">*</span>
                </label>
                <input type="text" maxLength={200} value={fieldForm.label}
                  onChange={(e) => { setFieldForm({ ...fieldForm, label: e.target.value }); setFieldFormError(null); }}
                  placeholder="cth: Apakah anak Anda pernah mengikuti tahfidz?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Jenis Jawaban</label>
                <select value={fieldForm.type}
                  onChange={(e) => { setFieldForm({ ...fieldForm, type: e.target.value as SpmbFieldType }); setFieldFormError(null); }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20">
                  {SPMB_FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {spmbFieldNeedsOptions(fieldForm.type) && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Opsi Jawaban <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={5} value={fieldForm.optionsText}
                    onChange={(e) => { setFieldForm({ ...fieldForm, optionsText: e.target.value }); setFieldFormError(null); }}
                    placeholder={"Ya\nTidak\nKadang-kadang"}
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm leading-relaxed focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
                  <p className="mt-1 text-xs text-slate-400">Tulis satu opsi per baris.</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teks kolom (opsional)</label>
                <input type="text" maxLength={200} value={fieldForm.placeholder}
                  onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                  placeholder="Teks petunjuk di dalam kolom isian"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teks bantuan (opsional)</label>
                <input type="text" maxLength={300} value={fieldForm.help}
                  onChange={(e) => setFieldForm({ ...fieldForm, help: e.target.value })}
                  placeholder="Keterangan tambahan di bawah pertanyaan"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Wajib Diisi</label>
                  <button type="button" onClick={() => setFieldForm({ ...fieldForm, required: !fieldForm.required })}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${fieldForm.required ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    <span>{fieldForm.required ? "Ya, wajib" : "Tidak wajib"}</span>
                    <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${fieldForm.required ? "bg-emerald-500" : "bg-slate-300"}`}>
                      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${fieldForm.required ? "translate-x-5" : ""}`} />
                    </span>
                  </button>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tampil di Form</label>
                  <button type="button" onClick={() => setFieldForm({ ...fieldForm, active: !fieldForm.active })}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${fieldForm.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    <span>{fieldForm.active ? "Tampil" : "Sembunyi"}</span>
                    <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${fieldForm.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${fieldForm.active ? "translate-x-5" : ""}`} />
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Pertanyaan tersimpan ke database dan langsung dipakai formulir pendaftaran di
                /admission/register.
              </p>
            </div>
          </SlideOver>
        )}

        {/* ── KONFIRMASI HAPUS PERTANYAAN ─────────────────── */}
        {deleteFieldItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDeleteFieldItem(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
                <Warning className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-center text-lg font-bold text-slate-800">Hapus Pertanyaan?</h3>
              <p className="mt-2 text-center text-sm text-slate-500">
                &ldquo;{deleteFieldItem.label}&rdquo; akan dihapus dari formulir. Jawaban pendaftar lama tetap
                tersimpan di data pendaftaran.
              </p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setDeleteFieldItem(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button onClick={handleDeleteField}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header + Tab */}
      <PageHeader active={mainTab} onSelect={setMainTab} onExport={handleExportCsv} onAdd={() => setAddOpen(true)} onImport={() => setImportOpen(true)} canCreate={permCreate} canImport={permImport} canExport={permExport} />

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={Users} label="Total" value={stats.total} tone="neutral" />
        <StatPill icon={Clock} label="Menunggu" value={stats.pending} tone="warning" />
        <StatPill icon={CheckCircle} label="Diterima" value={stats.accepted} tone="success" />
        <StatPill icon={XCircle} label="Ditolak" value={stats.rejected} tone="danger" />
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex">
          <Checks className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permVerify && (
            <>
              <button onClick={() => setConfirmAction({ id: "bulk", status: "accepted" })} aria-label={`Terima ${selectedIds.size} pendaftar terpilih`} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Terima</button>
              <button onClick={() => setConfirmAction({ id: "bulk", status: "rejected" })} aria-label={`Tolak ${selectedIds.size} pendaftar terpilih`} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Tolak</button>
            </>
          )}
          {permDelete && (
            <button onClick={() => setBulkDelete(true)} aria-label={`Hapus ${selectedIds.size} pendaftar terpilih`} className="rounded-lg bg-slate-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">Hapus</button>
          )}
          <button onClick={() => setSelectedIds(new Set())} aria-label="Batalkan pilihan" title="Batalkan pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari nama, sekolah, email..."
          searchLabel="Cari nama, sekolah, atau email"
          query={search}
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter (dengan jumlah) + urut + Pilih */}
      <MobileFilterBar
        placeholder="Cari nama, sekolah, email…"
        searchLabel="Cari nama, sekolah, atau email"
        query={search}
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        sort={{
          value: `${sortField}:${sortDir}`,
          options: [
            { key: "created_at:desc", label: "Terbaru" },
            { key: "created_at:asc", label: "Terlama" },
            { key: "full_name:asc", label: "Nama A–Z" },
            { key: "full_name:desc", label: "Nama Z–A" },
            { key: "status:asc", label: "Status A–Z" },
            { key: "status:desc", label: "Status Z–A" },
            { key: "registration_path:asc", label: "Jalur A–Z" },
            { key: "registration_path:desc", label: "Jalur Z–A" },
          ],
          onChange: (k) => {
            const [f, d] = k.split(":");
            setSortField(f as SortField);
            setSortDir(d as SortDir);
          },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
      />

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — checkbox & No hanya untuk tablet/desktop; di
                bawah 640px sisa kolom biar lega, sama seperti
                agenda/teachers/users/announcements/facilities. */}
                <th className="hidden w-12 px-2 py-3 text-center sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("full_name")}>
                  <span className="flex items-center gap-1">Nama {sortIcon("full_name")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Asal Sekolah</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("registration_path")}>
                  <span className="flex items-center gap-1">Jalur {sortIcon("registration_path")}</span>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="flex items-center gap-1">Status {sortIcon("status")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center gap-1">Tanggal {sortIcon("created_at")}</span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data pendaftar...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pendaftar SPMB"}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => {
                    const st = statusConfig[item.status] || statusConfig.pending;
                    const StatusIcon = st.icon;
                    // Nama & asal sekolah judul dinormalisasi untuk tampilan — data DB tidak diubah saat render.
                    const name = normalizeName(item.full_name);
                    const pendingDays = item.status === "pending" ? daysSince(item.created_at) : 0;
                    const late = pendingDays >= PENDING_SLA_DAYS;
                  return (
                    <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""}`}>
                      <td className="hidden w-12 px-2 py-3.5 text-center sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-4 py-3.5 cursor-pointer" onClick={() => openDetail(item)}>
                        <p className="text-sm font-medium text-slate-800">
                          {name}
                          {item.documents?.input_source === "admin" && (
                            <span className="ml-1.5 inline-block rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-slate-500" title="Ditambahkan manual oleh admin">
                              Manual
                            </span>
                          )}
                          {item.documents?.input_source === "import" && (
                            <span className="ml-1.5 inline-block rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-slate-500" title="Diimpor massal dari ekspor Google Form">
                              Impor
                            </span>
                          )}
                        </p>
                        {item.email && <p className="mt-0.5 text-xs text-slate-400">{item.email}</p>}
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm text-slate-600 md:table-cell">{normalizeSchool(item.previous_school) || "-"}</td>
                      <td className="hidden px-4 py-3.5 sm:table-cell">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${pathColors[item.registration_path] || "bg-slate-100 text-slate-600"}`}>
                          {pathLabels[item.registration_path] || item.registration_path}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${st.bg} ${st.color} hover:opacity-80`}>
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </button>
                      </td>
                      <td
                        className="hidden whitespace-nowrap px-4 py-3.5 text-sm text-slate-500 lg:table-cell"
                        title={new Date(item.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      >
                        {formatRelativeTime(item.created_at)}
                        {late && (
                          <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-700" title={`Menunggu ${pendingDays} hari`}>
                            Lewat {PENDING_SLA_DAYS} hari
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(item)} aria-label={`Lihat detail ${name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Detail">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditItem(item)} aria-label={`Edit data ${name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit Data">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteItem(item)} aria-label={`Hapus pendaftaran ${name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pendaftar
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daftar mobile (<md) — baris ringkas: avatar + titik status, nama,
          badge jalur + asal sekolah/email + tanggal, status lewat titik di
          pojok avatar (tanpa ubah status sekali tap), aksi via menu ⋯.
          Tanpa scroll horizontal, semua fitur tabel tetap ada. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar pendaftar SPMB">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3.5 w-2/3 rounded" />
                    <SkeletonBlock className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pendaftar SPMB"}</p>
              </div>
            </div>
          ) : (
            paginated.map((item) => (
              <RegistrationMobileRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onDetail={openDetail}
                onEditData={setEditItem}
                onSetStatus={(r, s) => {
                  // Terima/Tolak lewat modal konfirmasi; "Jadikan Menunggu"
                  // langsung dijalankan (kembalikan ke antrean review).
                  if (s === "pending") handleSetPending(r);
                  else setConfirmAction({ id: r.id, status: s });
                }}
                onDelete={setDeleteItem}
                canVerify={permVerify}
                canDelete={permDelete}
              />
            ))
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * PAGE_SIZE + 1}
            to={Math.min(page * PAGE_SIZE, filtered.length)}
            onPageChange={setPage}
            itemLabel="pendaftar"
          />
        )}
        {/* Ruang ekstra agar baris terakhir tidak tertutup bar sticky mode pilih */}
        {pickMode && <div className="h-24" aria-hidden="true" />}
      </div>

      {/* Bar aksi massal sticky (mobile, mode pilih) — di atas bottom nav admin */}
      {pickMode && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={permDelete ? () => setBulkDelete(true) : undefined}
          onCancel={exitPickMode}
        >
          {permVerify && (
            <>
              <button
                type="button"
                onClick={() => setConfirmAction({ id: "bulk", status: "accepted" })}
                disabled={selectedIds.size === 0}
                aria-label="Terima pendaftar terpilih"
                className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                Terima
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction({ id: "bulk", status: "rejected" })}
                disabled={selectedIds.size === 0}
                aria-label="Tolak pendaftar terpilih"
                className="min-h-10 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                Tolak
              </button>
            </>
          )}
        </MobileSelectBar>
      )}

      {/* ── VIEW MODAL ──────────────────────────────── */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewItem(null)}>
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
                    {waveLabel(viewItem.wave_id) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                        <CalendarBlank className="h-2.5 w-2.5" />
                        {waveLabel(viewItem.wave_id)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setViewItem(null)} className="ml-auto shrink-0 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Tabs */}
            {(() => {
              const tabs = [
                { key: "siswa" as const, label: "Siswa" },
                { key: "kontak" as const, label: "Kontak" },
                { key: "ayah" as const, label: "Ayah" },
                { key: "ibu" as const, label: "Ibu" },
                // Hanya tampil bila pendaftar mengisi pertanyaan tambahan.
                ...(customAnswers.length > 0 ? [{ key: "tambahan" as const, label: "Tambahan" }] : []),
                // Berkas = dokumen pribadi (KK, akta, KTP ortu) → data sensitif.
                ...(permSensitive ? [{ key: "berkas" as const, label: "Berkas" }] : []),
              ];
              const docCount = viewItem.documents ? [viewItem.documents.kk, viewItem.documents.akta, viewItem.documents.surat_sekolah, viewItem.documents.ktp_ortu, viewItem.documents.bukti_transfer].filter((v) => typeof v === "string" && v.length > 0).length : 0;
              // flex-wrap, BUKAN overflow-x-auto: tab aktif ditandai garis
              // absolute -bottom-px yang menimpa border. overflow menciptakan
              // clip edge di padding box sehingga separuh garis itu terpotong
              // (sama seperti bug ring stats card). Dengan wrap, ke-7 tab tetap
              // terjangkau di 360px tanpa mengorbankan indikatornya.
              return (
                <div className="flex flex-wrap border-b border-slate-100 px-6">
                  {tabs.map((t) => (
                    <button key={t.key} onClick={() => setViewTab(t.key)}
                      className={`relative whitespace-nowrap px-4 py-2.5 text-xs font-semibold transition-colors ${viewTab === t.key ? "text-[var(--brand-primary)]" : "text-slate-400 hover:text-slate-600"}`}>
                      {t.label}
                      {t.key === "berkas" && docCount > 0 && <span className="ml-1 rounded-full bg-[var(--brand-primary)]/10 px-1.5 text-[10px] text-[var(--brand-primary)]">{docCount}</span>}
                      {t.key === "tambahan" && <span className="ml-1 rounded-full bg-[var(--brand-primary)]/10 px-1.5 text-[10px] text-[var(--brand-primary)]">{customAnswers.length}</span>}
                      {viewTab === t.key && <div className="absolute inset-x-2 -bottom-px h-0.5 bg-[var(--brand-primary)]" />}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Tab Content */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {viewTab === "siswa" && (
                <div className="space-y-1">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.birth_place || "-"} />
                    <InfoRow icon={CalendarIcon} label="Tanggal Lahir" value={viewItem.birth_date ? new Date(viewItem.birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
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
                  <InfoRow icon={CalendarIcon} label="Tanggal Lahir" value={viewItem.documents?.father_birth_date ? new Date(viewItem.documents.father_birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
                  <InfoRow icon={GraduationCap} label="Pendidikan Terakhir" value={viewItem.documents?.father_education || "-"} />
                  <InfoRow icon={FileText} label="Pekerjaan" value={viewItem.parent_occupation || "-"} />
                  <InfoRow icon={FloppyDisk} label="Penghasilan/bulan" value={viewItem.documents?.father_income ? `Rp ${Number(viewItem.documents.father_income).toLocaleString("id-ID")}` : "-"} />
                </div>
              )}

              {viewTab === "ibu" && (
                <div className="space-y-1">
                  <InfoRow icon={Users} label="Nama" value={normalizeName(viewItem.parent_name?.split(" / ")[1]) || "-"} />
                  <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.documents?.mother_birth_place || "-"} />
                  <InfoRow icon={CalendarIcon} label="Tanggal Lahir" value={viewItem.documents?.mother_birth_date ? new Date(viewItem.documents.mother_birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
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

              {viewTab === "berkas" && permSensitive && (
                <div className="space-y-2">
                  {([
                    ["kk", "Kartu Keluarga"],
                    ["akta", "Akta Kelahiran"],
                    ["surat_sekolah", "Surat Keterangan Sekolah"],
                    ["ktp_ortu", "KTP Orang Tua"],
                    ["bukti_transfer", "Bukti Transfer"],
                  ] as [string, string][]).map(([key, label]) => {
                    const url = signedUrls[key];
                    const hasFile = !!url;
                    const ext = hasFile ? url.split(".").pop()?.split("?")[0]?.toLowerCase() || "" : "";
                    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
                    const isPdf = ext === "pdf";
                    return <BerkasItem key={key} label={label} url={hasFile ? url : null} isImage={isImage} isPdf={isPdf} />;
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
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              {permUpdate && (
                <button onClick={() => { setViewItem(null); setEditItem(viewItem); }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <PencilSimple className="h-4 w-4" /> Edit Data
                </button>
              )}
              {permVerify && viewItem.status === "pending" && (
                <>
                  <button onClick={() => { setViewItem(null); setConfirmAction({ id: viewItem.id, status: "rejected" }); }}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                    Tolak
                  </button>
                  <button onClick={() => { setViewItem(null); setConfirmAction({ id: viewItem.id, status: "accepted" }); }}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Terima
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAMBAH / EDIT PENDAFTAR (SLIDE-OVER) ────── */}
      {addOpen && (
        <RegistrationFormSlideOver
          open
          mode="create"
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            fetchData();
            toast("Pendaftar berhasil ditambahkan", "success");
          }}
          waves={waves}
          formFields={formFields}
        />
      )}

      {/* ── EDIT DATA PENDAFTAR (SLIDE-OVER) ────────── */}
      {editItem && (
        <RegistrationFormSlideOver
          open
          mode="edit"
          registration={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            fetchData();
            toast("Perubahan pendaftar disimpan", "success");
          }}
          waves={waves}
          formFields={formFields}
        />
      )}

      {/* ── IMPORT PENDAFTAR (MASSAL DARI GOOGLE FORM) ──── */}
      {importOpen && (
        <ImportRegistrationsModal
          open
          onClose={() => setImportOpen(false)}
          existing={data}
          onImported={fetchData}
        />
      )}

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteItem(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">&ldquo;{normalizeName(deleteItem.full_name)}&rdquo; akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteItem(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      {bulkDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setBulkDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua pendaftar yang dipilih akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setBulkDelete(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS CONFIRM MODAL ────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setConfirmAction(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto">
              {confirmAction.status === "accepted" ? (
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">
              {confirmAction.id === "bulk"
                ? `${confirmAction.status === "accepted" ? "Terima" : "Tolak"} ${selectedIds.size} Pendaftar?`
                : confirmAction.status === "accepted" ? "Terima Pendaftar?" : "Tolak Pendaftar?"}
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              {confirmAction.status === "accepted"
                ? "Pendaftar akan diterima sebagai calon siswa baru."
                : "Pendaftar akan ditolak."}
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button
                onClick={() => {
                  if (confirmAction.id === "bulk") {
                    handleBulkStatus(confirmAction.status);
                  } else {
                    handleUpdateStatus(confirmAction.id, confirmAction.status);
                  }
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${confirmAction.status === "accepted" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                Ya, {confirmAction.status === "accepted" ? "Terima" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Header halaman + tab "Pendaftar" / "Gelombang Pendaftaran". */
function PageHeader({ active, onSelect, onExport, onAdd, onImport, canCreate, canImport, canExport }: {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  onExport: () => void;
  onAdd: () => void;
  onImport: () => void;
  /** Izin aksi tombol header — sembunyikan yang tidak dimiliki. */
  canCreate: boolean;
  canImport: boolean;
  canExport: boolean;
}) {
  const tabs: { key: MainTab; label: string; desktopLabel?: string; icon: React.ElementType }[] = [
    { key: "registrations", label: "Pendaftar", icon: Users },
    { key: "waves", label: "Gelombang", desktopLabel: "Gelombang & Pengaturan", icon: CalendarBlank },
  ];
  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <Users className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola SPMB</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Kelola Pendaftaran Santri Baru</p>
          </div>
        </div>
        {active === "registrations" && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {canCreate && (
              <button onClick={onAdd} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] sm:flex-none">
                <Plus className="h-4 w-4" />
                Tambah Pendaftar
              </button>
            )}
            {canImport && (
              <button onClick={onImport} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:flex-none">
                <Upload className="h-4 w-4" />
                Import
              </button>
            )}
            {canExport && (
              <button onClick={onExport} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:flex-none">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab utama */}
      <div className="mb-6 flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => onSelect(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:flex-none sm:px-4 ${active === t.key ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="h-4 w-4" />
            {t.desktopLabel ? (
              <>
                <span className="sm:hidden">{t.label}</span>
                <span className="hidden sm:inline">{t.desktopLabel}</span>
              </>
            ) : t.label}
          </button>
        ))}
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

const BERKAS_ICONS: Record<string, React.ElementType> = {
  kk: FileText,
  akta: FileText,
  surat_sekolah: FileText,
  ktp_ortu: FileText,
  bukti_transfer: Download,
};

const BERKAS_COLORS: Record<string, string> = {
  kk: "text-blue-600 bg-blue-100",
  akta: "text-amber-600 bg-amber-100",
  surat_sekolah: "text-emerald-600 bg-emerald-100",
  ktp_ortu: "text-purple-600 bg-purple-100",
  bukti_transfer: "text-rose-600 bg-rose-100",
};

function BerkasItem({ label, url, isImage, isPdf }: { label: string; url: string | null; isImage: boolean; isPdf: boolean }) {
  const [open, setOpen] = useState(false);
  const berkasKey = label.toLowerCase().includes("kartu") ? "kk"
    : label.toLowerCase().includes("akta") ? "akta"
      : label.toLowerCase().includes("surat") ? "surat_sekolah"
        : label.toLowerCase().includes("ktp") ? "ktp_ortu"
          : "bukti_transfer";
  const Icon = BERKAS_ICONS[berkasKey] || FileText;
  const colorCls = BERKAS_COLORS[berkasKey] || "text-slate-600 bg-slate-100";

  if (!url) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
        <div className={`flex h-8 min-w-8 items-center justify-center rounded-lg ${colorCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-red-600">{label}</span>
        <span className="ml-auto text-[11px] text-red-400">Belum diupload</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
        <div className={`flex h-8 min-w-8 items-center justify-center rounded-lg ${colorCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm text-slate-700">{label}</span>
        {isImage && <span className="text-[10px] text-slate-400">Gambar</span>}
        {isPdf && <span className="text-[10px] text-slate-400">PDF</span>}
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
          {isImage && (
            <div className="rounded-lg border border-slate-200 bg-white p-1">
              <Image src={url} alt={label} width={640} height={360} sizes="100%" unoptimized className="max-h-72 w-full rounded object-contain" />
            </div>
          )}
          {isPdf && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <iframe src={url} className="h-72 w-full" title={label} loading="lazy" />
            </div>
          )}
          {!isImage && !isPdf && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
              Preview tidak tersedia untuk file ini
            </div>
          )}
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Buka
            </a>
            <a href={url} download
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]">
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Baris daftar mobile (SPMB): avatar inisial + titik status 14px di pojoknya
 * (amber = Menunggu, hijau = Diterima, merah = Ditolak), nama, badge jalur +
 * asal sekolah/email + tanggal, QuietBadge "Ditolak" untuk status tidak
 * biasa. Menu ⋯ berisi Detail, Edit Data, pilihan status (Jadikan
 * Menunggu / Terima / Tolak — Terima & Tolak lewat modal konfirmasi), Telepon
 * (bila ada nomor) & Hapus. Tap baris = buka modal detail; tekan lama = mode
 * pilih. Nomor urut & kolom tanggal tetap desktop-saja, sama seperti tabel
 * lamanya.
 */
function RegistrationMobileRow({
  item,
  selected,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onDetail,
  onEditData,
  onSetStatus,
  onDelete,
  canVerify = true,
  canDelete = true,
}: {
  item: SpmbRegistration;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onDetail: (r: SpmbRegistration) => void;
  onEditData: (r: SpmbRegistration) => void;
  onSetStatus: (r: SpmbRegistration, s: "pending" | "accepted" | "rejected") => void;
  onDelete: (r: SpmbRegistration) => void;
  /** `spmb:verify` — ubah status pendaftar. */
  canVerify?: boolean;
  /** `spmb:delete` — hapus pendaftar. */
  canDelete?: boolean;
}) {
  const st = statusConfig[item.status] || statusConfig.pending;
  // Nama & asal sekolah judul dinormalisasi hanya untuk tampilan.
  const name = normalizeName(item.full_name);
  const school = normalizeSchool(item.previous_school);
  const pendingDays = item.status === "pending" ? daysSince(item.created_at) : 0;
  const late = pendingDays >= PENDING_SLA_DAYS;
  const actions: RowAction[] = [
    { key: "detail", label: "Detail", icon: <Eye className="h-4 w-4" />, run: () => onDetail(item) },
    { key: "edit", label: "Edit Data", icon: <PencilSimple className="h-4 w-4" />, run: () => onEditData(item) },
    ...(canVerify && item.status !== "pending"
      ? [{
          key: "pending",
          label: "Jadikan Menunggu",
          icon: <Clock className="h-4 w-4" />,
          run: () => onSetStatus(item, "pending"),
        }]
      : []),
    ...(canVerify && item.status !== "accepted"
      ? [{
          key: "accept",
          label: "Terima",
          icon: <CheckCircle className="h-4 w-4" />,
          run: () => onSetStatus(item, "accepted"),
        }]
      : []),
    ...(canVerify && item.status !== "rejected"
      ? [{
          key: "reject",
          label: "Tolak",
          icon: <XCircle className="h-4 w-4" />,
          run: () => onSetStatus(item, "rejected"),
        }]
      : []),
    ...(item.phone
      ? [{
          key: "call",
          label: "Telepon",
          icon: <Phone className="h-4 w-4" />,
          run: () => { window.location.href = `tel:${item.phone?.replace(/[^0-9]/g, "")}`; },
        }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) } as RowAction]
      : []),
  ];

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          selectMode ? (
            <span
              data-no-longpress=""
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 shrink-0 items-center justify-center"
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`Pilih ${name}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              />
            </span>
          ) : (
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[11px] font-bold text-[var(--brand-primary)]">
                {name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <StatusDot
                tone={DOT_TONE[item.status] ?? "pending"}
                label={st.label}
                className="absolute bottom-0 right-0"
              />
            </span>
          )
        }
        title={name}
        badge={
          item.status === "rejected" || late || item.documents?.input_source === "admin" || item.documents?.input_source === "import" ? (
            <>
              {item.documents?.input_source === "admin" && <QuietBadge>Manual</QuietBadge>}
              {item.documents?.input_source === "import" && <QuietBadge>Impor</QuietBadge>}
              {late && <QuietBadge>Lewat {PENDING_SLA_DAYS} hari</QuietBadge>}
              {item.status === "rejected" && <QuietBadge>Ditolak</QuietBadge>}
            </>
          ) : undefined
        }
        subtitle={
          <>
            <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${pathColors[item.registration_path] || "bg-slate-100 text-slate-600"}`}>
              {pathLabels[item.registration_path] || item.registration_path}
            </span>
            {(school || item.email) && (
              <span className="min-w-0 truncate">{school || item.email}</span>
            )}
            <span
              className="shrink-0 whitespace-nowrap"
              title={new Date(item.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
            >
              {formatRelativeTime(item.created_at)}
            </span>
          </>
        }
        actions={<RowActionsMenu label={name} actions={actions} disabled={selectMode} />}
        selected={selected}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onDetail(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
