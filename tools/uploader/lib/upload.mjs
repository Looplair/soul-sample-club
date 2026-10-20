// Puts a prepared release on the site as an unpublished draft, writing exactly
// what the admin panel writes (same buckets, path patterns and columns; see
// PackForm.tsx and SampleManager.tsx), plus the bits done by hand there:
// track names without "(BPM, Key)", BPM, key, track order and waveforms.
// Progress is saved to .ssc-upload.json in the output folder after every file,
// so a re-run carries on where it stopped instead of uploading twice.
import { createClient } from "@supabase/supabase-js";
import { open, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";
import { analyzeWav } from "./wav.mjs";
import { SUPABASE_URL, SERVICE_KEY } from "./config.mjs";

export const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const rand = () => Math.random().toString(36).substr(2, 9);
const CHUNK = 6 * 1024 * 1024; // Supabase's resumable uploads need exactly 6 MB chunks

/** Same as slugifyPackName in src/lib/pack-url.ts */
export function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(name) {
  const base = slugify(name) || "pack";
  const { data } = await supabase.from("packs").select("slug").like("slug", `${base}%`);
  const taken = new Set((data || []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Resumable (TUS) upload with progress, so big zips survive a shaky connection */
async function uploadFile(bucket, objectName, filePath, contentType, onProgress) {
  const { size } = await stat(filePath);
  const b64 = (s) => Buffer.from(s).toString("base64");
  const auth = { authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "tus-resumable": "1.0.0" };

  for (let attempt = 1; ; attempt++) {
    try {
      const create = await fetch(`${SUPABASE_URL}/storage/v1/upload/resumable`, {
        method: "POST",
        headers: {
          ...auth,
          "upload-length": String(size),
          "x-upsert": "false",
          "upload-metadata": [
            `bucketName ${b64(bucket)}`,
            `objectName ${b64(objectName)}`,
            `contentType ${b64(contentType)}`,
            `cacheControl ${b64("3600")}`,
          ].join(","),
        },
      });
      if (create.status !== 201) throw new Error(`upload refused (${create.status}): ${(await create.text()).slice(0, 200)}`);
      const location = create.headers.get("location");

      const fh = await open(filePath, "r");
      try {
        let offset = 0;
        const buf = Buffer.alloc(CHUNK);
        while (offset < size) {
          const { bytesRead } = await fh.read(buf, 0, Math.min(CHUNK, size - offset), offset);
          let ok = false;
          for (let tries = 1; !ok; tries++) {
            const res = await fetch(location, {
              method: "PATCH",
              headers: { ...auth, "upload-offset": String(offset), "content-type": "application/offset+octet-stream" },
              body: buf.subarray(0, bytesRead),
            });
            if (res.status === 204) ok = true;
            else if (tries >= 4) throw new Error(`chunk failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
            else await new Promise((r) => setTimeout(r, 1500 * tries));
          }
          offset += bytesRead;
          onProgress?.(offset / size);
        }
      } finally {
        await fh.close();
      }
      return objectName;
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

async function loadState(release) {
  const path = join(release.outDir, ".ssc-upload.json");
  const state = existsSync(path) ? JSON.parse(await readFile(path, "utf8")) : { samples: {} };
  const save = () => writeFile(path, JSON.stringify(state, null, 2));
  return { state, save };
}

/** A cover under the covers bucket's 5 MB limit (the original isn't changed) */
async function coverFile(release) {
  const { path, size } = release.cover;
  if (size <= 5 * 1024 * 1024) return { path, ext: extname(path).slice(1).toLowerCase(), type: `image/${extname(path).slice(1).toLowerCase().replace("jpg", "jpeg")}` };
  const out = join(release.outDir, ".cover-for-site.jpg");
  await sharp(path).resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(out);
  return { path: out, ext: "jpg", type: "image/jpeg" };
}

/**
 * release: from inspectRelease (tracks in the order they should appear)
 * files: from prepareRelease
 * details: { name, description, genres, styles, releaseDate }
 */
export async function uploadRelease(release, files, details, log) {
  const { state, save } = await loadState(release);

  // 1. The pack row, unpublished
  const packFields = {
    name: details.name,
    description: details.description,
    release_date: details.releaseDate,
    genres: details.genres || [],
    styles: details.styles || [],
  };
  if (state.packId) {
    const { data } = await supabase.from("packs").select("id").eq("id", state.packId).maybeSingle();
    if (!data) state.packId = null; // deleted on the site since; start again
    else await supabase.from("packs").update(packFields).eq("id", state.packId);
  }
  if (!state.packId) {
    const { data: clash } = await supabase.from("packs").select("id, is_published").ilike("name", details.name).limit(1);
    if (clash?.length) throw new Error(`A pack called "${details.name}" is already on the site. Rename it here, or delete the old one in the admin panel first.`);
    log({ step: "pack", label: "Create draft pack", status: "run" });
    const slug = await uniqueSlug(details.name);
    const { data, error } = await supabase
      .from("packs")
      .insert({ ...packFields, slug, end_date: null, is_published: false, is_bonus: false, is_returned: false })
      .select("id, slug")
      .single();
    if (error) throw new Error(`Couldn't create the pack: ${error.message}`);
    Object.assign(state, { packId: data.id, slug: data.slug, samples: {} });
    await save();
    log({ step: "pack", status: "done", note: `/packs/${data.slug}` });
  } else {
    log({ step: "pack", label: "Draft pack", status: "skip", note: "already created, details updated" });
  }
  const packId = state.packId;

  // 2. Cover
  if (!state.cover) {
    log({ step: "cover", label: "Cover", status: "run" });
    const c = await coverFile(release);
    const path = `pack-covers/${Date.now()}-${rand()}.${c.ext}`;
    await uploadFile("covers", path, c.path, c.type, (p) => log({ step: "cover", progress: p }));
    const url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
    await supabase.from("packs").update({ cover_image_url: url }).eq("id", packId);
    state.cover = url;
    await save();
    log({ step: "cover", status: "done" });
  } else log({ step: "cover", label: "Cover", status: "skip", note: "already uploaded" });

  // 3. Tracks: WAV + row, then MP3 preview, then stems
  for (const [index, t] of release.tracks.entries()) {
    const s = (state.samples[t.name] ||= {});
    if (!s.id) {
      log({ step: `wav:${t.name}`, label: `WAV: ${t.name}`, status: "run" });
      const { duration, peaks } = await analyzeWav(t.wavPath);
      const path = `${packId}/${Date.now()}-${rand()}.wav`;
      await uploadFile("samples", path, t.wavPath, "audio/wav", (p) => log({ step: `wav:${t.name}`, progress: p }));
      const { data, error } = await supabase
        .from("samples")
        .insert({
          pack_id: packId,
          name: t.name,
          bpm: t.bpm,
          key: t.key,
          file_path: path,
          preview_path: null,
          file_size: t.size,
          duration,
          order_index: index,
          waveform_peaks: peaks,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Couldn't add ${t.name}: ${error.message}`);
      s.id = data.id;
      await save();
      log({ step: `wav:${t.name}`, status: "done" });
    } else {
      await supabase.from("samples").update({ name: t.name, bpm: t.bpm, key: t.key, order_index: index }).eq("id", s.id);
      log({ step: `wav:${t.name}`, label: `WAV: ${t.name}`, status: "skip", note: "already uploaded" });
    }

    if (!s.mp3) {
      log({ step: `mp3up:${t.name}`, label: `MP3 preview: ${t.name}`, status: "run" });
      const path = `${packId}/${Date.now()}-preview.mp3`;
      await uploadFile("samples", path, files.mp3[t.name], "audio/mpeg", (p) => log({ step: `mp3up:${t.name}`, progress: p }));
      await supabase.from("samples").update({ preview_path: path }).eq("id", s.id);
      s.mp3 = path;
      await save();
      log({ step: `mp3up:${t.name}`, status: "done" });
    } else log({ step: `mp3up:${t.name}`, label: `MP3 preview: ${t.name}`, status: "skip", note: "already uploaded" });

    if (files.stems[t.name] && !s.stems) {
      log({ step: `stemsup:${t.name}`, label: `Stems: ${t.name}`, status: "run" });
      const path = `${packId}/${Date.now()}-stems.zip`;
      await uploadFile("samples", path, files.stems[t.name], "application/zip", (p) => log({ step: `stemsup:${t.name}`, progress: p }));
      await supabase.from("samples").update({ stems_path: path }).eq("id", s.id);
      s.stems = path;
      await save();
      log({ step: `stemsup:${t.name}`, status: "done" });
    } else if (s.stems) log({ step: `stemsup:${t.name}`, label: `Stems: ${t.name}`, status: "skip", note: "already uploaded" });
  }

  // 4. Full pack zip
  if (!state.packZip) {
    log({ step: "packzipup", label: "Full pack zip", status: "run" });
    const path = `pack-zips/${packId}/${Date.now()}-full-pack.zip`;
    await uploadFile("samples", path, files.packZip, "application/zip", (p) => log({ step: "packzipup", progress: p }));
    await supabase.from("packs").update({ pack_zip_path: path }).eq("id", packId);
    state.packZip = path;
    await save();
    log({ step: "packzipup", status: "done" });
  } else log({ step: "packzipup", label: "Full pack zip", status: "skip", note: "already uploaded" });

  return { packId, slug: state.slug };
}
