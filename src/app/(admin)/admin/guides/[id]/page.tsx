import { notFound } from "next/navigation";
import { GuideEditor } from "@/components/admin/GuideEditor";
import { getAllGuides, getGuideById } from "@/lib/guides";
import { getGuidePacks } from "@/lib/guide-packs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const guide = await getGuideById(params.id);
  return { title: guide ? `Edit: ${guide.title} | Admin` : "Edit Guide | Admin" };
}

export default async function EditGuidePage({ params }: { params: { id: string } }) {
  const [guide, packs, guides] = await Promise.all([getGuideById(params.id), getGuidePacks(), getAllGuides()]);
  if (!guide) notFound();
  return (
    <GuideEditor
      guide={guide}
      packs={packs}
      otherGuides={guides.filter((g) => g.id !== guide.id).map((g) => ({ slug: g.slug, title: g.title }))}
    />
  );
}
