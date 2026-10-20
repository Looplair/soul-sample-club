// The go-live schedule, shared with the site (src/lib/pack-schedule.ts):
// a { packId: { publishAt, setAt } } JSON file in the private samples bucket.
import { supabase } from "./upload.mjs";
import { SCHEDULE_BUCKET, SCHEDULE_PATH, SITE } from "./config.mjs";

export async function readSchedule() {
  const { data, error } = await supabase.storage.from(SCHEDULE_BUCKET).download(SCHEDULE_PATH);
  if (error || !data) return {};
  try {
    return JSON.parse(await data.text());
  } catch {
    return {};
  }
}

async function writeSchedule(schedule) {
  const body = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage.from(SCHEDULE_BUCKET).upload(SCHEDULE_PATH, body, { upsert: true, contentType: "application/json" });
  if (error) throw new Error(`Couldn't save the schedule: ${error.message}`);
}

/** publishAt: ISO string in UTC, or null to take it off the schedule */
export async function setSchedule(packId, publishAt) {
  const schedule = await readSchedule();
  if (publishAt) schedule[packId] = { publishAt: new Date(publishAt).toISOString(), setAt: new Date().toISOString() };
  else delete schedule[packId];
  await writeSchedule(schedule);
  return schedule[packId] || null;
}

/** Asks the site to publish anything that's due right now */
export async function runPublisher() {
  const res = await fetch(`${SITE}/api/cron/publish-scheduled-packs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`The site's publisher answered ${res.status}`);
  return res.json();
}

/** Site status for each pack name: draft / live / scheduled, with ids */
export async function siteStatus(names) {
  if (!names.length) return {};
  const [{ data }, schedule] = await Promise.all([
    supabase.from("packs").select("id, name, slug, is_published, release_date, samples(count)").in("name", names),
    readSchedule(),
  ]);
  const out = {};
  for (const p of data || []) {
    out[p.name.toLowerCase()] = {
      id: p.id,
      slug: p.slug,
      live: p.is_published,
      releaseDate: p.release_date,
      tracks: p.samples?.[0]?.count ?? 0,
      publishAt: schedule[p.id]?.publishAt || null,
    };
  }
  return out;
}
