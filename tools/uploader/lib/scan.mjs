// Finds the releases in Dropbox and checks each one: cover, licence, the WAVs
// in SAMPLES (name, BPM and key read from "NAME (72 BPM, F Minor).wav"), and a
// STEMS folder per track. Everything it notices goes in `warnings`/`blockers`.
import { readdir, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { MONTHS_DIR, OUTPUT_DIR } from "./config.mjs";

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const visible = (n) => !n.startsWith(".") && !n.startsWith("._") && n !== "Icon\r";

async function ls(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((d) => visible(d.name));
  } catch {
    return [];
  }
}

/** "OCTOBER 26" -> sortable number, or null for folders that aren't months */
function monthKey(name) {
  const m = name.match(/^([A-Z]+)\s+(\d{2})$/i);
  if (!m) return null;
  const i = MONTHS.indexOf(m[1].toUpperCase());
  return i < 0 ? null : (2000 + Number(m[2])) * 100 + i;
}

/** "OSMAREN (October 2026 Release 2)" -> "OSMAREN" */
export const packNameFromFolder = (folder) => folder.replace(/\s*\([^)]*\)\s*$/, "").trim();

/** "BOW TO THE KING (72 BPM, F Minor)" -> { name, bpm, key } */
export function parseTrackName(file) {
  const base = basename(file, extname(file)).trim();
  const m = base.match(/^(.*?)\s*\(\s*(\d{2,3})\s*BPM\s*,\s*([^)]+?)\s*\)\s*$/i);
  if (!m) return { name: base, bpm: null, key: null };
  const key = m[3]
    .replace(/\s+/g, " ")
    .replace(/\b(major|minor)\b/gi, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .replace(/^([a-g])/, (c) => c.toUpperCase());
  return { name: m[1].trim(), bpm: Number(m[2]), key };
}

export async function listReleases() {
  const months = (await ls(MONTHS_DIR))
    .filter((d) => d.isDirectory() && monthKey(d.name) !== null)
    .sort((a, b) => {
      // This month first, then the months coming up, then older ones newest first
      const now = new Date();
      const cur = now.getFullYear() * 100 + now.getMonth();
      const ka = monthKey(a.name), kb = monthKey(b.name);
      const fa = ka >= cur, fb = kb >= cur;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? ka - kb : kb - ka;
    });
  const out = [];
  for (const m of months) {
    const releases = (await ls(join(MONTHS_DIR, m.name))).filter((d) => d.isDirectory());
    releases.sort((a, b) => {
      const n = (s) => Number((s.match(/release\s*(\d+)/i) || [])[1] || 0);
      return n(a.name) - n(b.name) || a.name.localeCompare(b.name);
    });
    for (const r of releases) {
      const dir = join(MONTHS_DIR, m.name, r.name);
      const wavs = (await ls(join(dir, "SAMPLES"))).filter((f) => /\.wav$/i.test(f.name));
      out.push({ month: m.name, folder: r.name, name: packNameFromFolder(r.name), dir, trackCount: wavs.length });
    }
  }
  return out;
}

async function folderSize(dir) {
  let total = 0;
  for (const e of await ls(dir)) {
    const p = join(dir, e.name);
    total += e.isDirectory() ? await folderSize(p) : (await stat(p)).size;
  }
  return total;
}

export async function inspectRelease(dir) {
  const folder = basename(dir);
  const name = packNameFromFolder(folder);
  const blockers = [];
  const warnings = [];
  const root = await ls(dir);

  const images = root.filter((f) => f.isFile() && /\.(png|jpe?g|webp)$/i.test(f.name));
  const coverFile = images.find((f) => /cover/i.test(f.name)) || images[0];
  const cover = coverFile ? { path: join(dir, coverFile.name), size: (await stat(join(dir, coverFile.name))).size } : null;
  if (!cover) blockers.push("No cover image in the release folder.");
  else if (cover.size > 5 * 1024 * 1024) warnings.push("Cover is over 5 MB, so it'll be shrunk for the site (your file isn't touched).");

  const licence = root.find((f) => f.isFile() && /(clearance|licen[cs]e)/i.test(f.name));
  if (!licence) warnings.push("No Pre-Clearance Document in the release folder, so the full pack zip won't include it.");

  const sampleDir = join(dir, "SAMPLES");
  const stemsDir = join(dir, "STEMS");
  const wavs = (await ls(sampleDir)).filter((f) => f.isFile() && /\.wav$/i.test(f.name));
  const others = (await ls(sampleDir)).filter((f) => f.isFile() && !/\.wav$/i.test(f.name));
  if (!wavs.length) blockers.push("No WAVs in SAMPLES yet.");
  if (others.length) warnings.push(`SAMPLES also has ${others.map((f) => f.name).join(", ")}, which won't be uploaded.`);

  const stemFolders = (await ls(stemsDir)).filter((d) => d.isDirectory());
  const stemByName = new Map(stemFolders.map((d) => [d.name.trim().toLowerCase(), d.name]));
  const used = new Set();

  const tracks = [];
  for (const f of wavs.sort((a, b) => a.name.localeCompare(b.name))) {
    const parsed = parseTrackName(f.name);
    const wavPath = join(sampleDir, f.name);
    const stemFolder = stemByName.get(parsed.name.toLowerCase()) || null;
    if (stemFolder) used.add(stemFolder);
    const stemFiles = stemFolder ? (await ls(join(stemsDir, stemFolder))).filter((s) => s.isFile() && /\.(wav|aif+)$/i.test(s.name)) : [];
    if (parsed.bpm === null) warnings.push(`"${f.name}" isn't named "NAME (BPM, Key).wav", so BPM and key will be left blank.`);
    if (!stemFolder) warnings.push(`${parsed.name} has no STEMS folder, so it'll go up without stems.`);
    else if (!stemFiles.length) warnings.push(`STEMS/${stemFolder} is empty, so ${parsed.name} will go up without stems.`);
    tracks.push({
      file: f.name,
      wavPath,
      size: (await stat(wavPath)).size,
      ...parsed,
      stemFolder: stemFiles.length ? stemFolder : null,
      stemCount: stemFiles.length,
    });
  }
  for (const d of stemFolders) {
    if (!used.has(d.name)) warnings.push(`STEMS/${d.name} doesn't match any WAV in SAMPLES, so it won't be attached to a track.`);
  }
  const names = tracks.map((t) => t.name.toLowerCase());
  if (new Set(names).size !== names.length) blockers.push("Two WAVs have the same track name.");

  const outDir = join(OUTPUT_DIR, name);
  const statePath = join(outDir, ".ssc-upload.json");
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;

  return {
    folder,
    name,
    dir,
    monthDir: join(dir, ".."),
    outDir,
    cover,
    licence: licence ? licence.name : null,
    tracks,
    blockers,
    warnings,
    totalSize: wavs.length ? await folderSize(dir) : 0,
    state,
  };
}
