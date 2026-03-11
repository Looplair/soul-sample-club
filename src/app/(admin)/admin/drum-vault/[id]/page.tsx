import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditDrumBreakClient } from "./EditDrumBreakClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DrumBreakData {
  id: string;
  name: string;
  bpm: number | null;
  file_path: string | null;
  preview_path: string | null;
  is_exclusive: boolean;
  is_published: boolean;
  created_at: string;
}

async function getDrumBreak(id: string): Promise<DrumBreakData | null> {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from("drum_breaks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as DrumBreakData;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drumBreak = await getDrumBreak(id);

  if (!drumBreak) {
    return { title: "Drum Break Not Found | Soul Sample Club Admin" };
  }

  return {
    title: `Edit ${drumBreak.name} | Soul Sample Club Admin`,
  };
}

export default async function EditDrumBreakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drumBreak = await getDrumBreak(id);

  if (!drumBreak) {
    notFound();
  }

  return (
    <div className="space-y-48">
      <div>
        <h1 className="text-h1 text-snow mb-8">Edit Drum Break</h1>
        <p className="text-body-lg text-snow/60">
          Update drum break details and manage audio files
        </p>
      </div>

      <div className="max-w-4xl">
        <EditDrumBreakClient drumBreak={drumBreak} />
      </div>
    </div>
  );
}
