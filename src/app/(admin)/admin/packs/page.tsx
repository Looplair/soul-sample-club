import Link from "next/link";
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { DeletePackButton } from "@/components/admin/DeletePackButton";

export const metadata = {
  title: "Manage Packs | Soul Sample Club Admin",
};

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

// --------------------------------------
// FIXED TYPED FETCH FUNCTION
// --------------------------------------
interface PackRow {
  id: string;
  name: string;
  description: string | null;
  release_date: string;
  cover_image_url: string | null;
  is_published: boolean;
  scheduled_publish_at: string | null;
  samples: { count: number }[]; // <= joined count rows
}

async function getPacks(): Promise<PackRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packs")
    .select(
      `
      id,
      name,
      description,
      release_date,
      cover_image_url,
      is_published,
      scheduled_publish_at,
      samples:samples(count)
    `
    )
    .order("release_date", { ascending: false })
    .returns<PackRow[]>(); // <= CRITICAL FIX FOR VERCEL

  if (error) {
    console.error("Error fetching packs:", error);
    return [];
  }

  return data ?? [];
}

export default async function AdminPacksPage() {
  const packs = await getPacks();

  return (
    <div className="space-y-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-snow mb-8">Packs</h1>
          <p className="text-body-lg text-snow/60">
            Manage your sample packs
          </p>
        </div>
        <Link href="/admin/packs/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Pack</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {packs.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Samples</th>
                    <th>Release Date</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packs.map((pack) => (
                    <tr key={pack.id}>
                      <td>
                        <div className="flex items-center gap-12">
                          {pack.cover_image_url ? (
                            <img
                              src={pack.cover_image_url}
                              alt={pack.name}
                              className="w-10 h-10 rounded-image object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-image bg-steel" />
                          )}
                          <span className="text-snow font-medium">
                            {pack.name}
                          </span>
                        </div>
                      </td>

                      {/* samples is now typed safely */}
                      <td className="text-snow/70">
                        {pack.samples?.[0]?.count ?? 0}
                      </td>

                      <td className="text-snow/70">
                        {formatDate(pack.release_date)}
                      </td>

                      <td>
                        {pack.is_published ? (
                          <Badge variant="success">
                            <Eye className="w-3 h-3 mr-4" />
                            Published
                          </Badge>
                        ) : pack.scheduled_publish_at ? (
                          <div className="flex flex-col gap-4">
                            <Badge variant="primary">
                              <Calendar className="w-3 h-3 mr-4" />
                              Scheduled
                            </Badge>
                            <span className="text-xs text-snow/50">
                              {new Date(pack.scheduled_publish_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="warning">
                            <EyeOff className="w-3 h-3 mr-4" />
                            Draft
                          </Badge>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-8">
                          <Link href={`/admin/packs/${pack.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>

                          <DeletePackButton
                            packId={pack.id}
                            packName={pack.name}
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
              <p className="text-body text-snow/60 mb-24">No packs yet</p>
              <Link href="/admin/packs/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Create your first pack
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
