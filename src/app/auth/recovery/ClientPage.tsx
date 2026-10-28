"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseRecoveryHash } from "@/lib/auth-recovery";
import { Key, CheckCircle, Warning } from "@/components/Icons";

/**
 * Halaman pendaratan tautan recovery (fallback "Salin tautan reset").
 *
 * Supabase implicit flow mengirim token di FRAGMENT, yang tidak pernah sampai
 * ke server. Di sini token diekstrak di browser, ditukar menjadi sesi cookie
 * lewat `/api/auth/recovery`, lalu user diarahkan ke halaman ganti password.
 * Fragment langsung dibersihkan dari address bar agar token tidak tersisa di
 * riwayat/terkirim lewat referrer.
 */
type Status = "loading" | "success" | "error";

export default function RecoveryClientPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Memeriksa tautan pemulihan…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const tokens = parseRecoveryHash(window.location.hash);
      if (!tokens) {
        setStatus("error");
        setMessage(
          "Tautan reset tidak lengkap. Minta tautan baru ke admin (tautan lama hanya bisa dipakai sekali)."
        );
        return;
      }

      // Bersihkan fragment sebelum request apa pun.
      window.history.replaceState(null, "", window.location.pathname);

      try {
        const res = await fetch("/api/auth/recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokens),
        });

        if (cancelled) return;

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setStatus("error");
          setMessage(data.error || "Tautan reset tidak valid atau sudah kedaluwarsa.");
          return;
        }

        setStatus("success");
        setMessage("Tautan valid. Mengarahkan ke halaman ganti password…");
        router.replace("/admin/change-password");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Gagal memverifikasi tautan. Periksa koneksi lalu coba lagi.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            status === "error" ? "bg-red-50" : "bg-[var(--brand-primary)]/10"
          }`}
        >
          {status === "error" ? (
            <Warning className="h-7 w-7 text-red-500" />
          ) : status === "success" ? (
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          ) : (
            <Key className="h-7 w-7 text-[var(--brand-primary)]" />
          )}
        </div>

        <h1 className="text-lg font-bold text-slate-800">
          {status === "error" ? "Tautan Tidak Valid" : "Pemulihan Kata Sandi"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>

        {status === "loading" && (
          <div className="mt-5 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        )}

        {status === "error" && (
          <a
            href="/admin/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]"
          >
            Kembali ke Halaman Login
          </a>
        )}
      </div>
    </div>
  );
}
