"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGuideChecks, slugify, GUIDE_CLUSTERS, type Guide } from "@/lib/guide-utils";

export type GuideInput = Omit<Guide, "id" | "updatedAt"> & { id?: string };

type Result = { ok: true; id: string; slug: string } | { ok: false; error: string };

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not signed in";
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return (profile as { is_admin?: boolean } | null)?.is_admin ? null : "Admins only";
}

function refresh(slugs: string[]) {
  revalidatePath("/guides");
  slugs.forEach((s) => revalidatePath(`/guides/${s}`));
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/guides");
}

export async function saveGuide(input: GuideInput): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const slug = slugify(input.slug || input.title);
  if (!slug) return { ok: false, error: "Add a title or URL slug first" };
  if (!(GUIDE_CLUSTERS as readonly string[]).includes(input.cluster)) return { ok: false, error: "Pick a section" };

  if (input.published) {
    const blocking = getGuideChecks(input).filter((c) => c.level === "block");
    if (blocking.length) return { ok: false, error: `Can't publish yet: ${blocking.map((c) => c.message).join("; ")}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (createAdminClient() as any).from("guides");

  const { data: clash } = await table.select("id").eq("slug", slug).maybeSingle();
  if (clash && clash.id !== input.id) return { ok: false, error: `Another guide already uses /guides/${slug}` };

  const existing = input.id ? (await table.select("slug, published_at").eq("id", input.id).maybeSingle()).data : null;
  const now = new Date().toISOString();

  const row = {
    slug,
    cluster: input.cluster,
    is_pillar: input.isPillar,
    is_published: input.published,
    title: input.title.trim(),
    seo_title: input.seoTitle?.trim() || null,
    description: input.description.trim(),
    lead: input.lead.trim(),
    body: input.body,
    key_takeaways: input.keyTakeaways.map((t) => t.trim()).filter(Boolean),
    faqs: input.faqs.filter((f) => f.q.trim() && f.a.trim()),
    sources: input.sources.filter((s) => s.label.trim() && s.url.trim()),
    related: input.related,
    // Go-live time: a chosen date (future = scheduled), else first publish time
    published_at: input.publishedAt ?? existing?.published_at ?? (input.published ? now : null),
    updated_at: now,
  };

  const { data, error } = input.id
    ? await table.update(row).eq("id", input.id).select("id").single()
    : await table.insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };

  refresh([slug, ...(existing?.slug && existing.slug !== slug ? [existing.slug] : [])]);
  return { ok: true, id: data.id, slug };
}

export async function deleteGuide(id: string): Promise<{ ok: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (createAdminClient() as any).from("guides");
  const { data: existing } = await table.select("slug").eq("id", id).maybeSingle();
  const { error } = await table.delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh(existing?.slug ? [existing.slug] : []);
  return { ok: true };
}
