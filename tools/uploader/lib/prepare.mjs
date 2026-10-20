// Builds the "STEM ZIPS + MP3/<PACK>" folder the way it's done by hand:
// a 160kbps MP3 of every WAV, a zip per track's stem folder, and a zip of the
// whole release folder. Anything already made (and newer than its source) is
// skipped, so re-running only redoes what changed.
import { spawn } from "node:child_process";
import { mkdir, rename, rm, stat, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { FFMPEG, ZIP } from "./config.mjs";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${basename(cmd)} failed: ${err.trim().slice(-400)}`))));
  });
}

async function newestMtime(path) {
  const s = await stat(path);
  if (!s.isDirectory()) return s.mtimeMs;
  let newest = s.mtimeMs;
  for (const e of await readdir(path)) {
    if (e.startsWith(".")) continue;
    newest = Math.max(newest, await newestMtime(join(path, e)));
  }
  return newest;
}

/** True when `out` exists, isn't empty and is newer than everything in `src` */
async function upToDate(out, src) {
  try {
    const o = await stat(out);
    return o.size > 0 && o.mtimeMs >= (await newestMtime(src));
  } catch {
    return false;
  }
}

/** Writes to a temp name first so a crash never leaves a half-made file */
async function make(out, build) {
  const tmp = `${out}.part`;
  await rm(tmp, { force: true });
  await build(tmp);
  await rename(tmp, out);
}

const zipArgs = (out, folder) => ["-r", "-X", "-q", out, folder, "-x", "*.DS_Store", "*/._*", "__MACOSX/*"];

export async function prepareRelease(release, log) {
  const { outDir, tracks, dir, monthDir, folder } = release;
  await mkdir(outDir, { recursive: true });
  const files = { mp3: {}, stems: {}, packZip: join(outDir, `${folder}.zip`) };

  for (const t of tracks) {
    const mp3 = join(outDir, `${t.file.replace(/\.wav$/i, "")}.mp3`);
    files.mp3[t.name] = mp3;
    if (await upToDate(mp3, t.wavPath)) {
      log({ step: `mp3:${t.name}`, label: `MP3: ${t.name}`, status: "skip", note: "already made" });
      continue;
    }
    log({ step: `mp3:${t.name}`, label: `MP3: ${t.name}`, status: "run" });
    await make(mp3, (tmp) => run(FFMPEG, ["-y", "-loglevel", "error", "-i", t.wavPath, "-codec:a", "libmp3lame", "-b:a", "160k", "-f", "mp3", tmp]));
    log({ step: `mp3:${t.name}`, status: "done" });
  }

  for (const t of tracks) {
    if (!t.stemFolder) continue;
    const zip = join(outDir, `${t.stemFolder}.zip`);
    files.stems[t.name] = zip;
    const src = join(dir, "STEMS", t.stemFolder);
    if (await upToDate(zip, src)) {
      log({ step: `stems:${t.name}`, label: `Stems zip: ${t.name}`, status: "skip", note: "already made" });
      continue;
    }
    log({ step: `stems:${t.name}`, label: `Stems zip: ${t.name}`, status: "run" });
    // zip appends ".zip" to names without it, so build as "<name>.part.zip" and rename
    await make(zip, async (tmp) => {
      const tmpZip = `${tmp}.zip`;
      await rm(tmpZip, { force: true });
      await run(ZIP, zipArgs(tmpZip, t.stemFolder), { cwd: join(dir, "STEMS") });
      await rename(tmpZip, tmp);
    });
    log({ step: `stems:${t.name}`, status: "done" });
  }

  if (await upToDate(files.packZip, dir)) {
    log({ step: "packzip", label: "Full pack zip", status: "skip", note: "already made" });
  } else {
    log({ step: "packzip", label: "Full pack zip", status: "run" });
    await make(files.packZip, async (tmp) => {
      const tmpZip = `${tmp}.zip`;
      await rm(tmpZip, { force: true });
      await run(ZIP, zipArgs(tmpZip, folder), { cwd: monthDir });
      await rename(tmpZip, tmp);
    });
    log({ step: "packzip", status: "done" });
  }
  return files;
}
