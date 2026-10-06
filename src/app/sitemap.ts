import type { MetadataRoute } from "next";
import { getNewsListForSitemap, getArticleListForSitemap, getActivityListAll } from "@/lib/queries";

const BASE_URL = "https://www.smpmuh4tanggul.sch.id";

/** Sitemap diregenerasi tiap jam agar konten baru cepat terindeks. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, articles, activities] = await Promise.all([
    getNewsListForSitemap(),
    getArticleListForSitemap(),
    getActivityListAll(),
  ]);

  const now = new Date().toISOString();

  // Halaman statis: tanpa lastModified — tanggal build membuat Google mengira
  // semua halaman berubah tiap deploy. lastModified hanya untuk konten dinamis.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/profile`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/achievements`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gallery`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/news`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/articles`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/activities`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/admission`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/admission/register`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/portal`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [
    ...news.map((item) => ({
      url: `${BASE_URL}/news/${item.slug}`,
      lastModified: item.published_at || item.updated_at || now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...articles.map((item) => ({
      url: `${BASE_URL}/articles/${item.slug}`,
      lastModified: item.published_at || item.updated_at || now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...activities.map((item) => ({
      url: `${BASE_URL}/activities/${item.slug}`,
      lastModified: item.published_at || item.updated_at || now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticPages, ...dynamicPages];
}
