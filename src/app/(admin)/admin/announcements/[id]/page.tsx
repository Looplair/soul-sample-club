import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import type { Announcement } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("title")
    .eq("id", params.id)
    .single();

  return {
    title: data ? `Edit: ${data.title} | Admin` : "Edit Announcement | Admin",
  };
}

export default async function EditAnnouncementPage({ params }: { params: { id: string } }) {
  const adminSupabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();

  const announcement = data as Announcement;

  return (
    <div className="max-w-4xl">
      <div className="mb-24">
        <h1 className="text-h1 text-snow mb-8">Edit Announcement</h1>
        <p className="text-body-lg text-snow/60">{announcement.title}</p>
      </div>
      <AnnouncementForm announcement={announcement} />
    </div>
  );
}
