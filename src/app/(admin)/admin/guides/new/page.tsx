import { GuideEditor } from "@/components/admin/GuideEditor";
import { getAllGuides } from "@/lib/guides";
import { getGuidePacks } from "@/lib/guide-packs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Guide | Soul Sample Club Admin",
};

export default async function NewGuidePage() {
  const [packs, guides] = await Promise.all([getGuidePacks(), getAllGuides()]);
  return <GuideEditor packs={packs} otherGuides={guides.map((g) => ({ slug: g.slug, title: g.title }))} />;
}
