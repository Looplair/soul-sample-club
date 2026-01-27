import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  Download,
  Users,
  Package,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Analytics | Soul Sample Club Admin",
};

// Types
interface DailyDownload {
  date: string;
  count: number;
}

interface DailySignup {
  date: string;
  count: number;
}

interface TopPack {
  id: string;
  name: string;
  cover_image_url: string | null;
  downloads: number;
}

interface TopSample {
  id: string;
  name: string;
  pack_name: string;
  downloads: number;
}

interface DownloadRow {
  downloaded_at: string;
  sample: {
    id: string;
    name: string;
    pack: {
      id: string;
      name: string;
      cover_image_url: string | null;
    } | null;
  } | null;
}

interface UserRow {
  created_at: string;
}

// Helper to get date range
function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

// Helper to format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Get daily downloads for last N days
async function getDailyDownloads(days: number): Promise<DailyDownload[]> {
  const supabase = await createClient();
  const { start } = getDateRange(days);

  const result = await supabase
    .from("downloads")
    .select("downloaded_at")
    .gte("downloaded_at", start.toISOString())
    .order("downloaded_at", { ascending: true });

  const downloads = (result.data as { downloaded_at: string }[]) || [];

  // Group by date
  const countsByDate: Record<string, number> = {};

  // Initialize all dates with 0
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    countsByDate[formatDateKey(date)] = 0;
  }

  // Count downloads
  for (const download of downloads) {
    const dateKey = formatDateKey(new Date(download.downloaded_at));
    if (countsByDate[dateKey] !== undefined) {
      countsByDate[dateKey]++;
    }
  }

  return Object.entries(countsByDate).map(([date, count]) => ({
    date,
    count,
  }));
}

// Get daily signups for last N days
async function getDailySignups(days: number): Promise<DailySignup[]> {
  const supabase = await createClient();
  const { start } = getDateRange(days);

  const result = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  const users = (result.data as UserRow[]) || [];

  // Group by date
  const countsByDate: Record<string, number> = {};

  // Initialize all dates with 0
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    countsByDate[formatDateKey(date)] = 0;
  }

  // Count signups
  for (const user of users) {
    const dateKey = formatDateKey(new Date(user.created_at));
    if (countsByDate[dateKey] !== undefined) {
      countsByDate[dateKey]++;
    }
  }

  return Object.entries(countsByDate).map(([date, count]) => ({
    date,
    count,
  }));
}

// Get top downloaded packs
async function getTopPacks(days: number, limit: number): Promise<TopPack[]> {
  const supabase = await createClient();
  const { start } = getDateRange(days);

  const result = await supabase
    .from("downloads")
    .select(
      `
      sample:samples(
        pack:packs(id, name, cover_image_url)
      )
    `
    )
    .gte("downloaded_at", start.toISOString());

  const downloads = (result.data as DownloadRow[]) || [];

  // Count by pack
  const packCounts: Record<string, { name: string; cover_image_url: string | null; count: number }> = {};

  for (const download of downloads) {
    const pack = download.sample?.pack;
    if (pack) {
      if (!packCounts[pack.id]) {
        packCounts[pack.id] = {
          name: pack.name,
          cover_image_url: pack.cover_image_url,
          count: 0,
        };
      }
      packCounts[pack.id].count++;
    }
  }

  return Object.entries(packCounts)
    .map(([id, data]) => ({
      id,
      name: data.name,
      cover_image_url: data.cover_image_url,
      downloads: data.count,
    }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}

// Get top downloaded samples
async function getTopSamples(days: number, limit: number): Promise<TopSample[]> {
  const supabase = await createClient();
  const { start } = getDateRange(days);

  const result = await supabase
    .from("downloads")
    .select(
      `
      sample:samples(id, name, pack:packs(name))
    `
    )
    .gte("downloaded_at", start.toISOString());

  const downloads = (result.data as DownloadRow[]) || [];

  // Count by sample
  const sampleCounts: Record<string, { name: string; pack_name: string; count: number }> = {};

  for (const download of downloads) {
    const sample = download.sample;
    if (sample) {
      if (!sampleCounts[sample.id]) {
        sampleCounts[sample.id] = {
          name: sample.name,
          pack_name: sample.pack?.name || "Unknown",
          count: 0,
        };
      }
      sampleCounts[sample.id].count++;
    }
  }

  return Object.entries(sampleCounts)
    .map(([id, data]) => ({
      id,
      name: data.name,
      pack_name: data.pack_name,
      downloads: data.count,
    }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}

// Get comparison stats
async function getComparisonStats() {
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    currentDownloads,
    previousDownloads,
    currentUsers,
    previousUsers,
  ] = await Promise.all([
    supabase
      .from("downloads")
      .select("id", { count: "exact", head: true })
      .gte("downloaded_at", sevenDaysAgo.toISOString()),
    supabase
      .from("downloads")
      .select("id", { count: "exact", head: true })
      .gte("downloaded_at", fourteenDaysAgo.toISOString())
      .lt("downloaded_at", sevenDaysAgo.toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
  ]);

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    downloads: {
      current: currentDownloads.count || 0,
      previous: previousDownloads.count || 0,
      change: calcChange(currentDownloads.count || 0, previousDownloads.count || 0),
    },
    users: {
      current: currentUsers.count || 0,
      previous: previousUsers.count || 0,
      change: calcChange(currentUsers.count || 0, previousUsers.count || 0),
    },
  };
}

export default async function AnalyticsPage() {
  const [dailyDownloads, dailySignups, topPacks, topSamples, comparison] =
    await Promise.all([
      getDailyDownloads(30),
      getDailySignups(30),
      getTopPacks(30, 5),
      getTopSamples(30, 10),
      getComparisonStats(),
    ]);

  const maxDownloads = Math.max(...dailyDownloads.map((d) => d.count), 1);
  const maxSignups = Math.max(...dailySignups.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-snow mb-2">Analytics</h1>
        <p className="text-body-lg text-snow/60">
          Track downloads, user growth, and content performance
        </p>
      </div>

      {/* Week over Week Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComparisonCard
          title="Downloads"
          current={comparison.downloads.current}
          previous={comparison.downloads.previous}
          change={comparison.downloads.change}
          icon={<Download className="w-5 h-5" />}
        />
        <ComparisonCard
          title="New Users"
          current={comparison.users.current}
          previous={comparison.users.previous}
          change={comparison.users.change}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downloads Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Downloads (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-[2px] border-b border-grey-700 relative">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-snow/30 -ml-8 pointer-events-none">
                <span>{maxDownloads}</span>
                <span>{Math.round(maxDownloads / 2)}</span>
                <span>0</span>
              </div>
              {dailyDownloads.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 group relative h-full flex items-end"
                >
                  {/* Background bar for hover area */}
                  <div className="absolute inset-0 bg-grey-800/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Actual data bar */}
                  <div
                    className="w-full bg-info hover:bg-info/80 transition-colors rounded-t relative z-10"
                    style={{
                      height: day.count > 0 ? `${Math.max((day.count / maxDownloads) * 100, 4)}%` : "2px",
                      minHeight: day.count > 0 ? "4px" : "2px",
                    }}
                  />
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-grey-800 border border-grey-700 rounded text-xs text-snow whitespace-nowrap z-20 shadow-lg pointer-events-none">
                    <span className="font-medium">{day.count}</span> downloads
                    <br />
                    <span className="text-snow/60">{formatDate(day.date)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-snow/40">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {/* Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Signups (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-[2px] border-b border-grey-700 relative">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-snow/30 -ml-8 pointer-events-none">
                <span>{maxSignups}</span>
                <span>{Math.round(maxSignups / 2)}</span>
                <span>0</span>
              </div>
              {dailySignups.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 group relative h-full flex items-end"
                >
                  {/* Background bar for hover area */}
                  <div className="absolute inset-0 bg-grey-800/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Actual data bar */}
                  <div
                    className="w-full bg-success hover:bg-success/80 transition-colors rounded-t relative z-10"
                    style={{
                      height: day.count > 0 ? `${Math.max((day.count / maxSignups) * 100, 4)}%` : "2px",
                      minHeight: day.count > 0 ? "4px" : "2px",
                    }}
                  />
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-grey-800 border border-grey-700 rounded text-xs text-snow whitespace-nowrap z-20 shadow-lg pointer-events-none">
                    <span className="font-medium">{day.count}</span> signups
                    <br />
                    <span className="text-snow/60">{formatDate(day.date)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-snow/40">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Packs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top Packs (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPacks.length > 0 ? (
              <div className="space-y-4">
                {topPacks.map((pack, index) => (
                  <div
                    key={pack.id}
                    className="flex items-center gap-4"
                  >
                    <div className="w-6 h-6 rounded-full bg-grey-700 flex items-center justify-center text-xs text-snow/60 font-medium">
                      {index + 1}
                    </div>
                    {pack.cover_image_url ? (
                      <img
                        src={pack.cover_image_url}
                        alt={pack.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-grey-700" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-snow font-medium truncate">
                        {pack.name}
                      </p>
                    </div>
                    <Badge variant="default">
                      {pack.downloads} downloads
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-snow/60 text-center py-8">
                No download data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Samples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Samples (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSamples.length > 0 ? (
              <div className="space-y-3">
                {topSamples.map((sample, index) => (
                  <div
                    key={sample.id}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-grey-700 flex items-center justify-center text-xs text-snow/60 font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-snow text-sm font-medium truncate">
                        {sample.name}
                      </p>
                      <p className="text-snow/50 text-xs truncate">
                        {sample.pack_name}
                      </p>
                    </div>
                    <span className="text-snow/60 text-sm">
                      {sample.downloads}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-snow/60 text-center py-8">
                No download data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  current,
  previous,
  change,
  icon,
}: {
  title: string;
  current: number;
  previous: number;
  change: number;
  icon: React.ReactNode;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center text-info">
            {icon}
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isNeutral
                ? "text-snow/50"
                : isPositive
                ? "text-success"
                : "text-error"
            }`}
          >
            {isNeutral ? (
              <Minus className="w-4 h-4" />
            ) : isPositive ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        </div>
        <p className="text-h2 text-snow mb-1">{current}</p>
        <p className="text-label text-snow/50">{title} this week</p>
        <p className="text-caption text-snow/40 mt-2">
          vs {previous} last week
        </p>
      </CardContent>
    </Card>
  );
}
