// Guide types and helpers that are safe on both server and client
// (the admin editor's live preview uses these too).

export const GUIDE_CLUSTERS = ["Sample clearance", "Sampling craft", "Buying samples"] as const;
export type GuideCluster = (typeof GUIDE_CLUSTERS)[number];

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideSource {
  label: string;
  url: string;
}

export interface Guide {
  id: string;
  slug: string;
  cluster: GuideCluster;
  isPillar: boolean;
  published: boolean;
  title: string;
  seoTitle: string | null;
  description: string;
  lead: string;
  body: string;
  keyTakeaways: string[];
  faqs: GuideFaq[];
  sources: GuideSource[];
  related: string[];
  publishedAt: string | null;
  updatedAt: string;
}

export const GUIDE_AUTHOR = {
  name: "Chris",
  role: "Founder of Soul Sample Club",
};

export const PLACEHOLDER_MARKER = "[!CHRIS]";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** H2 headings, used for the contents list */
export function getGuideHeadings(body: string): { id: string; text: string }[] {
  return Array.from(body.matchAll(/^## (.+)$/gm)).map((m) => ({
    id: slugify(m[1]),
    text: m[1].trim(),
  }));
}

/** Pack IDs embedded with [Name](pack:<id>) */
export function getGuidePackIds(body: string): string[] {
  return Array.from(new Set(Array.from(body.matchAll(/\(pack:([0-9a-f-]{36})\)/g)).map((m) => m[1])));
}

export function getReadingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).length / 230));
}

export function countPlaceholders(guide: Pick<Guide, "body">): number {
  return guide.body.split(PLACEHOLDER_MARKER).length - 1;
}

/** House-style checks shown in the editor. Blocking ones stop publishing. */
export function getGuideChecks(guide: Pick<Guide, "title" | "seoTitle" | "description" | "lead" | "body" | "keyTakeaways" | "faqs">) {
  const checks: { level: "block" | "warn"; message: string }[] = [];
  const allText = [guide.title, guide.seoTitle ?? "", guide.description, guide.lead, guide.body, ...guide.keyTakeaways, ...guide.faqs.flatMap((f) => [f.q, f.a])].join("\n");

  const placeholders = countPlaceholders(guide);
  if (placeholders > 0) {
    checks.push({ level: "block", message: `${placeholders} "Chris to write" box${placeholders === 1 ? "" : "es"} still to fill in` });
  }
  if (!guide.title.trim()) checks.push({ level: "block", message: "Title is empty" });
  if (!guide.description.trim()) checks.push({ level: "block", message: "Search description is empty" });

  const dashes = (allText.match(/—/g) || []).length;
  if (dashes > 0) checks.push({ level: "warn", message: `${dashes} em dash${dashes === 1 ? "" : "es"} (house style is none)` });

  const seoLength = (guide.seoTitle || guide.title).length + " | Soul Sample Club".length;
  if (seoLength > 65) checks.push({ level: "warn", message: `Google title is ${seoLength} characters; it may get cut off after ~60` });
  if (guide.description.length > 160) {
    checks.push({ level: "warn", message: `Search description is ${guide.description.length} characters; Google shows ~155` });
  }
  if (getGuideHeadings(guide.body).length < 3) checks.push({ level: "warn", message: "Fewer than 3 section headings (## ...)" });
  return checks;
}
