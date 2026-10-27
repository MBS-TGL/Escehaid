"use client";

/**
 * Halaman 403 — ditampilkan proxy.ts ketika user login tetapi tidak memiliki
 * izin untuk rute SISTEM yang diminta. Ramah & informatif (menunjukkan izin
 * yang dibutuhkan), dengan tombol kembali ke dashboard.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Lock, House } from "@/components/Icons";
import { MODULE_LABELS } from "@/lib/rbac/permissions";

/** Label Indonesia untuk izin `modul:aksi`. */
const PERMISSION_LABELS: Record<string, string> = {
  "users:manage": "mengelola Pengguna & Peran",
  "settings:manage": "mengubah Pengaturan Situs",
  "flags:manage": "mengelola Feature Flags",
  "logs:read": "melihat Log Aktivitas",
  "backup:read": "melihat status Cadangan",
  "backup:update": "menjalankan Cadangan",
  "diagnostik:read": "melihat Diagnostik sistem",
  "sampah:read": "membuka Sampah",
  "sql:manage": "mengakses Migrasi SQL",
  "dev:read": "melihat alat developer",
};

/**
 * Label izin: entri khusus dulu, lalu turunkan dari registry
 * (`modul` → nama modul, `aksi` → kata kerja). Dengan begitu izin modul
 * konten (mis. `spmb:verify`) tetap terbaca manusia tanpa perlu menambah
 * entri manual setiap kali ada modul baru.
 */
function labelFor(perm: string): string {
  const explicit = PERMISSION_LABELS[perm];
  if (explicit) return explicit;

  const [moduleKey, action] = perm.split(":");
  const moduleLabel = MODULE_LABELS[moduleKey];
  if (!moduleLabel) return perm;

  const actionLabels: Record<string, string> = {
    read: "melihat",
    create: "menambah",
    update: "mengubah",
    delete: "menghapus",
    publish: "mempublikasikan",
    verify: "memverifikasi",
    import: "mengimpor",
    export: "mengekspor",
    view_sensitive: "melihat data sensitif",
    upload: "mengunggah",
    manage: "mengelola",
  };
  const actionLabel = actionLabels[action];
  if (!actionLabel) return perm;
  return `${actionLabel} ${moduleLabel}`;
}

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const perm = searchParams.get("perlu");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-8 w-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Akses Ditolak</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {perm === "unknown" ? (
          <>
            Halaman admin ini belum dipetakan ke izin apa pun, sehingga aksesnya
            ditolak secara default. Laporkan ke developer agar rute ini
            didaftarkan di <code className="font-mono text-xs">admin-routes.ts</code>.
          </>
        ) : perm ? (
          <>
            Akun Anda tidak memiliki izin untuk {labelFor(perm)}. Hubungi
            Super Admin bila Anda merasa seharusnya memiliki akses.
          </>
        ) : (
          <>
            Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi
            Super Admin bila Anda merasa seharusnya memiliki akses.
          </>
        )}
      </p>
      <Link
        href="/admin"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]"
      >
        <House className="h-4 w-4" />
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

export default function AdminForbiddenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
        </div>
      }
    >
      <ForbiddenContent />
    </Suspense>
  );
}
