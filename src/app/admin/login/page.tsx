"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { Eye, EyeSlash, Warning, ArrowRight, ArrowLeft, GraduationCap, Users, BookOpen, CheckCircle } from "@/components/Icons";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/admin/login`,
    });

    if (resetError) {
      setError("Gagal mengirim email reset password.");
      setResetLoading(false);
      return;
    }

    setResetSuccess(true);
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── LEFT PANEL — Branding ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#1767b1]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] bg-[#f4d21f]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[380px] h-[380px] bg-[#1767b1]/20 rounded-full blur-3xl" />

        <div className={`relative z-10 flex flex-col justify-between p-12 w-full transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}>
          <div className="flex items-center gap-3">
            <Image src="/images/Logo-Sekolah.png" alt="Logo" width={40} height={40} className="object-contain w-auto h-auto" />
            <div>
              <span className="text-white font-bold text-sm tracking-tight block">SMP Muhammadiyah 4</span>
              <span className="text-white/50 text-xs">Tanggul, Jember</span>
            </div>
          </div>

          <div className="max-w-sm my-auto w-full">
            <h1 className="text-3xl font-black text-white leading-tight mb-4">
              Admin Panel
            </h1>
            <p className="text-white/55 text-sm leading-relaxed mb-8">
              Sistem informasi sekolah untuk mengelola berita, artikel, galeri, SPMB, dan administrasi SMP Muhammadiyah 4 Tanggul.
            </p>

            <div className="mt-12 space-y-3">
              {([
                [GraduationCap, "164 Siswa Aktif", "Tahun ajaran 2025/2026"],
                [BookOpen, "Kurikulum Merdeka", " + ISMUBA terintegrasi"],
                [Users, "14 Guru & 3 Tendik", "Tim pengajar profesional"],
              ] as [typeof GraduationCap, string, string][]).map(([Icon, title, desc]) => (
                <div
                  key={title}
                  className={`flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] transition-all duration-700 delay-[300ms] hover:bg-white/[0.07] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#f4d21f]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-[#f4d21f]" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{title}</div>
                    <div className="text-white/45 text-xs">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} SMP Muhammadiyah 4 Tanggul. Hak cipta dilindungi.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form Login / Reset ───────────── */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[800px] h-[800px] bg-[#f4f7fb] rounded-full blur-3xl pointer-events-none lg:opacity-50" />

        <div className="w-full max-w-md relative z-10">
          <div className={`bg-white/80 backdrop-blur-xl border border-[#dce3ed]/60 rounded-2xl shadow-xl p-8 md:p-10 transition-all duration-700 ease-out ${mounted ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4"}`}>

            {resetMode ? (
              /* ── RESET PASSWORD FORM ──── */
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg bg-[#1767b1]/10">
                    {resetSuccess ? (
                      <CheckCircle className="h-7 w-7 text-emerald-600" />
                    ) : (
                      <Image src="/images/Logo-Sekolah.png" alt="Logo" width={36} height={36} className="object-contain" />
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-[#082b59] mb-2">
                    {resetSuccess ? "Email Terkirim!" : "Reset Password"}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {resetSuccess
                      ? "Periksa inbox email Anda untuk link reset password."
                      : "Masukkan email Anda untuk menerima link reset password."}
                  </p>
                </div>

                {error && (
                  <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                    <Warning className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {!resetSuccess ? (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#082b59] ml-1">Email</label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="block w-full px-4 py-3 rounded-xl border border-[#dce3ed] bg-[#f4f7fb] text-[#082b59] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1767b1]/20 focus:border-[#1767b1] transition-all text-sm"
                        placeholder="email@mbs.id"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-[#1767b1]/20 text-sm font-bold text-white bg-[#1767b1] hover:bg-[#0d4a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1767b1] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      {resetLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "Kirim Link Reset"
                      )}
                    </button>
                  </form>
                ) : null}

                <button
                  onClick={() => { setResetMode(false); setResetSuccess(false); setError(""); setResetEmail(""); }}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 hover:text-[#082b59] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Login
                </button>
              </>
            ) : (
              <>
                {/* Mobile header */}
                <div className="text-center mb-10 lg:hidden">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg bg-[#082b59] overflow-hidden">
                    <Image src="/images/Logo-Sekolah.png" alt="Logo" width={44} height={44} className="object-contain" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#082b59] mb-2">Admin Panel</h2>
                  <p className="text-slate-500 text-sm">SMP Muhammadiyah 4 Tanggul</p>
                </div>

                {/* Desktop header */}
                <div className="hidden lg:block text-left mb-10">
                  <h2 className="text-2xl font-extrabold text-[#082b59] mb-2">Masuk ke Akun Anda</h2>
                  <p className="text-slate-500 text-sm">Silakan masukkan kredensial admin/publisher.</p>
                </div>

                {(error || errorParam) && (
                  <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                    <Warning className="h-4 w-4 shrink-0" />
                    {errorParam === "inactive"
                      ? "Akun tidak aktif. Hubungi developer."
                      : errorParam === "no_profile"
                        ? "Akun belum terdaftar. Minta developer setup profile."
                        : error || "Terjadi kesalahan autentikasi."}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#082b59] ml-1">Email</label>
                    <div className="relative group">
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full px-4 py-3 rounded-xl border border-[#dce3ed] bg-[#f4f7fb] text-[#082b59] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1767b1]/20 focus:border-[#1767b1] transition-all text-sm"
                        placeholder="email@mbs.id"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-semibold text-[#082b59]">Password</label>
                      <button
                        type="button"
                        onClick={() => { setResetMode(true); setResetEmail(email); setError(""); }}
                        className="text-xs font-semibold text-[#1767b1] hover:underline transition-colors"
                      >
                        Lupa password?
                      </button>
                    </div>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-4 py-3 pr-11 rounded-xl border border-[#dce3ed] bg-[#f4f7fb] text-[#082b59] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1767b1]/20 focus:border-[#1767b1] transition-all text-sm"
                        placeholder="Masukkan password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-[#082b59]/20 text-sm font-bold text-white bg-[#082b59] hover:bg-[#1767b1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1767b1] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        Masuk Sistem
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#dce3ed] text-center lg:hidden">
                  <p className="text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} SMP Muhammadiyah 4 Tanggul
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 px-2">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#1767b1] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Beranda
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <Link href="/admission" className="text-xs font-bold text-slate-400 hover:text-[#1767b1] transition-colors">
              SPMB Online
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
