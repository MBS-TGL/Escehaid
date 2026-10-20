import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { createClient } from "@/lib/supabase-server";
import { getWaveStatus } from "@/lib/queries/waves";
import { toTitleCase, formatRelativeTime, daysSince, PENDING_SLA_DAYS } from "@/lib/admin-display";

export const metadata: Metadata = {
  title: "Dashboard",
};
import {
  Users,
  ImageSquare,
  Megaphone,
  Envelope,
  Note,
  Trophy,
  Bell,
  CalendarCheck,
  ArrowRight,
  CheckCircle,
  Plus,
  Eye,
} from "@/components/Icons";
import { StatCard, StatCardGroup } from "@/components/ui";

type IconType = ComponentType<{ className?: string }>;

/** Bentuk minimum hasil supabase yang dipakai dashboard (count / list). */
type Err = { message: string } | null;
type CountRes = { count: number | null; error: Err };
type ListRes<T> = { data: T[] | null; error: Err };

/**
 * Pengganti query bagi role yang izinnya tidak mencakup tabel itu:
 * shape sama, tanpa panggilan jaringan — Promise.all tetap satu array.
 */
const skipCount = (): Promise<CountRes> => Promise.resolve({ count: null, error: null });
const skipList = <T,>(): Promise<ListRes<T>> => Promise.resolve({ data: null, error: null });

/** count null saat query error ≠ 0. null → "—" (gagal memuat). */
const countValue = (r: CountRes): number | null => (r.error ? null : (r.count ?? 0));

type StatItem = {
  label: string;
  /** null = gagal memuat → tampil "—". */
  value: number | null;
  href: string;
  icon: ReactNode;
  variant: "info" | "brand" | "warning";
  show: boolean;
  /** Rincian status kecil di bawah angka utama. */
  detail?: ReactNode;
};

const TZ = "Asia/Jakarta";
const ADMIN_ROLES = ["developer", "admin"];
const CONTENT_ROLES = ["developer", "admin", "publisher"];

const roleLabel: Record<string, string> = {
  developer: "Developer",
  admin: "Administrator",
  publisher: "Publisher",
  teacher: "Guru",
  student: "Siswa",
};

const spmbStatusColor: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const spmbStatusLabel: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  rejected: "Ditolak",
};

/**
 * Aksi cepat tampil di banner, difilter per role.
 *
 * Tidak ada route /new di seluruh panel — pembuatan konten lewat MODAL
 * di ClientPage masing-masing modul, sehingga href hanya bisa ke arah menu
 * list (tombol tambah ada di sana). TODO: bila kelak dibuat halaman create
 * tersendiri (mis. "/admin/news/new"), ganti href berikut.
 */
const quickActions: { label: string; href: string; icon: IconType; roles: string[]; mobile: boolean }[] = [
  { label: "Lihat website", href: "/", icon: Eye, roles: [...CONTENT_ROLES, "teacher", "student"], mobile: true },
  { label: "Tulis berita", href: "/admin/news", icon: Plus, roles: CONTENT_ROLES, mobile: true },
  // Sudah ada di bottom nav (HP) & sidebar (desktop): disembunyikan di HP.
  // "Buka pendaftar" & "Lihat pesan" dihapus — duplikat navigasi sidebar.
  { label: "Tambah pengumuman", href: "/admin/announcements", icon: Bell, roles: CONTENT_ROLES, mobile: false },
  { label: "Unggah galeri", href: "/admin/gallery", icon: ImageSquare, roles: CONTENT_ROLES, mobile: false },
];

function greeting(now: Date) {
  const hour =
    Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(now)) % 24;
  if (hour < 11) return "pagi";
  if (hour < 15) return "siang";
  if (hour < 18) return "sore";
  return "malam";
}

/** Kerangka card daftar: judul + link "Lihat semua" + isi. */
function ListCard({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
        >
          Lihat semua <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </section>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: IconType; title: string; hint: string }) {
  return (
    <div className="px-5 py-5 text-center">
      <Icon className="mx-auto h-6 w-6 text-slate-300" />
      <p className="mt-1.5 text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

/** Satu baris daftar; seluruh baris bisa diklik. */
function Row({ href, leading, children, trailing }: { href: string; leading?: ReactNode; children: ReactNode; trailing?: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      {leading}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing}
    </Link>
  );
}

/** Detail rincian status di dalam kartu statistik (desktop via StatCard). */
function StatDetail({ parts }: { parts: [string, number | null][] }) {
  return (
    <>
      {parts.map(([label, n], i) => (
        <span key={label}>
          {i > 0 && <span className="mx-1 text-slate-300">·</span>}
          {n === null ? "—" : n} {label}
        </span>
      ))}
    </>
  );
}

type SpmbRow = { id: string; full_name: string; status: string; created_at: string };
type NewsRow = { id: string; title: string; is_published: boolean; created_at: string };
type MessageRow = { id: string; name: string; subject: string; message: string; is_read: boolean; created_at: string };
type WaveRow = { name: string; start_date: string; end_date: string };
type AgendaRow = { id: string; title: string; event_date: string };

export default async function AdminPage() {
  const supabase = await createClient();

  // getClaims(): verifikasi JWT lokal (tanpa panggilan Auth). proxy.ts sudah
  // memeriksa sesi, jadi di sini cukup mengambil id user.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/admin/login");

  // Profil dulu (select minim) supaya query berikutnya bisa DIFILTER ROLE —
  // publisher tidak perlu menyentuh spmb_registrations / contact_messages.
  const profileRes = await supabase
    .from("user_profiles")
    .select("full_name, role, is_active")
    .eq("id", userId)
    .single();
  if (!profileRes.data || !profileRes.data.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=inactive");
  }

  const profile = profileRes.data as { full_name: string; role: string; is_active: boolean };
  const role: string = profile.role;
  const isAdmin = ADMIN_ROLES.includes(role);
  const canPublish = CONTENT_ROLES.includes(role);

  // Semua query berjalan bersamaan (1 round-trip). Slot query yang tak relevan
  // untuk role digantikan placeholder skip*() tanpa panggilan jaringan; RLS
  // Supabase tetap penegakan akhir untuk tabel sensitif.
  const [
    newsCount,
    articlesCount,
    galleryCount,
    achievementsCount,
    draftNews,
    spmbCount,
    spmbPending,
    spmbAccepted,
    spmbRejected,
    spmbWaves,
    contactCount,
    unreadMsgs,
    recentNews,
    recentSpmb,
    recentMessages,
    nextAgenda,
  ] = await Promise.all([
    canPublish ? supabase.from("news").select("id", { count: "exact", head: true }) : skipCount(),
    canPublish ? supabase.from("articles").select("id", { count: "exact", head: true }) : skipCount(),
    canPublish ? supabase.from("gallery").select("id", { count: "exact", head: true }) : skipCount(),
    canPublish ? supabase.from("achievements").select("id", { count: "exact", head: true }) : skipCount(),
    canPublish ? supabase.from("news").select("id", { count: "exact", head: true }).eq("is_published", false) : skipCount(),
    isAdmin ? supabase.from("spmb_registrations").select("id", { count: "exact", head: true }) : skipCount(),
    isAdmin ? supabase.from("spmb_registrations").select("id", { count: "exact", head: true }).eq("status", "pending") : skipCount(),
    isAdmin ? supabase.from("spmb_registrations").select("id", { count: "exact", head: true }).eq("status", "accepted") : skipCount(),
    isAdmin ? supabase.from("spmb_registrations").select("id", { count: "exact", head: true }).eq("status", "rejected") : skipCount(),
    isAdmin
      ? supabase.from("spmb_waves").select("name, start_date, end_date").eq("is_published", true).order("start_date", { ascending: false }).limit(8)
      : skipList<WaveRow>(),
    isAdmin ? supabase.from("contact_messages").select("id", { count: "exact", head: true }) : skipCount(),
    isAdmin ? supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false) : skipCount(),
    canPublish
      ? supabase.from("news").select("id, title, is_published, created_at").order("created_at", { ascending: false }).limit(5)
      : skipList<NewsRow>(),
    isAdmin
      ? supabase.from("spmb_registrations").select("id, full_name, status, created_at").order("created_at", { ascending: false }).limit(5)
      : skipList<SpmbRow>(),
    isAdmin
      ? supabase.from("contact_messages").select("id, name, subject, message, is_read, created_at").order("created_at", { ascending: false }).limit(5)
      : skipList<MessageRow>(),
    canPublish
      ? supabase.from("agenda_events").select("id, title, event_date").eq("is_active", true).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date", { ascending: true }).limit(1)
      : skipList<AgendaRow>(),
  ]);

  const now = new Date();
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(now);
  const firstName = profile.full_name?.split(" ")[0] ?? "Admin";

  const actions = quickActions.filter((a) => a.roles.includes(role));
  const mobileActionCount = actions.filter((a) => a.mobile).length;

  // ── Perlu perhatian: hanya jumlah yang sah (>0) dan relevan untuk role.
  // Query gagal (error) dijauhkan dari todo supaya tidak memicu false alarm.
  const todo = [
    { label: "Pesan belum dibaca", res: unreadMsgs, href: "/admin/contact", show: isAdmin },
    { label: "Pendaftar menunggu verifikasi", res: spmbPending, href: "/admin/admission", show: isAdmin },
    { label: "Berita masih draft", res: draftNews, href: "/admin/news", show: canPublish },
  ].filter((t) => t.show && countValue(t.res) !== null && (t.res.count ?? 0) > 0);

  // Status SPMB paling relevan saat ini (gelombang dibuka/akan dibuka/ditutup).
  const waveStates = (spmbWaves.data || []).map((w) => ({ ...w, state: getWaveStatus({ start_date: w.start_date, end_date: w.end_date }, now) }));
  const openWave = waveStates.find((w) => w.state === "open");
  const upcomingWave = waveStates.find((w) => w.state === "upcoming");
  const waveNote = openWave
    ? `Pendaftaran dibuka — ${openWave.name}`
    : upcomingWave
      ? `Pendaftaran ditutup — gelombang berikutnya mulai ${fmtWIBDate(upcomingWave.start_date)}`
      : "Pendaftaran ditutup";

  /** null → tampil "—". */
  const shown = (r: CountRes) => countValue(r);

  const allStats: StatItem[] = [
    {
      label: "Berita",
      value: shown(newsCount),
      href: "/admin/news",
      icon: <Megaphone className="h-5 w-5 text-blue-600" />,
      variant: "info",
      show: canPublish,
      detail: (
        <StatDetail
          parts={[
            ["publish", newsCount.error ? null : (newsCount.count ?? 0) - (draftNews.error ? 0 : draftNews.count ?? 0)],
            ["draft", shown(draftNews)],
          ]}
        />
      ),
    },
    { label: "Artikel", value: shown(articlesCount), href: "/admin/articles", icon: <Note className="h-5 w-5 text-[var(--brand-primary)]" />, variant: "brand", show: canPublish },
    { label: "Galeri", value: shown(galleryCount), href: "/admin/gallery", icon: <ImageSquare className="h-5 w-5 text-blue-600" />, variant: "info", show: canPublish },
    {
      label: "Pendaftar",
      value: shown(spmbCount),
      href: "/admin/admission",
      icon: <Users className="h-5 w-5 text-[var(--brand-primary)]" />,
      variant: "brand",
      show: isAdmin,
      detail: (
        <div>
          <div>
            <StatDetail
              parts={[
                ["menunggu", shown(spmbPending)],
                ["diterima", shown(spmbAccepted)],
                ["ditolak", shown(spmbRejected)],
              ]}
            />
          </div>
          {spmbWaves.error ? null : <p className="mt-0.5 truncate">{waveNote}</p>}
        </div>
      ),
    },
    { label: "Prestasi", value: shown(achievementsCount), href: "/admin/achievements", icon: <Trophy className="h-5 w-5 text-amber-600" />, variant: "warning", show: canPublish },
    {
      label: "Pesan",
      value: shown(contactCount),
      href: "/admin/contact",
      icon: <Envelope className="h-5 w-5 text-[var(--brand-primary)]" />,
      variant: "brand",
      show: isAdmin,
      detail: <StatDetail parts={[["belum dibaca", shown(unreadMsgs)]]} />,
    },
  ];

  const stats = allStats.filter((s) => s.show);

  // ── Card daftar terbaru (urutan = prioritas pemakaian) ──
  const sections: { key: string; node: ReactNode }[] = [];

  if (isAdmin) {
    sections.push({
      key: "spmb",
      node: (
        <ListCard title="Pendaftar SPMB terbaru" href="/admin/admission">
          {recentSpmb.error ? (
            <EmptyState icon={Users} title="Gagal memuat" hint="Pendaftar tidak sementara tampil. Coba muat ulang halaman." />
          ) : (recentSpmb.data || []).length === 0 ? (
            <EmptyState icon={Users} title="Belum ada pendaftar" hint="Pendaftar yang masuk lewat formulir SPMB akan muncul di sini." />
          ) : (
            (recentSpmb.data || []).map((item) => {
              const late = item.status === "pending" && daysSince(item.created_at, now) >= PENDING_SLA_DAYS;
              return (
                <Row
                  key={item.id}
                  href="/admin/admission"
                  leading={
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${late ? "bg-amber-100 ring-2 ring-amber-300" : "bg-[var(--brand-primary)]/10"}`}>
                      <Users className={`h-4 w-4 ${late ? "text-amber-600" : "text-[var(--brand-primary)]"}`} />
                    </div>
                  }
                  trailing={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${spmbStatusColor[item.status] || "bg-slate-50 text-slate-700"}`}>
                      {spmbStatusLabel[item.status] || item.status}
                      {late && " · lewat"}
                    </span>
                  }
                >
                  <p className="line-clamp-1 text-sm font-medium text-slate-800">
                    {toTitleCase(item.full_name) || "Tanpa nama"}
                    {late && <span className="ml-1.5 font-bold text-amber-600" title={`Menunggu verifikasi ${PENDING_SLA_DAYS} hari atau lebih`}>!</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500" title={item.created_at}>
                    {formatRelativeTime(item.created_at, now)}
                  </p>
                </Row>
              );
            })
          )}
        </ListCard>
      ),
    });

    sections.push({
      key: "messages",
      node: (
        <ListCard title="Pesan masuk terbaru" href="/admin/contact">
          {recentMessages.error ? (
            <EmptyState icon={Envelope} title="Gagal memuat" hint="Pesan tidak sementara tampil. Coba muat ulang halaman." />
          ) : (recentMessages.data || []).length === 0 ? (
            <EmptyState icon={Envelope} title="Belum ada pesan" hint="Pesan dari formulir kontak website akan muncul di sini." />
          ) : (
            (recentMessages.data || []).map((item) => (
              <Row
                key={item.id}
                href="/admin/contact"
                leading={
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${item.is_read ? "bg-slate-100" : "bg-[var(--brand-primary)]/10"}`}>
                    <Envelope className={`h-4 w-4 ${item.is_read ? "text-slate-400" : "text-[var(--brand-primary)]"}`} />
                  </div>
                }
                trailing={
                  !item.is_read ? (
                    <span className="inline-flex items-center rounded-full bg-[var(--brand-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--brand-accent)]">Baru</span>
                  ) : null
                }
              >
                <p className={`line-clamp-1 text-sm text-slate-800 ${item.is_read ? "font-medium" : "font-semibold"}`}>
                  {toTitleCase(item.name) || "Tanpa nama"}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {item.subject || "Tanpa subjek"} &middot; {formatRelativeTime(item.created_at, now)}
                </p>
                {item.message && <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{item.message}</p>}
              </Row>
            ))
          )}
        </ListCard>
      ),
    });
  }

  if (canPublish) {
    sections.push({
      key: "news",
      node: (
        <ListCard title="Berita terbaru" href="/admin/news">
          {recentNews.error ? (
            <EmptyState icon={Megaphone} title="Gagal memuat" hint="Berita tidak sementara tampil. Coba muat ulang halaman." />
          ) : (recentNews.data || []).length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada berita" hint="Berita yang Anda tulis akan muncul di sini." />
          ) : (
            (recentNews.data || []).map((item) => (
              <Row key={item.id} href="/admin/news">
                <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {item.is_published ? "Publish" : "Draft"}
                  </span>
                  <span className="text-xs text-slate-500">{formatRelativeTime(item.created_at, now)}</span>
                </div>
              </Row>
            ))
          )}
        </ListCard>
      ),
    });

    // Kartu agenda terdekat — hanya bila ada event aktif yang akan datang.
    const agenda = nextAgenda.error ? null : (nextAgenda.data || [])[0];
    if (agenda) {
      sections.push({
        key: "agenda",
        node: (
          <ListCard title="Agenda terdekat" href="/admin/agenda">
            <Row href="/admin/agenda">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)]/10">
                <CalendarCheck className="h-4 w-4 text-[var(--brand-accent)]" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium text-slate-800">{agenda.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{fmtWIBDate(agenda.event_date)}</p>
              </div>
            </Row>
          </ListCard>
        ),
      });
    }
  }

  const gridClass =
    sections.length >= 3 ? "lg:grid-cols-2 xl:grid-cols-3" : sections.length === 2 ? "lg:grid-cols-2" : "";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Banner ringkas: sapaan + tanggal + aksi cepat (1 baris yang bisa digeser di HP) */}
      <header className="mb-4 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-accent)] p-4 text-white shadow-lg shadow-[var(--brand-primary)]/20 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-white/70">{today}</p>
          <h1 className="mt-0.5 truncate text-lg font-bold sm:text-xl">
            Selamat {greeting(now)}, {firstName}
          </h1>
          <p className="sr-only">Peran: {roleLabel[role] || role}</p>
        </div>
        <nav
          aria-label="Aksi cepat"
          className={`grid gap-2 lg:flex lg:flex-wrap ${mobileActionCount > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`${action.mobile ? "flex" : "hidden lg:flex"} min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:min-h-0 lg:rounded-lg`}
            >
              <action.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      {/* Perlu perhatian: satu baris kecil saat kosong, kartu hanya bila ada tugas */}
      {(isAdmin || canPublish) &&
        (todo.length === 0 ? (
          <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Semua beres, tidak ada yang perlu ditindaklanjuti.
          </p>
        ) : (
          <section aria-labelledby="todo-title" className="mb-4">
            <h2 id="todo-title" className="mb-2 text-sm font-bold text-slate-800">
              Perlu perhatian
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {todo.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className="group flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                >
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-amber-500 px-2 text-sm font-bold text-white">
                    {t.res.count}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800">{t.label}</span>
                  <ArrowRight className="h-4 w-4 text-amber-700 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        ))}

      {/* Statistik */}
      {stats.length > 0 && (
        <>
          {/* Mobile: grid padat, semua angka terlihat tanpa scroll panjang.
              Rincian status sengaja disembunyikan di HP (grid tetap padat). */}
          <div className={`grid gap-2 md:hidden ${stats.length === 4 ? "grid-cols-2" : stats.length % 3 === 0 ? "grid-cols-3" : "grid-cols-2"}`}>
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                aria-label={`${stat.label}: ${stat.value === null ? "gagal memuat" : stat.value}`}
                className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm active:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold leading-none text-slate-900">{stat.value === null ? "—" : stat.value}</span>
                  {stat.icon}
                </div>
                <span className="text-xs text-slate-500">{stat.label}</span>
              </Link>
            ))}
          </div>

          {/* Tablet & desktop: StatCard bawaan + rincian status */}
          <div className="hidden md:block">
            <StatCardGroup>
              {stats.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  aria-label={`${stat.label}: ${stat.value === null ? "gagal memuat" : stat.value}`}
                  className="block h-full rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
                >
                  <StatCard label={stat.label} value={stat.value === null ? "—" : stat.value} icon={stat.icon} variant={stat.variant}>
                    {stat.detail}
                  </StatCard>
                </Link>
              ))}
            </StatCardGroup>
          </div>
        </>
      )}

      {/* Daftar terbaru */}
      {sections.length > 0 && (
        <div className={`mt-5 grid items-start gap-4 lg:mt-6 lg:gap-6 ${gridClass}`}>
          {sections.map((s) => (
            <div key={s.key}>{s.node}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tanggal WIB "20 Okt 2026" (pakai Intl dengan zona eksplisit). */
function fmtWIBDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(d);
}
