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
import { glowStyle } from "@/components/ssc/Glass";
import type { Sample, Pack } from "@/types/database";
import { packPath } from "@/lib/pack-url";

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
  /** Cover colour per pack id ("r, g, b"), so each pack box glows in its own light */
  packGlows?: Record<string, string>;
}

type TabType = "liked" | "downloaded";

export function LibraryTabs({
  likedGroups,
  downloadGroups,
  likedSampleIds: initialLikedIds,
  canDownload,
  totalLiked,
  totalDownloaded,
  packGlows = {},
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

  const tabs: { id: TabType; label: string; count: number; icon: typeof Heart }[] = [
    { id: "liked", label: "Liked", count: totalLiked, icon: Heart },
    { id: "downloaded", label: "Downloaded", count: totalDownloaded, icon: Download },
  ];

  return (
    <div className="space-y-5">
      {/* One glass bar: tabs, search and expand controls */}
      <div className="ssc-glass ssc-glass--plain flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <div className="flex rounded-xl border border-white/10 bg-black/40 p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-4",
                activeTab === t.id ? "bg-white text-black" : "text-white/75 hover:text-white"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={cn("tabular-nums", activeTab === t.id ? "text-black/70" : "text-white/55")}>{t.count}</span>
            </button>
          ))}
        </div>

        <label className="relative flex h-10 min-w-[200px] flex-1 items-center">
          <span className="sr-only">Search your library</span>
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-white/55" />
          <input
            type="text"
            placeholder="Search samples, packs, BPM, key"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-9 text-[14px] text-white outline-none transition-colors placeholder:text-white/55 focus:border-white/35"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-white/55 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        {filteredGroups.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="h-10 rounded-xl px-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="h-10 rounded-xl px-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Results summary */}
      {searchQuery && (
        <p className="text-[13px] text-white/55">
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
              glow={packGlows[group.pack.id]}
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
  glow?: string;
  isExpanded: boolean;
  onToggle: () => void;
  canDownload: boolean;
  likedIds: Set<string>;
  onToggleLike: (sampleId: string) => void;
}

function PackGroupCard({
  group,
  glow,
  isExpanded,
  onToggle,
  canDownload,
  likedIds,
  onToggleLike,
}: PackGroupCardProps) {
  const { pack, samples } = group;

  return (
    <div className={cn("ssc-glass overflow-hidden rounded-[22px]", !glow && "ssc-glass--plain")} style={glowStyle(glow)}>
      {/* Pack Header - Clickable */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-white/[0.03] sm:p-4"
      >
        {/* Pack Cover */}
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[14px] bg-white/[0.06] sm:h-16 sm:w-16">
          {pack.cover_image_url ? (
            <Image
              src={pack.cover_image_url}
              alt={pack.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-6 w-6 text-white/55" />
            </div>
          )}
        </div>

        {/* Pack Info */}
        <div className="min-w-0 flex-1">
          <h3 className="ssc-display truncate text-[15px] leading-tight sm:text-[17px]">{pack.name}</h3>
          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-white/55">
            <span className="flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              {samples.length} {samples.length === 1 ? "composition" : "compositions"}
            </span>
            <span>{formatDate(pack.release_date)}</span>
          </div>
        </div>

        {/* View Pack Link */}
        <Link
          href={packPath(pack)}
          onClick={(e) => e.stopPropagation()}
          className="hidden rounded-full border border-white/14 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors hover:border-white/35 hover:text-white sm:block"
        >
          View pack
        </Link>

        {/* Expand/Collapse Icon */}
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/75">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Samples List - Collapsible */}
      {isExpanded && (
        <div className="space-y-1 border-t border-white/[0.08] p-2 sm:p-3">
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
  const Icon = hasSearch ? Search : type === "liked" ? Heart : Download;
  const title = hasSearch ? "No results" : type === "liked" ? "Nothing liked yet" : "No downloads yet";
  const body = hasSearch
    ? <>Nothing in this tab matches &quot;{searchQuery}&quot;.</>
    : type === "liked"
      ? "Tap the heart on any sample and it will be saved here."
      : "Samples you download from the catalog will show up here.";

  return (
    <div className="ssc-glass ssc-glass--plain flex flex-col items-center rounded-[24px] px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
        <Icon className="h-5 w-5 text-white/75" />
      </span>
      <p className="ssc-display mt-5 text-[1.3rem]">{title}</p>
      <p className="ssc-body mt-2 max-w-sm text-[15px]">{body}</p>
      {!hasSearch && (
        <Link href="/feed" className="ssc-btn ssc-btn--primary mt-6">
          Browse the catalog
        </Link>
      )}
    </div>
  );
}
