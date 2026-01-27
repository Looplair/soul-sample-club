"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Music,
  Package,
  X,
} from "lucide-react";
import { SampleRowWithLoop as SampleRow } from "@/components/audio/SampleRowWithLoop";
import { cn, formatDate } from "@/lib/utils";
import type { Sample, Pack } from "@/types/database";

interface SampleWithPack extends Sample {
  pack: Pack;
}

interface PackGroup {
  pack: Pack;
  samples: SampleWithPack[];
}

interface LibraryTabsProps {
  likedGroups: PackGroup[];
  downloadGroups: PackGroup[];
  likedSampleIds: string[];
  canDownload: boolean;
  totalLiked: number;
  totalDownloaded: number;
}

type TabType = "liked" | "downloaded";

export function LibraryTabs({
  likedGroups,
  downloadGroups,
  likedSampleIds: initialLikedIds,
  canDownload,
  totalLiked,
  totalDownloaded,
}: LibraryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("liked");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(
    new Set(initialLikedIds)
  );

  const currentGroups = activeTab === "liked" ? likedGroups : downloadGroups;

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return currentGroups;

    const query = searchQuery.toLowerCase();
    return currentGroups
      .map((group) => ({
        ...group,
        samples: group.samples.filter(
          (sample) =>
            sample.name.toLowerCase().includes(query) ||
            sample.pack.name.toLowerCase().includes(query) ||
            (sample.key && sample.key.toLowerCase().includes(query)) ||
            (sample.bpm && sample.bpm.toString().includes(query))
        ),
      }))
      .filter((group) => group.samples.length > 0);
  }, [currentGroups, searchQuery]);

  const togglePackExpanded = useCallback((packId: string) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedPacks(new Set(filteredGroups.map((g) => g.pack.id)));
  }, [filteredGroups]);

  const collapseAll = useCallback(() => {
    setExpandedPacks(new Set());
  }, []);

  const handleToggleLike = useCallback((sampleId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  }, []);

  const totalFilteredSamples = filteredGroups.reduce(
    (acc, group) => acc + group.samples.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-grey-800/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("liked")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "liked"
              ? "bg-white text-charcoal"
              : "text-text-muted hover:text-white hover:bg-grey-700"
          )}
        >
          <Heart className="w-4 h-4" />
          Liked
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-xs",
              activeTab === "liked"
                ? "bg-charcoal/10 text-charcoal"
                : "bg-grey-700 text-text-muted"
            )}
          >
            {totalLiked}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("downloaded")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "downloaded"
              ? "bg-white text-charcoal"
              : "text-text-muted hover:text-white hover:bg-grey-700"
          )}
        >
          <Download className="w-4 h-4" />
          Downloaded
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-xs",
              activeTab === "downloaded"
                ? "bg-charcoal/10 text-charcoal"
                : "bg-grey-700 text-text-muted"
            )}
          >
            {totalDownloaded}
          </span>
        </button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search samples, packs, BPM, key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-grey-800/50 border border-grey-700 rounded-lg text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-grey-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand/Collapse Controls */}
        {filteredGroups.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-text-muted hover:text-white hover:bg-grey-800 rounded-lg transition-colors"
            >
              Expand all
            </button>
            <span className="text-grey-600">|</span>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-text-muted hover:text-white hover:bg-grey-800 rounded-lg transition-colors"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Results summary */}
      {searchQuery && (
        <p className="text-sm text-text-muted">
          Found {totalFilteredSamples}{" "}
          {totalFilteredSamples === 1 ? "sample" : "samples"} in{" "}
          {filteredGroups.length}{" "}
          {filteredGroups.length === 1 ? "pack" : "packs"}
        </p>
      )}

      {/* Grouped Content */}
      {filteredGroups.length === 0 ? (
        <EmptyState
          type={activeTab}
          hasSearch={!!searchQuery.trim()}
          searchQuery={searchQuery}
        />
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <PackGroupCard
              key={group.pack.id}
              group={group}
              isExpanded={expandedPacks.has(group.pack.id)}
              onToggle={() => togglePackExpanded(group.pack.id)}
              canDownload={canDownload}
              likedIds={likedIds}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Pack Group Card Component
interface PackGroupCardProps {
  group: PackGroup;
  isExpanded: boolean;
  onToggle: () => void;
  canDownload: boolean;
  likedIds: Set<string>;
  onToggleLike: (sampleId: string) => void;
}

function PackGroupCard({
  group,
  isExpanded,
  onToggle,
  canDownload,
  likedIds,
  onToggleLike,
}: PackGroupCardProps) {
  const { pack, samples } = group;

  return (
    <div className="bg-grey-800/30 border border-grey-700 rounded-xl overflow-hidden">
      {/* Pack Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-grey-800/50 transition-colors text-left"
      >
        {/* Pack Cover */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-grey-700">
          {pack.cover_image_url ? (
            <Image
              src={pack.cover_image_url}
              alt={pack.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-6 h-6 text-text-muted" />
            </div>
          )}
        </div>

        {/* Pack Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-medium text-white truncate">
            {pack.name}
          </h3>
          <div className="flex items-center gap-3 text-caption text-text-muted mt-1">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {samples.length} {samples.length === 1 ? "sample" : "samples"}
            </span>
            <span>{formatDate(pack.release_date)}</span>
          </div>
        </div>

        {/* View Pack Link */}
        <Link
          href={`/packs/${pack.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hidden sm:block px-3 py-1.5 text-sm text-text-muted hover:text-white hover:bg-grey-700 rounded-lg transition-colors"
        >
          View pack
        </Link>

        {/* Expand/Collapse Icon */}
        <div className="text-text-muted">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Samples List - Collapsible */}
      {isExpanded && (
        <div className="border-t border-grey-700 p-4 space-y-2 sm:space-y-3">
          {samples.map((sample, index) => (
            <SampleRow
              key={sample.id}
              sample={sample}
              index={index + 1}
              canDownload={canDownload}
              isLiked={likedIds.has(sample.id)}
              onToggleLike={() => onToggleLike(sample.id)}
              packName={pack.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  type: TabType;
  hasSearch: boolean;
  searchQuery: string;
}

function EmptyState({ type, hasSearch, searchQuery }: EmptyStateProps) {
  if (hasSearch) {
    return (
      <div className="bg-grey-800/50 border border-grey-700 rounded-card text-center py-12">
        <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-body text-text-muted mb-1">No results found</p>
        <p className="text-caption text-text-subtle">
          No samples match &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="bg-grey-800/50 border border-grey-700 rounded-card text-center py-12">
      {type === "liked" ? (
        <>
          <Heart className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-body text-text-muted mb-1">No liked samples yet</p>
          <p className="text-caption text-text-subtle">
            Browse packs and click the heart icon to save samples you love
          </p>
          <Link
            href="/feed"
            className="inline-block mt-4 px-4 py-2 bg-white text-charcoal rounded-lg text-sm font-medium hover:bg-snow transition-colors"
          >
            Browse packs
          </Link>
        </>
      ) : (
        <>
          <Download className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-body text-text-muted mb-1">No downloads yet</p>
          <p className="text-caption text-text-subtle">
            Download samples to build your collection
          </p>
          <Link
            href="/feed"
            className="inline-block mt-4 px-4 py-2 bg-white text-charcoal rounded-lg text-sm font-medium hover:bg-snow transition-colors"
          >
            Browse packs
          </Link>
        </>
      )}
    </div>
  );
}
