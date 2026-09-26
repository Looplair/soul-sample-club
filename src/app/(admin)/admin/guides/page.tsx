import Link from "next/link";
import { Plus, Edit, BookOpen, ExternalLink } from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { getAllGuides, countPlaceholders, getGuideStatus } from "@/lib/guides";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Guides | Soul Sample Club Admin",
};

export default async function AdminGuidesPage() {
  const guides = await getAllGuides();
  const published = guides.filter((g) => getGuideStatus(g) === "published").length;
  const scheduled = guides.filter((g) => getGuideStatus(g) === "scheduled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Guides</h1>
          <p className="text-sm text-text-muted mt-1">
            Articles that help Soul Sample Club rank on Google. {published} published, {scheduled} scheduled,{" "}
            {guides.length - published - scheduled} draft{guides.length - published - scheduled === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/admin/guides/new" className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          New Guide
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {guides.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-10 h-10 text-text-subtle mx-auto mb-3" />
              <p className="text-text-muted">No guides yet.</p>
              <Link href="/admin/guides/new" className="text-velvet text-sm mt-2 inline-block hover:underline">
                Write your first one
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-grey-700">
                  <th className="text-left text-label text-text-muted px-6 py-3">Guide</th>
                  <th className="text-left text-label text-text-muted px-6 py-3 hidden md:table-cell">Section</th>
                  <th className="text-left text-label text-text-muted px-6 py-3 hidden sm:table-cell">Updated</th>
                  <th className="text-left text-label text-text-muted px-6 py-3">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {guides.map((g) => {
                  const gaps = countPlaceholders(g);
                  return (
                    <tr key={g.id} className="border-b border-grey-700/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-body text-white font-medium">{g.title}</p>
                        <p className="text-xs text-text-subtle mt-0.5">
                          /guides/{g.slug}
                          {g.isPillar && " · Main guide"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-body text-text-muted hidden md:table-cell">{g.cluster}</td>
                      <td className="px-6 py-4 text-body text-text-muted hidden sm:table-cell">{formatDate(g.updatedAt)}</td>
                      <td className="px-6 py-4">
                        {getGuideStatus(g) === "published" ? (
                          <Badge variant="success">Published</Badge>
                        ) : getGuideStatus(g) === "scheduled" && g.publishedAt ? (
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="default">Scheduled</Badge>
                            <span className="text-[11px] text-text-subtle">{formatDate(g.publishedAt)}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="default">Draft</Badge>
                            {gaps > 0 && (
                              <span className="text-[11px] text-yellow-200/80">
                                {gaps} box{gaps === 1 ? "" : "es"} to write
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/guides/${g.slug}`}
                            target="_blank"
                            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </Link>
                          <Link
                            href={`/admin/guides/${g.id}`}
                            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-white transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
