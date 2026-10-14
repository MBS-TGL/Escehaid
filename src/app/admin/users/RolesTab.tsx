"use client";

/**
 * Tab "Peran" — editor matriks izin (peran × aksi).
 *
 * Checkbox dikelompokkan per modul (dari MODULE_REGISTRY). Peran SUPER_ADMIN
 * terkunci (izinnnya tidak bisa dikurangi). Setiap perubahan disimpan lewat
 * server action `saveRolePermissions` yang divalidasi `users:manage` dan
 * dicatat ke log aktivitas.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRoleList,
  getRolePermissions,
  rbacTablesReady,
  type RoleRow,
} from "@/lib/queries/rbac";
import { MODULE_REGISTRY } from "@/lib/rbac/permissions";
import { DEFAULT_ROLES } from "@/lib/rbac/roles";
import { saveRolePermissions, resetRoleToDefault } from "./actions";
import { useToast } from "@/components/ui/Toast";
import {
  Crown,
  FloppyDisk,
  ArrowUUpLeft,
  CheckCircle,
  Lock,
  Warning,
  ShieldCheck,
} from "@/components/Icons";

const ROLE_BADGE: Record<string, { text: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  SUPER_ADMIN: { text: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Crown },
  ADMIN_SEKOLAH: { text: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: ShieldCheck },
  OPERATOR_KONTEN: { text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: ShieldCheck },
  PANITIA_SPMB: { text: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: ShieldCheck },
};

export function RolesTab() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permMap, setPermMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN_SEKOLAH");
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    // Tidak memanggil setLoading(true): `loading` sudah true pada mount, dan
    // saat muat ulang (setelah simpan) tombol sudah punya spinner sendiri.
    const ok = await rbacTablesReady();
    setReady(ok);
    if (!ok) {
      setLoading(false);
      return;
    }
    const [roleRows, perms] = await Promise.all([getRoleList(), getRolePermissions()]);
    setRoles(roleRows);
    setPermMap(perms);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Panggil lewat microtask: `load` mengubah state, dan memanggilnya langsung
    // di body effect dianggap "setState sinkron dalam effect" oleh ESLint.
    queueMicrotask(() => {
      load().catch(() => {});
    });
  }, [load]);

  const isSuper = selectedRole === "SUPER_ADMIN";

  /**
   * Izin efektif untuk peran terpilih: `draft` bila ada perubahan yang belum
   * disimpan, selain itu isi `permMap[peran]`. Sengaja TIDAK memakai effect
   * sync — draft di-reset eksplisit saat ganti peran dan setelah simpan/reset
   * (event handler & callback async), sehingga tidak ada setState sinkron di
   * dalam effect.
   */
  const currentPerms = useMemo<Set<string>>(
    () => draft ?? new Set(permMap[selectedRole] ?? []),
    [draft, permMap, selectedRole]
  );

  function toggle(perm: string) {
    if (isSuper) return; // terkunci
    const next = new Set(currentPerms);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setDraft(next);
    setDirty(true);
  }

  function toggleModule(allPerms: readonly string[], checked: boolean) {
    if (isSuper) return;
    const next = new Set(currentPerms);
    for (const p of allPerms) {
      if (checked) next.add(p);
      else next.delete(p);
    }
    setDraft(next);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const res = await saveRolePermissions(selectedRole, Array.from(currentPerms));
    setSaving(false);
    if (res.success) {
      toast("Izin peran berhasil disimpan", "success");
      setDirty(false);
      await load();
      setDraft(null);
    } else {
      toast(res.error ?? "Gagal menyimpan izin", "error");
    }
  }

  async function handleReset() {
    setSaving(true);
    const res = await resetRoleToDefault(selectedRole);
    setSaving(false);
    if (res.success) {
      toast("Izin dikembalikan ke default", "success");
      setDirty(false);
      await load();
      setDraft(null);
    } else {
      toast(res.error ?? "Gagal mengembalikan default", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 bg-white py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
        <p className="text-sm text-slate-500">Memuat matriks izin...</p>
      </div>
    );
  }

  if (!ready) {
    return <RbacSqlNotice />;
  }

  // Daftar peran = gabungan dari DB + registry (aman bila DB kosong).
  const roleKeys = roles.length > 0
    ? roles.map((r) => r.key)
    : DEFAULT_ROLES.map((r) => r.key);
  const roleLabel = (key: string) =>
    roles.find((r) => r.key === key)?.name ?? DEFAULT_ROLES.find((r) => r.key === key)?.label ?? key;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      {/* Daftar peran */}
      <div className="h-max rounded-xl border border-slate-200/80 bg-white p-3">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Peran</p>
        <ul className="space-y-1">
          {roleKeys.map((key) => {
            const badge = ROLE_BADGE[key] ?? ROLE_BADGE.ADMIN_SEKOLAH;
            const active = selectedRole === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    // Ganti peran: buang draf lama & tandai bersih — izin yang
                    // tampil kembali ke isi tersimpan peran yang dipilih.
                    setSelectedRole(key);
                    setDraft(null);
                    setDirty(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-[#082b59]/10 text-[#082b59]" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <badge.icon className={`h-4 w-4 shrink-0 ${badge.text}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{roleLabel(key)}</span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {(permMap[key] ?? []).length} izin
                    </span>
                  </span>
                  {key === "SUPER_ADMIN" && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Matriks izin */}
      <div className="rounded-xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">{roleLabel(selectedRole)}</h2>
            <p className="text-xs text-slate-500">
              {DEFAULT_ROLES.find((r) => r.key === selectedRole)?.description ??
                "Atur izin modul untuk peran ini."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || isSuper}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowUUpLeft className="h-3.5 w-3.5" />
              Default
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 rounded-xl bg-[#082b59] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1767b1] disabled:opacity-50"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <FloppyDisk className="h-3.5 w-3.5" />
              )}
              Simpan
            </button>
          </div>
        </div>

        {isSuper && (
          <div className="flex items-start gap-2 border-b border-slate-200/80 bg-purple-50/60 px-5 py-3 text-xs text-purple-700">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Izin <strong>SUPER_ADMIN</strong> bersifat penuh dan tidak bisa dikurangi. Ia selalu
              memiliki akses ke seluruh modul.
            </p>
          </div>
        )}

        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
          {MODULE_REGISTRY.map((mod) => {
            const modPerms = mod.actions.map((a) => `${mod.key}:${a.key}`);
            const checkedCount = modPerms.filter((p) => currentPerms.has(p)).length;
            const allChecked = checkedCount === modPerms.length;
            return (
              <div key={mod.key} className="rounded-xl border border-slate-200/70">
                <div className="flex items-center gap-3 border-b border-slate-200/70 bg-slate-50/70 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    disabled={isSuper}
                    onChange={(e) => toggleModule(modPerms, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1] disabled:opacity-40"
                    aria-label={`Pilih semua aksi ${mod.label}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">{mod.label}</p>
                    {mod.description && (
                      <p className="truncate text-[11px] text-slate-400">{mod.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400 tabular-nums">
                    {checkedCount}/{modPerms.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mod.actions.map((action) => {
                    const perm = `${mod.key}:${action.key}`;
                    const checked = isSuper || currentPerms.has(perm);
                    return (
                      <label
                        key={perm}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                          isSuper ? "text-slate-400" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isSuper}
                          onChange={() => toggle(perm)}
                          className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1] disabled:opacity-40"
                        />
                        <span>{action.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer ringkasan */}
        <div className="flex items-center gap-2 border-t border-slate-200/80 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          {dirty ? (
            <>
              <Warning className="h-3.5 w-3.5 text-amber-500" />
              <span>Ada perubahan yang belum disimpan.</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                {currentPerms.size} izin aktif untuk {roleLabel(selectedRole)}.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Panel "jalankan SQL" bila tabel RBAC belum ada (degradasi anggun). */
export function RbacSqlNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <Warning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h3 className="text-sm font-bold text-amber-800">Jalankan migrasi RBAC dulu</h3>
          <p className="mt-1 text-sm text-amber-700">
            Tabel <code className="rounded bg-amber-100 px-1">roles</code> &amp;{" "}
            <code className="rounded bg-amber-100 px-1">role_permissions</code> belum dibuat. Jalankan
            berkas <code className="rounded bg-amber-100 px-1">supabase/rbac_foundation.sql</code> di
            Supabase SQL Editor, lalu muat ulang halaman ini.
          </p>
        </div>
      </div>
    </div>
  );
}
