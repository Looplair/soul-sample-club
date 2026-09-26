// Storage paths must never reach the browser: anyone holding one could fetch
// the file. Pages only ever need to know a file exists (e.g. `!!s.stems_path`
// to show the stems button), so each path is swapped for a marker. Downloads
// look the real path up server-side by ID.

const PATH_KEYS = new Set(["file_path", "preview_path", "stems_path", "pack_zip_path"]);
const MARKER = "stored";

/** Returns a copy with every storage path replaced by a marker, including nested rows and arrays */
export function hidePaths<T>(value: T): T {
  if (Array.isArray(value)) return value.map(hidePaths) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = PATH_KEYS.has(key) ? (v ? MARKER : v) : hidePaths(v);
    }
    return out as T;
  }
  return value;
}
