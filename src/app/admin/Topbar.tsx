"use client";

import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  List,
  User,
  SignOut,
  Bell,
  CaretDown,
  MagnifyingGlass,
  House,
  Users,
  Megaphone,
  Note,
  ImageSquare,
  Trophy,
  Envelope,
  CheckCircle,
} from "@/components/Icons";
import { getUnreadMessageCount, getRecentUnreadMessages, markContactAsRead } from "@/lib/queries";
import type { ContactMessage } from "@/lib/supabase";

interface UserProfile {
  full_name: string;
  role: string;
  is_active: boolean;
}

const navSearchItems = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "Kelola SPMB", href: "/admin/admission", icon: Users },
  { label: "Kelola Berita", href: "/admin/news", icon: Megaphone },
  { label: "Kelola Fasilitas", href: "/admin/facilities", icon: ImageSquare },
  { label: "Kelola Artikel", href: "/admin/articles", icon: Note },
  { label: "Kelola Galeri", href: "/admin/gallery", icon: ImageSquare },
  { label: "Kelola Prestasi", href: "/admin/achievements", icon: Trophy },
  { label: "Pesan Masuk", href: "/admin/contact", icon: Envelope },
];

const roleBadge: Record<string, string> = {
  developer: "bg-purple-500/10 text-purple-600",
  admin: "bg-blue-500/10 text-blue-600",
  publisher: "bg-emerald-500/10 text-emerald-600",
  teacher: "bg-teal-500/10 text-teal-600",
  student: "bg-amber-500/10 text-amber-600",
};

const roleLabel: Record<string, string> = {
  developer: "Developer",
  admin: "Administrator",
  publisher: "Publisher",
  teacher: "Guru",
  student: "Siswa",
};

export default function AdminTopbar({
  profile,
  onOpenMobile,
}: {
  profile: UserProfile;
  onOpenMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<ContactMessage[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filteredNav = searchQuery
    ? navSearchItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const fetchNotifications = useCallback(async () => {
    const count = await getUnreadMessageCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!notifOpen) return;
    setNotifLoading(true);
    getRecentUnreadMessages(5).then((msgs) => {
      setNotifications(msgs);
      setNotifLoading(false);
    });
  }, [notifOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setNotifOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  async function handleMarkAsRead(id: string) {
    await markContactAsRead(id);
    setNotifications((prev) => prev.filter((m) => m.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins}m lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}j lalu`;
    const days = Math.floor(hrs / 24);
    return `${days}h lalu`;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 sm:px-6">
      {/* Left: hamburger (mobile) + search bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#082b59] transition-colors lg:hidden"
        >
          <List className="h-5 w-5" />
        </button>

        {/* Search bar */}
        <div className="relative" ref={searchContainerRef}>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-white w-48 sm:w-64"
          >
            <MagnifyingGlass className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Cari halaman...</span>
            <span className="sm:hidden">Cari...</span>
            <kbd className="ml-auto hidden rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
              {typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "⌘K" : "Ctrl+K"}
            </kbd>
          </button>

          {/* Search dropdown */}
          {searchOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 pb-2">
                <MagnifyingGlass className="h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama halaman..."
                  className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredNav.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">
                    {searchQuery ? "Tidak ditemukan" : "Ketik untuk mencari halaman"}
                  </p>
                ) : (
                  filteredNav.map((item) => {
                    const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-[#082b59]/5 text-[#082b59] font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {item.label}
                        {isActive && <span className="ml-auto text-[10px] font-bold text-[#082b59]">Aktif</span>}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1767b1] px-1 text-[9px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Notifikasi</h3>
                {unreadCount > 0 && (
                  <Link href="/admin/contact" onClick={() => setNotifOpen(false)}
                    className="text-[11px] font-semibold text-[#1767b1] hover:text-[#082b59]">
                    Lihat semua
                  </Link>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#082b59] border-t-transparent" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                    <p className="text-xs text-slate-500">Semua sudah dibaca</p>
                  </div>
                ) : (
                  notifications.map((msg) => (
                    <div key={msg.id} className="flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50/50">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1767b1]/10">
                        <Envelope className="h-4 w-4 text-[#1767b1]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">{msg.name}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(msg.created_at)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{msg.message}</p>
                        <button
                          onClick={() => handleMarkAsRead(msg.id)}
                          className="mt-1.5 text-[10px] font-semibold text-[#1767b1] hover:text-[#082b59]"
                        >
                          Tandai sudah dibaca
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {unreadCount > 0 && (
                <div className="border-t border-slate-100 px-4 py-2.5">
                  <Link href="/admin/contact" onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs font-semibold text-[#1767b1] hover:text-[#082b59]">
                    Lihat semua pesan
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#082b59]">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{profile.full_name}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-none ${roleBadge[profile.role] || "bg-slate-100 text-slate-500"}`}>
                {roleLabel[profile.role] || profile.role}
              </span>
            </div>
            <CaretDown className={`h-3.5 w-3.5 text-slate-400 transition-transform hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{profile.full_name}</p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase mt-1 ${roleBadge[profile.role] || "bg-slate-100 text-slate-500"}`}>
                  {roleLabel[profile.role] || profile.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <SignOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
