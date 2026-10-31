import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import ReviewClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Inbox Review",
};

export default async function ReviewPage() {
  const supabase = await createClient();

  // Ambil draft berita dan artikel yang menunggu persetujuan
  const [newsRes, articlesRes] = await Promise.all([
    supabase
      .from("news")
      .select("id, title, summary, created_at, published_at, user_profiles(full_name)")
      .eq("is_published", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("articles")
      .select("id, title, excerpt, created_at, published_at, user_profiles(full_name)")
      .eq("is_published", false)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  type RawRow = {
    id: string;
    title: string;
    created_at: string;
    published_at?: string | null;
    user_profiles?: { full_name?: string | null } | null;
  };

  const newsItems = ((newsRes.data || []) as (RawRow & { summary: string })[]).map((n) => ({
    id: n.id,
    type: "news" as const,
    title: n.title,
    summary: n.summary,
    author: n.user_profiles?.full_name || "Staf",
    created_at: n.created_at,
    published_at: n.published_at,
  }));

  const articleItems = ((articlesRes.data || []) as (RawRow & { excerpt: string })[]).map((a) => ({
    id: a.id,
    type: "articles" as const,
    title: a.title,
    summary: a.excerpt,
    author: a.user_profiles?.full_name || "Staf",
    created_at: a.created_at,
    published_at: a.published_at,
  }));

  const allQueue = [...newsItems, ...articleItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return <ReviewClientPage initialQueue={allQueue} />;
}
