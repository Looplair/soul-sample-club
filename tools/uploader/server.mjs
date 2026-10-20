// SSC Pack Uploader: a local app (http://localhost:4747) that turns a Dropbox
// release folder into a draft pack on soulsampleclub.com, and schedules when
// it goes live. Start it with the "SSC Uploader" app or `node tools/uploader/server.mjs`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { exec } from "node:child_process";
import { listReleases, inspectRelease } from "./lib/scan.mjs";
import { prepareRelease } from "./lib/prepare.mjs";
import { uploadRelease, supabase } from "./lib/upload.mjs";
import { setSchedule, runPublisher, siteStatus } from "./lib/schedule.mjs";
import { DROPBOX, MONTHS_DIR, PORT, REPO, SITE } from "./lib/config.mjs";

const HERE = join(REPO, "tools/uploader");
let busy = null; // one job at a time

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const readBody = async (req) => {
  let s = "";
  for await (const c of req) s += c;
  return s ? JSON.parse(s) : {};
};
const inDropbox = (p) => resolve(p).startsWith(DROPBOX + "/");

/** The admin picker's preset tags (read from the site's code) plus any used on packs */
async function tagOptions() {
  const src = await readFile(join(REPO, "src/lib/pack-tags.ts"), "utf8");
  const list = (name) => [...(src.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`)) || [, ""])[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const { data } = await supabase.from("packs").select("genres, styles");
  const merge = (presets, used) => {
    const seen = new Set(presets.map((t) => t.toLowerCase()));
    const extra = [...new Set(used)].filter((t) => t && !seen.has(t.toLowerCase())).sort();
    return [...presets, ...extra];
  };
  return {
    genres: merge(list("GENRE_PRESETS"), (data || []).flatMap((p) => p.genres || [])),
    styles: merge(list("STYLE_PRESETS"), (data || []).flatMap((p) => p.styles || [])),
  };
}

/** The coming Friday (today if it's Friday), as YYYY-MM-DD */
function nextFriday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  if (p === "/" || p === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(await readFile(join(HERE, "index.html")));
  }

  if (p === "/api/releases") {
    const releases = await listReleases();
    const status = await siteStatus([...new Set(releases.map((r) => r.name))]);
    return json(res, 200, { releases: releases.map((r) => ({ ...r, site: status[r.name.toLowerCase()] || null })), busy: !!busy });
  }

  if (p === "/api/release") {
    const dir = url.searchParams.get("dir");
    if (!dir || !inDropbox(dir) || !existsSync(dir)) return json(res, 400, { error: "Unknown release folder" });
    const release = await inspectRelease(dir);
    const [status, tags] = await Promise.all([siteStatus([release.name]), tagOptions()]);
    let pack = null;
    const site = status[release.name.toLowerCase()] || null;
    if (site) {
      const { data } = await supabase.from("packs").select("description, genres, styles, release_date").eq("id", site.id).single();
      pack = data;
    }
    return json(res, 200, { release, site, pack, tags, defaults: { releaseDate: nextFriday() } });
  }

  if (p === "/api/file") {
    const path = url.searchParams.get("path");
    if (!path || !inDropbox(path) || !existsSync(path)) return json(res, 404, { error: "Not found" });
    const type = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[extname(path).toLowerCase()];
    if (!type) return json(res, 403, { error: "Not an image" });
    res.writeHead(200, { "content-type": type, "cache-control": "max-age=60" });
    return createReadStream(path).pipe(res);
  }

  // The one button: check, make MP3s + zips, upload as a draft, and schedule
  if (p === "/api/go" && req.method === "POST") {
    const body = await readBody(req);
    if (busy) return json(res, 409, { error: `Already working on ${busy}` });
    if (!body.dir || !inDropbox(body.dir)) return json(res, 400, { error: "Unknown release folder" });
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
    const d = body.details || {};
    busy = d.name || "a pack";
    try {
      const release = await inspectRelease(body.dir);
      if (release.blockers.length) throw new Error(release.blockers.join(" "));
      if (!d.name?.trim()) throw new Error("The pack needs a name.");
      if (!d.description?.trim()) throw new Error("Add a short description first.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.releaseDate || "")) throw new Error("Pick a release date.");
      if (Array.isArray(body.order)) {
        const rank = new Map(body.order.map((n, i) => [n, i]));
        release.tracks.sort((a, b) => (rank.get(a.name) ?? 99) - (rank.get(b.name) ?? 99));
      }
      send({ phase: "Making MP3s and zips" });
      const files = await prepareRelease(release, send);
      send({ phase: "Uploading to the site (as a hidden draft)" });
      const { packId, slug } = await uploadRelease(
        release,
        files,
        { name: d.name.trim(), description: d.description.trim(), genres: d.genres, styles: d.styles, releaseDate: d.releaseDate },
        send
      );
      let schedule = null;
      if (body.publishAt) {
        send({ phase: "Scheduling" });
        schedule = await setSchedule(packId, body.publishAt);
        if (new Date(body.publishAt).getTime() <= Date.now()) await runPublisher();
      }
      send({ done: true, packId, slug, schedule, admin: `${SITE}/admin/packs/${packId}`, page: `${SITE}/packs/${slug}` });
    } catch (e) {
      send({ error: e.message || String(e) });
    } finally {
      busy = null;
      res.end();
    }
    return;
  }

  // Change or clear the go-live time, or go live now
  if (p === "/api/schedule" && req.method === "POST") {
    const { packId, publishAt, now } = await readBody(req);
    if (!packId) return json(res, 400, { error: "No pack" });
    try {
      const when = now ? new Date().toISOString() : publishAt || null;
      const entry = await setSchedule(packId, when);
      let published = null;
      if (when && new Date(when).getTime() <= Date.now()) published = await runPublisher();
      return json(res, 200, { ok: true, entry, published });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  json(res, 404, { error: "Not found" });
}

createServer((req, res) =>
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: e.message });
    else res.end();
  })
).listen(PORT, "127.0.0.1", () => {
  console.log(`SSC Pack Uploader running at http://localhost:${PORT}`);
  console.log(`Reading releases from ${MONTHS_DIR}`);
  if (process.argv.includes("--open")) exec(`open http://localhost:${PORT}`);
});
