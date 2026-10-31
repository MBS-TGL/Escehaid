import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import QualityClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Kualitas Konten & SEO",
};

export interface QualityIssue {
  id: string;
  type: "news" | "article";
  title: string;
  issue: "missing_alt" | "missing_summary" | "stale_content";
  severity: "warning" | "danger" | "info";
  href: string;
  detail: string;
}

function collectIssues(
  newsData: { id: string; title: string; summary: string | null; image_alt: string | null; updated_at: string; is_published: boolean }[],
  articlesData: { id: string; title: string; excerpt: string | null; image_alt: string | null; updated_at: string; is_published: boolean }[],
  nowMs: number
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const STALE_MS = 180 * 86400000; // 180 hari

  for (const n of newsData) {
    if (n.is_published && !n.image_alt?.trim()) {
      issues.push({
        id: `news-alt-${n.id}`,
        type: "news",
        title: n.title,
        issue: "missing_alt",
        severity: "warning",
        href: "/admin/news",
        detail: "Gambar sampul belum memiliki teks alternatif (Alt Text) untuk SEO & aksesibilitas.",
      });
    }
    if (n.is_published && !n.summary?.trim()) {
      issues.push({
        id: `news-sum-${n.id}`,
        type: "news",
        title: n.title,
        issue: "missing_summary",
        severity: "danger",
        href: "/admin/news",
        detail: "Ringkasan konten kosong. Meta deskripsi mesin pencari akan menggunakan fallback generik.",
      });
    }
    const age = nowMs - new Date(n.updated_at).getTime();
    if (n.is_published && age > STALE_MS) {
      issues.push({
        id: `news-stale-${n.id}`,
        type: "news",
        title: n.title,
        issue: "stale_content",
        severity: "info",
        href: "/admin/news",
        detail: `Konten belum diperbarui selama ${Math.floor(age / 86400000)} hari. Pertimbangkan pembaruan fakta.`,
      });
    }
  }

  for (const a of articlesData) {
    if (a.is_published && !a.image_alt?.trim()) {
      issues.push({
        id: `art-alt-${a.id}`,
        type: "article",
        title: a.title,
        issue: "missing_alt",
        severity: "warning",
        href: "/admin/articles",
        detail: "Gambar artikel belum memiliki teks alternatif (Alt Text).",
      });
    }
    if (a.is_published && !a.excerpt?.trim()) {
      issues.push({
        id: `art-sum-${a.id}`,
        type: "article",
        title: a.title,
        issue: "missing_summary",
        severity: "danger",
        href: "/admin/articles",
        detail: "Kutipan / ringkasan artikel kosong.",
      });
    }
  }

  return issues;
}

async function fetchQualityAudit(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [newsRes, articlesRes] = await Promise.all([
    supabase
      .from("news")
      .select("id, title, summary, image_alt, updated_at, is_published")
      .limit(100),
    supabase
      .from("articles")
      .select("id, title, excerpt, image_alt, updated_at, is_published")
      .limit(100),
  ]);

  const timestamp = Date.now();
  type NewsRow = { id: string; title: string; summary: string | null; image_alt: string | null; updated_at: string; is_published: boolean };
  type ArticleRow = { id: string; title: string; excerpt: string | null; image_alt: string | null; updated_at: string; is_published: boolean };

  const issues = collectIssues(
    (newsRes.data || []) as NewsRow[],
    (articlesRes.data || []) as ArticleRow[],
    timestamp
  );

  const totalContent = (newsRes.data?.length ?? 0) + (articlesRes.data?.length ?? 0);
  const criticalIssues = issues.filter((i) => i.severity === "danger").length;
  const healthScore = totalContent === 0
    ? 100
    : Math.max(0, Math.round(100 - (criticalIssues * 15 + (issues.length - criticalIssues) * 5) / (totalContent || 1)));

  return { issues, healthScore, totalContent };
}

export default async function QualityPage() {
  const supabase = await createClient();
  const { issues, healthScore, totalContent } = await fetchQualityAudit(supabase);

  return (
    <QualityClientPage
      initialIssues={issues}
      healthScore={healthScore}
      totalAudited={totalContent}
    />
  );
}
