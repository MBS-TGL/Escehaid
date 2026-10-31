import type { SupabaseClient } from "@supabase/supabase-js";

export type CommandGroupKey = "actions" | "menus" | "news" | "articles" | "admission" | "messages";

export interface CommandItem {
  id: string;
  group: CommandGroupKey;
  label: string;
  subLabel?: string;
  href: string;
  iconName?: string;
}

export interface CommandSearchResults {
  groups: {
    key: CommandGroupKey;
    title: string;
    items: CommandItem[];
  }[];
  totalCount: number;
}

const STATIC_ACTIONS: { label: string; subLabel: string; href: string; perm?: string; iconName: string }[] = [
  { label: "Tulis Berita Baru", subLabel: "Buka form berita", href: "/admin/news", perm: "berita:create", iconName: "Plus" },
  { label: "Tulis Artikel Baru", subLabel: "Buka form artikel", href: "/admin/articles", perm: "artikel:create", iconName: "Plus" },
  { label: "Lihat Website Publik", subLabel: "Halaman beranda utama", href: "/", iconName: "Eye" },
  { label: "Analitik Trafik", subLabel: "Lihat page view & perangkat", href: "/admin/analytics", perm: "analitik:read", iconName: "ChartLine" },
  { label: "Pendaftar SPMB", subLabel: "Kelola data & verifikasi", href: "/admin/admission", perm: "spmb:read", iconName: "Users" },
  { label: "Pesan Masuk", subLabel: "Kotak masuk kontak", href: "/admin/contact", perm: "kontak:read", iconName: "Envelope" },
  { label: "Cadangan Database", subLabel: "Status & unduh backup", href: "/admin/backup", perm: "backup:read", iconName: "Database" },
  { label: "Log Aktivitas", subLabel: "Audit trail perubahan", href: "/admin/logs", perm: "logs:read", iconName: "Scroll" },
  { label: "Pengaturan Situs", subLabel: "Branding, kontak, SEO", href: "/admin/settings", perm: "settings:manage", iconName: "Gear" },
  { label: "Pengaturan Akun & Keamanan", subLabel: "Sandi, 2FA, sesi", href: "/admin/security", iconName: "ShieldCheck" },
];

/**
 * Mencari data global admin yang dikelompokkan dan disaring hak akses.
 */
export async function executeGlobalSearch(
  supabase: SupabaseClient,
  query: string,
  userPermissions: string[]
): Promise<CommandSearchResults> {
  const q = query.trim().toLowerCase();
  const isSuper = userPermissions.includes("SUPER_ADMIN") || userPermissions.includes("*");
  const hasPerm = (p: string) => isSuper || userPermissions.includes(p);

  const groups: CommandSearchResults["groups"] = [];
  let totalCount = 0;

  // 1. Actions Matching
  const matchedActions: CommandItem[] = STATIC_ACTIONS.filter(
    (a) => (!a.perm || hasPerm(a.perm)) && (a.label.toLowerCase().includes(q) || a.subLabel.toLowerCase().includes(q))
  ).slice(0, 5).map((a, idx) => ({
    id: `action-${idx}`,
    group: "actions",
    label: a.label,
    subLabel: a.subLabel,
    href: a.href,
    iconName: a.iconName,
  }));

  if (matchedActions.length > 0) {
    groups.push({ key: "actions", title: "Aksi Cepat", items: matchedActions });
    totalCount += matchedActions.length;
  }

  // Jika query kurang dari 2 karakter, aksi cepat sudah cukup
  if (q.length < 2) {
    return { groups, totalCount };
  }

  // 2. Berita (News)
  if (hasPerm("berita:read")) {
    try {
      const { data } = await supabase
        .from("news")
        .select("id, title, summary")
        .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
        .limit(4);

      if (data && data.length > 0) {
        const items: CommandItem[] = data.map((n) => ({
          id: `news-${n.id}`,
          group: "news",
          label: n.title,
          subLabel: n.summary?.slice(0, 60) || "Berita",
          href: "/admin/news",
          iconName: "Megaphone",
        }));
        groups.push({ key: "news", title: "Berita", items });
        totalCount += items.length;
      }
    } catch {
      // toleransi kegagalan query
    }
  }

  // 3. Artikel (Articles)
  if (hasPerm("artikel:read")) {
    try {
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt")
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
        .limit(4);

      if (data && data.length > 0) {
        const items: CommandItem[] = data.map((a) => ({
          id: `art-${a.id}`,
          group: "articles",
          label: a.title,
          subLabel: a.excerpt?.slice(0, 60) || "Artikel",
          href: "/admin/articles",
          iconName: "Note",
        }));
        groups.push({ key: "articles", title: "Artikel", items });
        totalCount += items.length;
      }
    } catch {
      // toleransi
    }
  }

  // 4. Pendaftar SPMB
  if (hasPerm("spmb:read")) {
    try {
      const { data } = await supabase
        .from("spmb_registrations")
        .select("id, full_name, status, created_at")
        .ilike("full_name", `%${q}%`)
        .limit(4);

      if (data && data.length > 0) {
        const items: CommandItem[] = data.map((s) => ({
          id: `spmb-${s.id}`,
          group: "admission",
          label: s.full_name,
          subLabel: `Pendaftar SPMB · Status: ${s.status}`,
          href: "/admin/admission",
          iconName: "Users",
        }));
        groups.push({ key: "admission", title: "Pendaftar SPMB", items });
        totalCount += items.length;
      }
    } catch {
      // toleransi
    }
  }

  // 5. Pesan Kontak
  if (hasPerm("kontak:read")) {
    try {
      const { data } = await supabase
        .from("contact_messages")
        .select("id, name, subject")
        .or(`name.ilike.%${q}%,subject.ilike.%${q}%`)
        .limit(4);

      if (data && data.length > 0) {
        const items: CommandItem[] = data.map((m) => ({
          id: `msg-${m.id}`,
          group: "messages",
          label: m.name,
          subLabel: m.subject || "Pesan kontak",
          href: "/admin/contact",
          iconName: "Envelope",
        }));
        groups.push({ key: "messages", title: "Pesan Masuk", items });
        totalCount += items.length;
      }
    } catch {
      // toleransi
    }
  }

  return { groups, totalCount };
}
