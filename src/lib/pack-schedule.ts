import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Scheduled go-live for packs. The local pack uploader (tools/uploader) writes
// a small JSON file of { packId: publishAt } into the private samples bucket;
// /api/cron/publish-scheduled-packs flips due packs to published. Kept in
// storage rather than a packs column so it needed no database migration.
// Times are UTC ISO strings.

export const SCHEDULE_BUCKET = "samples";
export const SCHEDULE_PATH = "_admin/pack-schedule.json";

export type PackSchedule = Record<string, { publishAt: string; setAt: string }>;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Every read here must be fresh. Next.js was serving these GETs from its fetch
// cache, so a published pack still looked "due and unpublished" and each run
// posted another New pack notification.
const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }) },
  }) as any;

export async function readSchedule(): Promise<PackSchedule> {
  const { data, error } = await db().storage.from(SCHEDULE_BUCKET).download(SCHEDULE_PATH);
  if (error || !data) return {};
  try {
    return JSON.parse(await data.text()) as PackSchedule;
  } catch {
    return {};
  }
}

async function writeSchedule(schedule: PackSchedule) {
  // The samples bucket only accepts audio/zip/octet-stream, so JSON goes up as octet-stream
  const body = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/octet-stream" });
  const { error } = await db().storage.from(SCHEDULE_BUCKET).upload(SCHEDULE_PATH, body, { upsert: true, contentType: "application/octet-stream" });
  if (error) throw new Error(`Couldn't save the pack schedule: ${error.message}`);
}

export interface PublishResult {
  published: { id: string; name: string }[];
  skipped: { id: string; reason: string }[];
  waiting: { id: string; publishAt: string }[];
}

/** Publishes every scheduled pack whose time has come. Safe to call any time. */
export async function publishDuePacks({ dryRun = false } = {}): Promise<PublishResult> {
  const schedule = await readSchedule();
  const now = Date.now();
  const result: PublishResult = { published: [], skipped: [], waiting: [] };
  const remaining: PackSchedule = {};

  for (const [id, entry] of Object.entries(schedule)) {
    if (new Date(entry.publishAt).getTime() > now) {
      remaining[id] = entry;
      result.waiting.push({ id, publishAt: entry.publishAt });
      continue;
    }
    const { data: pack } = await db().from("packs").select("id, name, slug, is_published").eq("id", id).maybeSingle();
    if (!pack) {
      result.skipped.push({ id, reason: "pack no longer exists" });
      continue;
    }
    if (pack.is_published) {
      result.skipped.push({ id, reason: "already live" });
      continue;
    }
    if (dryRun) {
      result.published.push({ id, name: pack.name });
      remaining[id] = entry;
      continue;
    }

    const { error } = await db().from("packs").update({ is_published: true }).eq("id", id).eq("is_published", false);
    if (error) {
      remaining[id] = entry; // try again next run
      result.skipped.push({ id, reason: error.message });
      continue;
    }
    result.published.push({ id, name: pack.name });

    // Same bell notification the admin panel posts when a pack goes live
    const { data: existing } = await db().from("notifications").select("id").eq("pack_id", id).eq("type", "new_pack").limit(1);
    if (!existing?.length) {
      const { data: admin } = await db().from("profiles").select("id").eq("is_admin", true).order("created_at").limit(1);
      await db().from("notifications").insert({
        title: `New pack: ${pack.name}`,
        message: `Check out our latest release: ${pack.name}`,
        type: "new_pack",
        pack_id: id,
        created_by: admin?.[0]?.id ?? null,
      });
    }
    if (pack.slug) revalidatePath(`/packs/${pack.slug}`);
  }

  if (!dryRun && Object.keys(remaining).length !== Object.keys(schedule).length) {
    await writeSchedule(remaining);
  }
  if (result.published.length && !dryRun) {
    revalidateTag("packs");
    revalidatePath("/");
    revalidatePath("/feed");
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
