import Link from "next/link";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Button,
  Badge,
  Card,
  CardContent,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { DeleteDrumBreakButton } from "@/components/admin/DeleteDrumBreakButton";
import { PublishDrumBreakButton } from "@/components/admin/PublishDrumBreakButton";
import { NotifyVaultButton } from "@/components/admin/NotifyVaultButton";

export const metadata = {
  title: "Drum Vault | Soul Sample Club Admin",
};

interface DrumBreakRow {
  id: string;
  name: string;
  bpm: number | null;
  is_exclusive: boolean;
  is_published: boolean;
  created_at: string;
  collection_count: number;
}

async function getDrumBreaks(): Promise<DrumBreakRow[]> {
  const adminSupabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from("drum_breaks")
    .select("id, name, bpm, is_exclusive, is_published, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching drum breaks:", error);
    return [];
  }

  const breaks = (data ?? []) as DrumBreakRow[];
  const breakIds = breaks.map((b) => b.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: collectionCounts } = await (adminSupabase as any)
    .from("break_collections")
    .select("break_id")
    .in("break_id", breakIds);

  const countMap: Record<string, number> = {};
  ((collectionCounts ?? []) as { break_id: string }[]).forEach((c) => {
    countMap[c.break_id] = (countMap[c.break_id] ?? 0) + 1;
  });

  return breaks.map((b) => ({
    ...b,
    collection_count: countMap[b.id] ?? 0,
  }));
}

export default async function AdminDrumVaultPage() {
  const breaks = await getDrumBreaks();

  return (
    <div className="space-y-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-snow mb-8">Drum Vault</h1>
          <p className="text-body-lg text-snow/60">
            Manage your drum breaks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotifyVaultButton />
          <Link href="/admin/drum-vault/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>New Drum Break</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {breaks.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>BPM</th>
                    <th>Exclusive</th>
                    <th>Published</th>
                    <th>Collections</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {breaks.map((drumBreak) => (
                    <tr key={drumBreak.id}>
                      <td>
                        <span className="text-snow font-medium">
                          {drumBreak.name}
                        </span>
                      </td>

                      <td className="text-snow/70">
                        {drumBreak.bpm ?? <span className="text-snow/30">—</span>}
                      </td>

                      <td>
                        {drumBreak.is_exclusive ? (
                          <Badge variant="primary">Exclusive</Badge>
                        ) : (
                          <span className="text-snow/40 text-body-sm">No</span>
                        )}
                      </td>

                      <td>
                        <Badge
                          variant={drumBreak.is_published ? "success" : "warning"}
                        >
                          {drumBreak.is_published ? (
                            <>
                              <Eye className="w-3 h-3 mr-4" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-4" />
                              Draft
                            </>
                          )}
                        </Badge>
                      </td>

                      <td className="text-snow/70">
                        {drumBreak.collection_count}
                      </td>

                      <td className="text-snow/70">
                        {formatDate(drumBreak.created_at)}
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-8">
                          <PublishDrumBreakButton
                            breakId={drumBreak.id}
                            isPublished={drumBreak.is_published}
                          />

                          <Link href={`/admin/drum-vault/${drumBreak.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>

                          <DeleteDrumBreakButton
                            breakId={drumBreak.id}
                            breakName={drumBreak.name}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-48">
              <p className="text-body text-snow/60 mb-24">No drum breaks yet</p>
              <Link href="/admin/drum-vault/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add your first drum break
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
