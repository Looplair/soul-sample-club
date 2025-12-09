import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PackForm } from "@/components/admin/PackForm";
import { SampleManager } from "@/components/admin/SampleManager";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pack } = await supabase
    .from("packs")
    .select("name")
    .eq("id", id)
    .single();

  if (!pack) {
    return { title: "Pack Not Found | Soul Sample Club Admin" };
  }

  return {
    title: `Edit ${pack.name} | Soul Sample Club Admin`,
  };
}

async function getPack(id: string) {
  const supabase = await createClient();

  const { data: pack, error } = await supabase
    .from("packs")
    .select(
      `
      *,
      samples(*)
    `
    )
    .eq("id", id)
    .single();

  if (error || !pack) return null;

  pack.samples = pack.samples.sort((a: any, b: any) => a.order_index - b.order_index);

  return pack;
}

export default async function EditPackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPack(id);

  if (!pack) {
    notFound();
  }

  return (
    <div className="space-y-48">
      <div>
        <h1 className="text-h1 text-snow mb-8">Edit Pack</h1>
        <p className="text-body-lg text-snow/60">
          Update pack details and manage samples
        </p>
      </div>

      <div className="max-w-4xl">
        <PackForm pack={pack} />
      </div>

      <div>
        <h2 className="text-h2 text-snow mb-24">Samples</h2>
        <SampleManager packId={pack.id} initialSamples={pack.samples} />
      </div>
    </div>
  );
}
