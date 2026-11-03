"use client";

import { useAdminBottomBar } from "@/app/admin/AdminChrome";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getRegistrationList,
  getRegistrationById,
  getRegistrationPage,
  getSpmbAggregates,
  getPipelineRows,
  getInterviewRows,
  getDuplicateCandidates,
  getRegistrationsByIds,
  clientSearchRemainder,
  updateRegistrationStatus,
  updateRegistrationBulkStatus,
  deleteRegistration,
  deleteRegistrationBulk,
  getWavesAll,
  createWave,
  updateWave,
  deleteWave,
  getSchoolProfile,
  getDocumentVerifications,
  getDocumentVerificationSummary,
  saveDocumentVerification,
  updateRegistrationWaveBulk,
  setRegistrationPendingBulk,
  updateRegistrationPathBulk,
  getSpmbMessageTemplates,
  updateSpmbMessageTemplate,
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
import { SlideOver } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useReorder } from "@/lib/admin/useReorder";
import type { SpmbDocumentKey, SpmbDocumentVerification, SpmbRegistration, SpmbWave, SpmbFormField, SpmbFieldType } from "@/lib/supabase";
import type { SpmbMessageTemplate } from "@/lib/queries";
import type { RegistrationPath } from "@/lib/queries";
import type { SpmbAdminListRow, SpmbAggregateRow, SpmbListQuery } from "@/lib/queries/spmb-list";
import { findDuplicateGroups, duplicateIdSet } from "@/lib/spmb-duplicates";
import { parseSpmbListParams, serializeSpmbListParams, SPMB_LIST_DEFAULTS, type SpmbListUiParams } from "@/lib/spmb-list-params";
import { SPMB_PROGRAMS } from "@/lib/spmb-registration";
import { SPMB_NO_PROGRAM } from "@/lib/spmb-filter";
import { buildSpmbMonthlyRecap, buildSpmbRecapCsv } from "@/lib/admin-reports";
import { downloadCsv } from "@/lib/download-csv";
import { fillSpmbTemplate, spmbWhatsappHref } from "@/lib/spmb-message";
import { useToast } from "@/components/ui/Toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  GraduationCap,
  Compass,
  Tag,
  Warning,
  CalendarBlank,
  FloppyDisk,
} from "@/components/Icons";
import { PipelineBoard } from "./PipelineBoard";
import { BroadcastWaModal } from "./BroadcastWaModal";
import { InterviewsPanel } from "./InterviewsPanel";
import { InterviewScheduleModal } from "./InterviewScheduleModal";
import { scheduleInterviewAction, scheduleInterviewBulkAction } from "./actions";
import {
  MobileFilterBar,
  MobilePickButton,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";
import { RegistrationFormSlideOver } from "@/components/admin/RegistrationFormSlideOver";
import { ImportRegistrationsModal } from "@/components/admin/ImportRegistrationsModal";
import { PageHeader } from "./PageHeader";
import { WavesTab } from "./WavesTab";
import { FormTab } from "./FormTab";
import { SettingsTab } from "./SettingsTab";
import { pathLabels } from "./shared";
import { SpmbBulkBar, SpmbMobileBulkBar } from "./BulkBars";
import { SpmbDesktopTable } from "./SpmbDesktopTable";
import { SpmbMobileList } from "./SpmbMobileList";
import { SpmbDetailModal } from "./SpmbDetailModal";
import { SpmbModals } from "./SpmbModals";
import type { MainTab, SortField, SortDir, WaveFormState, FieldDraft } from "./types";

/**
 * Baca query string URL sekali (lazy initializer useState) — filter bisa
 * dibagikan/bookmark. Aman SSR: tanpa window → default.
 */
function readInitialParams(): SpmbListUiParams {
  if (typeof window === "undefined") return SPMB_LIST_DEFAULTS;
  try {
    return parseSpmbListParams(new URLSearchParams(window.location.search));
  } catch {
    return SPMB_LIST_DEFAULTS;
  }
}


/* Konstanta tampilan baris (statusConfig, pathLabels, dst.) kini di ./shared;
   tipe di ./types — definisi duplikat di sini sudah dipindah. */
const FIELD_MAX = 50;

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
  const [search, setSearch] = useState(() => readInitialParams().q);
  /** Kata kunci yang sudah di-debounce — inilah yang dikirim ke server. */
  const [debouncedSearch, setDebouncedSearch] = useState(() => readInitialParams().q);
  const [filter, setFilter] = useState<string>(() => readInitialParams().status);
  const [pathFilter, setPathFilter] = useState<string>(() => readInitialParams().path);
  const [programFilter, setProgramFilter] = useState<string>(() => readInitialParams().program);
  const [genderFilter, setGenderFilter] = useState<string>(() => readInitialParams().gender);
  /** Filter cepat "perlu tindakan" (server-side, lihat SpmbListQuery.action). */
  const [actionFilter, setActionFilter] = useState<string>(() => readInitialParams().action);
  /** Filter wawancara (server-side, lihat SpmbListQuery.interview). */
  const [interviewFilter, setInterviewFilter] = useState<string>(() => readInitialParams().interview);
  /** Baris halaman aktif dari server (bukan lagi load-all). */
  const [rows, setRows] = useState<SpmbAdminListRow[]>([]);
  const [total, setTotal] = useState(0);
  /** Agregat ringan — stats pills, facet filter, insight. */
  const [aggregates, setAggregates] = useState<SpmbAggregateRow[]>([]);
  /** Id duplikat (dari kandidat NISN/NIK/telepon) — dipakai action=duplicates. */
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(() => readInitialParams().page);
  const [pageSize, setPageSize] = useState(() => readInitialParams().size);
  const [sortField, setSortField] = useState<SortField>(() => {
    const [sf] = readInitialParams().sort.split(":");
    return (sf || "created_at") as SortField;
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    const [, sd] = readInitialParams().sort.split(":");
    return sd === "asc" ? "asc" : "desc";
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile) — baris memakai checkbox, bar aksi massal sticky
  // muncul di atas bottom nav admin.
  const [pickMode, setPickMode] = useState(false);
  useAdminBottomBar(pickMode);

  // Modals
  const [viewItem, setViewItem] = useState<SpmbRegistration | null>(null);
  const [viewTab, setViewTab] = useState<"siswa" | "kontak" | "ayah" | "ibu" | "berkas" | "tambahan">("siswa");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [docVerifs, setDocVerifs] = useState<Record<string, SpmbDocumentVerification>>({});
  const [docVerifSaving, setDocVerifSaving] = useState<string | null>(null);
  /** Agregat verifikasi semua pendaftar — badge di daftar. */
  const [docSummary, setDocSummary] = useState<Record<string, { total: number; verified: number; rejected: number; pending: number }>>({});
  const [deleteItem, setDeleteItem] = useState<SpmbRegistration | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  /** Aksi massal pindah gelombang — modal pilih gelombang tujuan. */
  const [bulkWaveOpen, setBulkWaveOpen] = useState(false);
  const [bulkWaveId, setBulkWaveId] = useState<string>("");
  const [bulkWaveSaving, setBulkWaveSaving] = useState(false);
  const [bulkPendingSaving, setBulkPendingSaving] = useState(false);
  /** Aksi massal ubah jalur — modal pilih jalur tujuan. */
  const [bulkPathOpen, setBulkPathOpen] = useState(false);
  const [bulkPath, setBulkPath] = useState<RegistrationPath | "">("");
  const [bulkPathSaving, setBulkPathSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: "accepted" | "rejected" } | null>(null);
  /** Panel "Tambah Pendaftar" (input manual admin) — mount ulang tiap dibuka. */
  const [addOpen, setAddOpen] = useState(false);
  /** Modal "Import Pendaftar" (massal dari ekspor Google Form). */
  const [importOpen, setImportOpen] = useState(false);
  /** Modal jadwal wawancara: tunggal (item) atau massal (selectedIds). */
  const [interviewTarget, setInterviewTarget] = useState<SpmbRegistration | "bulk" | null>(null);
  const [interviewSaving, setInterviewSaving] = useState(false);

  // Edit panel — form penuh (RegistrationFormSlideOver mode "edit")
  const [editItem, setEditItem] = useState<SpmbRegistration | null>(null);

  // Gelombang pendaftaran
  const [mainTab, setMainTab] = useState<MainTab>(() => readInitialParams().tab as MainTab);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
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
  /** Template pesan WhatsApp (migrasi 0015) — draft per key. */
  const [waTemplates, setWaTemplates] = useState<SpmbMessageTemplate[]>([]);
  const [waDrafts, setWaDrafts] = useState<Record<string, string>>({});
  const [waSavingKey, setWaSavingKey] = useState<string | null>(null);
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

  /** Parameter list server-side dari state filter/sort/page aktif. */
  const listParams: SpmbListQuery = useMemo(
    () => ({
      search: debouncedSearch,
      status: filter,
      path: pathFilter,
      program: programFilter,
      gender: genderFilter,
      action: actionFilter as SpmbListQuery["action"],
      interview: interviewFilter as SpmbListQuery["interview"],
      duplicateIds,
      page,
      pageSize,
      sortField,
      sortDir,
    }),
    [debouncedSearch, filter, pathFilter, programFilter, genderFilter, actionFilter, interviewFilter, duplicateIds, page, pageSize, sortField, sortDir]
  );

  /** Muat SATU halaman dari server (filter/search/sort/paginasi di DB). */
  const fetchPage = useCallback((params: SpmbListQuery) => {
    // Tanpa spinner tiap ganti filter (stale-while-revalidate): daftar lama
    // tetap tampil sampai halaman baru datang. setState hanya di callback
    // promise (pola halaman Logs/Notifications), bukan sinkron di effect.
    return getRegistrationPage(params).then(
      (res) => {
        setRows(res.rows);
        setTotal(res.total);
        // Sinkronkan badge verifikasi dari kolom view (tanpa query tambahan).
        setDocSummary((prev) => {
          const next: typeof prev = { ...prev };
          for (const r of res.rows) {
            next[r.id] = {
              total: r.doc_total,
              verified: r.doc_verified,
              rejected: r.doc_rejected,
              pending: r.doc_pending,
            };
          }
          return next;
        });
        setLoadError("");
        setLoading(false);
      },
      (e: unknown) => {
        setRows([]);
        setTotal(0);
        setLoadError(e instanceof Error && e.message ? e.message : "Gagal memuat data pendaftar.");
        setLoading(false);
      }
    );
  }, []);

  /** Debounce pencarian 350ms — halaman selalu kembali ke 1. */
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  }

  /** Muat ulang halaman setiap filter/sort/page berubah. */
  useEffect(() => {
    void fetchPage(listParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, debouncedSearch, filter, pathFilter, programFilter, genderFilter, actionFilter, interviewFilter, duplicateIds, page, pageSize, sortField, sortDir]);

  /** Muat agregat ringan + kandidat duplikat; gagal → biarkan data lama. */
  const fetchAggregates = useCallback(async () => {
    try {
      const aggr = await getSpmbAggregates();
      setAggregates(aggr);
      try {
        const cands = await getDuplicateCandidates();
        const groups = findDuplicateGroups(
          cands.map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone, documents: { nisn: c.nisn, nik: c.nik } }))
        );
        setDuplicateIds(Array.from(duplicateIdSet(groups)));
      } catch {
        setDuplicateIds([]);
      }
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Gagal memuat ringkasan.", "error");
    }
  }, [toast]);

  /** Alias kompatibilitas — semua mutasi memanggil ini untuk refresh. */
  const fetchData = useCallback(async () => {
    await fetchPage(listParams);
    await fetchAggregates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, fetchAggregates]);

  /** Baris penuh untuk pipeline (dimuat saat tab pipeline dibuka). */  const [pipelineRows, setPipelineRows] = useState<SpmbAdminListRow[]>([]);
  const fetchPipeline = useCallback(() => {
    // setState hanya di callback promise (pola halaman Logs/Notifications).
    return getPipelineRows().then(
      (list) => setPipelineRows(list),
      () => setPipelineRows([])
    );
  }, []);

  /** Baris wawancara (dimuat saat tab wawancara dibuka). */
  const [interviewRows, setInterviewRows] = useState<SpmbAdminListRow[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const fetchInterviews = useCallback(() => {
    // setState lanjutan di callback promise (pola halaman Logs/Notifications).
    return getInterviewRows().then(
      (list) => {
        setInterviewRows(list);
        setInterviewsLoading(false);
      },
      () => {
        setInterviewRows([]);
        setInterviewsLoading(false);
      }
    );
  }, []);
  useEffect(() => {
    if (mainTab !== "interviews") return;
    void fetchInterviews();
  }, [mainTab, fetchInterviews]);

  /** Ganti tab — spinner wawancara dinyalakan di sini (event handler, bukan effect). */
  function handleTabChange(tab: MainTab) {
    if (tab === "interviews") setInterviewsLoading(true);
    if (tab === "pipeline") void fetchPipeline();
    setMainTab(tab);
  }

  /** Kirim undangan wawancara via template WA (buka wa.me terisi). */
  function handleSendInterviewInvite(item: SpmbRegistration) {
    const tpl = waTemplates.find((t) => t.key === "interview_invite") || waTemplates[0];
    if (!tpl) {
      toast("Template pesan belum tersedia.", "error");
      return;
    }
    // Sisipkan jadwal ke pesan bila template tidak menyebutkannya.
    const withSchedule = tpl.key === "interview_invite" && item.interview_at
      ? {
          ...tpl,
          body: `${tpl.body}\nJadwal: ${new Date(item.interview_at).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB.`,
        }
      : tpl;
    setViewItem(item);
    handleSendWaTemplate(withSchedule);
  }

  // ── URL sync ─────────────────────────────────────────────────────────
  // State filter/sort/page/tab diinisialisasi dari query string (lazy,
  // readInitialParams) — tanpa setState di effect. Perubahan ditulis balik
  // ke URL (debounce) agar filter bisa dibagikan/bookmark (pengganti
  // "simpan filter": tanpa DB, tanpa modal).
  // Tulis state ke URL (debounce 500ms) — filter bisa dibagikan/bookmark.
  const uiParams: SpmbListUiParams = useMemo(
    () => ({
      q: search,
      status: filter,
      path: pathFilter,
      program: programFilter,
      gender: genderFilter,
      action: actionFilter,
      interview: interviewFilter,
      sort: `${sortField}:${sortDir}`,
      page,
      size: pageSize,
      tab: mainTab,
    }),
    [search, filter, pathFilter, programFilter, genderFilter, actionFilter, interviewFilter, sortField, sortDir, page, pageSize, mainTab]
  );
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const qs = serializeSpmbListParams(uiParams);
        const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState(null, "", url);
      } catch {
        // history API tak tersedia (test) → abaikan.
      }
    }, 500);
    return () => clearTimeout(t);
  }, [uiParams]);

  /** Kandidat impor (nama + NIK) — dimuat saat modal impor dibuka. */  const [importCandidates, setImportCandidates] = useState<{ full_name: string; documents: Record<string, string | null> | null }[]>([]);
  useEffect(() => {
    if (!importOpen) return;
    (async () => {
      try {
        const cands = await getDuplicateCandidates();
        setImportCandidates(cands.map((c) => ({ full_name: c.full_name, documents: { nik: c.nik || null } })));
      } catch {
        setImportCandidates([]);
      }
    })();
  }, [importOpen]);

  /** Data penuh untuk broadcast — diambil sesuai cakupan saat modal dibuka. */
  const [broadcastRows, setBroadcastRows] = useState<SpmbRegistration[]>([]);
  useEffect(() => {
    if (!broadcastOpen) return;
    (async () => {
      try {
        if (selectedIds.size > 0) {
          setBroadcastRows(await getRegistrationsByIds(Array.from(selectedIds)));
        } else {
          setBroadcastRows(await getRegistrationList());
        }
      } catch {
        setBroadcastRows([]);
      }
    })();
  }, [broadcastOpen, selectedIds]);

  /** Muat agregat verifikasi berkas (badge daftar); gagal → biarkan lama. */
  const fetchDocSummary = useCallback(async () => {
    try {
      setDocSummary(await getDocumentVerificationSummary());
    } catch {
      // tabel belum dimigrasi / tanpa izin → tidak menampilkan badge
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchAggregates();
      await fetchDocSummary();
    })().catch(() => {});
  }, [fetchAggregates, fetchDocSummary]);

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

  // Muat template pesan WA (kosong bila migrasi 0015 belum dijalankan).
  useEffect(() => {
    let alive = true;
    getSpmbMessageTemplates()
      .then((rows) => {
        if (!alive) return;
        setWaTemplates(rows);
        setWaDrafts(Object.fromEntries(rows.map((r) => [r.key, r.body])));
      })
      .catch(() => {});
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
    setDocVerifs({});
    void getDocumentVerifications(item.id)
      .then((rows) => {
        setDocVerifs(Object.fromEntries(rows.map((r) => [r.document_key, r])));
      })
      .catch(() => {});
  }

  async function handleVerifyDoc(key: SpmbDocumentKey, status: "pending" | "verified" | "rejected") {
    if (!viewItem) return;
    setDocVerifSaving(key);
    const res = await saveDocumentVerification({
      registrationId: viewItem.id,
      documentKey: key,
      status,
    });
    setDocVerifSaving(null);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setDocVerifs((prev) => ({
      ...prev,
      [key]: {
        registration_id: viewItem.id,
        document_key: key,
        status,
        note: prev[key]?.note ?? "",
        verified_by: null,
        verified_at: status === "pending" ? null : new Date().toISOString(),
      },
    }));
    toast(status === "verified" ? "Berkas ditandai valid." : status === "rejected" ? "Berkas ditolak." : "Verifikasi direset.", "success");
    void fetchDocSummary();
  }

  /** Buka WhatsApp dengan template terisi; tanpa nomor → salin pesan. */
  function handleSendWaTemplate(template: SpmbMessageTemplate) {
    if (!viewItem) return;
    const message = fillSpmbTemplate(template.body, {
      nama: viewItem.full_name,
      orang_tua: viewItem.parent_name || "-",
      gelombang: waveLabel(viewItem.wave_id) || "-",
      jalur: pathLabels[viewItem.registration_path] || viewItem.registration_path || "-",
      program: viewItem.documents?.program || "-",
      nisn: viewItem.documents?.nisn ?? "-",
    });
    const href = spmbWhatsappHref(viewItem.phone, message);
    if (!href) {
      navigator.clipboard?.writeText(message).then(
        () => toast("Nomor WA kosong — pesan disalin ke clipboard", "success"),
        () => toast("Nomor WA kosong dan pesan gagal disalin", "error")
      );
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
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

  // Filter & sort dikerjakan server (view). Sisa pencarian yang tak bisa
  // diekspresikan di `.or()` (jawaban cf_*, alias gender panjang) disaring
  // di sini sebagai lapis kedua atas baris halaman aktif.
  const filtered = useMemo(
    () => rows.filter((r) => clientSearchRemainder(r, debouncedSearch)),
    [rows, debouncedSearch]
  );

  // Halaman aktif = hasil server (paginasi di DB); lapis client hanya
  // menyaring sisa kata kunci di atasnya.
  const paginated = filtered;

  const stats = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const a of aggregates) {
      if (a.status === "pending") pending += 1;
      else if (a.status === "accepted") accepted += 1;
      else if (a.status === "rejected") rejected += 1;
    }
    return { total: aggregates.length, pending, accepted, rejected };
  }, [aggregates]);

  /** Hitungan "perlu tindakan" dari agregat — badge chips cepat. */
  const actionCounts = useMemo(() => {
    let overdue = 0;
    let docsRejected = 0;
    let docsIncomplete = 0;
    let noWave = 0;
    for (const a of aggregates) {
      if (a.status === "pending" && a.is_overdue) overdue += 1;
      if (a.doc_rejected > 0) docsRejected += 1;
      if (a.uploaded_docs < 5 || a.doc_verified < 5 || a.doc_rejected > 0) docsIncomplete += 1;
      if (!a.wave_id) noWave += 1;
    }
    return { overdue, docsRejected, docsIncomplete, noWave, duplicates: duplicateIds.length };
  }, [aggregates, duplicateIds]);

  // Opsi dropdown filter — dipakai toolbar desktop & mobile agar seragam.
  // Label "Semua ..." sengaja menyebut dimensinya supaya tiga pill tidak
  // sama-sama terbaca "Semua".
  const statusOptions = [
    { key: "all", label: "Semua Status", count: stats.total },
    { key: "pending", label: "Menunggu", count: stats.pending },
    { key: "accepted", label: "Diterima", count: stats.accepted },
    { key: "rejected", label: "Ditolak", count: stats.rejected },
  ];

  const pathOptions = [
    { key: "all", label: "Semua Jalur", count: aggregates.length },
    ...Object.entries(pathLabels).map(([key, label]) => ({
      key,
      label,
      count: aggregates.filter((d) => d.registration_path === key).length,
    })),
  ];

  const programValues = [
    ...SPMB_PROGRAMS,
    ...Array.from(
      new Set(
        aggregates
          .map((d) => d.program)
          .filter((p): p is string => !!p && !SPMB_PROGRAMS.includes(p))
      )
    ),
  ];
  const programOptions = [
    { key: "all", label: "Semua Program", count: aggregates.length },
    ...programValues.map((program) => ({
      key: program,
      label: program,
      count: aggregates.filter((d) => d.program === program).length,
    })),
    ...(aggregates.some((d) => !d.program)
      ? [{
          key: SPMB_NO_PROGRAM,
          label: "Tanpa Program",
          count: aggregates.filter((d) => !d.program).length,
        }]
      : []),
  ];

  const genderOptions = [
    { key: "all", label: "Semua Jenis Kelamin", count: aggregates.length },
    { key: "L", label: "Putra", count: aggregates.filter((d) => d.gender === "L").length },
    { key: "P", label: "Putri", count: aggregates.filter((d) => d.gender === "P").length },
  ];

  const actionOptions = [
    { key: "all", label: "Semua Kondisi", count: aggregates.length },
    { key: "overdue", label: "Lewat SLA", count: actionCounts.overdue },
    { key: "docs_rejected", label: "Berkas ditolak", count: actionCounts.docsRejected },
    { key: "docs_incomplete", label: "Berkas kurang", count: actionCounts.docsIncomplete },
    { key: "no_wave", label: "Tanpa gelombang", count: actionCounts.noWave },
    { key: "duplicates", label: "Duplikat", count: actionCounts.duplicates },
  ];

  const interviewOptions = [
    { key: "all", label: "Semua Jadwal", count: aggregates.length },
    { key: "scheduled", label: "Terjadwal", count: aggregates.filter((d) => !!d.interview_at).length },
    { key: "unscheduled", label: "Belum terjadwal", count: aggregates.filter((d) => d.status === "pending" && !d.interview_at).length },
  ];

  /** Reset halaman + seleksi setiap filter berubah (server-side). */
  function resetPage() {
    setPage(1);
    setSelectedIds(new Set());
  }

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

  /** Unduh berkas dari API route ekspor (CSV/XLSX dibuat di server). */
  async function downloadExport(format: "csv" | "xlsx") {
    try {
      const res = await fetch("/api/admin/spmb/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          selectedIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
          filters:
            selectedIds.size > 0
              ? undefined
              : {
                  status: filter,
                  path: pathFilter,
                  program: programFilter,
                  gender: genderFilter,
                },
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast(j.error || "Gagal mengekspor.", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pendaftar-spmb-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(
        `Ekspor ${format.toUpperCase()} dimulai${selectedIds.size > 0 ? ` (${selectedIds.size} terpilih)` : ""}.`,
        "success"
      );
    } catch {
      toast("Gagal mengekspor.", "error");
    }
  }

  /** Export daftar (mengikuti filter aktif / terpilih) ke CSV via server. */
  function handleExportCsv() {
    void downloadExport("csv");
  }

  /** Export daftar ke Excel multi-sheet via server. */
  function handleExportXlsx() {
    void downloadExport("xlsx");
  }

  /** Rekap bulanan siap cetak: total/menunggu/diterima/ditolak per bulan daftar. */
  function handleExportRecap() {
    const recap = buildSpmbMonthlyRecap(aggregates);
    if (recap.length === 0) {
      toast("Belum ada data pendaftar untuk direkap.", "error");
      return;
    }
    downloadCsv(`rekap-spmb-bulanan-${new Date().toISOString().slice(0, 10)}.csv`, buildSpmbRecapCsv(recap));
    toast(`${recap.length} bulan direkap ke CSV.`, "success");
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

  /** Pindahkan pendaftar terpilih ke gelombang lain (null = tanpa gelombang). */
  async function handleBulkMoveWave() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || bulkWaveSaving) return;
    setBulkWaveSaving(true);
    const res = await updateRegistrationWaveBulk(ids, bulkWaveId || null);
    setBulkWaveSaving(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast(`${ids.length} pendaftar dipindahkan ke ${bulkWaveId ? waveLabel(bulkWaveId) || "gelombang" : "tanpa gelombang"}`, "success");
    setBulkWaveOpen(false);
    setBulkWaveId("");
    exitPickMode();
    fetchData();
  }

  /** Simpan jadwal wawancara (tunggal dari detail, atau massal dari bulk bar). */
  async function handleSaveInterview(interviewAtIso: string, note: string) {
    if (interviewSaving) return;
    setInterviewSaving(true);
    try {
      if (interviewTarget === "bulk") {
        const ids = Array.from(selectedIds);
        const res = await scheduleInterviewBulkAction({ registrationIds: ids, interviewAt: interviewAtIso, note });
        if (!res.success) {
          toast(res.error || "Gagal menjadwalkan wawancara.", "error");
          return;
        }
        toast(`Wawancara dijadwalkan untuk ${res.data?.updated ?? ids.length} pendaftar.`, "success");
        exitPickMode();
      } else if (interviewTarget) {
        const res = await scheduleInterviewAction({
          registrationId: interviewTarget.id,
          interviewAt: interviewAtIso,
          note,
        });
        if (!res.success) {
          toast(res.error || "Gagal menjadwalkan wawancara.", "error");
          return;
        }
        toast("Jadwal wawancara disimpan.", "success");
        // Refresh baris detail agar jadwal baru langsung terlihat.
        try {
          const fresh = await getRegistrationById(interviewTarget.id);
          if (fresh) setViewItem(fresh);
        } catch {
          // abaikan — daftar di bawah tetap di-refresh
        }
      } else {
        return;
      }
    } finally {
      setInterviewSaving(false);
    }
    setInterviewTarget(null);
    fetchData();
  }

  /** Kembalikan pendaftar terpilih ke status Menunggu (tanpa modal — bukan aksi publik). */
  async function handleBulkSetPending() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || bulkPendingSaving) return;
    setBulkPendingSaving(true);
    const res = await setRegistrationPendingBulk(ids);
    setBulkPendingSaving(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast(`${ids.length} pendaftar dikembalikan ke Menunggu`, "success");
    exitPickMode();
    fetchData();
  }

  /** Ubah jalur pendaftar terpilih sekaligus (mis. koreksi hasil impor). */
  async function handleBulkMovePath() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !bulkPath || bulkPathSaving) return;
    setBulkPathSaving(true);
    const res = await updateRegistrationPathBulk(ids, bulkPath);
    setBulkPathSaving(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast(`${ids.length} pendaftar dipindahkan ke jalur ${pathLabels[bulkPath] || bulkPath}`, "success");
    setBulkPathOpen(false);
    setBulkPath("");
    exitPickMode();
    fetchData();
  }

  /** Simpan satu template pesan WA. */
  async function handleSaveTemplate(key: string) {
    const body = (waDrafts[key] ?? "").trim();
    if (!body) {
      toast("Isi template tidak boleh kosong", "error");
      return;
    }
    setWaSavingKey(key);
    const res = await updateSpmbMessageTemplate(key, body);
    setWaSavingKey(null);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setWaTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, body } : t)));
    toast("Template pesan disimpan", "success");
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
          quota: wave.quota != null ? String(wave.quota) : "",
          registration_fee: wave.registration_fee != null ? String(wave.registration_fee) : "",
          announcement_at: wave.announcement_at ? wave.announcement_at.slice(0, 10) : "",
          result_at: wave.result_at ? wave.result_at.slice(0, 10) : "",
          is_archived: wave.is_archived ?? false,
        }
        : {
          name: "",
          start_date: "",
          end_date: "",
          note: "",
          is_published: true,
          quota: "",
          registration_fee: "",
          announcement_at: "",
          result_at: "",
          is_archived: false,
        }
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
      quota: waveForm.quota.trim() === "" ? null : Number(waveForm.quota),
      registration_fee:
        waveForm.registration_fee.trim() === "" ? null : Number(waveForm.registration_fee),
      announcement_at: waveForm.announcement_at || null,
      result_at: waveForm.result_at || null,
      is_archived: waveForm.is_archived,
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header + Tab */}
      <PageHeader
        active={mainTab}
        onSelect={handleTabChange}
        onExport={handleExportCsv}
        onExportXlsx={handleExportXlsx}
        onRecap={handleExportRecap}
        onAdd={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
        onBroadcast={() => setBroadcastOpen(true)}
        canCreate={permCreate}
        canImport={permImport}
        canExport={permExport}
      />

      {/* ── TAB: PENDAFTAR ── */}
      {mainTab === "registrations" && (
        <>
          {/* Stats — StatPillGroup: pill kompak satu baris */}
          <StatPillGroup>
            <StatPill icon={Users} label="Total" value={stats.total} tone="neutral" />
            <StatPill icon={Clock} label="Menunggu" value={stats.pending} tone="warning" />
            <StatPill icon={CheckCircle} label="Diterima" value={stats.accepted} tone="success" />
            <StatPill icon={XCircle} label="Ditolak" value={stats.rejected} tone="danger" />
          </StatPillGroup>

          {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
          <SpmbBulkBar
            count={selectedIds.size}
            canVerify={permVerify}
            canDelete={permDelete}
            bulkPendingSaving={bulkPendingSaving}
            onAccept={() => setConfirmAction({ id: "bulk", status: "accepted" })}
            onReject={() => setConfirmAction({ id: "bulk", status: "rejected" })}
            onMoveWave={() => { setBulkWaveId(""); setBulkWaveOpen(true); }}
            onMovePath={() => { setBulkPath(""); setBulkPathOpen(true); }}
            onSetPending={handleBulkSetPending}
            onScheduleInterview={() => setInterviewTarget("bulk")}
            onDelete={() => setBulkDelete(true)}
            onClear={() => setSelectedIds(new Set())}
          />

          {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
              6 pill compact (ikon + label pendek) agar muat 1 baris di ≥1024px. */}
          <div className="hidden md:block">
            <FilterBar
              placeholder="Cari nama, NISN/NIK, sekolah, program, jalur, putra/putri…"
              searchLabel="Cari nama, NISN/NIK, sekolah, program, jalur, jenis kelamin, email, atau telepon"
              query={search}
              onQueryChange={handleSearchChange}
              wrap
              compact
              filters={[
                {
                  value: filter,
                  options: statusOptions,
                  onChange: (k) => { setFilter(k); resetPage(); },
                  menuLabel: "Filter status",
                  icon: <Tag className="h-3.5 w-3.5" />,
                  shortLabels: { all: "Sts", pending: "Tunggu", accepted: "Terima", rejected: "Tolak" },
                },
                {
                  value: pathFilter,
                  options: pathOptions,
                  onChange: (k) => { setPathFilter(k); resetPage(); },
                  menuLabel: "Filter jalur",
                  icon: <Compass className="h-3.5 w-3.5" />,
                  shortLabels: { all: "Jalur", reguler: "Reg", prestasi: "Pres", beasiswa: "Bea" },
                },
                {
                  value: programFilter,
                  options: programOptions,
                  onChange: (k) => { setProgramFilter(k); resetPage(); },
                  menuLabel: "Filter program",
                  icon: <GraduationCap className="h-3.5 w-3.5" />,
                  shortLabels: {
                    all: "Prodi",
                    "SMP Boarding": "Boarding",
                    "SMP Full Day (Non Boarding)": "Reguler",
                    "SMA Boarding": "SMA",
                    [SPMB_NO_PROGRAM]: "Tanpa",
                  },
                },
                {
                  value: genderFilter,
                  options: genderOptions,
                  onChange: (k) => { setGenderFilter(k); resetPage(); },
                  menuLabel: "Filter jenis kelamin",
                  icon: <Users className="h-3.5 w-3.5" />,
                  shortLabels: { all: "L/P", L: "L", P: "P" },
                },
                {
                  value: actionFilter,
                  options: actionOptions,
                  onChange: (k) => { setActionFilter(k); resetPage(); },
                  menuLabel: "Filter perlu tindakan",
                  icon: <Warning className="h-3.5 w-3.5" />,
                  shortLabels: {
                    all: "Kondisi",
                    overdue: "SLA",
                    docs_rejected: "Ditolak",
                    docs_incomplete: "Kurang",
                    no_wave: "Gelombang",
                    duplicates: "Duplikat",
                  },
                },
                {
                  value: interviewFilter,
                  options: interviewOptions,
                  onChange: (k) => { setInterviewFilter(k); resetPage(); },
                  menuLabel: "Filter wawancara",
                  icon: <CalendarBlank className="h-3.5 w-3.5" />,
                  shortLabels: { all: "Jadwal", scheduled: "Jadwal", unscheduled: "Belum" },
                },
              ]}
            />
          </div>

          {/* Toolbar mobile (<md): 4 filter + urut + Pilih; baris dipecah
              otomatis (stackedControls): [status·tindakan] /
              [jalur·program] / [urut·Pilih]. Tanpa compactFilters agar label
              terbaca, bukan ikon saja. */}
          <MobileFilterBar
            placeholder="Cari nama, NISN/NIK, sekolah, program, jalur, putra/putri…"
            searchLabel="Cari nama, NISN/NIK, sekolah, program, jalur, jenis kelamin, email, atau telepon"
            query={search}
            onQueryChange={handleSearchChange}
            filter={{
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k); resetPage(); },
              menuLabel: "Filter status",
            }}
            filter2={{
              value: actionFilter,
              options: actionOptions,
              onChange: (k) => { setActionFilter(k); resetPage(); },
              menuLabel: "Filter perlu tindakan",
            }}
            filter3={{
              value: pathFilter,
              options: pathOptions,
              onChange: (k) => { setPathFilter(k); resetPage(); },
              menuLabel: "Filter jalur",
            }}
            filter4={{
              value: programFilter,
              options: programOptions,
              onChange: (k) => { setProgramFilter(k); resetPage(); },
              menuLabel: "Filter program",
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
                { key: "gender:asc", label: "Putra dulu" },
                { key: "gender:desc", label: "Putri dulu" },
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

          {/* Tabel desktop (md+) — komponen SpmbDesktopTable */}
          <SpmbDesktopTable
            rows={paginated}
            loading={loading}
            loadError={loadError}
            search={search}
            page={page}
            pageSize={pageSize}
            total={total}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            docSummary={docSummary}
            sortField={sortField}
            sortDir={sortDir}
            canVerify={permVerify}
            canEdit={permUpdate}
            canDelete={permDelete}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelect={toggleSelect}
            onToggleSort={toggleSort}
            onDetail={openDetail}
            onEdit={setEditItem}
            onDelete={setDeleteItem}
            onSetStatus={(r, s) => {
              if (s === "pending") handleSetPending(r);
              else setConfirmAction({ id: r.id, status: s });
            }}
            onRetry={() => void fetchData()}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />


          {/* Daftar mobile (<md) — komponen SpmbMobileList */}
          <SpmbMobileList
            rows={paginated}
            loading={loading}
            loadError={loadError}
            search={search}
            page={page}
            pageSize={pageSize}
            total={total}
            selectedIds={selectedIds}
            pickMode={pickMode}
            docSummary={docSummary}
            canEdit={permUpdate}
            canVerify={permVerify}
            canDelete={permDelete}
            onEnterPickMode={enterPickMode}
            onToggleSelect={toggleSelect}
            onDetail={openDetail}
            onEdit={setEditItem}
            onDelete={setDeleteItem}
            onSetStatus={(r, s) => {
              // Terima/Tolak lewat modal konfirmasi; Jadikan Menunggu langsung.
              if (s === 'pending') handleSetPending(r);
              else setConfirmAction({ id: r.id, status: s });
            }}
            onRetry={() => void fetchData()}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />

          {pickMode && (
            <SpmbMobileBulkBar
              count={selectedIds.size}
              canVerify={permVerify}
              canDelete={permDelete}
              bulkPendingSaving={bulkPendingSaving}
              onAccept={() => setConfirmAction({ id: 'bulk', status: 'accepted' })}
              onReject={() => setConfirmAction({ id: 'bulk', status: 'rejected' })}
              onMoveWave={() => { setBulkWaveId(''); setBulkWaveOpen(true); }}
              onMovePath={() => { setBulkPath(''); setBulkPathOpen(true); }}
              onSetPending={handleBulkSetPending}
              onScheduleInterview={() => setInterviewTarget("bulk")}
              onDelete={() => setBulkDelete(true)}
              onCancel={exitPickMode}
            />
          )}
        </>
      )}

      {/* ── TAB: GELOMBANG (komponen ./WavesTab) ── */}
      {mainTab === "waves" && (
        <WavesTab
          waves={waves}
          wavesLoading={wavesLoading}
          wavesError={wavesError}
          dragDisabled={dragDisabled}
          permUpdate={permUpdate}
          permVerify={permVerify}
          onReorderWaves={onReorderWaves}
          onAdd={() => openWaveForm()}
          onEdit={(w) => openWaveForm(w)}
          onToggleWave={(w) => void handleToggleWave(w)}
          onDelete={(w) => setDeleteWaveItem(w)}
          onPublishResult={(w) => setResultWave(w)}
        />
      )}

      {/* ── TAB: FORMULIR (komponen ./FormTab) ── */}
      {mainTab === "form" && (
        <FormTab
          regMode={regMode}
          regModeSaving={regModeSaving}
          regUrl={regUrl}
          formFields={formFields}
          fieldMax={FIELD_MAX}
          onOpenGoogleModal={() => setGoogleModal(true)}
          onChangeRegMode={(m) => void handleChangeRegMode(m)}
          onAddField={() => openFieldForm()}
          onEditField={(f) => openFieldForm(f)}
          onToggleField={(f) => void handleToggleField(f)}
          onMoveField={(i, d) => void handleMoveField(i, d)}
          onDeleteField={(f) => setDeleteFieldItem(f)}
        />
      )}

      {/* ── TAB: PENGATURAN (komponen ./SettingsTab) ── */}
      {mainTab === "settings" && (
        <SettingsTab
          docBrochure={docBrochure}
          docBrochureErr={docBrochureErr}
          docOffline={docOffline}
          docOfflineErr={docOfflineErr}
          docPhone={docPhone}
          docPhoneErr={docPhoneErr}
          docHighlight={docHighlight}
          docSaving={docSaving}
          docDirty={docDirty}
          waTemplates={waTemplates}
          waDrafts={waDrafts}
          waSavingKey={waSavingKey}
          permUpdate={permUpdate}
          onDocBrochureChange={(v) => { setDocBrochure(v); setDocBrochureErr(null); }}
          onDocOfflineChange={(v) => { setDocOffline(v); setDocOfflineErr(null); }}
          onDocPhoneChange={(v) => { setDocPhone(v); setDocPhoneErr(null); }}
          onDocHighlightChange={setDocHighlight}
          onSaveDocs={() => void handleSaveDocs()}
          onWaDraftChange={(k, v) => setWaDrafts((prev) => ({ ...prev, [k]: v }))}
          onSaveTemplate={(k) => void handleSaveTemplate(k)}
        />
      )}

      {/* ── MODALS & SLIDE-OVERS (SHARED ANTAR TAB) ──────────────────── */}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kuota (opsional)</label>
                <input type="number" min={0} value={waveForm.quota}
                  onChange={(e) => setWaveForm({ ...waveForm, quota: e.target.value })}
                  placeholder="cth: 64"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Biaya pendaftaran (Rp)</label>
                <input type="number" min={0} value={waveForm.registration_fee}
                  onChange={(e) => setWaveForm({ ...waveForm, registration_fee: e.target.value })}
                  placeholder="cth: 150000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal pengumuman</label>
                <input type="date" value={waveForm.announcement_at}
                  onChange={(e) => setWaveForm({ ...waveForm, announcement_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal hasil seleksi</label>
                <input type="date" value={waveForm.result_at}
                  onChange={(e) => setWaveForm({ ...waveForm, result_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              </div>
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

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Arsipkan gelombang</label>
              <button type="button" onClick={() => setWaveForm({ ...waveForm, is_archived: !waveForm.is_archived })}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${waveForm.is_archived ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                <span>{waveForm.is_archived ? "Diarsipkan" : "Aktif"}</span>
                <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${waveForm.is_archived ? "bg-amber-500" : "bg-slate-300"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${waveForm.is_archived ? "translate-x-5" : ""}`} />
                </span>
              </button>
              <p className="mt-1 text-xs text-slate-400">Gelombang arsip disimpan untuk riwayat, tidak dipakai pendaftaran baru.</p>
            </div>
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

      {/* ── VIEW MODAL — komponen SpmbDetailModal ───────── */}
      {viewItem && (
        <SpmbDetailModal
          item={viewItem}
          viewTab={viewTab}
          customAnswers={customAnswers}
          signedUrls={signedUrls}
          docVerifs={docVerifs}
          docVerifSaving={docVerifSaving}
          waTemplates={waTemplates}
          waveName={waveLabel(viewItem.wave_id)}
          canEdit={permUpdate}
          canVerify={permVerify}
          canSeeSensitive={permSensitive}
          onClose={() => setViewItem(null)}
          onTabChange={setViewTab}
          onVerifyDoc={handleVerifyDoc}
          onSendWa={handleSendWaTemplate}
          onEdit={() => { setViewItem(null); setEditItem(viewItem); }}
          onScheduleInterview={() => setInterviewTarget(viewItem)}
          onConfirmStatus={(id, status) => { setViewItem(null); setConfirmAction({ id, status }); }}
        />
      )}

      {/* ── JADWAL WAWANCARA (TUNGGAL / MASSAL) ──── */}
      {interviewTarget && (
        <InterviewScheduleModal
          open
          title={interviewTarget === "bulk" ? `Jadwalkan Wawancara ${selectedIds.size} Pendaftar` : "Jadwalkan Wawancara"}
          subtitle={
            interviewTarget === "bulk"
              ? "Satu jadwal yang sama untuk semua pendaftar terpilih."
              : interviewTarget.full_name
          }
          initialAt={interviewTarget === "bulk" ? null : interviewTarget.interview_at}
          initialNote={interviewTarget === "bulk" ? "" : interviewTarget.interview_note || ""}
          saving={interviewSaving}
          onClose={() => !interviewSaving && setInterviewTarget(null)}
          onSave={handleSaveInterview}
        />
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
              existing={importCandidates}
              onImported={fetchData}
            />
          )}

          {/* ── MODAL KONFIRMASI — komponen SpmbModals ──── */}
          <SpmbModals
            deleteItem={deleteItem}
            bulkDelete={bulkDelete}
            bulkPathOpen={bulkPathOpen}
            bulkPath={bulkPath}
            bulkPathSaving={bulkPathSaving}
            bulkWaveOpen={bulkWaveOpen}
            bulkWaveId={bulkWaveId}
            bulkWaveSaving={bulkWaveSaving}
            confirmAction={confirmAction}
            selectedCount={selectedIds.size}
            waves={waves}
            onCloseDelete={() => setDeleteItem(null)}
            onConfirmDelete={handleDelete}
            onCloseBulkDelete={() => setBulkDelete(false)}
            onConfirmBulkDelete={handleBulkDelete}
            onCloseBulkPath={() => setBulkPathOpen(false)}
            onBulkPathChange={setBulkPath}
            onConfirmBulkPath={handleBulkMovePath}
            onCloseBulkWave={() => setBulkWaveOpen(false)}
            onBulkWaveChange={setBulkWaveId}
            onConfirmBulkWave={handleBulkMoveWave}
            onCloseConfirm={() => setConfirmAction(null)}
            onConfirmStatus={() => {
              if (!confirmAction) return;
              if (confirmAction.id === 'bulk') handleBulkStatus(confirmAction.status);
              else handleUpdateStatus(confirmAction.id, confirmAction.status);
            }}
          />


      {mainTab === "pipeline" && (
        <PipelineBoard
          registrations={pipelineRows}
          docSummary={docSummary}
          onOpenDetail={openDetail}
          onOpenConfirmStatus={(id, status) => setConfirmAction({ id, status })}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {mainTab === "interviews" && (
        <InterviewsPanel
          rows={interviewRows}
          loading={interviewsLoading}
          canVerify={permVerify}
          onDetail={openDetail}
          onReschedule={(item) => setInterviewTarget(item)}
          onSendInvite={handleSendInterviewInvite}
        />
      )}

      {broadcastOpen && (
        <BroadcastWaModal
          isOpen={broadcastOpen}
          onClose={() => setBroadcastOpen(false)}
          registrations={broadcastRows}
        />
      )}
    </div>
  );
}
