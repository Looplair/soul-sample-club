import { createClient } from "@/lib/supabase/server";
import { PackForm } from "@/components/admin/PackForm";

export const metadata = {
  title: "Create New Pack | Soul Sample Club Admin",
};

export default async function NewPackPage() {
  // no pack data yet — creating fresh
  const emptyPack = {
    id: null,
    name: "",
    description: "",
    cover_image: "",
    samples: [],
  };

  return (
    <div className="space-y-48">
      <div>
        <h1 className="text-h1 text-snow mb-8">Create Pack</h1>
        <p className="text-body-lg text-snow/60">
          Add a new pack and upload its samples
        </p>
      </div>

      <div className="max-w-4xl">
        <PackForm pack={emptyPack} />
      </div>
    </div>
  );
}
