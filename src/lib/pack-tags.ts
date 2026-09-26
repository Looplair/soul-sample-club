// Tags for packs. Presets are what the admin picker always offers; any custom
// tag added to a pack also becomes available for future packs.

export const GENRE_PRESETS = [
  "Vintage Soul",
  "Psychedelic",
  "Gospel",
  "Jazz",
  "Funk",
  "R&B",
  "Lo-Fi",
  "Neo-Soul",
  "Japanese",
];

export const STYLE_PRESETS = [
  "Gritty",
  "Dark",
  "Cinematic",
  "Heavy",
  "Sparse",
  "Majestic",
  "Smoky",
  "Lush",
  "Raw",
  "Haunting",
  "Hard",
];

/** Presets first, then custom tags already used on other packs */
export function mergeTagOptions(presets: string[], used: string[]): string[] {
  const seen = new Set(presets.map((t) => t.toLowerCase()));
  const extras = used.filter((t) => !seen.has(t.toLowerCase()) && (seen.add(t.toLowerCase()), true));
  return [...presets, ...extras.sort((a, b) => a.localeCompare(b))];
}
