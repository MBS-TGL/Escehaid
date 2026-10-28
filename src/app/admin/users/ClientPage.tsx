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
import { useCallback, useEffect, useRef, useState } from "react";
import { UsersTab, type UsersTabHandle } from "./UsersTab";
import { RolesTab } from "./RolesTab";
import { UsersThree, ShieldCheck, UserPlus, Upload, Download } from "@/components/Icons";

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
  const [exporting, setExporting] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const usersRef = useRef<UsersTabHandle>(null);

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

  // Satu panel untuk dua tab (konten diganti) — id harus cocok dengan
  // aria-controls milik tab aktif agar pembaca layar tidak menunjuk elemen lain.
  const panelId = `tabpanel-${tab}`;


  /** Ekspor lewat ref; state loading dipegang header agar tidak dobel klik. */
  async function handleExportCsv() {
    if (!usersRef.current) return;
    setExporting(true);
    try {
      await usersRef.current.exportCsv();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header (hero): judul + aksi halaman. Aksi hanya untuk tab Pengguna. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
            <UsersThree className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pengguna &amp; Peran</h1>
            <p className="text-[13px] text-slate-500 sm:text-sm">
              Kelola akun, peran, dan izin akses modul panel admin
            </p>
          </div>
        </div>

        {tab === "users" && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting}
              aria-label="Ekspor CSV"
              title="Ekspor CSV (mengikuti filter aktif)"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:shadow-none sm:h-auto sm:flex-none sm:px-4 sm:py-2.5"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => usersRef.current?.openBulkInvite()}
              aria-label="Impor CSV (undang massal)"
              title="Impor CSV — undang banyak pengguna"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:h-auto sm:flex-none sm:px-4 sm:py-2.5"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Impor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => usersRef.current?.openInvite()}
              aria-label="Undang Pengguna"
              title="Undang Pengguna"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] sm:h-auto sm:flex-none sm:px-4 sm:py-2.5"
            >
              <UserPlus className="h-4 w-4" />
              <span className="whitespace-nowrap">Undang</span>
            </button>
          </div>
        )}
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
        {tab === "users" ? (
          <UsersTab ref={usersRef} currentUserId={currentUserId} />
        ) : (
          <RolesTab />
        )}
      </div>
    </div>
  );
}
