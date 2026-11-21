// Shared by the site popup and the admin preview (no server imports here).

export interface PopupContent {
  id: string;
  title: string;
  line: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string | null;
}

interface PopupSource {
  id: string;
  title: string;
  slug: string;
  body: string;
  popup_button_text?: string | null;
  popup_button_url?: string | null;
  popup_image_url?: string | null;
}

const LINE_MAX = 110;

/** One short line from the announcement body: its first paragraph, markdown removed, cut at a word. */
export function popupLine(body: string): string {
  const first = (body || "").trim().split(/\n\s*\n/)[0] ?? "";
  const plain = first
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/[*_`#>~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= LINE_MAX) return plain;
  const cut = plain.slice(0, LINE_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : LINE_MAX).replace(/[,.;:\s-]+$/, "")}…`;
}

export function popupContent(a: PopupSource): PopupContent {
  return {
    id: a.id,
    title: a.title,
    line: popupLine(a.body),
    buttonText: a.popup_button_text?.trim() || "Read more",
    buttonUrl: a.popup_button_url?.trim() || `/announcements/${a.slug}`,
    imageUrl: a.popup_image_url?.trim() || null,
  };
}

/** Pages the popup never shows on: checkout, billing, account settings, admin. */
export function popupHiddenOn(pathname: string): boolean {
  return /^\/(checkout|billing|account|switch-yearly|subscribe|admin)(\/|$)/.test(pathname);
}

// ---- New York time for the admin date fields ----

const NY = "America/New_York";

function nyParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" as a New York wall clock (for datetime-local inputs). */
export function isoToNyInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = nyParts(date);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/** "YYYY-MM-DDTHH:mm" read as New York time -> ISO timestamp; null when empty or incomplete. */
export function nyInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // New York's offset at that moment, found by reading the guess back (run twice for DST edges)
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = nyParts(new Date(guess));
    const shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
    guess += wall - shown;
  }
  return new Date(guess).toISOString();
}
