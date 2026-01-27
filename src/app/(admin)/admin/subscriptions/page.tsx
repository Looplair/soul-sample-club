import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreditCard,
  Users as UsersIcon,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { SubscriptionTable } from "@/components/admin/SubscriptionTable";
import { KlaviyoAutoSync } from "@/components/admin/KlaviyoAutoSync";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Patreon Icon
const PatreonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FF424D">
    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
  </svg>
);

// Types
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Subscription {
  user_id: string;
  status: string;
  current_period_end: string | null;
}

interface PatreonLink {
  user_id: string;
  patreon_email: string;
  is_active: boolean;
  tier_title: string | null;
}

interface UnifiedSubscription {
  userId: string;
  email: string;
  fullName: string | null;
  stripeStatus: string | null;
  stripePeriodEnd: string | null;
  patreonActive: boolean;
  patreonTier: string | null;
  hasAccess: boolean;
  accessSource: "stripe_active" | "stripe_trialing" | "patreon" | "none";
  joinedAt: string;
}

async function getSubscriptionData() {
  const adminSupabase = createAdminClient();

  const [profilesResult, subscriptionsResult, patreonResult] = await Promise.all([
    adminSupabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
    adminSupabase.from("subscriptions").select("user_id, status, current_period_end"),
    adminSupabase.from("patreon_links").select("user_id, patreon_email, is_active, tier_title"),
  ]);

  const profiles = (profilesResult.data || []) as Profile[];
  const subscriptions = (subscriptionsResult.data || []) as Subscription[];
  const patreonLinks = (patreonResult.data || []) as PatreonLink[];

  // Build lookup maps
  const subMap = new Map<string, Subscription>();
  for (const sub of subscriptions) {
    subMap.set(sub.user_id, sub);
  }

  const patreonMap = new Map<string, PatreonLink>();
  for (const link of patreonLinks) {
    patreonMap.set(link.user_id, link);
  }

  // Build unified list
  const unified: UnifiedSubscription[] = profiles.map((profile) => {
    const stripeSub = subMap.get(profile.id);
    const patreonLink = patreonMap.get(profile.id);

    const stripeStatus = stripeSub?.status || null;
    const stripePeriodEnd = stripeSub?.current_period_end || null;
    const patreonActive = patreonLink?.is_active || false;
    const patreonTier = patreonLink?.tier_title || null;

    // Determine access
    let hasAccess = false;
    let accessSource: UnifiedSubscription["accessSource"] = "none";

    if (stripeStatus === "active") {
      hasAccess = true;
      accessSource = "stripe_active";
    } else if (stripeStatus === "trialing") {
      hasAccess = true;
      accessSource = "stripe_trialing";
    } else if (patreonActive) {
      hasAccess = true;
      accessSource = "patreon";
    }

    return {
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      stripeStatus,
      stripePeriodEnd,
      patreonActive,
      patreonTier,
      hasAccess,
      accessSource,
      joinedAt: profile.created_at,
    };
  });

  // Calculate stats
  const stats = {
    total: unified.length,
    withAccess: unified.filter((u) => u.hasAccess).length,
    stripeActive: unified.filter((u) => u.accessSource === "stripe_active").length,
    stripeTrialing: unified.filter((u) => u.accessSource === "stripe_trialing").length,
    patreonActive: unified.filter((u) => u.accessSource === "patreon").length,
    noAccess: unified.filter((u) => !u.hasAccess).length,
    stripeCanceled: unified.filter((u) => u.stripeStatus === "canceled").length,
  };

  return { unified, stats };
}

export default async function AdminSubscriptionsPage() {
  const { unified, stats } = await getSubscriptionData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-snow mb-2">Subscriptions</h1>
        <p className="text-body-lg text-snow/60">
          Unified view of all member access
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <QuickStat
          label="Total Users"
          value={stats.total}
          icon={<UsersIcon className="w-4 h-4" />}
          color="default"
        />
        <QuickStat
          label="With Access"
          value={stats.withAccess}
          icon={<CheckCircle className="w-4 h-4" />}
          color="mint"
        />
        <QuickStat
          label="Stripe Active"
          value={stats.stripeActive}
          icon={<CreditCard className="w-4 h-4" />}
          color="mint"
        />
        <QuickStat
          label="Stripe Trial"
          value={stats.stripeTrialing}
          icon={<Clock className="w-4 h-4" />}
          color="primary"
        />
        <QuickStat
          label="Patreon"
          value={stats.patreonActive}
          icon={<PatreonIcon />}
          color="patreon"
        />
        <QuickStat
          label="Canceled"
          value={stats.stripeCanceled}
          icon={<XCircle className="w-4 h-4" />}
          color="warning"
        />
      </div>

      {/* Summary Card */}
      <Card className="!bg-grey-800/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-snow/60">Access breakdown: </span>
              <span className="text-snow font-medium">
                {stats.stripeActive} Stripe paid + {stats.stripeTrialing} Stripe trial + {stats.patreonActive} Patreon = {stats.withAccess} total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Klaviyo Auto-Sync */}
      <KlaviyoAutoSync />

      {/* Interactive Subscriptions Table */}
      <SubscriptionTable subscriptions={unified} />
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon,
  color = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "default" | "mint" | "warning" | "patreon" | "primary";
}) {
  const colorClasses = {
    default: "bg-grey-700 text-snow/60",
    mint: "bg-success/20 text-success",
    warning: "bg-amber-500/20 text-amber-500",
    patreon: "bg-[#FF424D]/20 text-[#FF424D]",
    primary: "bg-info/20 text-info",
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-h3 text-snow">{value}</p>
          <p className="text-caption text-snow/50">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
