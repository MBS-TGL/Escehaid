"use client";

/**
 * Halaman Pengguna & Peran — dua tab:
 *   • Pengguna: daftar akun, undang, ubah peran, aktif/nonaktif, reset password.
 *   • Peran:    editor matriks izin (peran × aksi), reset ke default.
 *
 * Guard server-side (requirePermission + trigger DB) adalah penegakan
 * sebenarnya; tab ini hanya menyaring kenyamanan (mis. tombol "ubah peran"
 * nonaktif untuk akun sendiri).
 */
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { UsersTab } from "./UsersTab";
import { RolesTab } from "./RolesTab";
import { UsersThree, ShieldCheck } from "@/components/Icons";

const TABS = [
  { key: "users", label: "Pengguna", icon: UsersThree },
  { key: "roles", label: "Peran", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminUsersPage() {
  const [tab, setTab] = useState<TabKey>("users");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null))
      .catch(() => setCurrentUserId(null));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
          <UsersThree className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pengguna &amp; Peran</h1>
          <p className="text-sm text-slate-500">
            Kelola akun, peran, dan izin akses modul panel admin
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Pengguna dan Peran"
        className="mb-6 inline-flex w-full max-w-xs rounded-xl border border-slate-200 bg-white p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? <UsersTab currentUserId={currentUserId} /> : <RolesTab />}
    </div>
  );
}
