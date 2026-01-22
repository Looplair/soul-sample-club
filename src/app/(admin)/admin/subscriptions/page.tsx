"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  Users as UsersIcon,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";

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
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
}

interface PatreonLink {
  user_id: string;
  patreon_email: string;
  is_active: boolean;
  tier_title: string | null;
  updated_at: string;
}

interface UnifiedSubscription {
  userId: string;
  email: string;
  fullName: string | null;
  source: "stripe" | "patreon" | "none";
  status: "active" | "trialing" | "canceled" | "past_due" | "inactive" | "none";
  tierOrPlan: string | null;
  periodEnd: string | null;
  hasAccess: boolean;
  joinedAt: string;
}

type StatusFilter = "all" | "has_access" | "trialing" | "active" | "canceled" | "no_access";
type SourceFilter = "all" | "stripe" | "patreon" | "none";

export default function AdminSubscriptionsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [patreonLinks, setPatreonLinks] = useState<PatreonLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    const [profilesResult, subscriptionsResult, patreonResult] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at"),
      supabase.from("subscriptions").select("user_id, status, current_period_start, current_period_end, trial_end"),
      supabase.from("patreon_links").select("user_id, patreon_email, is_active, tier_title, updated_at"),
    ]);

    if (profilesResult.data) setProfiles(profilesResult.data as Profile[]);
    if (subscriptionsResult.data) setSubscriptions(subscriptionsResult.data as Subscription[]);
    if (patreonResult.data) setPatreonLinks(patreonResult.data as PatreonLink[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build unified subscription list
  const unifiedSubscriptions = useMemo(() => {
    const subMap = new Map<string, Subscription>();
    for (const sub of subscriptions) {
      subMap.set(sub.user_id, sub);
    }

    const patreonMap = new Map<string, PatreonLink>();
    for (const link of patreonLinks) {
      patreonMap.set(link.user_id, link);
    }

    return profiles.map((profile): UnifiedSubscription => {
      const stripeSub = subMap.get(profile.id);
      const patreonLink = patreonMap.get(profile.id);

      // Determine primary source and status
      let source: UnifiedSubscription["source"] = "none";
      let status: UnifiedSubscription["status"] = "none";
      let tierOrPlan: string | null = null;
      let periodEnd: string | null = null;
      let hasAccess = false;

      // Priority: Active Stripe > Trialing Stripe > Active Patreon > Canceled > None
      if (stripeSub) {
        if (stripeSub.status === "active" || stripeSub.status === "trialing") {
          source = "stripe";
          status = stripeSub.status as "active" | "trialing";
          periodEnd = stripeSub.current_period_end;
          hasAccess = true;
        } else if (stripeSub.status === "past_due") {
          source = "stripe";
          status = "past_due";
          periodEnd = stripeSub.current_period_end;
          hasAccess = false;
        } else if (stripeSub.status === "canceled") {
          source = "stripe";
          status = "canceled";
          periodEnd = stripeSub.current_period_end;
          hasAccess = false;
        }
      }

      // If no active Stripe, check Patreon
      if (!hasAccess && patreonLink) {
        if (patreonLink.is_active) {
          source = "patreon";
          status = "active"; // Patreon doesn't have "trialing" - they're either pledged or not
          tierOrPlan = patreonLink.tier_title;
          hasAccess = true;
        } else {
          // Has Patreon link but not active
          if (source === "none") {
            source = "patreon";
            status = "inactive";
          }
        }
      }

      return {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        source,
        status,
        tierOrPlan,
        periodEnd,
        hasAccess,
        joinedAt: profile.created_at,
      };
    });
  }, [profiles, subscriptions, patreonLinks]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    let result = [...unifiedSubscriptions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.email.toLowerCase().includes(query) ||
          sub.fullName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((sub) => {
        switch (statusFilter) {
          case "has_access":
            return sub.hasAccess;
          case "trialing":
            return sub.status === "trialing";
          case "active":
            return sub.status === "active";
          case "canceled":
            return sub.status === "canceled";
          case "no_access":
            return !sub.hasAccess;
          default:
            return true;
        }
      });
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((sub) => sub.source === sourceFilter);
    }

    // Sort by access status, then by join date
    result.sort((a, b) => {
      if (a.hasAccess !== b.hasAccess) return a.hasAccess ? -1 : 1;
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });

    return result;
  }, [unifiedSubscriptions, searchQuery, statusFilter, sourceFilter]);

  // Stats
  const stats = useMemo(() => {
    const withAccess = unifiedSubscriptions.filter((s) => s.hasAccess).length;
    const stripeActive = unifiedSubscriptions.filter((s) => s.source === "stripe" && s.status === "active").length;
    const stripeTrialing = unifiedSubscriptions.filter((s) => s.source === "stripe" && s.status === "trialing").length;
    const patreonActive = unifiedSubscriptions.filter((s) => s.source === "patreon" && s.hasAccess).length;
    const noAccess = unifiedSubscriptions.filter((s) => !s.hasAccess).length;
    const canceled = unifiedSubscriptions.filter((s) => s.status === "canceled").length;

    return { withAccess, stripeActive, stripeTrialing, patreonActive, noAccess, canceled };
  }, [unifiedSubscriptions]);

  const getStatusBadge = (sub: UnifiedSubscription) => {
    if (sub.source === "stripe") {
      switch (sub.status) {
        case "active":
          return (
            <Badge variant="success">
              <CreditCard className="w-3 h-3 mr-1" />
              Stripe Active
            </Badge>
          );
        case "trialing":
          return (
            <Badge variant="primary">
              <Clock className="w-3 h-3 mr-1" />
              Stripe Trial
            </Badge>
          );
        case "canceled":
          return (
            <Badge variant="warning">
              <XCircle className="w-3 h-3 mr-1" />
              Canceled
            </Badge>
          );
        case "past_due":
          return (
            <Badge variant="error">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Past Due
            </Badge>
          );
      }
    }

    if (sub.source === "patreon") {
      if (sub.hasAccess) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FF424D]/20 text-[#FF424D]">
            <PatreonIcon />
            {sub.tierOrPlan || "Patron"}
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-grey-700 text-snow/50">
            <PatreonIcon />
            Inactive
          </span>
        );
      }
    }

    return <span className="text-snow/40 text-sm">No subscription</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-snow mb-2">Subscriptions</h1>
          <p className="text-body-lg text-snow/60">
            Unified view of all member subscriptions
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchData}
          disabled={loading}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <QuickStat
          label="Total Access"
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
          value={stats.canceled}
          icon={<XCircle className="w-4 h-4" />}
          color="warning"
        />
        <QuickStat
          label="No Access"
          value={stats.noAccess}
          icon={<UsersIcon className="w-4 h-4" />}
          color="default"
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-snow/40" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-grey-800 border border-grey-700 rounded-lg text-snow placeholder:text-snow/40 focus:outline-none focus:border-velvet"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filters
              {(statusFilter !== "all" || sourceFilter !== "all") && (
                <span className="ml-2 w-2 h-2 rounded-full bg-velvet" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-grey-700 space-y-4">
              <div>
                <p className="text-label text-snow/60 mb-3">Access Status</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All" },
                    { value: "has_access", label: "Has Access" },
                    { value: "trialing", label: "Trialing" },
                    { value: "active", label: "Active" },
                    { value: "canceled", label: "Canceled" },
                    { value: "no_access", label: "No Access" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusFilter(option.value as StatusFilter)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        statusFilter === option.value
                          ? "bg-velvet text-white"
                          : "bg-grey-800 text-snow/60 hover:text-snow"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-label text-snow/60 mb-3">Source</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All Sources" },
                    { value: "stripe", label: "Stripe" },
                    { value: "patreon", label: "Patreon" },
                    { value: "none", label: "No Subscription" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSourceFilter(option.value as SourceFilter)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        sourceFilter === option.value
                          ? "bg-velvet text-white"
                          : "bg-grey-800 text-snow/60 hover:text-snow"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-body text-snow/60">
        Showing {filteredSubscriptions.length} of {unifiedSubscriptions.length} members
      </p>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-snow/40 animate-spin mx-auto mb-4" />
              <p className="text-snow/60">Loading subscriptions...</p>
            </div>
          ) : filteredSubscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-grey-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-label text-snow/60">Email</th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">Name</th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">Subscription</th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">Access</th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">Period End</th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grey-700">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.userId} className="hover:bg-grey-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-snow text-sm">{sub.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-snow/70 text-sm">{sub.fullName || "—"}</p>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(sub)}</td>
                      <td className="px-4 py-3">
                        {sub.hasAccess ? (
                          <span className="inline-flex items-center gap-1 text-mint text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-snow/40 text-sm">
                            <XCircle className="w-4 h-4" />
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-snow/50 text-sm">
                          {sub.periodEnd ? formatDate(sub.periodEnd) : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-snow/50 text-sm">{formatDate(sub.joinedAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-snow/20 mx-auto mb-4" />
              <p className="text-snow/60">No subscriptions match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
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
    mint: "bg-mint/20 text-mint",
    warning: "bg-amber-500/20 text-amber-500",
    patreon: "bg-[#FF424D]/20 text-[#FF424D]",
    primary: "bg-velvet/20 text-velvet",
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
