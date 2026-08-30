"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Eye, EyeSlash, Warning } from "@/components/Icons";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#082b59]">
          <span className="text-xl font-bold text-white">M4T</span>
        </div>
        <h1 className="text-xl font-bold text-[#082b59]">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-500">SMP Muhammadiyah 4 Tanggul</p>
      </div>

      {(error || errorParam) && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <Warning className="h-4 w-4 shrink-0" />
          {error || (errorParam === "inactive" ? "Akun tidak aktif." : "Terjadi kesalahan autentikasi.")}
        </div>
      )}

      <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
              placeholder="email@mbs.id"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#082b59]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-2.5 pr-10 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                placeholder="Masukkan password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#082b59] py-3 text-sm font-bold text-white transition-all hover:bg-[#1767b1] hover:shadow-lg disabled:opacity-50"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} SMP Muhammadiyah 4 Tanggul
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
