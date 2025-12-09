import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PackForm } from "@/components/admin/PackForm";
import { SampleManager } from "@/components/admin/SampleManager";

// --------------------
// FIXED METADATA FUNCTION
// --------------------
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: pack } = await supabase
    .from("packs")
    .select("name")
    .eq("id", params.id)
    .single();

  if (!pack) {
    return {
      title: "Pack Not Found | Soul Sample Club Admin",
    };
  }

  return {
    title: `Edit ${pack.name} | Soul Sample Club Admin`,
  };
}

// --------------------
// FETCH PACK
// --------------------
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

  // Ensure samples exist before sorting
  if (Array.isArray(pack.samples)) {
    pack.samples = pack.samples.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );
  } else {
    pack.samples = [];
  }

  return pack;
}

// --------------------
// PAGE COMPONENT
// --------------------
export default async function EditPackPage({
  params,
}: {
  params: { id: string };
}) {
  const pack = await getPack(params.id);

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
