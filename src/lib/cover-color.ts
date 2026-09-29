import sharp from "sharp";
import { unstable_cache } from "next/cache";

// Cover-lit design: each pack's glass box glows in a colour taken from its own
// cover. Picked server-side once per cover URL and cached, so pages never
// compute it in the browser. Returned as "r, g, b" for rgba(var(--glow), a).

const FALLBACK = "196, 160, 120"; // warm neutral, for missing or unreadable covers

async function extract(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return FALLBACK;
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(24, 24, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Bucket pixels by hue and keep the bucket with the most colourful weight,
    // ignoring near-black, near-white and grey pixels that would glow muddy.
    const buckets = new Map<number, { r: number; g: number; b: number; w: number }>();
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const light = (max + min) / 510;
      const sat = max === 0 ? 0 : (max - min) / max;
      if (light < 0.12 || light > 0.92 || sat < 0.18) continue;
      let hue = 0;
      if (max !== min) {
        const d = max - min;
        hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        hue = (hue * 60 + 360) % 360;
      }
      const key = Math.floor(hue / 20);
      const weight = sat * (1 - Math.abs(light - 0.5));
      const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
      buckets.set(key, { r: cur.r + r * weight, g: cur.g + g * weight, b: cur.b + b * weight, w: cur.w + weight });
    }
    let best: { r: number; g: number; b: number; w: number } | null = null;
    buckets.forEach((v) => {
      if (!best || v.w > best.w) best = v;
    });
    if (!best) return FALLBACK;
    const { r, g, b, w } = best as { r: number; g: number; b: number; w: number };

    // Lift it so the glow reads on black without going neon
    let [rr, gg, bb] = [r / w, g / w, b / w];
    const peak = Math.max(rr, gg, bb);
    if (peak < 200) {
      const k = 200 / peak;
      [rr, gg, bb] = [rr * k, gg * k, bb * k];
    }
    return [rr, gg, bb].map((v) => Math.min(255, Math.round(v))).join(", ");
  } catch {
    return FALLBACK;
  }
}

/** The glow colour for one cover, as "r, g, b" */
export const getCoverColor = unstable_cache(
  async (url: string | null | undefined) => (url ? extract(url) : FALLBACK),
  ["cover-color-v1"],
  { revalidate: 60 * 60 * 24 * 30 }
);

/** Adds a `glow` to each pack, from its cover */
export async function withCoverColors<T extends { cover_image_url: string | null }>(packs: T[]): Promise<(T & { glow: string })[]> {
  return Promise.all(packs.map(async (p) => ({ ...p, glow: await getCoverColor(p.cover_image_url) })));
}
