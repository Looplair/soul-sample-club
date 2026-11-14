// The go-live schedule, shared with the site (src/lib/pack-schedule.ts):
// a { packId: { publishAt, setAt } } JSON file in the private samples bucket.
import { supabase } from "./upload.mjs";
import { SCHEDULE_BUCKET, SCHEDULE_PATH, SITE } from "./config.mjs";

export async function readSchedule() {
  // Fresh one-off signed link: a plain download can return a stale CDN copy
  const { data: signed } = await supabase.storage.from(SCHEDULE_BUCKET).createSignedUrl(SCHEDULE_PATH, 60);
  if (!signed?.signedUrl) return {};
  const res = await fetch(`${signed.signedUrl}&fresh=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return {};
  try {
    return JSON.parse(await res.text());
  } catch {
    return {};
  }
}

async function writeSchedule(schedule) {
  // The samples bucket only accepts audio/zip/octet-stream, so JSON goes up as octet-stream
  const body = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/octet-stream" });
  const { error } = await supabase.storage.from(SCHEDULE_BUCKET).upload(SCHEDULE_PATH, body, { upsert: true, contentType: "application/octet-stream", cacheControl: "0" });
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

// Bonus folder names drift from the site's names ("Back Porch Soul 82" vs "Back Porch Soul '82",
// "... Vol.1" vs no volume), so bonus packs also match on a loose key
const loose = (s) => s.toLowerCase().replace(/&/g, "and").replace(/\bvol(ume)?\b/g, "").replace(/[^a-z0-9]/g, "");

/** Site status for each pack name: draft / live / scheduled, with ids */
export async function siteStatus(names, { bonus = false } = {}) {
  if (!names.length) return {};
  const query = supabase.from("packs").select("id, name, slug, is_published, release_date, samples(count)");
  const [{ data }, schedule] = await Promise.all([bonus ? query.eq("is_bonus", true) : query.in("name", names), readSchedule()]);
  const packs = data || [];
  const out = {};
  for (const name of names) {
    const key = loose(name);
    const p =
      packs.find((x) => x.name.toLowerCase() === name.toLowerCase()) ||
      (bonus && key.length >= 6 ? packs.find((x) => { const k = loose(x.name); return k.length >= 6 && (k.startsWith(key) || key.startsWith(k)); }) : null);
    if (!p) continue;
    out[name.toLowerCase()] = {
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
