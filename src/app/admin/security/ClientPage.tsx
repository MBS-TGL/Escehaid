"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  Shield,
  Lock,
  CheckCircle,
  Plus,
} from "@/components/Icons";

/**
 * Keamanan akun — 2FA TOTP via Supabase MFA native. SEMUA operasi lewat
 * server API route (/api/auth/mfa/*) karena sesi login aplikasi dikelola
 * server (pola sama dengan login & change-password).
 * Prasyarat: toggle TOTP di Supabase Dashboard → Authentication → MFA.
 */

interface MfaFactor {
  id: string;
  friendlyName?: string | null;
}
interface StatusRes {
  mfaEnabled: boolean;
  factors: MfaFactor[];
  aal: { current: string | null; next: string | null } | null;
  error?: string;
}

export default function SecurityClientPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [mfaNotEnabled, setMfaNotEnabled] = useState(false);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [aal, setAal] = useState<StatusRes["aal"]>(null);

  // Enroll state
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMfaNotEnabled(false);
    try {
      const res = await fetch("/api/auth/mfa/status");
      const data = (await res.json()) as StatusRes;
      if (data.mfaEnabled) {
        setFactors(data.factors ?? []);
        setAal(data.aal ?? null);
      } else {
        setMfaNotEnabled(true);
        setFactors([]);
      }
    } catch {
      setMfaNotEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
    })().catch(() => {});
  }, [refresh]);

  async function startEnroll() {
    setEnrolling(true);
    setQr(null);
    setSecret(null);
    setCode("");
    const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
    const data = (await res.json().catch(() => null)) as {
      factorId?: string;
      otpauthUri?: string;
      qr?: string;
      secret?: string;
      error?: string;
    } | null;
    setEnrolling(false);
    if (!res.ok || !data?.factorId) {
      toast(
        data?.error ||
          "Gagal memulai setup 2FA. Pastikan MFA TOTP sudah dinyalakan di Supabase Dashboard → Authentication → MFA.",
        "error"
      );
      return;
    }
    // Render QR dari otpauth URI (qrcode → data URL, tanpa layanan eksternal).
    const QRCode = (await import("qrcode")).default;
    setQr(await QRCode.toDataURL(data.otpauthUri || data.qr || "", { margin: 1, width: 220 }));
    setSecret(data.secret ?? null);
    setFactorId(data.factorId);
  }

  async function verifyCode() {
    if (!factorId) return;
    if (code.length !== 6) {
      toast("Masukkan 6 digit kode.", "error");
      return;
    }
    setVerifying(true);
    const res = await fetch("/api/auth/mfa/enroll/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId, code }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setVerifying(false);
    if (!res.ok) {
      toast(data?.error || "Kode salah atau kedaluwarsa.", "error");
      return;
    }
    toast("2FA aktif! Akun kini terlindungi.", "success");
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    refresh();
  }

  async function removeFactor(factor: MfaFactor) {
    if (
      !confirm(
        `Nonaktifkan 2FA${factor.friendlyName ? ` (${factor.friendlyName})` : ""}? Akun akan kembali hanya dilindungi password.`
      )
    )
      return;
    setRemovingId(factor.id);
    const res = await fetch("/api/auth/mfa/unenroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId: factor.id }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setRemovingId(null);
    if (!res.ok) {
      toast(data?.error || "Gagal menonaktifkan 2FA.", "error");
      return;
    }
    toast("2FA dinonaktifkan.", "success");
    refresh();
  }

  const aalBadge = aal
    ? aal.current === "aal2"
      ? { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Terlindungi 2FA" }
      : aal.next === "aal2"
        ? { cls: "border-amber-200 bg-amber-50 text-amber-700", text: "2FA aktif — verifikasi saat login" }
        : { cls: "border-slate-200 bg-slate-100 text-slate-500", text: "Hanya password" }
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
          <ShieldCheck className="h-5 w-5 text-[var(--brand-accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Keamanan</h1>
          <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
            Verifikasi dua langkah (2FA) untuk akun admin ini
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Memuat status keamanan…</p>
        </div>
      ) : mfaNotEnabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Lock className="h-4 w-4" /> MFA belum diaktifkan di Supabase
          </p>
          <p className="mt-1.5 text-sm text-amber-600">
            Nyalakan di Supabase Dashboard → <b>Authentication → MFA</b> → aktifkan TOTP, lalu muat ulang halaman ini.
          </p>
        </div>
      ) : (
        <>
          {/* Status */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status akun</p>
                {aalBadge && (
                  <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${aalBadge.cls}`}>
                    {aal?.current === "aal2" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                    {aalBadge.text}
                  </span>
                )}
              </div>
              {!qr && factors.length === 0 && (
                <button
                  onClick={startEnroll}
                  disabled={enrolling}
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" /> {enrolling ? "Menyiapkan…" : "Aktifkan 2FA"}
                </button>
              )}
            </div>

            {/* Daftar faktor */}
            {factors.length > 0 && !qr && (
              <div className="mt-4 space-y-2">
                {factors.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        TOTP — {f.friendlyName || "Aplikasi authenticator"}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{f.id}</p>
                    </div>
                    <button
                      onClick={() => removeFactor(f)}
                      disabled={removingId === f.id}
                      className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {removingId === f.id ? "Menonaktifkan…" : "Nonaktifkan"}
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  Kehilangan akses aplikasi authenticator tanpa cadangan = perlu developer dengan akses
                  Supabase Dashboard (Authentication → Users → Factors) untuk menghapus faktor.
                </p>
              </div>
            )}
          </div>

          {/* Enroll flow */}
          {qr && (
            <div className="mt-5 rounded-xl border border-[var(--brand-primary)]/20 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800">1. Pindai QR dengan aplikasi authenticator</h2>
              <p className="mt-1 text-xs text-slate-500">
                Google Authenticator, Authy, 1Password, dsb. — atau masukkan secret manual di bawah QR.
              </p>
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR kode 2FA" width={220} height={220} className="rounded-lg border border-slate-200" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Secret manual</p>
                  <code className="mt-1 block break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
                    {secret}
                  </code>
                </div>
              </div>

              <h2 className="mt-6 text-sm font-bold text-slate-800">2. Masukkan kode 6 digit dari aplikasi</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="w-36 rounded-lg border border-slate-200 px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-slate-700 focus:border-[var(--brand-primary)] focus:outline-none"
                />
                <button
                  onClick={verifyCode}
                  disabled={verifying || code.length !== 6}
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] disabled:opacity-60"
                >
                  {verifying ? "Memverifikasi…" : "Verifikasi & Aktifkan"}
                </button>
                <button
                  onClick={() => {
                    setQr(null);
                    setSecret(null);
                    setFactorId(null);
                    setCode("");
                  }}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
