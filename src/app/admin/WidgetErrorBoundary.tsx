"use client";

/**
 * WidgetErrorBoundary — penangkap render-error per widget dashboard (#22).
 *
 * Tanpa ini, satu widget yang throw (mis. bug pemanggilan fungsi modul client
 * dari server) membunuh SELURUH halaman dashboard ke `error.tsx` root. Dengan
 * ini, hanya widget yang gagal yang jadi fallback error; widget lain tetap
 * stream normal.
 *
 * Pola pakai (di LUAR Suspense, di DALAM gate role):
 *   <WidgetErrorBoundary name="stats" fallback={<WidgetErrorCard title="Statistik" />}>
 *     <Suspense fallback={<StatsSkeleton />}>
 *       <StatsSection ... />
 *     </Suspense>
 *   </WidgetErrorBoundary>
 *
 * Class component: satu-satunya cara menangkap error render di React.
 * Sentry ditag per widget agar diagnosis langsung menunjuk pelakunya.
 *
 * Catatan retry: tombol "Coba lagi" memanggil `router.refresh()` — me-refetch
 * SELURUH route (semua widget streaming ulang sesaat), bukan hanya widget itu.
 * Itu batas teknis App Router: render ulang server hanya bisa dipicu per route.
 * Masih jauh lebih baik daripada halaman error penuh: chrome + widget sehat
 * tidak diganti layar error, dan error transien (DB blip sesaat) benar pulih.
 */
import { Component, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Warning, ArrowRight } from "@/components/Icons";

type BoundaryProps = {
  /** Nama widget — dipakai tag Sentry. */
  name: string;
  /** Tampilan pengganti saat widget gagal. */
  fallback: ReactNode;
  children: ReactNode;
};

type BoundaryState = { failed: boolean };

export class WidgetErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // No-op bila DSN belum diset (SDK tidak di-init).
    Sentry.captureException(error, { tags: { widget: this.props.name } });
    console.error(`[WidgetErrorBoundary:${this.props.name}]`, error);
  }

  render() {
    if (this.state.failed) {
      return <>{this.props.fallback}</>;
    }
    return this.props.children;
  }
}

/** Tombol retry per widget — me-refresh route agar server me-render ulang. */
export function WidgetRetryButton({ label = "Coba lagi" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
    >
      {label}
    </button>
  );
}

/**
 * Fallback error kartu daftar — konsisten dengan ListCard + EmptyState yang
 * sudah ada: judul + "Lihat semua" tetap tampil, isi diganti pesan gagal +
 * tombol retry. `role="alert"` agar screen reader mengumumkan kegagalan.
 */
export function WidgetErrorCard({ title, href }: { title: string; href?: string }) {
  return (
    <section
      role="alert"
      className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            Lihat semua <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-5 text-center">
        <Warning className="h-6 w-6 text-amber-400" />
        <p className="mt-1.5 text-sm font-medium text-slate-600">Gagal memuat</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Widget tidak sementara tampil. Coba muat ulang.
        </p>
        <div className="mt-3">
          <WidgetRetryButton />
        </div>
      </div>
    </section>
  );
}

/**
 * Fallback error strip — untuk TodoRail. SENGAJA bukan "Semua beres": daftar
 * perhatian yang gagal diperiksa tidak boleh disamarkan jadi tidak ada kerjaan.
 */
export function WidgetErrorStrip() {
  return (
    <div
      role="alert"
      className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3"
    >
      <Warning className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      <p className="flex-1 text-xs font-medium text-slate-700">
        Tidak dapat memeriksa daftar perhatian.
      </p>
      <WidgetRetryButton />
    </div>
  );
}
