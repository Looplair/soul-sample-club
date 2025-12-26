import { createClient } from "@/lib/supabase/server";
import { Package, Users, Download, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export const metadata = {
  title: "Admin Dashboard | Soul Sample Club",
};

async function getStats() {
  const supabase = await createClient();

  const [packsResult, usersResult, downloadsResult, activeSubsResult] = await Promise.all([
    supabase.from("packs").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("downloads").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
  ]);

  // Get downloads in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentDownloads } = await supabase
    .from("downloads")
    .select("id", { count: "exact", head: true })
    .gte("downloaded_at", sevenDaysAgo.toISOString());

  return {
    totalPacks: packsResult.count || 0,
    totalUsers: usersResult.count || 0,
    totalDownloads: downloadsResult.count || 0,
    activeSubscriptions: activeSubsResult.count || 0,
    recentDownloads: recentDownloads || 0,
  };
}

// Type for recent downloads with relations
interface RecentDownload {
  id: string;
  downloaded_at: string;
  sample: {
    name: string;
    pack: {
      name: string;
    } | null;
  } | null;
  user: {
    email: string;
  } | null;
}

async function getRecentDownloads(): Promise<RecentDownload[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("downloads")
    .select(
      `
      id,
      downloaded_at,
      sample:samples(name, pack:packs(name)),
      user:profiles(email)
    `
    )
    .order("downloaded_at", { ascending: false })
    .limit(10);

  return (result.data as RecentDownload[]) || [];
}

export default async function AdminDashboardPage() {
  const [stats, recentDownloads] = await Promise.all([
    getStats(),
    getRecentDownloads(),
  ]);

  return (
    <div className="space-y-32">
      <div>
        <h1 className="text-h1 text-snow mb-8">Dashboard</h1>
        <p className="text-body-lg text-snow/60">
          Overview of your sample platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-24">
        <StatCard
          title="Total Packs"
          value={stats.totalPacks}
          icon={<Package className="w-6 h-6" />}
          color="velvet"
        />
        <StatCard
          title="Active Subscribers"
          value={stats.activeSubscriptions}
          icon={<Users className="w-6 h-6" />}
          color="mint"
        />
        <StatCard
          title="Total Downloads"
          value={stats.totalDownloads}
          icon={<Download className="w-6 h-6" />}
          color="peach"
        />
        <StatCard
          title="Downloads (7d)"
          value={stats.recentDownloads}
          icon={<TrendingUp className="w-6 h-6" />}
          color="velvet-light"
        />
      </div>

      {/* Recent Downloads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDownloads.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Sample</th>
                    <th>Pack</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDownloads.map((download: RecentDownload) => (
                    <tr key={download.id}>
                      <td className="text-snow">{download.user?.email}</td>
                      <td className="text-snow/70">{download.sample?.name}</td>
                      <td className="text-snow/70">
                        {download.sample?.pack?.name}
                      </td>
                      <td className="text-snow/50 text-caption">
                        {new Date(download.downloaded_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-body text-snow/60 text-center py-24">
              No downloads yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    velvet: "bg-velvet/20 text-velvet",
    mint: "bg-mint/20 text-mint",
    peach: "bg-peach/20 text-peach",
    "velvet-light": "bg-velvet-light/20 text-velvet-light",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-16">
        <div
          className={`w-12 h-12 rounded-card flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-label text-snow/50">{title}</p>
          <p className="text-h2 text-snow">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
