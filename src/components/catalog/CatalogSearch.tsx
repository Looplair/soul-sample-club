"use client";

import { useState, useMemo } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { PackCard } from "@/components/packs/PackCard";
import type { Sample } from "@/types/database";

interface PackWithSamples {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_staff_pick?: boolean;
  is_bonus: boolean;
  created_at: string;
  updated_at: string;
  samples: Sample[];
}

interface CatalogSearchProps {
  packs: PackWithSamples[];
  hasSubscription: boolean;
}

type SortOption = "newest" | "oldest" | "name";

export function CatalogSearch({ packs, hasSubscription }: CatalogSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedPacks = useMemo(() => {
    let result = [...packs];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((pack) => {
        // Search in pack name and description
        if (pack.name.toLowerCase().includes(query)) return true;
        if (pack.description.toLowerCase().includes(query)) return true;

        // Search in sample names, keys, and BPM
        if (pack.samples?.some((sample) => {
          if (sample.name.toLowerCase().includes(query)) return true;
          if (sample.key?.toLowerCase().includes(query)) return true;
          if (sample.bpm?.toString().includes(query)) return true;
          return false;
        })) return true;

        return false;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        case "oldest":
          return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [packs, searchQuery, sortBy]);

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search packs, samples, BPM, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-grey-800 border border-grey-700 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle & Sort */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              showFilters
                ? "bg-white/10 border-white/20 text-white"
                : "bg-grey-800 border-grey-700 text-text-muted hover:text-white hover:border-grey-600"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2.5 bg-grey-800 border border-grey-700 rounded-lg text-white focus:outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Expanded Filters (placeholder for future BPM/Key filters) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-grey-800/50 border border-grey-700 rounded-lg">
          <p className="text-sm text-text-muted">
            Tip: Search by BPM (e.g., &quot;90&quot;) or musical key (e.g., &quot;C minor&quot;) to find matching samples.
          </p>
        </div>
      )}

      {/* Results Count */}
      {searchQuery && (
        <div className="mb-4">
          <p className="text-sm text-text-muted">
            {filteredAndSortedPacks.length} {filteredAndSortedPacks.length === 1 ? "pack" : "packs"} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>
      )}

      {/* Packs Grid */}
      {filteredAndSortedPacks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredAndSortedPacks.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
              hasSubscription={hasSubscription}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-grey-800/30 rounded-xl">
          <Search className="w-12 h-12 text-text-subtle mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No packs found</h3>
          <p className="text-text-muted mb-4">
            Try adjusting your search or filters
          </p>
          <button
            onClick={handleClearSearch}
            className="text-white underline hover:no-underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
