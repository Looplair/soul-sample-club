import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { getPublishedGuides } from "@/lib/guides";
import { GENRE_PAGES } from "@/lib/genre-pages";
import { getGenreAvailability } from "@/lib/genre-data";

// Re-check hourly so scheduled guides show up on their go-live date
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Static pages (login/signup left out: nothing there worth ranking)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/subscribe`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/app`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic pack pages
  let packPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createAdminClient();
    const { data: packs } = await supabase
      .from("packs")
      .select("id, updated_at")
      .eq("is_published", true);

    if (packs && Array.isArray(packs)) {
      packPages = packs.map((pack: { id: string; updated_at: string }) => ({
        url: `${baseUrl}/packs/${pack.id}`,
        lastModified: new Date(pack.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Error generating sitemap pack pages:", error);
  }

  // Guides: published only (drafts are visible on previews but never listed)
  const published = await getPublishedGuides();
  const guidePages: MetadataRoute.Sitemap = published.length
    ? [
        { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
        ...published.map((g) => ({
          url: `${baseUrl}/guides/${g.slug}`,
          lastModified: new Date(g.updatedAt),
          changeFrequency: "monthly" as const,
          priority: g.isPillar ? 0.8 : 0.6,
        })),
      ]
    : [];

  // Genre pages: only those with at least one pack currently in the catalog
  const availability = await getGenreAvailability();
  const genrePages: MetadataRoute.Sitemap = GENRE_PAGES.filter((g) => (availability[g.tag]?.live ?? 0) > 0).map((g) => ({
    url: `${baseUrl}/samples/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...genrePages, ...guidePages, ...packPages];
}
