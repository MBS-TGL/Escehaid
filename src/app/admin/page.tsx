"use client";

import Link from "next/link";
import { Users, FileText, ImageSquare, Megaphone, ChartBar } from "@/components/icons";

const stats = [
  { label: "Pendaftar", value: "128", icon: Users, color: "text-[#082b59]" },
  { label: "Diterima", value: "85", icon: FileText, color: "text-emerald-600" },
  { label: "Pending", value: "43", icon: ChartBar, color: "text-amber-600" },
];

const menuItems = [
  { label: "Kelola PPDB", href: "/admin/admission", icon: Users, color: "bg-[#082b59]" },
  { label: "Kelola Berita", href: "/admin/news", icon: Megaphone, color: "bg-[#1767b1]" },
  { label: "Kelola Gallery", href: "/admin/gallery", icon: ImageSquare, color: "bg-[#0d4a8a]" },
];

export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-[#082b59]">Dashboard Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{stat.label}</div>
                <div className="text-3xl font-bold text-[#082b59]">{stat.value}</div>
              </div>
              <stat.icon className={`h-10 w-10 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-6 text-[#082b59]">Menu Admin</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed] hover:shadow-md transition-shadow"
          >
            <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <item.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-[#082b59]">{item.label}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
