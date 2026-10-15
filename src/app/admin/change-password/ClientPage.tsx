"use client";

/**
 * Halaman Ganti Password — ditampilkan proxy.ts ketika `must_change_password`
 * aktif ( hasil reset oleh admin ). User wajib mengganti password sebelum
 * melanjutkan. Setelah berhasil, flag dibersihkan dan user diarahkan ke
 * dashboard.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Key, Eye, EyeSlash, CheckCircle } from "@/components/Icons";

const MIN_LEN = 8;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LEN) {
      toast(`Password minimal ${MIN_LEN} karakter.`, "error");
      return;
    }
    if (password !== confirm) {
      toast("Konfirmasi password tidak cocok.", "error");
      return;
    }
    setSaving(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      toast(error.message || "Gagal mengganti password.", "error");
      return;
    }

    // Bersihkan flag must_change_password (best-effort; bila policy belum ada
    // biarkan — proxy tetap akan melempar lagi, tapi user sudah bisa login).
    if (userId) {
      try {
        await supabase
          .from("user_profiles")
          .update({ must_change_password: false })
          .eq("id", userId);
      } catch {
        // Abaikan — tidak menjatuhkan proses ganti password.
      }
    }

    toast("Password berhasil diganti.", "success");
    router.push("/admin?success=login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
            <Key className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Ganti Password</h1>
            <p className="text-sm text-slate-500">
              Anda diminta mengganti password sebelum melanjutkan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="Password Baru"
              required
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              minLength={MIN_LEN}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
              aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
            >
              {show ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            label="Ulangi Password Baru"
            required
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ketik ulang password"
            minLength={MIN_LEN}
          />

          <button
            type="submit"
            disabled={saving || password.length < MIN_LEN || password !== confirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)] disabled:opacity-60"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Simpan Password Baru
          </button>
        </form>
      </div>
    </div>
  );
}
