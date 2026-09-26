// Pack pages live at /packs/<slug> (e.g. /packs/linkz). Old /packs/<uuid>
// links still work: the pack page redirects them to the slug.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPackUuid(value: string): boolean {
  return UUID.test(value);
}

/** Link to a pack page; falls back to the id if a pack has no slug yet */
export function packPath(pack: { id: string; slug?: string | null }): string {
  return `/packs/${pack.slug || pack.id}`;
}

/** "Back Porch Soul '82" -> "back-porch-soul-82". Set once, never changed on rename. */
export function slugifyPackName(name: string): string {
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
