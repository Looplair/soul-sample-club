"use client";

import { useState, useMemo } from "react";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";

// Patreon Icon
const PatreonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FF424D">
    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
  </svg>
);

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

interface SubscriptionTableProps {
  subscriptions: UnifiedSubscription[];
}

type FilterType = "all" | "with_access" | "stripe_active" | "stripe_trialing" | "patreon" | "no_access" | "canceled";

const ITEMS_PER_PAGE = 25;

export function SubscriptionTable({ subscriptions }: SubscriptionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search
  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions;

    // Apply filter
    if (filter !== "all") {
      result = result.filter((sub) => {
        switch (filter) {
          case "with_access":
            return sub.hasAccess;
          case "stripe_active":
            return sub.accessSource === "stripe_active";
          case "stripe_trialing":
            return sub.accessSource === "stripe_trialing";
          case "patreon":
            return sub.accessSource === "patreon";
          case "no_access":
            return !sub.hasAccess;
          case "canceled":
            return sub.stripeStatus === "canceled";
          default:
            return true;
        }
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.email.toLowerCase().includes(query) ||
          (sub.fullName && sub.fullName.toLowerCase().includes(query))
      );
    }

    // Sort: those with access first, then by join date
    return result.sort((a, b) => {
      if (a.hasAccess !== b.hasAccess) return a.hasAccess ? -1 : 1;
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });
  }, [subscriptions, filter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter/search changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const filterOptions: { value: FilterType; label: string; count: number }[] = [
    { value: "all", label: "All", count: subscriptions.length },
    { value: "with_access", label: "With Access", count: subscriptions.filter((s) => s.hasAccess).length },
    { value: "stripe_active", label: "Stripe Active", count: subscriptions.filter((s) => s.accessSource === "stripe_active").length },
    { value: "stripe_trialing", label: "Stripe Trial", count: subscriptions.filter((s) => s.accessSource === "stripe_trialing").length },
    { value: "patreon", label: "Patreon", count: subscriptions.filter((s) => s.accessSource === "patreon").length },
    { value: "no_access", label: "No Access", count: subscriptions.filter((s) => !s.hasAccess).length },
    { value: "canceled", label: "Canceled", count: subscriptions.filter((s) => s.stripeStatus === "canceled").length },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-snow/40" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-grey-800/50 border border-grey-700 rounded-lg text-sm text-snow placeholder:text-snow/40 focus:outline-none focus:border-grey-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-snow/40 hover:text-snow transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-snow/40" />
            <select
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value as FilterType)}
              className="bg-grey-800/50 border border-grey-700 rounded-lg px-3 py-2.5 text-sm text-snow focus:outline-none focus:border-grey-600 transition-colors cursor-pointer"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter Pills (Quick Filters) */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              filter === option.value
                ? "bg-white text-charcoal"
                : "bg-grey-800 text-snow/60 hover:text-snow hover:bg-grey-700"
            )}
          >
            {option.label}
            <span className="ml-1.5 opacity-60">{option.count}</span>
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-snow/60">
        <p>
          Showing {paginatedSubscriptions.length} of {filteredSubscriptions.length} members
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
        {totalPages > 1 && (
          <p>
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-grey-800/30 border border-grey-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-grey-800">
              <tr>
                <th className="px-4 py-3 text-left text-label text-snow/60">Email</th>
                <th className="px-4 py-3 text-left text-label text-snow/60">Name</th>
                <th className="px-4 py-3 text-left text-label text-snow/60">Stripe</th>
                <th className="px-4 py-3 text-left text-label text-snow/60">Patreon</th>
                <th className="px-4 py-3 text-left text-label text-snow/60">Access</th>
                <th className="px-4 py-3 text-left text-label text-snow/60">Source</th>
                <th className="px-4 py-3 text-left text-label text-snow/60">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-700">
              {paginatedSubscriptions.length > 0 ? (
                paginatedSubscriptions.map((sub) => (
                  <tr key={sub.userId} className="hover:bg-grey-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-snow text-sm">{sub.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-snow/70 text-sm">{sub.fullName || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {sub.stripeStatus ? (
                        <div>
                          <Badge
                            variant={
                              sub.stripeStatus === "active"
                                ? "success"
                                : sub.stripeStatus === "trialing"
                                ? "primary"
                                : "warning"
                            }
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            {sub.stripeStatus}
                          </Badge>
                          {sub.stripePeriodEnd && (
                            <p className="text-caption text-snow/40 mt-1">
                              Until {formatDate(sub.stripePeriodEnd)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-snow/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub.patreonActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FF424D]/20 text-[#FF424D]">
                          <PatreonIcon />
                          {sub.patreonTier || "Active"}
                        </span>
                      ) : (
                        <span className="text-snow/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub.hasAccess ? (
                        <span className="inline-flex items-center gap-1 text-mint text-sm font-medium">
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
                      <span className={`text-sm ${sub.hasAccess ? "text-snow" : "text-snow/40"}`}>
                        {sub.accessSource === "stripe_active" && "Stripe (paid)"}
                        {sub.accessSource === "stripe_trialing" && "Stripe (trial)"}
                        {sub.accessSource === "patreon" && "Patreon"}
                        {sub.accessSource === "none" && "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-snow/50 text-sm">{formatDate(sub.joinedAt)}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Search className="w-8 h-8 text-snow/20 mx-auto mb-2" />
                    <p className="text-snow/40 text-sm">No members found</p>
                    {searchQuery && (
                      <button
                        onClick={() => handleSearchChange("")}
                        className="text-velvet hover:text-velvet-light text-sm mt-2"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              currentPage === 1
                ? "text-snow/30 cursor-not-allowed"
                : "text-snow hover:bg-grey-800"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                    currentPage === pageNum
                      ? "bg-white text-charcoal"
                      : "text-snow/60 hover:text-snow hover:bg-grey-800"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              currentPage === totalPages
                ? "text-snow/30 cursor-not-allowed"
                : "text-snow hover:bg-grey-800"
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
