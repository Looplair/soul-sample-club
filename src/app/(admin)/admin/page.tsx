import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Package,
  Users,
  Download,
  TrendingUp,
  CreditCard,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Eye,
  Gift,
  Heart,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { formatDate, getDaysUntilEndDate, getExpiryBadgeText } from "@/lib/utils";

export const metadata = {
  title: "Admin Dashboard | Soul Sample Club",
};

// Patreon Icon component
const PatreonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FF424D">
    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
  </svg>
);

// Type definitions
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
    full_name: string | null;
  } | null;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription: Array<{
    status: string;
  }> | null;
}

interface ExpiringPack {
  id: string;
  name: string;
  release_date: string;
  end_date: string | null;
  is_bonus: boolean;
}

interface ArchivedPackWithVotes {
  id: string;
  name: string;
  release_date: string;
  cover_image_url: string | null;
  vote_count: number;
}

interface SubscriptionBreakdown {
  stripeActive: number;
  stripTrialing: number;
  stripeCanceled: number;
  stripePastDue: number;
  patreonActive: number;
}

async function getStats() {
  const supabase = await createClient();

  const [packsResult, usersResult, downloadsResult, activeSubsResult] =
    await Promise.all([
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

  // Get downloads in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get new users in last 7 days
  const [recentDownloadsResult, monthlyDownloadsResult, newUsersResult] =
    await Promise.all([
      supabase
        .from("downloads")
        .select("id", { count: "exact", head: true })
        .gte("downloaded_at", sevenDaysAgo.toISOString()),
      supabase
        .from("downloads")
        .select("id", { count: "exact", head: true })
        .gte("downloaded_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString()),
    ]);

  // Get published vs draft packs
  const publishedPacksResult = await supabase
    .from("packs")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  // Get bonus packs count
  const bonusPacksResult = await supabase
    .from("packs")
    .select("id", { count: "exact", head: true })
    .eq("is_bonus", true);

  return {
    totalPacks: packsResult.count || 0,
    publishedPacks: publishedPacksResult.count || 0,
    bonusPacks: bonusPacksResult.count || 0,
    totalUsers: usersResult.count || 0,
    newUsersWeek: newUsersResult.count || 0,
    totalDownloads: downloadsResult.count || 0,
    activeSubscriptions: activeSubsResult.count || 0,
    recentDownloads: recentDownloadsResult.count || 0,
    monthlyDownloads: monthlyDownloadsResult.count || 0,
  };
}

async function getSubscriptionBreakdown(): Promise<SubscriptionBreakdown> {
  // Use admin client to bypass RLS for accurate counts
  const adminSupabase = createAdminClient();

  // Fetch all data and compute accurate counts per unique user
  const [subscriptionsResult, patreonResult] = await Promise.all([
    adminSupabase.from("subscriptions").select("user_id, status"),
    adminSupabase.from("patreon_links").select("user_id, is_active"),
  ]);

  const subscriptions = (subscriptionsResult.data || []) as Array<{ user_id: string; status: string }>;
  const patreonLinks = (patreonResult.data || []) as Array<{ user_id: string; is_active: boolean }>;

  // Build maps for unique users (in case of duplicates, take the "best" status)
  const userStripeStatus = new Map<string, string>();
  for (const sub of subscriptions) {
    const existing = userStripeStatus.get(sub.user_id);
    // Priority: active > trialing > past_due > canceled
    if (!existing ||
        (sub.status === "active") ||
        (sub.status === "trialing" && existing !== "active") ||
        (sub.status === "past_due" && existing !== "active" && existing !== "trialing")) {
      userStripeStatus.set(sub.user_id, sub.status);
    }
  }

  const userPatreonActive = new Map<string, boolean>();
  for (const link of patreonLinks) {
    userPatreonActive.set(link.user_id, link.is_active);
  }

  // Count unique users per status
  let stripeActiveCount = 0;
  let stripeTrialingCount = 0;
  let stripeCanceledCount = 0;
  let stripePastDueCount = 0;

  for (const [, status] of userStripeStatus) {
    if (status === "active") stripeActiveCount++;
    else if (status === "trialing") stripeTrialingCount++;
    else if (status === "canceled") stripeCanceledCount++;
    else if (status === "past_due") stripePastDueCount++;
  }

  // Count Patreon active (only those who don't already have Stripe active/trialing)
  let patreonActiveCount = 0;
  for (const [userId, isActive] of userPatreonActive) {
    if (isActive) {
      const stripeStatus = userStripeStatus.get(userId);
      // Only count as Patreon if they don't have active Stripe access
      if (stripeStatus !== "active" && stripeStatus !== "trialing") {
        patreonActiveCount++;
      }
    }
  }

  return {
    stripeActive: stripeActiveCount,
    stripTrialing: stripeTrialingCount,
    stripeCanceled: stripeCanceledCount,
    stripePastDue: stripePastDueCount,
    patreonActive: patreonActiveCount,
  };
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
      user:profiles(email, full_name)
    `
    )
    .order("downloaded_at", { ascending: false })
    .limit(8);

  return (result.data as RecentDownload[]) || [];
}

async function getRecentUsers(): Promise<RecentUser[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      created_at,
      subscription:subscriptions(status)
    `
    )
    .order("created_at", { ascending: false })
    .limit(5);

  return (result.data as RecentUser[]) || [];
}

async function getExpiringPacks(): Promise<ExpiringPack[]> {
  const supabase = await createClient();

  // Get all published packs
  const result = await supabase
    .from("packs")
    .select("id, name, release_date, end_date, is_bonus")
    .eq("is_published", true)
    .order("release_date", { ascending: false });

  const packs = (result.data as ExpiringPack[]) || [];

  // Filter to packs expiring within 14 days
  return packs.filter((pack) => {
    const daysRemaining = getDaysUntilEndDate(pack.release_date, pack.end_date);
    return daysRemaining > 0 && daysRemaining <= 14;
  });
}

interface PackForVotes {
  id: string;
  name: string;
  release_date: string;
  cover_image_url: string | null;
  end_date: string | null;
}

async function getArchivedPacksWithVotes(): Promise<ArchivedPackWithVotes[]> {
  const supabase = await createClient();

  // Get all published packs
  const packsResult = await supabase
    .from("packs")
    .select("id, name, release_date, cover_image_url, end_date")
    .eq("is_published", true)
    .order("release_date", { ascending: false });

  const packs = (packsResult.data as PackForVotes[]) || [];

  // Filter to archived packs (older than 90 days)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const archivedPacks = packs.filter((pack) => {
    const releaseDate = new Date(pack.release_date);
    return releaseDate < threeMonthsAgo;
  });

  // Get vote counts for archived packs
  const packIds = archivedPacks.map((p) => p.id);

  if (packIds.length === 0) {
    return [];
  }

  // Get all votes for these packs
  const votesResult = await supabase
    .from("pack_votes")
    .select("pack_id")
    .in("pack_id", packIds);

  const votes = votesResult.data || [];

  // Count votes per pack
  const voteCountMap = new Map<string, number>();
  votes.forEach((vote: { pack_id: string }) => {
    const count = voteCountMap.get(vote.pack_id) || 0;
    voteCountMap.set(vote.pack_id, count + 1);
  });

  // Combine packs with vote counts and sort by votes
  const packsWithVotes: ArchivedPackWithVotes[] = archivedPacks.map((pack) => ({
    id: pack.id,
    name: pack.name,
    release_date: pack.release_date,
    cover_image_url: pack.cover_image_url,
    vote_count: voteCountMap.get(pack.id) || 0,
  }));

  // Sort by vote count (highest first)
  return packsWithVotes.sort((a, b) => b.vote_count - a.vote_count).slice(0, 10);
}

export default async function AdminDashboardPage() {
  const [stats, subscriptionBreakdown, recentDownloads, recentUsers, expiringPacks, archivedPacksWithVotes] =
    await Promise.all([
      getStats(),
      getSubscriptionBreakdown(),
      getRecentDownloads(),
      getRecentUsers(),
      getExpiringPacks(),
      getArchivedPacksWithVotes(),
    ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-snow mb-2">Dashboard</h1>
        <p className="text-body-lg text-snow/60">
          Overview of Soul Sample Club
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/packs/new"
          className="btn-primary flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          New Pack
        </Link>
        <Link
          href="/admin/analytics"
          className="btn-secondary flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          View Analytics
        </Link>
        <Link
          href="/admin/users"
          className="btn-secondary flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Manage Users
        </Link>
      </div>

      {/* Expiring Packs Alert */}
      {expiringPacks.length > 0 && (
        <Card className="!bg-amber-500/10 !border-amber-500/30">
          <CardContent className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-body font-medium text-amber-500 mb-2">
                Packs Expiring Soon
              </h3>
              <div className="space-y-2">
                {expiringPacks.map((pack) => {
                  const daysRemaining = getDaysUntilEndDate(
                    pack.release_date,
                    pack.end_date
                  );
                  const badgeText = getExpiryBadgeText(daysRemaining);
                  return (
                    <div
                      key={pack.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-snow">{pack.name}</span>
                        {pack.is_bonus && (
                          <Badge variant="warning" className="text-xs">
                            Bonus
                          </Badge>
                        )}
                      </div>
                      <span className="text-amber-500 text-sm">{badgeText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Link
              href="/admin/packs"
              className="text-amber-500 hover:text-amber-400 transition-colors"
            >
              <ArrowUpRight className="w-5 h-5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtext={`+${stats.newUsersWeek} this week`}
          icon={<Users className="w-5 h-5" />}
          color="velvet"
          href="/admin/users"
        />
        <StatCard
          title="Active Subscribers"
          value={stats.activeSubscriptions}
          subtext={`${Math.round((stats.activeSubscriptions / Math.max(stats.totalUsers, 1)) * 100)}% conversion`}
          icon={<CreditCard className="w-5 h-5" />}
          color="mint"
          href="/admin/analytics"
        />
        <StatCard
          title="Total Downloads"
          value={stats.totalDownloads}
          subtext={`${stats.recentDownloads} this week`}
          icon={<Download className="w-5 h-5" />}
          color="peach"
        />
        <StatCard
          title="Total Packs"
          value={stats.totalPacks}
          subtext={`${stats.publishedPacks} published`}
          icon={<Package className="w-5 h-5" />}
          color="velvet-light"
          href="/admin/packs"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard
          title="Downloads (7d)"
          value={stats.recentDownloads}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MiniStatCard
          title="Downloads (30d)"
          value={stats.monthlyDownloads}
          icon={<Clock className="w-4 h-4" />}
        />
        <MiniStatCard
          title="Bonus Packs"
          value={stats.bonusPacks}
          icon={<Gift className="w-4 h-4" />}
        />
        <MiniStatCard
          title="Draft Packs"
          value={stats.totalPacks - stats.publishedPacks}
          icon={<Eye className="w-4 h-4" />}
        />
      </div>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription Status
            </CardTitle>
            <Link
              href="/admin/subscriptions"
              className="text-sm text-velvet hover:text-velvet/80 flex items-center gap-1"
            >
              View Details
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stripe Subscriptions */}
            <div>
              <p className="text-label text-snow/60 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Stripe Subscriptions
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SubscriptionStat
                  label="Active"
                  value={subscriptionBreakdown.stripeActive}
                  color="bg-mint"
                />
                <SubscriptionStat
                  label="Trialing"
                  value={subscriptionBreakdown.stripTrialing}
                  color="bg-velvet"
                />
                <SubscriptionStat
                  label="Canceled"
                  value={subscriptionBreakdown.stripeCanceled}
                  color="bg-grey-500"
                />
                <SubscriptionStat
                  label="Past Due"
                  value={subscriptionBreakdown.stripePastDue}
                  color="bg-error"
                  alert={subscriptionBreakdown.stripePastDue > 0}
                />
              </div>
            </div>

            {/* Patreon Members */}
            <div>
              <p className="text-label text-snow/60 mb-3 flex items-center gap-2">
                <PatreonIcon />
                Patreon Members
              </p>
              <div className="flex items-center gap-4">
                <SubscriptionStat
                  label="Active Patrons"
                  value={subscriptionBreakdown.patreonActive}
                  color="bg-[#FF424D]"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-grey-700">
                <p className="text-body text-snow font-medium">
                  Total with access: {subscriptionBreakdown.stripeActive + subscriptionBreakdown.stripTrialing + subscriptionBreakdown.patreonActive}
                </p>
                <p className="text-caption text-snow/40 mt-1">
                  {subscriptionBreakdown.stripeActive} Stripe active + {subscriptionBreakdown.stripTrialing} Stripe trial + {subscriptionBreakdown.patreonActive} Patreon
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Signups</CardTitle>
            <Link
              href="/admin/users"
              className="text-sm text-velvet hover:text-velvet-light transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => {
                  const subscription = user.subscription?.[0];
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-2 border-b border-grey-700 last:border-0"
                    >
                      <div>
                        <p className="text-snow text-sm font-medium">
                          {user.full_name || user.email.split("@")[0]}
                        </p>
                        <p className="text-snow/50 text-xs">{user.email}</p>
                      </div>
                      <div className="text-right">
                        {subscription ? (
                          <Badge
                            variant={
                              subscription.status === "active"
                                ? "success"
                                : subscription.status === "trialing"
                                ? "primary"
                                : "warning"
                            }
                            className="text-xs"
                          >
                            {subscription.status}
                          </Badge>
                        ) : (
                          <span className="text-snow/40 text-xs">Free</span>
                        )}
                        <p className="text-snow/40 text-xs mt-1">
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body text-snow/60 text-center py-8">
                No users yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Downloads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Downloads</CardTitle>
            <Link
              href="/admin/analytics"
              className="text-sm text-velvet hover:text-velvet-light transition-colors flex items-center gap-1"
            >
              View analytics <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentDownloads.length > 0 ? (
              <div className="space-y-3">
                {recentDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="flex items-center justify-between py-2 border-b border-grey-700 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-snow text-sm font-medium truncate">
                        {download.sample?.name}
                      </p>
                      <p className="text-snow/50 text-xs truncate">
                        {download.sample?.pack?.name}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-snow/70 text-xs">
                        {download.user?.full_name ||
                          download.user?.email?.split("@")[0]}
                      </p>
                      <p className="text-snow/40 text-xs">
                        {new Date(download.downloaded_at).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body text-snow/60 text-center py-8">
                No downloads yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Archived Packs with Votes */}
      {archivedPacksWithVotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              Archived Pack Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-snow/50 mb-4">
              Votes from the Explore feature for archived packs to come back
            </p>
            <div className="space-y-3">
              {archivedPacksWithVotes.map((pack, index) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between py-3 border-b border-grey-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-snow/40 text-sm w-6">{index + 1}.</span>
                    <div>
                      <p className="text-snow font-medium">{pack.name}</p>
                      <p className="text-snow/40 text-xs">
                        Released {formatDate(pack.release_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" fill="currentColor" />
                    <span className="text-snow font-semibold">{pack.vote_count}</span>
                    <span className="text-snow/40 text-sm">votes</span>
                  </div>
                </div>
              ))}
            </div>
            {archivedPacksWithVotes.every((p) => p.vote_count === 0) && (
              <p className="text-center text-snow/50 py-4">
                No votes yet for archived packs
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtext,
  icon,
  color,
  href,
}: {
  title: string;
  value: number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
}) {
  const colorClasses: Record<string, string> = {
    velvet: "bg-velvet/20 text-velvet",
    mint: "bg-mint/20 text-mint",
    peach: "bg-peach/20 text-peach",
    "velvet-light": "bg-velvet-light/20 text-velvet-light",
  };

  const content = (
    <Card className="hover:border-grey-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
          >
            {icon}
          </div>
          {href && (
            <ArrowUpRight className="w-4 h-4 text-snow/30" />
          )}
        </div>
        <p className="text-h2 text-snow mb-1">{value.toLocaleString()}</p>
        <p className="text-label text-snow/50">{title}</p>
        {subtext && (
          <p className="text-caption text-snow/40 mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function MiniStatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-grey-700 flex items-center justify-center text-snow/60">
          {icon}
        </div>
        <div>
          <p className="text-h4 text-snow">{value.toLocaleString()}</p>
          <p className="text-caption text-snow/50">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionStat({
  label,
  value,
  color,
  alert,
}: {
  label: string;
  value: number;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div>
        <p className={`text-h4 ${alert ? "text-error" : "text-snow"}`}>
          {value}
        </p>
        <p className="text-caption text-snow/50">{label}</p>
      </div>
    </div>
  );
}
