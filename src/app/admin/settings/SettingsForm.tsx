"use client";

/**
 * Form Konfigurasi Situs — satu tab per grup (Identitas, Kontak, Media Sosial,
 * SEO, Footer, Tema).
 *
 * Semantik:
 *   • Input menampilkan NILAI EFEKTIF (override → school_profile → default)
 *     dan menyebutkan asalnya lewat lencana.
 *   • Kolom yang DIKOSONGKAN = "hapus override" → situs kembali memakai nilai
 *     profil sekolah / bawaan.
 *   • Hanya kunci yang berubah (dirty) yang dikirim ke server — tab lain tidak
 *     pernah ikut tersimpan.
 * Penegakan izin tetap di server (`requirePermission` + RLS); tab ini kenyamanan.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { ConfirmModal } from "@/components/ui/Modal";
import { MediaPicker } from "./MediaPicker";
import { resetGroupSettings, saveGroupSettings } from "./actions";
import {
  SETTING_GROUPS,
  SETTING_GROUP_META,
  fieldsForGroup,
  type SettingField,
  type SettingGroup,
} from "@/lib/settings/registry";
import { normalizeHex } from "@/lib/settings/contrast";
import { THEME_PRESETS, findThemePreset, validateThemePair } from "@/lib/settings/theme";
import type { SiteSettings } from "@/lib/settings";
import {
  Buildings,
  EnvelopeSimple,
  ShareNetwork,
  Globe,
  NotePencil,
  Palette,
  FloppyDisk,
  ArrowUUpLeft,
  CheckCircle,
  Warning,
} from "@/components/Icons";

const GROUP_ICONS: Record<SettingGroup, typeof Buildings> = {
  identitas: Buildings,
  kontak: EnvelopeSimple,
  media_sosial: ShareNetwork,
  seo: Globe,
  footer: NotePencil,
  tema: Palette,
};

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy + requirePermission di actions.ts.
  const permManage = can("settings:manage");

  const [tab, setTab] = useState<SettingGroup>("identitas");
  const [drafts, setDrafts] = useState<Record<string, string>>({ ...initial.values });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // Sinkronkan draft dengan data segar dari server (setelah router.refresh()),
  // TANPA menimpa isian yang sedang diedit pengguna.
  const prevInitialRef = useRef(initial.values);
  useEffect(() => {
    const prevInitial = prevInitialRef.current;
    prevInitialRef.current = initial.values;
    queueMicrotask(() => {
      setDrafts((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(initial.values)) {
          const editing = prev[key] !== undefined && prev[key] !== prevInitial[key];
          if (!editing) next[key] = value;
        }
        return next;
      });
    });
  }, [initial]);

  const dirtyKeys = (group: SettingGroup) =>
    fieldsForGroup(group).filter((f) => (drafts[f.key] ?? "") !== (initial.values[f.key] ?? ""));

  const tabDirtyCount = (group: SettingGroup) => dirtyKeys(group).length;
  const totalDirty = SETTING_GROUPS.reduce((n, g) => n + tabDirtyCount(g), 0);

  function setDraft(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    const changed = dirtyKeys(tab);
    if (changed.length === 0) return;

    setSaving(true);
    setFormError(null);
    const payload: Record<string, string> = {};
    for (const field of changed) payload[field.key] = drafts[field.key] ?? "";

    const result = await saveGroupSettings(tab, payload);
    setSaving(false);

    if (!result.success) {
      setFormError(result.error ?? "Gagal menyimpan.");
      setFieldErrors(result.fieldErrors ?? {});
      if (result.fieldErrors && Object.keys(result.fieldErrors).length === 0) {
        toast(result.error ?? "Gagal menyimpan.", "error");
      }
      return;
    }

    toast(
      result.changes === 0
        ? "Tidak ada perubahan untuk disimpan."
        : `${result.changes} pengaturan berhasil disimpan.`,
      "success"
    );
    router.refresh();
  }

  async function handleResetGroup() {
    setSaving(true);
    const result = await resetGroupSettings(tab);
    setSaving(false);
    setResetOpen(false);

    if (!result.success) {
      toast(result.error ?? "Gagal mereset.", "error");
      return;
    }
    toast(`Konfigurasi ${SETTING_GROUP_META[tab].label} dikembalikan ke bawaan.`, "success");
    router.refresh();
  }

  const groupMeta = SETTING_GROUP_META[tab];

  return (
    <div>
      {/* Tab grup */}
      <div
        role="tablist"
        aria-label="Grup pengaturan situs"
        className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1"
      >
        {SETTING_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group];
          const active = group === tab;
          const dirty = tabDirtyCount(group);
          return (
            <button
              key={group}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(group);
                setFieldErrors({});
                setFormError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-[var(--brand-primary)] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{SETTING_GROUP_META[group].label}</span>
              {dirty > 0 && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#f4d21f]" aria-label="Ada perubahan belum disimpan" />
              )}
            </button>
          );
        })}
      </div>

      {/* Judul grup */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">{groupMeta.label}</h2>
        <p className="text-sm text-slate-500">{groupMeta.description}</p>
      </div>

      {/* Galat umum */}
      {formError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Warning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Isian */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className={tab === "tema" ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" : "grid gap-5"}>
          <div className="min-w-0 space-y-5">
            {fieldsForGroup(tab).map((field) => (
              <Field
                key={field.key}
                field={field}
                value={drafts[field.key] ?? ""}
                effective={initial.values[field.key] ?? ""}
                source={initial.sources[field.key] ?? "default"}
                error={fieldErrors[field.key]}
                disabled={saving}
                onChange={(v) => setDraft(field.key, v)}
              />
            ))}

            {tab === "tema" && (
              <ThemePresets
                primary={drafts.theme_primary ?? ""}
                accent={drafts.theme_accent ?? ""}
                onApply={(primary, accent) => {
                  setDraft("theme_primary", primary);
                  setDraft("theme_accent", accent);
                }}
              />
            )}
          </div>

          {tab === "tema" && (
            <ThemePreview
              primary={drafts.theme_primary ?? ""}
              accent={drafts.theme_accent ?? ""}
            />
          )}
        </div>

        {/* Aksi */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || tabDirtyCount(tab) === 0 || !permManage}
            title={permManage ? undefined : "Tidak berizin menyimpan pengaturan"}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-mid)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FloppyDisk className="h-4 w-4" />
            {saving ? "Menyimpan…" : "Simpan perubahan"}
          </button>

          <button
            type="button"
            onClick={() => setResetOpen(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-40"
          >
            <ArrowUUpLeft className="h-4 w-4" />
            Kembalikan ke bawaan
          </button>

          <span className="text-xs text-slate-500">
            {totalDirty > 0
              ? `${totalDirty} perubahan belum disimpan${tabDirtyCount(tab) === 0 ? " (di tab lain)" : ""}.`
              : "Kolom yang dikosongkan akan kembali memakai nilai profil sekolah / bawaan."}
          </span>
        </div>
      </div>

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => void handleResetGroup()}
        title={`Kembalikan pengaturan ${groupMeta.label} ke bawaan?`}
        message="Seluruh perubahan pada tab ini akan dihapus dan situs kembali memakai nilai profil sekolah / bawaan. Tindakan ini dicatat di Log Aktivitas."
        confirmLabel="Kembalikan ke bawaan"
        cancelLabel="Pertahankan perubahan"
        variant="warning"
        loading={saving}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  override: { label: "Diubah admin", className: "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" },
  profile: { label: "Profil sekolah", className: "bg-slate-100 text-slate-600" },
  default: { label: "Bawaan", className: "bg-slate-100 text-slate-500" },
};

function Field({
  field,
  value,
  effective,
  source,
  error,
  disabled,
  onChange,
}: {
  field: SettingField;
  value: string;
  effective: string;
  source: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const badge = SOURCE_BADGE[source] ?? SOURCE_BADGE.default;
  const isDirty = value !== effective;
  const inputClass = `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:ring-2 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
      : "border-[#dce3ed] focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/10"
  }`;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={field.key} className="text-sm font-medium text-slate-700">
          {field.label}
        </label>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
        {isDirty && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
            <Warning className="h-3 w-3" />
            Belum disimpan
          </span>
        )}
      </div>

      {field.type === "textarea" ? (
        <textarea
          id={field.key}
          rows={3}
          value={value}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : field.type === "image" ? (
        <MediaPicker
          label={""}
          help={field.help}
          error={error}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      ) : field.type === "color" ? (
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label={`Pilih ${field.label}`}
            value={normalizeHex(value) ?? "#000000"}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-16 cursor-pointer rounded-xl border border-[#dce3ed] bg-white p-1"
          />
          <input
            id={field.key}
            type="text"
            value={value}
            disabled={disabled}
            placeholder="#082b59"
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : (
        <input
          id={field.key}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          value={value}
          disabled={disabled}
          placeholder={field.placeholder ?? (source !== "override" ? effective : undefined)}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}

      {field.help && !error && field.type !== "image" && (
        <p className="mt-1.5 text-xs text-slate-500">{field.help}</p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {source === "profile" && field.type !== "image" && (
        <p className="mt-1.5 text-xs text-slate-400">
          Nilai ini berasal dari Profil Sekolah. Isi kolom untuk menimpanya, atau kosongkan untuk mengembalikannya.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function ThemePreview({
  primary,
  accent,
}: {
  primary: string;
  accent: string;
}) {
  const verdict = validateThemePair(primary, accent);
  const safePrimary = normalizeHex(primary) ?? "#082b59";
  const safeAccent = normalizeHex(accent) ?? "#1767b1";

  return (
    <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
      {/* Pratinjau langsung */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Pratinjau langsung</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: safePrimary }}>
            <span className="text-xs font-bold text-white">SMP Muhammadiyah 4</span>
            <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: safeAccent, color: "#ffffff" }}>
              SPMB
            </span>
          </div>
          <div className="space-y-2 bg-white p-3">
            <div className="h-2 w-3/4 rounded" style={{ backgroundColor: safePrimary }} />
            <div className="h-2 w-1/2 rounded" style={{ backgroundColor: safeAccent }} />
            <button type="button" className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ backgroundColor: safePrimary }}>
              Tombol utama
            </button>
          </div>
          <div className="px-3 py-2 text-[11px]" style={{ backgroundColor: safePrimary, color: "rgba(255,255,255,0.7)" }}>
            Footer situs
          </div>
        </div>

        {/* Kontras */}
        <div className="mt-3 space-y-1.5">
          <ContrastRow label="Teks putih di warna utama" result={verdict.primaryOnWhite} min={4.5} />
          <ContrastRow label="Teks putih di warna aksen" result={verdict.accentOnWhite} min={3} />
        </div>

        {!verdict.ok && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{verdict.errors.join(" ")}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function ThemePresets({
  primary,
  accent,
  onApply,
}: {
  primary: string;
  accent: string;
  onApply: (primary: string, accent: string) => void;
}) {
  const activePreset = findThemePreset(primary, accent);

  return (
    <section aria-label="Preset warna" className="min-w-0">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Preset warna</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {THEME_PRESETS.map((preset) => {
          const active = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset.primary, preset.accent)}
              aria-pressed={active}
              className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                active ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/5" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="flex shrink-0 gap-1">
                <span className="h-6 w-6 rounded-md border border-black/5" style={{ backgroundColor: preset.primary }} />
                <span className="h-6 w-6 rounded-md border border-black/5" style={{ backgroundColor: preset.accent }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-700">{preset.label}</span>
                <span className="block truncate text-xs text-slate-500">{preset.description}</span>
              </span>
              {active && <CheckCircle className="ml-auto h-4 w-4 shrink-0 text-[var(--brand-accent)]" />}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Warna diterapkan lewat variabel CSS — perubahan langsung terlihat di situs publik setelah disimpan.
      </p>
    </section>
  );
}

function ContrastRow({ label, result, min }: { label: string; result: number | null; min: number }) {
  const pass = result !== null && result >= min;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`inline-flex items-center gap-1 font-semibold ${pass ? "text-emerald-600" : "text-red-600"}`}>
        {pass ? <CheckCircle className="h-3.5 w-3.5" /> : <Warning className="h-3.5 w-3.5" />}
        {result === null ? "—" : `${result.toFixed(2)}:1`}
      </span>
    </div>
  );
}
