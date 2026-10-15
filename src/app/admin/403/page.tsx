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

/** Label Indonesia untuk izin `modul:aksi` yang umum diminta. */
const PERMISSION_LABELS: Record<string, string> = {
  "users:manage": "mengelola Pengguna & Peran",
  "settings:manage": "mengubah Pengaturan Situs",
  "flags:manage": "mengelola Feature Flags",
  "logs:read": "melihat Log Aktivitas",
};

function labelFor(perm: string): string {
  return PERMISSION_LABELS[perm] ?? perm;
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
        {perm ? (
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
