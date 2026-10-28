"use client";

/**
 * Halaman Pengguna & Peran — dua tab:
 *   • Pengguna: daftar akun, undang, ubah peran, aktif/nonaktif, reset password.
 *   • Peran:    editor matriks izin (peran × aksi), reset ke default.
 *
 * Guard server-side (requirePermission + trigger DB) adalah penegakan
 * sebenarnya; tab ini hanya menyaring kenyamanan (mis. tombol "ubah peran"
 * nonaktif untuk akun sendiri).
 *
 * Tab disimpan di hash URL (`#peran`) supaya reload / berbagi tautan mendarat
 * di tab yang sama. `hashchange` ditangani agar tombol Back/Forward bekerja.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UsersTab } from "./UsersTab";
import { RolesTab } from "./RolesTab";
import { UsersThree, ShieldCheck } from "@/components/Icons";

const TABS = [
  { key: "users", label: "Pengguna", icon: UsersThree, hash: "#pengguna" },
  { key: "roles", label: "Peran", icon: ShieldCheck, hash: "#peran" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function tabFromHash(hash: string): TabKey {
  return hash.replace(/^#/, "") === "peran" ? "roles" : "users";
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<TabKey>("users");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Sinkronkan tab dengan hash saat mount & saat Back/Forward.
  useEffect(() => {
    const sync = () => setTab(tabFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    // userId untuk menyaring halaman tab sendiri (tombol nonaktif).
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { session?: { userId?: string } | null }) =>
        setCurrentUserId(j?.session?.userId ?? null)
      )
      .catch(() => setCurrentUserId(null));
  }, []);

  const selectTab = useCallback((key: TabKey) => {
    setTab(key);
    const target = TABS.find((t) => t.key === key);
    if (target) {
      // `replaceState` — jangan menumpuk riwayat untuk setiap klik tab.
      window.history.replaceState(null, "", target.hash);
    }
  }, []);

  /** Panah kiri/kanan + Home/End sesuai pola ARIA `tablist`. */
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    selectTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  const panelId = useMemo(() => `tabpanel-${tab}`, [tab]);

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

      {/* Tabs — sticky tepat di bawah topbar (h-16 = 64px).
          Pembungkus memberi latar buram + padding vertikal supaya konten tidak
          terlihat lewat di bawah bar saat di-scroll (sebelumnya `top-20`
          menyisakan celah 16px yang tembus pandang). */}
      <div className="sticky top-16 z-20 -mx-4 mb-4 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div
          role="tablist"
          aria-label="Pengguna dan Peran"
          className="inline-flex w-full max-w-xs rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        >
          {TABS.map((t, i) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={active}
                aria-controls={`tabpanel-${t.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.key)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand-accent)] ${
                  active
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`tab-${tab}`}>
        {tab === "users" ? <UsersTab currentUserId={currentUserId} /> : <RolesTab />}
      </div>
    </div>
  );
}
