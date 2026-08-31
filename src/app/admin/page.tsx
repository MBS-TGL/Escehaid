import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  Users,
  ImageSquare,
  Megaphone,
  Envelope,
  Note,
  Trophy,
  House,
  ArrowRight,
  Clock,
  CheckCircle,
  Plus,
  Eye,
} from "@/components/Icons";
import { StatCard, StatCardGroup } from "@/components/ui";

const menuItems = [
  { label: "Kelola SPMB", href: "/admin/admission", icon: Users, color: "from-[#082b59] to-[#0a3570]", roles: ["developer", "admin"] },
  { label: "Kelola Berita", href: "/admin/news", icon: Megaphone, color: "from-[#1767b1] to-[#1d7dd4]", roles: ["developer", "admin", "publisher"] },
  { label: "Kelola Artikel", href: "/admin/articles", icon: Note, color: "from-[#0d4a8a] to-[#1565c0]", roles: ["developer", "admin", "publisher"] },
  { label: "Kelola Gallery", href: "/admin/gallery", icon: ImageSquare, color: "from-[#1767b1] to-[#2196f3]", roles: ["developer", "admin", "publisher"] },
  { label: "Kelola Prestasi", href: "/admin/achievements", icon: Trophy, color: "from-[#f4d21f] to-[#fdd835]", roles: ["developer", "admin"] },
  { label: "Pesan Masuk", href: "/admin/contact", icon: Envelope, color: "from-[#082b59] to-[#0a3570]", roles: ["developer", "admin"] },
];

const roleLabel: Record<string, string> = {
  developer: "Developer",
  admin: "Administrator",
  publisher: "Publisher",
  teacher: "Guru",
  student: "Siswa",
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=inactive");
  }

  const visibleMenu = menuItems.filter((item) => item.roles.includes(profile.role));

  // Fetch stats + recent data in parallel
  const [newsCount, articlesCount, galleryCount, spmbCount, achievementsCount, contactCount, recentNews, recentSpmb, recentMessages] = await Promise.all([
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("gallery").select("id", { count: "exact", head: true }),
    supabase.from("spmb_registrations").select("id", { count: "exact", head: true }),
    supabase.from("achievements").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase.from("news").select("id, title, is_published, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("spmb_registrations").select("id, full_name, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("contact_messages").select("id, name, subject, is_read, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "Total Berita", value: newsCount.count || 0, icon: Megaphone, variant: "info" as const },
    { label: "Total Artikel", value: articlesCount.count || 0, icon: Note, variant: "brand" as const },
    { label: "Total Gallery", value: galleryCount.count || 0, icon: ImageSquare, variant: "info" as const },
    { label: "Pendaftar SPMB", value: spmbCount.count || 0, icon: Users, variant: "brand" as const },
    { label: "Prestasi", value: achievementsCount.count || 0, icon: Trophy, variant: "warning" as const },
    { label: "Pesan Masuk", value: contactCount.count || 0, icon: Envelope, variant: "brand" as const },
  ];

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Welcome Header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#082b59] via-[#0a3570] to-[#1767b1] p-5 text-white shadow-lg shadow-[#082b59]/20 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Selamat datang kembali</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">{profile.full_name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm">
                {roleLabel[profile.role] || profile.role}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/60">
                <CheckCircle className="h-3 w-3" /> Aktif
              </span>
            </div>
          </div>
          <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm sm:flex sm:h-20 sm:w-20">
            <House className="h-8 w-8 text-white/80 sm:h-10 sm:w-10" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StatCardGroup>
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} variant={stat.variant} />
        ))}
      </StatCardGroup>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Aksi Cepat</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Lihat Website", href: "/", icon: Eye, color: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
            { label: "SPMB Baru", href: "/admin/admission", icon: Plus, color: "bg-[#082b59]/10 text-[#082b59] hover:bg-[#082b59]/20" },
            { label: "Tulis Berita", href: "/admin/news", icon: Plus, color: "bg-[#1767b1]/10 text-[#1767b1] hover:bg-[#1767b1]/20" },
            { label: "Pesan Baru", href: "/admin/contact", icon: Envelope, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${action.color}`}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent News */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Berita Terbaru</h3>
            <Link href="/admin/news" className="flex items-center gap-1 text-xs font-semibold text-[#1767b1] hover:underline">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(recentNews.data || []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-slate-200" />
                <p className="mt-2 text-xs text-slate-400">Belum ada berita</p>
              </div>
            ) : (
              (recentNews.data || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {item.is_published ? "Publish" : "Draft"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent SPMB */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Pendaftar SPMB Terbaru</h3>
            <Link href="/admin/admission" className="flex items-center gap-1 text-xs font-semibold text-[#1767b1] hover:underline">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(recentSpmb.data || []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-200" />
                <p className="mt-2 text-xs text-slate-400">Belum ada pendaftar</p>
              </div>
            ) : (
              (recentSpmb.data || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/50">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#082b59]/10">
                    <Users className="h-4 w-4 text-[#082b59]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.full_name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${spmbStatusColor[item.status] || "bg-slate-50 text-slate-700"}`}>
                    {spmbStatusLabel[item.status] || item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Pesan Masuk Terbaru</h3>
            <Link href="/admin/contact" className="flex items-center gap-1 text-xs font-semibold text-[#1767b1] hover:underline">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(recentMessages.data || []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Envelope className="mx-auto h-8 w-8 text-slate-200" />
                <p className="mt-2 text-xs text-slate-400">Belum ada pesan</p>
              </div>
            ) : (
              (recentMessages.data || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/50">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${item.is_read ? "bg-slate-100" : "bg-[#082b59]/10"}`}>
                    <Envelope className={`h-4 w-4 ${item.is_read ? "text-slate-400" : "text-[#082b59]"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                      {item.subject || "Tanpa subjek"} &middot; {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {!item.is_read && (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#1767b1]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Menu Admin</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">{visibleMenu.length} menu tersedia</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {visibleMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-all hover:border-[#1767b1]/30 hover:bg-slate-50 hover:shadow-sm"
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md transition-transform group-hover:scale-105`}
                >
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 transition-colors group-hover:text-[#082b59]">
                    {item.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
