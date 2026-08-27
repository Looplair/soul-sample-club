import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  Download,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Minus,
  Music,
  Gauge,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Analytics | Soul Sample Club Admin",
};

interface DailyDownload { date: string; count: number; }
interface DailySignup { date: string; count: number; }
interface TopPack { id: string; name: string; cover_image_url: string | null; downloads: number; }
interface TopSample { id: string; name: string; pack_name: string; downloads: number; }

interface DownloadRow {
  downloaded_at: string;
  sample: {
    id: string;
    name: string;
    bpm: number | null;
    key: string | null;
    pack: { id: string; name: string; cover_image_url: string | null } | null;
  } | null;
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function bpmBucket(bpm: number): string {
  if (bpm < 70) return "<70";
  if (bpm < 80) return "70–79";
  if (bpm < 90) return "80–89";
  if (bpm < 100) return "90–99";
  if (bpm < 110) return "100–109";
  if (bpm < 120) return "110–119";
  return "120+";
}

async function getDailyDownloads(days: number): Promise<DailyDownload[]> {
  const supabase = await createClient();
  const { start } = getDateRange(days);
  const result = await supabase
    .from("downloads")
    .select("downloaded_at")
    .gte("downloaded_at", start.toISOString())
    .order("downloaded_at", { ascending: true });

  const downloads = (result.data as { downloaded_at: string }[]) || [];
  const countsByDate: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    countsByDate[formatDateKey(date)] = 0;
  }
  for (const d of downloads) {
    const key = formatDateKey(new Date(d.downloaded_at));
    if (countsByDate[key] !== undefined) countsByDate[key]++;
  }
  return Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
}

async function getDailySignups(days: number): Promise<DailySignup[]> {
  const supabase = await createClient();
  const { start } = getDateRange(days);
  const result = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  const users = (result.data as { created_at: string }[]) || [];
  const countsByDate: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    countsByDate[formatDateKey(date)] = 0;
  }
  for (const u of users) {
    const key = formatDateKey(new Date(u.created_at));
    if (countsByDate[key] !== undefined) countsByDate[key]++;
  }
  return Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
}

async function getAllDownloads(): Promise<DownloadRow[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("downloads")
    .select("downloaded_at, sample:samples(id, name, bpm, key, pack:packs(id, name, cover_image_url))");
  return (result.data as DownloadRow[]) || [];
}

function computeTopPacks(downloads: DownloadRow[], limit?: number): TopPack[] {
  const counts: Record<string, { name: string; cover_image_url: string | null; count: number }> = {};
  for (const d of downloads) {
    const pack = d.sample?.pack;
    if (pack) {
      if (!counts[pack.id]) counts[pack.id] = { name: pack.name, cover_image_url: pack.cover_image_url, count: 0 };
      counts[pack.id].count++;
    }
  }
  const sorted = Object.entries(counts)
    .map(([id, data]) => ({ id, name: data.name, cover_image_url: data.cover_image_url, downloads: data.count }))
    .sort((a, b) => b.downloads - a.downloads);
  return limit ? sorted.slice(0, limit) : sorted;
}

function computeTopSamples(downloads: DownloadRow[], limit: number): TopSample[] {
  const counts: Record<string, { name: string; pack_name: string; count: number }> = {};
  for (const d of downloads) {
    const sample = d.sample;
    if (sample) {
      if (!counts[sample.id]) counts[sample.id] = { name: sample.name, pack_name: sample.pack?.name || "Unknown", count: 0 };
      counts[sample.id].count++;
    }
  }
  return Object.entries(counts)
    .map(([id, data]) => ({ id, name: data.name, pack_name: data.pack_name, downloads: data.count }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}

function filterSince(downloads: DownloadRow[], days: number): DownloadRow[] {
  const start = new Date();
  start.setDate(start.getDate() - days);
  return downloads.filter((d) => new Date(d.downloaded_at) >= start);
}

function computeTopBPMRanges(downloads: DownloadRow[]): { range: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const d of downloads) {
    const bpm = d.sample?.bpm;
    if (bpm != null) {
      const bucket = bpmBucket(bpm);
      counts[bucket] = (counts[bucket] || 0) + 1;
    }
  }
  const order = ["<70", "70–79", "80–89", "90–99", "100–109", "110–119", "120+"];
  return order.filter(r => counts[r]).map(range => ({ range, count: counts[range] })).sort((a, b) => b.count - a.count);
}

function computeTopKeys(downloads: DownloadRow[]): { key: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const d of downloads) {
    const key = d.sample?.key;
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

async function getComparisonStats() {
  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(now.getDate() - 14);

  const [currentDownloads, previousDownloads, currentUsers, previousUsers] = await Promise.all([
    supabase.from("downloads").select("id", { count: "exact", head: true }).gte("downloaded_at", sevenDaysAgo.toISOString()),
    supabase.from("downloads").select("id", { count: "exact", head: true }).gte("downloaded_at", fourteenDaysAgo.toISOString()).lt("downloaded_at", sevenDaysAgo.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo.toISOString()).lt("created_at", sevenDaysAgo.toISOString()),
  ]);

  const calcChange = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
  return {
    downloads: { current: currentDownloads.count || 0, previous: previousDownloads.count || 0, change: calcChange(currentDownloads.count || 0, previousDownloads.count || 0) },
    users: { current: currentUsers.count || 0, previous: previousUsers.count || 0, change: calcChange(currentUsers.count || 0, previousUsers.count || 0) },
  };
}

export default async function AnalyticsPage() {
  const [dailyDownloads, dailySignups, allDownloads, comparison] = await Promise.all([
    getDailyDownloads(30),
    getDailySignups(30),
    getAllDownloads(),
    getComparisonStats(),
  ]);

  const windows = [7, 14, 30] as const;
  const topPacksByWindow = Object.fromEntries(
    windows.map((d) => [d, computeTopPacks(filterSince(allDownloads, d), 6)])
  ) as Record<(typeof windows)[number], TopPack[]>;
  const topSamplesByWindow = Object.fromEntries(
    windows.map((d) => [d, computeTopSamples(filterSince(allDownloads, d), 8)])
  ) as Record<(typeof windows)[number], TopSample[]>;

  const topPacksAllTime = computeTopPacks(allDownloads);
  const topSamplesAllTime = computeTopSamples(allDownloads, 20);
  const topBPMRanges = computeTopBPMRanges(allDownloads);
  const topKeys = computeTopKeys(allDownloads);

  const maxDownloads = Math.max(...dailyDownloads.map(d => d.count), 1);
  const maxSignups = Math.max(...dailySignups.map(d => d.count), 1);
  const maxPackDownloads = Math.max(...topPacksAllTime.map(p => p.downloads), 1);
  const maxBPM = Math.max(...topBPMRanges.map(b => b.count), 1);
  const maxKey = Math.max(...topKeys.map(k => k.count), 1);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-h1 text-snow mb-2">Analytics</h1>
        <p className="text-body-lg text-snow/60">Downloads, content performance, and sample insights</p>
      </div>

      {/* Week over week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComparisonCard title="Downloads" current={comparison.downloads.current} previous={comparison.downloads.previous} change={comparison.downloads.change} icon={<Download className="w-5 h-5" />} />
        <ComparisonCard title="New Users" current={comparison.users.current} previous={comparison.users.previous} change={comparison.users.change} icon={<Users className="w-5 h-5" />} />
      </div>

      {/* 30-day charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart title="Downloads (Last 30 Days)" icon={<Download className="w-5 h-5" />} data={dailyDownloads} max={maxDownloads} color="bg-info" label="downloads" />
        <BarChart title="User Signups (Last 30 Days)" icon={<Users className="w-5 h-5" />} data={dailySignups} max={maxSignups} color="bg-success" label="signups" />
      </div>

      {/* Windowed top content — spot momentum shifts across 7/14/30 days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Top Packs — Recent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {windows.map((d) => (
              <div key={d} className={d !== 30 ? "sm:border-r sm:border-grey-700 sm:pr-6" : ""}>
                <p className="text-xs uppercase tracking-wider text-snow/30 font-medium mb-4">Last {d} days</p>
                <PackList packs={topPacksByWindow[d]} compact />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Top Samples — Recent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {windows.map((d) => (
              <div key={d} className={d !== 30 ? "sm:border-r sm:border-grey-700 sm:pr-6" : ""}>
                <p className="text-xs uppercase tracking-wider text-snow/30 font-medium mb-4">Last {d} days</p>
                <SampleList samples={topSamplesByWindow[d]} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All-time divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-grey-700" />
        <span className="text-xs uppercase tracking-widest text-snow/30 font-medium">All Time</span>
        <div className="flex-1 h-px bg-grey-700" />
      </div>

      {/* All-time top samples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Top Samples — All Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {topSamplesAllTime.map((sample, i) => (
              <div key={sample.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-snow/30 font-medium text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-snow text-sm font-medium truncate">{sample.name}</p>
                  <p className="text-snow/40 text-xs truncate">{sample.pack_name}</p>
                </div>
                <span className="text-snow/50 text-sm flex-shrink-0">{sample.downloads}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All-time pack leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Pack Leaderboard — All Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPacksAllTime.map((pack, i) => (
              <div key={pack.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-snow/30 font-medium text-right flex-shrink-0">{i + 1}</span>
                {pack.cover_image_url
                  ? <img src={pack.cover_image_url} alt={pack.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  : <div className="w-8 h-8 rounded bg-grey-700 flex-shrink-0" />}
                <p className="flex-1 text-snow text-sm truncate">{pack.name}</p>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-24 h-1.5 bg-grey-700 rounded-full overflow-hidden">
                    <div className="h-full bg-info rounded-full" style={{ width: `${(pack.downloads / maxPackDownloads) * 100}%` }} />
                  </div>
                  <span className="text-snow/50 text-sm w-8 text-right">{pack.downloads}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sample insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BPM breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5" />Top BPM Ranges — All Time</CardTitle>
          </CardHeader>
          <CardContent>
            {topBPMRanges.length > 0 ? (
              <div className="space-y-3">
                {topBPMRanges.map(({ range, count }) => (
                  <div key={range} className="flex items-center gap-3">
                    <span className="text-snow/60 text-sm w-16 flex-shrink-0">{range} BPM</span>
                    <div className="flex-1 h-2 bg-grey-700 rounded-full overflow-hidden">
                      <div className="h-full bg-info rounded-full" style={{ width: `${(count / maxBPM) * 100}%` }} />
                    </div>
                    <span className="text-snow/50 text-sm w-8 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-snow/40 text-sm">No BPM data on samples yet</p>
            )}
          </CardContent>
        </Card>

        {/* Key breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Music className="w-5 h-5" />Top Keys — All Time</CardTitle>
          </CardHeader>
          <CardContent>
            {topKeys.length > 0 ? (
              <div className="space-y-3">
                {topKeys.map(({ key, count }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-snow/60 text-sm w-16 flex-shrink-0">{key}</span>
                    <div className="flex-1 h-2 bg-grey-700 rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${(count / maxKey) * 100}%` }} />
                    </div>
                    <span className="text-snow/50 text-sm w-8 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-snow/40 text-sm">No key data on samples yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BarChart({ title, icon, data, max, color, label }: {
  title: string;
  icon: React.ReactNode;
  data: { date: string; count: number }[];
  max: number;
  color: string;
  label: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-[2px] border-b border-grey-700 relative">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-snow/30 -ml-8 pointer-events-none">
            <span>{max}</span>
            <span>{Math.round(max / 2)}</span>
            <span>0</span>
          </div>
          {data.map((day) => (
            <div key={day.date} className="flex-1 group relative h-full flex items-end">
              <div className="absolute inset-0 bg-grey-800/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div
                className={`w-full ${color} hover:opacity-80 transition-opacity rounded-t relative z-10`}
                style={{ height: day.count > 0 ? `${Math.max((day.count / max) * 100, 4)}%` : "2px", minHeight: day.count > 0 ? "4px" : "2px" }}
              />
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-grey-800 border border-grey-700 rounded text-xs text-snow whitespace-nowrap z-20 shadow-lg pointer-events-none">
                <span className="font-medium">{day.count}</span> {label}<br />
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
  );
}

function PackList({ packs, compact }: { packs: TopPack[]; compact?: boolean }) {
  if (!packs.length) return <p className="text-snow/40 text-sm py-4">No downloads yet</p>;
  if (compact) {
    return (
      <div className="space-y-3">
        {packs.map((pack, i) => (
          <div key={pack.id} className="flex items-center gap-2.5">
            <span className="w-4 text-xs text-snow/30 font-medium flex-shrink-0">{i + 1}</span>
            {pack.cover_image_url
              ? <img src={pack.cover_image_url} alt={pack.name} className="w-7 h-7 rounded object-cover flex-shrink-0" />
              : <div className="w-7 h-7 rounded bg-grey-700 flex-shrink-0" />}
            <p className="flex-1 text-snow text-sm truncate">{pack.name}</p>
            <span className="text-snow/50 text-xs flex-shrink-0">{pack.downloads}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {packs.map((pack, i) => (
        <div key={pack.id} className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-grey-700 flex items-center justify-center text-xs text-snow/60 font-medium">{i + 1}</div>
          {pack.cover_image_url
            ? <img src={pack.cover_image_url} alt={pack.name} className="w-10 h-10 rounded object-cover" />
            : <div className="w-10 h-10 rounded bg-grey-700" />}
          <p className="flex-1 text-snow font-medium truncate">{pack.name}</p>
          <Badge variant="default">{pack.downloads} downloads</Badge>
        </div>
      ))}
    </div>
  );
}

function SampleList({ samples }: { samples: TopSample[] }) {
  if (!samples.length) return <p className="text-snow/60 text-center py-8">No download data yet</p>;
  return (
    <div className="space-y-3">
      {samples.map((sample, i) => (
        <div key={sample.id} className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-grey-700 flex items-center justify-center text-xs text-snow/60 font-medium">{i + 1}</div>
          <div className="flex-1 min-w-0">
            <p className="text-snow text-sm font-medium truncate">{sample.name}</p>
            <p className="text-snow/50 text-xs truncate">{sample.pack_name}</p>
          </div>
          <span className="text-snow/60 text-sm">{sample.downloads}</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonCard({ title, current, previous, change, icon }: {
  title: string; current: number; previous: number; change: number; icon: React.ReactNode;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center text-info">{icon}</div>
          <div className={`flex items-center gap-1 text-sm font-medium ${isNeutral ? "text-snow/50" : isPositive ? "text-success" : "text-error"}`}>
            {isNeutral ? <Minus className="w-4 h-4" /> : isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        </div>
        <p className="text-h2 text-snow mb-1">{current}</p>
        <p className="text-label text-snow/50">{title} this week</p>
        <p className="text-caption text-snow/40 mt-2">vs {previous} last week</p>
      </CardContent>
    </Card>
  );
}
