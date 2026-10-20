// Where things live, and the Supabase keys (read from the site's .env.local,
// so nothing secret is stored in this folder).
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const DROPBOX = "/Users/looplair/Library/CloudStorage/Dropbox/SOUL SAMPLE CLUB";
export const MONTHS_DIR = join(DROPBOX, "MONTHLY PRODUCER PACK");
export const OUTPUT_DIR = join(DROPBOX, "STEM ZIPS + MP3");
export const SITE = "https://www.soulsampleclub.com";
export const PORT = 4747;

// Absolute paths: the launcher app runs with a bare PATH
export const FFMPEG = ["/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"].find(existsSync) || "ffmpeg";
export const ZIP = "/usr/bin/zip";

// Same as src/lib/pack-schedule.ts
export const SCHEDULE_BUCKET = "samples";
export const SCHEDULE_PATH = "_admin/pack-schedule.json";

function loadEnv() {
  const env = {};
  const file = join(REPO, ".env.local");
  if (!existsSync(file)) throw new Error(`Can't find ${file}`);
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error(".env.local is missing the Supabase URL or service role key");
