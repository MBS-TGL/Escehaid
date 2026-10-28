"use client";

/**
 * Halaman Feature Flags — daftar flag dengan toggle, badge status, dan editor jadwal.
 * Akses dikunci oleh proxy (`flags:manage`) + server action guard.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { ConfirmModal } from "@/components/ui/Modal";
import { saveFlagSettings, resetFlagSettings } from "./actions";
import { getFlagsByCategory, FLAG_CATEGORIES, type FeatureFlagKey, FEATURE_FLAG_MAP } from "@/lib/flags/registry";
import { type FlagEvaluation, STATUS_LABEL } from "@/lib/flags/evaluate";
import {
  Clock,
  CalendarBlank,
  Play,
  XCircle,
  ArrowUUpLeft,
  ShieldCheck,
  Warning,
  ArrowUp,
  FloppyDisk,
} from "@/components/Icons";

export function FlagsList({ initialFlags, initialOverrides }: { initialFlags: Record<FeatureFlagKey, FlagEvaluation>; initialOverrides: Record<FeatureFlagKey, { enabled: boolean; startAt: string | null; endAt: string | null }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy + requirePermission di actions.ts.
  const permManage = can("flags:manage");

  const [flags] = useState(initialFlags);
  const [overrides] = useState(initialOverrides);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<FeatureFlagKey | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<{ startAt: string; endAt: string }>({ startAt: "", endAt: "" });
  const [resetOpen, setResetOpen] = useState<FeatureFlagKey | null>(null);

  function getDef(key: FeatureFlagKey) {
    return FEATURE_FLAG_MAP[key];
  }

  async function handleToggle(key: FeatureFlagKey, nextEnabled: boolean) {
    const override = overrides[key] ?? { enabled: getDef(key).defaultEnabled, startAt: null, endAt: null };
    setSaving(key);

    const result = await saveFlagSettings(key, { ...override, enabled: nextEnabled });
    setSaving(null);

    if (!result.success) {
      toast(result.error ?? "Gagal mengubah status.", "error");
      return;
    }

    toast(`${getDef(key).name} ${nextEnabled ? "diaktifkan" : "dinonaktifkan"}.`, "success");
    router.refresh();
  }

  async function handleSaveSchedule(key: FeatureFlagKey) {
    const override = overrides[key] ?? { enabled: getDef(key).defaultEnabled, startAt: null, endAt: null };
    setSaving(key);

    const result = await saveFlagSettings(key, {
      ...override,
      startAt: scheduleDraft.startAt || null,
      endAt: scheduleDraft.endAt || null,
    });
    setSaving(null);
    setEditingKey(null);
    setScheduleDraft({ startAt: "", endAt: "" });

    if (!result.success) {
      toast(result.error ?? "Gagal menyimpan jadwal.", "error");
      return;
    }

    toast("Jadwal disimpan.", "success");
    router.refresh();
  }

  async function handleReset(key: FeatureFlagKey) {
    setSaving(key);
    const result = await resetFlagSettings(key);
    setSaving(null);
    setResetOpen(null);

    if (!result.success) {
      toast(result.error ?? "Gagal mereset.", "error");
      return;
    }

    toast(`${getDef(key).name} dikembalikan ke bawaan.`, "success");
    router.refresh();
  }

  function openScheduleEditor(key: FeatureFlagKey) {
    const ov = overrides[key];
    if (ov) {
      setScheduleDraft({
        startAt: ov.startAt ? new Date(ov.startAt).toISOString().slice(0, 16) : "",
        endAt: ov.endAt ? new Date(ov.endAt).toISOString().slice(0, 16) : "",
      });
    } else {
      setScheduleDraft({ startAt: "", endAt: "" });
    }
    setEditingKey(key);
  }

  return (
    <div className="space-y-4">
      {FLAG_CATEGORIES.map((cat) => {
        const catFlags = getFlagsByCategory(cat);
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{cat}</h3>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {catFlags.map((def) => {
                const evaln = flags[def.key];
                const ov = overrides[def.key];
                const isEditing = editingKey === def.key;
                const status = evaln?.status ?? "inactive";
                const active = evaln?.active ?? false;
                const highImpact = def.highImpact;

                return (
                  <div
                    key={def.key}
                    className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center border-t border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 ${isEditing ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 truncate">{def.name}</span>
                        {highImpact && (
                          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" aria-label="Dampak tinggi — konfirmasi extra" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">{def.description}</p>

                      {isEditing && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Mulai aktif (UTC)</label>
                            <input
                              type="datetime-local"
                              value={scheduleDraft.startAt}
                              onChange={(e) => setScheduleDraft({ ...scheduleDraft, startAt: e.target.value })}
                              className="w-full rounded-xl border border-[#dce3ed] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1767b1]/10 focus:border-[#1767b1]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Berakhir (UTC)</label>
                            <input
                              type="datetime-local"
                              value={scheduleDraft.endAt}
                              onChange={(e) => setScheduleDraft({ ...scheduleDraft, endAt: e.target.value })}
                              className="w-full rounded-xl border border-[#dce3ed] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1767b1]/10 focus:border-[#1767b1]"
                            />
                          </div>
                        </div>
                      )}

                      {!isEditing && ov && (ov.startAt || ov.endAt) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {ov.startAt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              <Clock className="h-3 w-3" />
                              Mulai: {new Date(ov.startAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                          {ov.endAt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              <CalendarBlank className="h-3 w-3" />
                              Berakhir: {new Date(ov.endAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                        status === "active" ? "bg-emerald-50 text-emerald-700" :
                        status === "scheduled" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status === "active" && <Play className="h-3.5 w-3.5" />}
                      {status === "scheduled" && <Clock className="h-3.5 w-3.5" />}
                      {status === "inactive" && <XCircle className="h-3.5 w-3.5" />}
                      {STATUS_LABEL[status]}
                    </span>

                    {/* Actions */}
                    {permManage && (
                    <div className="flex items-center gap-1">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggle(def.key, !active)}
                            disabled={saving === def.key}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
                              active
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                            aria-label={active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {active ? <XCircle className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => openScheduleEditor(def.key)}
                            disabled={saving === def.key}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            title="Atur jadwal"
                          >
                            <Clock className="h-4.5 w-4.5" />
                          </button>

                          {highImpact && (
                            <button
                              type="button"
                              onClick={() => setResetOpen(def.key)}
                              disabled={saving === def.key}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-red-500 hover:bg-red-50"
                              title="Kembalikan ke bawaan"
                            >
                              <ArrowUUpLeft className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveSchedule(def.key)}
                            disabled={saving === def.key}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#082b59] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0b3a75]"
                          >
                            <FloppyDisk className="h-3.5 w-3.5" />
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            disabled={saving === def.key}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            aria-label="Batal"
                          >
                            <ArrowUp className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.keys(overrides).filter((k) => !FEATURE_FLAG_MAP[k]).length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Warning className="inline h-4 w-4 mr-2" />
          Terdapat flag di database yang tidak terdaftar di registry. Tambahkan definisinya di
          <code>src/lib/flags/registry.ts</code> agar muncul di sini.
        </div>
      )}

      <ConfirmModal
        open={!!resetOpen}
        onClose={() => setResetOpen(null)}
        onConfirm={() => resetOpen && handleReset(resetOpen)}
        title="Kembalikan ke bawaan?"
        message={`Flag <strong>{resetOpen ? getDef(resetOpen).name : ""}</strong> akan kembali ke nilai default (enabled: {resetOpen ? String(getDef(resetOpen).defaultEnabled) : ""}). Override di database dihapus. Tindakan ini dicatat di Log Aktivitas.`}
        confirmLabel="Kembalikan ke bawaan"
        cancelLabel="Batal"
        variant="warning"
        loading={saving === resetOpen}
      />
    </div>
  );
}