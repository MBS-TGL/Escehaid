import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { createClient } from "@/lib/supabase-server";
import {
  Users,
  ImageSquare,
  Megaphone,
  Envelope,
  Note,
  Trophy,
  ArrowRight,
  CheckCircle,
  Plus,
  Eye,
} from "@/components/Icons";
import { StatCard, StatCardGroup } from "@/components/ui";

type IconType = ComponentType<{ className?: string }>;

type StatItem = {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
  variant: "info" | "brand" | "warning";
  show: boolean;
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
 * TODO: ganti href ke halaman create (mis. "/admin/news/new") bila sudah ada.
 */
const quickActions: { label: string; href: string; icon: IconType; roles: string[]; mobile: boolean }[] = [
  { label: "Lihat website", href: "/", icon: Eye, roles: [...CONTENT_ROLES, "teacher", "student"], mobile: true },
  { label: "Tulis berita", href: "/admin/news", icon: Plus, roles: CONTENT_ROLES, mobile: true },
  // Sudah ada di bottom nav (HP) & sidebar (desktop): disembunyikan di HP.
  { label: "Buka pendaftar", href: "/admin/admission", icon: Users, roles: ADMIN_ROLES, mobile: false },
  { label: "Lihat pesan", href: "/admin/contact", icon: Envelope, roles: ADMIN_ROLES, mobile: false },
];

function greeting(now: Date) {
  const hour =
    Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(now)) % 24;
  if (hour < 11) return "pagi";
  if (hour < 15) return "siang";
  if (hour < 18) return "sore";
  return "malam";
}

function fmtDate(value: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString("id-ID", { ...opts, timeZone: TZ });
}

/** Kerangka card daftar: judul + link "Lihat semua" + isi. */
function ListCard({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-[#1767b1] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
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

export default async function AdminPage() {
  const supabase = await createClient();

  // getClaims(): verifikasi JWT lokal (tanpa panggilan Auth). proxy.ts sudah
  // memeriksa sesi, jadi di sini cukup mengambil id user.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/admin/login");

  // Semua query berjalan bersamaan (1 round-trip). Data yang tidak boleh dilihat
  // role tertentu hanya tidak dirender di bawah; pastikan RLS Supabase tetap
  // membatasi tabel sensitif (spmb_registrations, contact_messages).
  const [
    profileRes,
    newsCount,
    articlesCount,
    galleryCount,
    spmbCount,
    achievementsCount,
    contactCount,
    unreadMsgs,
    pendingSpmb,
    draftNews,
    recentNews,
    recentSpmb,
    recentMessages,
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).single(),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("gallery").select("id", { count: "exact", head: true }),
    supabase.from("spmb_registrations").select("id", { count: "exact", head: true }),
    supabase.from("achievements").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
    supabase.from("spmb_registrations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("is_published", false),
    supabase.from("news").select("id, title, is_published, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("spmb_registrations").select("id, full_name, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("contact_messages").select("id, name, subject, is_read, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = profileRes.data;
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=inactive");
  }

  const role: string = profile.role;
  const isAdmin = ADMIN_ROLES.includes(role);
  const canPublish = CONTENT_ROLES.includes(role);

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

  // ── Perlu perhatian: hanya yang jumlahnya > 0 dan relevan untuk role ──
  const todo = [
    { label: "Pesan belum dibaca", count: unreadMsgs.count ?? 0, href: "/admin/contact", show: isAdmin },
    { label: "Pendaftar menunggu verifikasi", count: pendingSpmb.count ?? 0, href: "/admin/admission", show: isAdmin },
    { label: "Berita masih draft", count: draftNews.count ?? 0, href: "/admin/news", show: canPublish },
  ].filter((t) => t.show && t.count > 0);

  const allStats: StatItem[] = [
    { label: "Berita", value: newsCount.count || 0, href: "/admin/news", icon: <Megaphone className="h-5 w-5 text-blue-600" />, variant: "info", show: canPublish },
    { label: "Artikel", value: articlesCount.count || 0, href: "/admin/articles", icon: <Note className="h-5 w-5 text-[#082b59]" />, variant: "brand", show: canPublish },
    { label: "Galeri", value: galleryCount.count || 0, href: "/admin/gallery", icon: <ImageSquare className="h-5 w-5 text-blue-600" />, variant: "info", show: canPublish },
    { label: "Pendaftar", value: spmbCount.count || 0, href: "/admin/admission", icon: <Users className="h-5 w-5 text-[#082b59]" />, variant: "brand", show: isAdmin },
    { label: "Prestasi", value: achievementsCount.count || 0, href: "/admin/achievements", icon: <Trophy className="h-5 w-5 text-amber-600" />, variant: "warning", show: canPublish },
    { label: "Pesan", value: contactCount.count || 0, href: "/admin/contact", icon: <Envelope className="h-5 w-5 text-[#082b59]" />, variant: "brand", show: isAdmin },
  ];

  const stats = allStats.filter((s) => s.show);

  // ── Card daftar terbaru (urutan = prioritas pemakaian) ──
  const sections: { key: string; node: ReactNode }[] = [];

  if (isAdmin) {
    sections.push({
      key: "spmb",
      node: (
        <ListCard title="Pendaftar SPMB terbaru" href="/admin/admission">
          {(recentSpmb.data || []).length === 0 ? (
            <EmptyState icon={Users} title="Belum ada pendaftar" hint="Pendaftar yang masuk lewat formulir SPMB akan muncul di sini." />
          ) : (
            (recentSpmb.data || []).map((item) => (
              <Row
                key={item.id}
                href="/admin/admission"
                leading={
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#082b59]/10">
                    <Users className="h-4 w-4 text-[#082b59]" />
                  </div>
                }
                trailing={
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${spmbStatusColor[item.status] || "bg-slate-50 text-slate-700"}`}>
                    {spmbStatusLabel[item.status] || item.status}
                  </span>
                }
              >
                <p className="line-clamp-1 text-sm font-medium text-slate-800">{item.full_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{fmtDate(item.created_at, { day: "numeric", month: "short", year: "numeric" })}</p>
              </Row>
            ))
          )}
        </ListCard>
      ),
    });

    sections.push({
      key: "messages",
      node: (
        <ListCard title="Pesan masuk terbaru" href="/admin/contact">
          {(recentMessages.data || []).length === 0 ? (
            <EmptyState icon={Envelope} title="Belum ada pesan" hint="Pesan dari formulir kontak website akan muncul di sini." />
          ) : (
            (recentMessages.data || []).map((item) => (
              <Row
                key={item.id}
                href="/admin/contact"
                leading={
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${item.is_read ? "bg-slate-100" : "bg-[#082b59]/10"}`}>
                    <Envelope className={`h-4 w-4 ${item.is_read ? "text-slate-400" : "text-[#082b59]"}`} />
                  </div>
                }
                trailing={
                  !item.is_read ? (
                    <span className="inline-flex items-center rounded-full bg-[#1767b1]/10 px-2 py-0.5 text-xs font-semibold text-[#1767b1]">Baru</span>
                  ) : null
                }
              >
                <p className={`line-clamp-1 text-sm text-slate-800 ${item.is_read ? "font-medium" : "font-semibold"}`}>{item.name}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {item.subject || "Tanpa subjek"} &middot; {fmtDate(item.created_at, { day: "numeric", month: "short" })}
                </p>
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
          {(recentNews.data || []).length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada berita" hint="Berita yang Anda tulis akan muncul di sini." />
          ) : (
            (recentNews.data || []).map((item) => (
              <Row key={item.id} href="/admin/news">
                <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {item.is_published ? "Publish" : "Draft"}
                  </span>
                  <span className="text-xs text-slate-500">{fmtDate(item.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </Row>
            ))
          )}
        </ListCard>
      ),
    });
  }

  const gridClass =
    sections.length >= 3 ? "lg:grid-cols-2 xl:grid-cols-3" : sections.length === 2 ? "lg:grid-cols-2" : "";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Banner ringkas: sapaan + tanggal + aksi cepat (1 baris yang bisa digeser di HP) */}
      <header className="mb-4 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[#082b59] via-[#0a3570] to-[#1767b1] p-4 text-white shadow-lg shadow-[#082b59]/20 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
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
                    {t.count}
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
          {/* Mobile: grid padat, semua angka terlihat tanpa scroll panjang */}
          <div className={`grid gap-2 md:hidden ${stats.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                aria-label={`${stat.label}: ${stat.value}`}
                className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm active:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold leading-none text-slate-900">{stat.value}</span>
                  {stat.icon}
                </div>
                <span className="text-xs text-slate-500">{stat.label}</span>
              </Link>
            ))}
          </div>

          {/* Tablet & desktop: StatCard bawaan */}
          <div className="hidden md:block">
            <StatCardGroup>
              {stats.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  aria-label={`${stat.label}: ${stat.value}`}
                  className="block h-full rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
                >
                  <StatCard label={stat.label} value={stat.value} icon={stat.icon} variant={stat.variant} />
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