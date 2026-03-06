import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Plus, Edit, Megaphone } from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcements | Soul Sample Club Admin",
};

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-sm text-text-muted mt-1">
            Members-only posts for drops, news, and updates.
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone className="w-10 h-10 text-text-subtle mx-auto mb-3" />
              <p className="text-text-muted">No announcements yet.</p>
              <Link href="/admin/announcements/new" className="text-velvet text-sm mt-2 inline-block hover:underline">
                Create your first one
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-grey-700">
                  <th className="text-left text-label text-text-muted px-6 py-3">Title</th>
                  <th className="text-left text-label text-text-muted px-6 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left text-label text-text-muted px-6 py-3">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id} className="border-b border-grey-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-body text-white font-medium">{a.title}</td>
                    <td className="px-6 py-4 text-body text-text-muted hidden sm:table-cell">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {a.is_published ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="default">Draft</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/announcements/${a.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
