"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Download, Layers, Loader2, Lock, Pause, Play, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { packPath } from "@/lib/pack-url";
import { useAudio } from "@/contexts/AudioContext";
import { usePreviewPlayer } from "@/components/audio/usePreviewPlayer";
import { SmoothWaveform } from "@/components/free-pack/SmoothWaveform";
import { downloadFile } from "@/lib/sample-download";
import { PackCard, type CardPack } from "../PackCard";
import { Rail } from "../Rail";

// The catalog: Packs (cover-lit rails) and Samples (the desktop app's list),
// sharing one filter bar. Everything filters instantly in the browser.

export interface CatalogSample {
  id: string;
  name: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
  peaks: number[];
  hasStems: boolean;
}

export interface CatalogPack extends CardPack {
  genres: string[];
  isBonus: boolean;
  samples: CatalogSample[];
}

type View = "packs" | "samples";
type Avail = "available" | "archived" | "all";

const BPMS = [
  { value: "", label: "Any BPM" },
  { value: "0-70", label: "Under 70" },
  { value: "70-80", label: "70–80" },
  { value: "80-90", label: "80–90" },
  { value: "90-110", label: "90–110" },
  { value: "110-999", label: "110+" },
];

const shortKey = (key: string | null) => key?.replace(/\s*minor$/i, "m").replace(/\s*major$/i, "") ?? "";
const time = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <label className="relative flex-shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-xl border bg-white/[0.04] pl-3.5 pr-9 text-[13px] text-white outline-none transition-colors hover:border-white/30",
          value && value !== "available" && value !== "newest" ? "border-white/45" : "border-white/12"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-black text-white">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/75" />
    </label>
  );
}

export function CatalogBrowser({ packs, hasAccess, isLoggedIn }: { packs: CatalogPack[]; hasAccess: boolean; isLoggedIn: boolean }) {
  const [view, setView] = useState<View>("packs");
  const [query, setQuery] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [avail, setAvail] = useState<Avail>("available");
  const [sort, setSort] = useState("newest");
  const [shown, setShown] = useState(60);

  // Keep the tab in the URL so a shared link opens the same view
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "samples") setView("samples");
  }, []);
  const switchView = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "samples") url.searchParams.set("view", "samples");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };

  const keys = useMemo(
    () => Array.from(new Set(packs.flatMap((p) => p.samples.map((s) => s.key)).filter((k): k is string => !!k))).sort(),
    [packs]
  );

  const q = query.trim().toLowerCase();
  const [lo, hi] = bpm ? bpm.split("-").map(Number) : [0, 999];
  const sampleMatches = (s: CatalogSample, p: CatalogPack) =>
    (!key || s.key === key) &&
    (!bpm || (s.bpm != null && s.bpm >= lo && s.bpm < hi)) &&
    (!q || s.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || shortKey(s.key).toLowerCase() === q);
  const packInScope = (p: CatalogPack) => avail === "all" || (avail === "archived" ? p.archived : !p.archived);
  const filtering = !!(q || key || bpm) || avail !== "available";

  const rows = useMemo(() => {
    const list = packs
      .filter(packInScope)
      .flatMap((p) => p.samples.filter((s) => sampleMatches(s, p)).map((s) => ({ s, p })));
    if (sort === "name") list.sort((a, b) => a.s.name.localeCompare(b.s.name));
    if (sort === "bpm") list.sort((a, b) => (a.s.bpm ?? 999) - (b.s.bpm ?? 999));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packs, q, key, bpm, avail, sort]);

  const matchingPacks = useMemo(
    () => packs.filter((p) => packInScope(p) && (p.samples.some((s) => sampleMatches(s, p)) || (!key && !bpm && (!q || p.name.toLowerCase().includes(q))))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packs, q, key, bpm, avail]
  );

  const current = packs.filter((p) => !p.archived && !p.isBonus);
  const genreRails = Array.from(
    current.reduce((m, p) => {
      p.genres.forEach((g) => m.set(g, [...(m.get(g) ?? []), p]));
      return m;
    }, new Map<string, CatalogPack[]>())
  ).filter(([, list]) => list.length >= 3);
  const rails: { title: string; list: CatalogPack[] }[] = [
    { title: "New releases", list: current.filter((p) => !p.is_returned) },
    { title: "Back by popular demand", list: current.filter((p) => p.is_returned) },
    ...genreRails.map(([g, list]) => ({ title: g, list })),
    { title: "Member bonus", list: packs.filter((p) => p.isBonus && !p.archived) },
    { title: "Archive · preview only", list: packs.filter((p) => p.archived) },
  ].filter((r) => r.list.length);

  const clear = () => {
    setQuery("");
    setKey("");
    setBpm("");
    setAvail("available");
  };

  return (
    <div>
      {/* Filter bar: sits under the floating menu while you scroll */}
      <div className="ssc-under-nav sticky z-30 -mx-2 px-2 pb-3 pt-1">
        <div
          className="ssc-glass ssc-glass--plain ssc-glass--blur flex flex-wrap items-center gap-2 rounded-2xl p-2"
          style={{ background: "linear-gradient(180deg, rgba(18,18,18,0.9), rgba(8,8,8,0.88))" }}
        >
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1" role="tablist">
            {(["packs", "samples"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => switchView(v)}
                className={cn(
                  "h-8 rounded-lg px-4 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  view === v ? "bg-white text-black" : "text-white/75 hover:text-white"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <label className="relative flex h-10 min-w-[180px] flex-1 items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-white/55" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search samples, packs, keys…"
              className="h-full w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-9 text-[14px] text-white outline-none placeholder:text-white/55 focus:border-white/35"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2.5 text-white/55 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <div className="-mx-1 flex w-full gap-2 overflow-x-auto px-1 [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden">
            <Select label="Availability" value={avail} onChange={(v) => setAvail(v as Avail)} options={[{ value: "available", label: "Available" }, { value: "archived", label: "Archived" }, { value: "all", label: "All packs" }]} />
            <Select label="Key" value={key} onChange={setKey} options={[{ value: "", label: "Any key" }, ...keys.map((k) => ({ value: k, label: k }))]} />
            <Select label="BPM" value={bpm} onChange={setBpm} options={BPMS} />
            {view === "samples" && (
              <Select label="Sort" value={sort} onChange={setSort} options={[{ value: "newest", label: "Newest" }, { value: "name", label: "Name" }, { value: "bpm", label: "BPM" }]} />
            )}
          </div>
        </div>
      </div>

      {view === "packs" ? (
        filtering ? (
          <div className="mt-6">
            <ResultLine count={matchingPacks.length} noun="pack" onClear={clear} />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {matchingPacks.map((p) => (
                <PackCard key={p.id} pack={p} className="!w-full" />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-14">
            {rails.map((r, railIndex) => (
              <Rail
                key={r.title}
                title={
                  <h2 className="flex items-baseline gap-3">
                    <span className="ssc-display text-[clamp(1.3rem,2.4vw,1.8rem)]">{r.title}</span>
                    <span className="text-[13px] text-white/55">{r.list.length}</span>
                  </h2>
                }
                tabs={[{ label: r.title, items: r.list.map((p, i) => <PackCard key={p.id} pack={p} priority={railIndex === 0 && i < 4} />) }]}
              />
            ))}
          </div>
        )
      ) : (
        <div className="mt-6">
          <ResultLine count={rows.length} noun="sample" onClear={filtering ? clear : undefined} />
          <div className="ssc-glass ssc-glass--plain mt-5 overflow-hidden rounded-[22px]">
            <div className="hidden grid-cols-[44px_minmax(0,1.3fr)_minmax(0,2fr)_64px_84px_92px] items-center gap-4 border-b border-white/[0.08] px-5 py-3 md:grid">
              {["", "Sample", "Waveform", "BPM", "Key", ""].map((h, i) => (
                <span key={i} className="ssc-label">
                  {h}
                </span>
              ))}
            </div>
            {rows.slice(0, shown).map(({ s, p }) => (
              <SampleLine key={s.id} sample={s} pack={p} canDownload={hasAccess && !p.archived} isLoggedIn={isLoggedIn} />
            ))}
            {rows.length === 0 && <p className="px-5 py-16 text-center text-white/55">Nothing matches those filters.</p>}
          </div>
          {rows.length > shown && (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={() => setShown((n) => n + 60)} className="ssc-btn ssc-btn--ghost">
                Show more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultLine({ count, noun, onClear }: { count: number; noun: string; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-4 text-[13px] text-white/55">
      <span>
        {count} {noun}
        {count === 1 ? "" : "s"}
      </span>
      {onClear && (
        <button type="button" onClick={onClear} className="font-medium text-white underline underline-offset-4">
          Clear filters
        </button>
      )}
    </div>
  );
}

/** One row of the Samples view, laid out like the desktop app */
function SampleLine({ sample: s, pack: p, canDownload, isLoggedIn }: { sample: CatalogSample; pack: CatalogPack; canDownload: boolean; isLoggedIn: boolean }) {
  const player = usePreviewPlayer();
  const { currentTrack, currentTime, duration } = useAudio();
  const [busy, setBusy] = useState<null | "wav" | "stems">(null);
  const [progress, setProgress] = useState(0);
  const isCurrent = currentTrack?.id === s.id;
  const playing = player.isTrackPlaying(s.id);

  const get = async (kind: "wav" | "stems") => {
    setBusy(kind);
    try {
      await downloadFile({
        endpoint: kind === "wav" ? `/api/download/${s.id}` : `/api/download/${s.id}/stems`,
        packName: p.name,
        fileName: kind === "wav" ? `${s.name}.wav` : `${s.name}-stems.zip`,
        onProgress: setProgress,
      });
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  return (
    <div
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-white/[0.05] px-3 py-3 last:border-b-0 sm:px-5 md:grid-cols-[44px_minmax(0,1.3fr)_minmax(0,2fr)_64px_84px_92px] md:gap-4",
        isCurrent ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
      )}
    >
      <button
        type="button"
        onClick={() => player.toggle({ id: s.id, name: s.name, packName: p.name, bpm: s.bpm, key: s.key, duration: s.duration })}
        aria-label={playing ? `Pause ${s.name}` : `Play ${s.name}`}
        className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors", playing ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}
      >
        {player.loadingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
      </button>
      <div className="flex min-w-0 items-center gap-3">
        <Link href={packPath(p)} className="relative hidden h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg sm:block">
          {p.cover_image_url && <Image src={p.cover_image_url} alt="" fill sizes="40px" className="object-cover" />}
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold uppercase tracking-[0.02em] text-white">{s.name}</p>
          <p className="truncate text-[12px] text-white/55">
            <Link href={packPath(p)} className="hover:text-white">
              {p.name}
            </Link>
            {s.duration ? ` · ${time(s.duration)}` : ""}
            <span className="md:hidden">{[s.bpm && ` · ${s.bpm} BPM`, s.key && ` · ${shortKey(s.key)}`].filter(Boolean).join("")}</span>
          </p>
        </div>
      </div>
      <SmoothWaveform peaks={s.peaks} progress={isCurrent && duration ? currentTime / duration : 0} className="col-span-3 block h-8 w-full md:col-span-1" />
      <span className="hidden text-[13px] tabular-nums text-white/75 md:block">{s.bpm ?? "–"}</span>
      <span className="hidden md:block">
        {s.key && <span className="rounded-full border border-white/12 px-2.5 py-1 text-[12px] text-white/75">{s.key}</span>}
      </span>
      <div className="col-start-3 row-start-1 flex items-center justify-end gap-1.5 md:col-start-auto md:row-start-auto">
        {canDownload ? (
          <>
            {s.hasStems && (
              <button type="button" onClick={() => get("stems")} disabled={!!busy} aria-label={`Download stems for ${s.name}`} title="Stems" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/75 transition-colors hover:border-white/35 hover:text-white">
                {busy === "stems" ? <span className="text-[10px] tabular-nums">{progress}%</span> : <Layers className="h-4 w-4" />}
              </button>
            )}
            <button type="button" onClick={() => get("wav")} disabled={!!busy} aria-label={`Download ${s.name}`} title="WAV" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/75 transition-colors hover:border-white/35 hover:text-white">
              {busy === "wav" ? <span className="text-[10px] tabular-nums">{progress}%</span> : <Download className="h-4 w-4" />}
            </button>
          </>
        ) : p.archived ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Archived</span>
        ) : (
          <Link href="/subscribe" aria-label={isLoggedIn ? "Subscribe to download" : "Join to download"} title="Join to download" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/75 transition-colors hover:border-white/35 hover:text-white">
            <Lock className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
