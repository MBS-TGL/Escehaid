import type { MetadataRoute } from "next";
import { getNewsListAll, getArticleListAll, getActivityListAll } from "@/lib/queries";

const BASE_URL = "https://smpmuh4tanggul.web.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, articles, activities] = await Promise.all([
    getNewsListAll(),
    getArticleListAll(),
    getActivityListAll(),
  ]);

  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/profile`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/achievements`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gallery`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/articles`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/activities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/admission`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/admission/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
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
