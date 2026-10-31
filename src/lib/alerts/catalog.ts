import type { SupabaseClient } from "@supabase/supabase-js";

export type MetricComparator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

export interface AlertMetricDef {
  key: string;
  name: string;
  description: string;
  unit: string;
  defaultThreshold: number;
  defaultComparator: MetricComparator;
  evaluator: (supabase: SupabaseClient) => Promise<number>;
}

export function compareMetric(
  value: number,
  comparator: MetricComparator,
  threshold: number
): boolean {
  switch (comparator) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    case "neq":
      return value !== threshold;
    default:
      return false;
  }
}

export const ALERT_METRIC_CATALOG: AlertMetricDef[] = [
  {
    key: "spmb_pending_oldest_days",
    name: "Pendaftar SPMB Terlama Menunggu",
    description: "Berapa hari pendaftar SPMB terlama menunggu verifikasi panitia.",
    unit: "hari",
    defaultThreshold: 3,
    defaultComparator: "gte",
    evaluator: async (supabase) => {
      const { data } = await supabase
        .from("spmb_registrations")
        .select("created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      if (!data || data.length === 0) return 0;
      const oldest = new Date(data[0].created_at).getTime();
      return Math.max(0, Math.floor((Date.now() - oldest) / 86400000));
    },
  },
  {
    key: "unread_messages_count",
    name: "Pesan Masuk Belum Dibaca",
    description: "Total pesan dari formulir kontak yang belum dibaca admin.",
    unit: "pesan",
    defaultThreshold: 20,
    defaultComparator: "gte",
    evaluator: async (supabase) => {
      const { count } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  },
  {
    key: "audit_delete_count",
    name: "Lonjakan Hapus Data (24 Jam)",
    description: "Jumlah penghapusan data konten dalam 24 jam terakhir (deteksi anomali mass-delete).",
    unit: "item",
    defaultThreshold: 10,
    defaultComparator: "gte",
    evaluator: async (supabase) => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { count } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "delete")
        .gte("created_at", since);
      return count ?? 0;
    },
  },
  {
    key: "draft_news_backlog",
    name: "Timbunan Draf Berita",
    description: "Jumlah berita yang masih berstatus draf dan belum diterbitkan.",
    unit: "berita",
    defaultThreshold: 15,
    defaultComparator: "gte",
    evaluator: async (supabase) => {
      const { count } = await supabase
        .from("news")
        .select("id", { count: "exact", head: true })
        .eq("is_published", false);
      return count ?? 0;
    },
  },
];

export const ALERT_METRIC_MAP = new Map(
  ALERT_METRIC_CATALOG.map((m) => [m.key, m])
);
