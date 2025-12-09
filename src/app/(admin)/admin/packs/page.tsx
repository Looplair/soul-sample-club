import Link from "next/link";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { DeletePackButton } from "@/components/admin/DeletePackButton";

export const metadata = {
  title: "Manage Packs | Soul Sample Club Admin",
};

async function getPacks() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packs")
    .select(
      `
      *,
      samples:samples(count)
    `
    )
    .order("release_date", { ascending: false });

  if (error) {
    console.error("Error fetching packs:", error);
    return [];
  }

  return data || [];
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
                  {packs.map((pack: any) => (
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
                      <td className="text-snow/70">
                        {pack.samples[0]?.count || 0}
                      </td>
                      <td className="text-snow/70">
                        {formatDate(pack.release_date)}
                      </td>
                      <td>
                        <Badge variant={pack.is_published ? "success" : "warning"}>
                          {pack.is_published ? (
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
                      <td>
                        <div className="flex items-center justify-end gap-8">
                          <Link href={`/admin/packs/${pack.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <DeletePackButton packId={pack.id} packName={pack.name} />
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
