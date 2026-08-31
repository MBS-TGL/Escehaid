"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-800">Terjadi Kesalahan</h2>
        <p className="mt-2 text-sm text-slate-500">
          {error.message || "Gagal memuat halaman. Silakan coba lagi."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1]"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
