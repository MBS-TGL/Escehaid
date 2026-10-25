"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { formatRelativeTime } from "@/lib/admin-display";
import {
  ShieldCheck,
  Shield,
  Lock,
  CheckCircle,
  Plus,
  DeviceMobile,
  Key,
  Eye,
  EyeSlash,
  User,
} from "@/components/Icons";

/**
 * Pengaturan Akun — satu halaman empat seksi (pola GitHub Settings):
 *   1. Profil (nama tampilan; email read-only)
 *   2. Password (self-service; verifikasi password lama di server)
 *   3. Keamanan — 2FA TOTP via Supabase MFA native
 *   4. Perangkat & Sesi Aktif
 * SEMUA operasi lewat server API route (/api/auth/*) karena sesi login
 * aplikasi dikelola server. Prasyarat 2FA: toggle TOTP di Supabase
 * Dashboard → Authentication → MFA.
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
interface ActiveSession {
  sessionId: string;
  device: string;
  ip: string;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

/** IP siap-tampil: loopback (::1/127.0.0.1) bukan alamat yang bermakna
 *  bagi pengguna — tampilkan label ramah. */
function formatIp(ip: string): string {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return "Jaringan lokal";
  return ip;
}

export default function SecurityClientPage() {
  const { toast } = useToast();
  const router = useRouter();

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

  // Seksi Password (self-service)
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Seksi Profil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwNew.length < 8) {
      toast("Password baru minimal 8 karakter.", "error");
      return;
    }
    if (pwNew !== pwConfirm) {
      toast("Konfirmasi password baru tidak cocok.", "error");
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: pwCurrent, password: pwNew }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setPwSaving(false);
    if (!res.ok) {
      toast(data?.error || "Gagal mengganti password.", "error");
      return;
    }
    toast("Password berhasil diganti.", "success");
    setPwCurrent("");
    setPwNew("");
    setPwConfirm("");
  }

  // Sesi aktif
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [kicking, setKicking] = useState(false);
  const [kickConfirm, setKickConfirm] = useState(false);

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

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (!res.ok) return;
      const data = (await res.json()) as { fullName?: string; email?: string };
      setFullName(data.fullName ?? "");
      setEmail(data.email ?? "");
    } catch {
      // Profil tidak kritis — biarkan kosong.
    }
  }, []);

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    if (name.length < 2) {
      toast("Nama tampilan minimal 2 karakter.", "error");
      return;
    }
    setNameSaving(true);
    const res = await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setNameSaving(false);
    if (!res.ok) {
      toast(data?.error || "Gagal menyimpan nama.", "error");
      return;
    }
    toast("Nama tampilan tersimpan.", "success");
    router.refresh(); // Nama di Topbar ikut ter-update.
  }

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) {
        setSessions(null);
        return;
      }
      const data = (await res.json()) as { sessions?: ActiveSession[] };
      setSessions(data.sessions ?? []);
    } catch {
      setSessions(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([refresh(), loadSessions(), loadProfile()]);
    })().catch(() => {});
  }, [refresh, loadSessions, loadProfile]);

  async function kickOthers() {
    setKicking(true);
    const res = await fetch("/api/auth/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign_out_others" }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setKicking(false);
    setKickConfirm(false);
    if (!res.ok) {
      toast(data?.error || "Gagal mengeluarkan sesi lain.", "error");
      return;
    }
    toast("Semua sesi lain telah dikeluarkan.", "success");
    loadSessions();
  }

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
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pengaturan Akun</h1>
          <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
            Password, verifikasi dua langkah, dan sesi login akun Anda
          </p>
        </div>
      </div>

      {/* Grid 2 kolom (lg): Profil|Password lalu Keamanan|Sesi; mobile stack. */}
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">

      {/* ── Seksi 1: Profil ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <User className="h-4 w-4 text-[var(--brand-accent)]" /> Profil
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Nama tampilan dipakai di seluruh panel admin. Email tidak bisa diganti sendiri.
        </p>
        <form onSubmit={submitName} className="mt-4 max-w-md space-y-4">
          <Input
            label="Nama tampilan"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama Anda"
            minLength={2}
            maxLength={100}
          />
          <div>
            <label className="text-xs font-semibold text-slate-500">Email (login)</label>
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <span className="truncate text-sm text-slate-500">{email || "—"}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Terkunci
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Hubungi developer untuk mengganti email login.
            </p>
          </div>
          <button
            type="submit"
            disabled={nameSaving || fullName.trim().length < 2}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] disabled:opacity-60"
          >
            {nameSaving ? "Menyimpan…" : "Simpan Nama"}
          </button>
        </form>
      </div>

      {/* ── Seksi 2: Password ──────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Key className="h-4 w-4 text-[var(--brand-accent)]" /> Password
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Password saat ini diverifikasi sebelum diganti. Minimal 8 karakter.
        </p>
        <form onSubmit={submitPassword} className="mt-4 max-w-md space-y-4">
          <Input
            label="Password saat ini"
            required
            type={pwShow ? "text" : "password"}
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            placeholder="Password yang sedang dipakai"
            autoComplete="current-password"
          />
          <div className="relative">
            <Input
              label="Password baru"
              required
              type={pwShow ? "text" : "password"}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="Minimal 8 karakter"
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setPwShow((s) => !s)}
              className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
              aria-label={pwShow ? "Sembunyikan password" : "Tampilkan password"}
            >
              {pwShow ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            label="Ulangi password baru"
            required
            type={pwShow ? "text" : "password"}
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            placeholder="Ketik ulang password baru"
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={pwSaving || !pwCurrent || pwNew.length < 8 || pwNew !== pwConfirm}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] disabled:opacity-60"
          >
            {pwSaving ? "Menyimpan…" : "Ganti Password"}
          </button>
        </form>
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
          {/* ── Seksi 3: Keamanan (2FA) — Status */}
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
        </>
      )}

      {/* ── Seksi 4: Perangkat & Sesi Aktif ─────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <DeviceMobile className="h-4 w-4 text-[var(--brand-accent)]" /> Perangkat &amp; Sesi Aktif
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Perangkat yang sedang login dengan akun ini — lupa logout di komputer sekolah? Keluarkan dari sini.
            </p>
          </div>
          {sessions && sessions.filter((s) => !s.current).length > 0 && (
            <button
              onClick={() => setKickConfirm(true)}
              disabled={kicking}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              Keluarkan semua sesi lain
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {sessions === null ? (
            <p className="py-2 text-xs text-slate-400">
              Daftar sesi tersedia setelah tabel `sessions` dimigrasi (supabase/sessions.sql).
            </p>
          ) : sessions.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">Belum ada sesi tercatat.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.sessionId}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e4ecf6]">
                    <DeviceMobile className="h-4.5 w-4.5 text-[var(--brand-accent)]" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                      {s.device}
                      {s.current && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Perangkat ini
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatIp(s.ip)} · aktif {formatRelativeTime(s.lastSeenAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>{/* tutup grid 2 kolom */}

      {/* Enroll flow — full-width di luar grid (QR + secret butuh ruang lebar) */}
      {qr && (
        <div className="mt-6 rounded-xl border border-[var(--brand-primary)]/20 bg-white p-5 shadow-sm">
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

      {/* Konfirmasi keluarkan sesi lain */}
      <ConfirmModal
        open={kickConfirm}
        onClose={() => setKickConfirm(false)}
        onConfirm={kickOthers}
        title="Keluarkan semua sesi lain?"
        message="Semua perangkat lain yang login dengan akun ini akan langsung ter-logout dan harus login ulang. Perangkat ini tetap aman."
        confirmLabel="Ya, Keluarkan"
        loading={kicking}
      />
    </div>
  );
}
