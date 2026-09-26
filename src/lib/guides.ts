import { createAdminClient } from "@/lib/supabase/admin";
import { GUIDE_CLUSTERS, type Guide, type GuideCluster } from "@/lib/guide-utils";

// Server-only reads for guides. Content lives in the `guides` table and is
// edited from /admin/guides.

export * from "@/lib/guide-utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToGuide(row: any): Guide {
  return {
    id: row.id,
    slug: row.slug,
    cluster: (GUIDE_CLUSTERS as readonly string[]).includes(row.cluster) ? (row.cluster as GuideCluster) : "Sample clearance",
    isPillar: !!row.is_pillar,
    published: !!row.is_published,
    title: row.title ?? "",
    seoTitle: row.seo_title ?? null,
    description: row.description ?? "",
    lead: row.lead ?? "",
    body: row.body ?? "",
    keyTakeaways: Array.isArray(row.key_takeaways) ? row.key_takeaways : [],
    faqs: Array.isArray(row.faqs) ? row.faqs : [],
    sources: Array.isArray(row.sources) ? row.sources : [],
    related: Array.isArray(row.related) ? row.related : [],
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at,
  };
}

function guidesTable() {
  return (createAdminClient() as any).from("guides");
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getPublishedGuides(): Promise<Guide[]> {
  const { data, error } = await guidesTable()
    .select("*")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: true });
  if (error) {
    console.error("getPublishedGuides:", error.message);
    return [];
  }
  return (data || []).map(rowToGuide);
}

/** Cheap check used to decide whether to show links to guides */
export async function isGuidePublished(slug: string): Promise<boolean> {
  const { data } = await guidesTable()
    .select("id")
    .eq("slug", slug)
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  return !!data;
}

/** Whether any guide is live (footers only link to /guides once one is) */
export async function hasPublishedGuides(): Promise<boolean> {
  const { count } = await guidesTable()
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString());
  return (count ?? 0) > 0;
}

export async function getAllGuides(): Promise<Guide[]> {
  const { data, error } = await guidesTable().select("*").order("updated_at", { ascending: false });
  if (error) {
    console.error("getAllGuides:", error.message);
    return [];
  }
  return (data || []).map(rowToGuide);
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const { data } = await guidesTable().select("*").eq("slug", slug).maybeSingle();
  return data ? rowToGuide(data) : null;
}

export async function getGuideById(id: string): Promise<Guide | null> {
  const { data } = await guidesTable().select("*").eq("id", id).maybeSingle();
  return data ? rowToGuide(data) : null;
}

/** Signed-in admin? Used so drafts can be previewed on the real page. */
export async function viewerIsAdmin(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
  return !!data?.is_admin;
}
