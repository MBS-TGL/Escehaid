import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Users, FileText, ImageSquare, Megaphone, ChartBar, Envelope, Note, Trophy, User } from "@/components/Icons";
import LogoutButton from "./LogoutButton";

const menuItems = [
  { label: "Kelola SPMB", href: "/admin/admission", icon: Users, color: "bg-[#082b59]" },
  { label: "Kelola Berita", href: "/admin/news", icon: Megaphone, color: "bg-[#1767b1]" },
  { label: "Kelola Artikel", href: "/admin/articles", icon: Note, color: "bg-[#0d4a8a]" },
  { label: "Kelola Gallery", href: "/admin/gallery", icon: ImageSquare, color: "bg-[#1767b1]" },
  { label: "Kelola Prestasi", href: "/admin/achievements", icon: Trophy, color: "bg-[#f4d21f]" },
  { label: "Pesan Masuk", href: "/admin/contact", icon: Envelope, color: "bg-[#082b59]" },
];

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

  const roleBadge: Record<string, string> = {
    developer: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    publisher: "bg-emerald-100 text-emerald-700",
    teacher: "bg-emerald-100 text-emerald-700",
    student: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#082b59]">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Selamat datang, {profile.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-4 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#082b59]/10">
              <User className="h-4 w-4 text-[#082b59]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#082b59]">{profile.full_name}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleBadge[profile.role] || "bg-slate-100 text-slate-600"}`}>
                {profile.role}
              </span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Menu */}
      <h2 className="text-xl font-bold mb-6 text-[#082b59]">Menu Admin</h2>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed] transition-all hover:border-[#1767b1]/30 hover:shadow-lg hover:shadow-[#082b59]/5"
          >
            <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <item.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-[#082b59]">{item.label}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
