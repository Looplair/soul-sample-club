"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Users as UsersIcon,
  CreditCard,
  Mail,
  Calendar,
  RefreshCw,
  FileDown,
  Copy,
  Check,
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
interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  subscription: Array<{
    status: string;
    current_period_end: string;
  }> | null;
}

interface PatreonLink {
  user_id: string;
  is_active: boolean;
  tier_title: string | null;
}

interface DownloadCount {
  user_id: string;
}

type SortField = "created_at" | "email" | "full_name" | "downloads";
type SortDirection = "asc" | "desc";
type SubscriptionFilter = "all" | "active" | "trialing" | "canceled" | "patreon" | "none";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const [patreonLinks, setPatreonLinks] = useState<Record<string, PatreonLink>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);

    const [usersResult, downloadsResult, patreonResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          `
          id,
          email,
          full_name,
          is_admin,
          created_at,
          subscription:subscriptions(status, current_period_end)
        `
        )
        .order("created_at", { ascending: false }),
      supabase.from("downloads").select("user_id"),
      supabase.from("patreon_links").select("user_id, is_active, tier_title"),
    ]);

    if (usersResult.data) {
      setUsers(usersResult.data as UserRow[]);
    }

    if (downloadsResult.data) {
      const counts: Record<string, number> = {};
      for (const row of downloadsResult.data as DownloadCount[]) {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
      }
      setDownloadCounts(counts);
    }

    if (patreonResult.data) {
      const links: Record<string, PatreonLink> = {};
      for (const row of patreonResult.data as PatreonLink[]) {
        links[row.user_id] = row;
      }
      setPatreonLinks(links);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.full_name?.toLowerCase().includes(query)
      );
    }

    // Subscription filter
    if (subscriptionFilter !== "all") {
      result = result.filter((user) => {
        const sub = user.subscription?.[0];
        const patreon = patreonLinks[user.id];

        if (subscriptionFilter === "none") {
          return !sub && !patreon?.is_active;
        }
        if (subscriptionFilter === "patreon") {
          return patreon?.is_active;
        }
        return sub?.status === subscriptionFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "full_name":
          comparison = (a.full_name || "").localeCompare(b.full_name || "");
          break;
        case "downloads":
          comparison = (downloadCounts[a.id] || 0) - (downloadCounts[b.id] || 0);
          break;
        case "created_at":
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [users, searchQuery, subscriptionFilter, sortField, sortDirection, downloadCounts, patreonLinks]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const withStripeSub = users.filter((u) => {
      const status = u.subscription?.[0]?.status;
      return status === "active" || status === "trialing";
    }).length;
    const withPatreon = users.filter((u) => patreonLinks[u.id]?.is_active).length;
    const noSub = users.filter((u) => !u.subscription?.[0] && !patreonLinks[u.id]?.is_active).length;
    const canceled = users.filter((u) => u.subscription?.[0]?.status === "canceled").length;

    return { total, withStripeSub, withPatreon, noSub, canceled };
  }, [users, patreonLinks]);

  // Export emails function
  const exportEmails = (format: "csv" | "clipboard") => {
    const emails = filteredUsers.map((u) => u.email);

    if (format === "csv") {
      const csvContent = "data:text/csv;charset=utf-8,email,name,subscription_type,joined\n" +
        filteredUsers.map((u) => {
          const subType = u.subscription?.[0]?.status
            ? `stripe_${u.subscription[0].status}`
            : patreonLinks[u.id]?.is_active
              ? "patreon"
              : "free";
          return `${u.email},${u.full_name || ""},${subType},${u.created_at.split("T")[0]}`;
        }).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `soul-sample-club-users-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      navigator.clipboard.writeText(emails.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-snow mb-2">Users</h1>
          <p className="text-body-lg text-snow/60">
            Manage platform users and subscriptions
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <QuickStat
          label="Total Users"
          value={stats.total}
          icon={<UsersIcon className="w-4 h-4" />}
        />
        <QuickStat
          label="Stripe Subs"
          value={stats.withStripeSub}
          icon={<CreditCard className="w-4 h-4" />}
          color="mint"
        />
        <QuickStat
          label="Patreon"
          value={stats.withPatreon}
          icon={<PatreonIcon />}
          color="patreon"
        />
        <QuickStat
          label="Free Users"
          value={stats.noSub}
          icon={<Mail className="w-4 h-4" />}
        />
        <QuickStat
          label="Canceled"
          value={stats.canceled}
          icon={<Calendar className="w-4 h-4" />}
          color="warning"
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-snow/40" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-grey-800 border border-grey-700 rounded-lg text-snow placeholder:text-snow/40 focus:outline-none focus:border-velvet"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filters
              {subscriptionFilter !== "all" && (
                <span className="ml-2 w-2 h-2 rounded-full bg-velvet" />
              )}
            </Button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-grey-700">
              <p className="text-label text-snow/60 mb-3">Subscription Status</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "active", label: "Stripe Active" },
                  { value: "trialing", label: "Stripe Trialing" },
                  { value: "patreon", label: "Patreon" },
                  { value: "canceled", label: "Canceled" },
                  { value: "none", label: "No Subscription" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSubscriptionFilter(option.value as SubscriptionFilter)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      subscriptionFilter === option.value
                        ? "bg-velvet text-white"
                        : "bg-grey-800 text-snow/60 hover:text-snow"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count & Export */}
      <div className="flex items-center justify-between">
        <p className="text-body text-snow/60">
          Showing {filteredUsers.length} of {users.length} users
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportEmails("clipboard")}
            leftIcon={copied ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? "Copied!" : "Copy Emails"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportEmails("csv")}
            leftIcon={<FileDown className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-snow/40 animate-spin mx-auto mb-4" />
              <p className="text-snow/60">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-grey-800">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-label text-snow/60 cursor-pointer hover:text-snow"
                      onClick={() => handleSort("full_name")}
                    >
                      <div className="flex items-center gap-2">
                        User
                        <SortIcon field="full_name" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-label text-snow/60 cursor-pointer hover:text-snow"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center gap-2">
                        Email
                        <SortIcon field="email" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">
                      Subscription
                    </th>
                    <th
                      className="px-4 py-3 text-left text-label text-snow/60 cursor-pointer hover:text-snow"
                      onClick={() => handleSort("downloads")}
                    >
                      <div className="flex items-center gap-2">
                        Downloads
                        <SortIcon field="downloads" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-label text-snow/60 cursor-pointer hover:text-snow"
                      onClick={() => handleSort("created_at")}
                    >
                      <div className="flex items-center gap-2">
                        Joined
                        <SortIcon field="created_at" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-label text-snow/60">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grey-700">
                  {filteredUsers.map((user) => {
                    const subscription = user.subscription?.[0];
                    const patreon = patreonLinks[user.id];
                    const isStripeActive =
                      subscription?.status === "active" ||
                      subscription?.status === "trialing";
                    const isPatreonActive = patreon?.is_active;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-grey-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-snow font-medium">
                            {user.full_name || "No name"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-snow/70 text-sm">{user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {subscription && (
                              <div>
                                <Badge
                                  variant={
                                    subscription.status === "active"
                                      ? "success"
                                      : subscription.status === "trialing"
                                      ? "primary"
                                      : "warning"
                                  }
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  {subscription.status}
                                </Badge>
                                {isStripeActive && (
                                  <p className="text-caption text-snow/50 mt-1">
                                    Until {formatDate(subscription.current_period_end)}
                                  </p>
                                )}
                              </div>
                            )}
                            {isPatreonActive && (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FF424D]/20 text-[#FF424D]">
                                  <PatreonIcon />
                                  {patreon?.tier_title || "Patron"}
                                </span>
                              </div>
                            )}
                            {!subscription && !isPatreonActive && (
                              <span className="text-snow/50 text-sm">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-snow/40" />
                            <span className="text-snow/70">
                              {downloadCounts[user.id] || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-snow/50 text-sm">
                            {formatDate(user.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_admin ? (
                            <Badge variant="primary">Admin</Badge>
                          ) : (
                            <span className="text-snow/50 text-sm">User</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-snow/20 mx-auto mb-4" />
              <p className="text-snow/60">
                {searchQuery || subscriptionFilter !== "all"
                  ? "No users match your filters"
                  : "No users yet"}
              </p>
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
  color?: "default" | "mint" | "warning" | "patreon";
}) {
  const colorClasses = {
    default: "bg-grey-700 text-snow/60",
    mint: "bg-mint/20 text-mint",
    warning: "bg-amber-500/20 text-amber-500",
    patreon: "bg-[#FF424D]/20 text-[#FF424D]",
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
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
