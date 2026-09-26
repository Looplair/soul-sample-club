"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewPlayer } from "@/components/audio/usePreviewPlayer";
import type { GenrePack } from "@/lib/genre-data";
import { packPath } from "@/lib/pack-url";

function tempo(p: GenrePack): string | null {
  const bpms = p.samples.map((s) => s.bpm).filter((b): b is number => !!b && b >= 40 && b <= 200);
  if (!bpms.length) return null;
  const [lo, hi] = [Math.min(...bpms), Math.max(...bpms)];
  return lo === hi ? `${lo} BPM` : `${lo}–${hi} BPM`;
}

function PackTile({ pack, player }: { pack: GenrePack; player: ReturnType<typeof usePreviewPlayer> }) {
  const first = pack.samples[0];
  const playing = !!first && player.isTrackPlaying(first.id);
  const meta = [`${pack.samples.length} tracks`, tempo(pack)].filter(Boolean).join(" · ");

  return (
    <div className="group">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-grey-800">
        <Link href={packPath(pack)} aria-label={pack.name}>
          {pack.cover_image_url && (
            <Image
              src={pack.cover_image_url}
              alt={pack.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
        </Link>
        {first && (
          <button
            type="button"
            onClick={() =>
              player.toggle({ id: first.id, name: first.name, packName: pack.name, bpm: first.bpm, key: first.key, duration: first.duration })
            }
            aria-label={playing ? `Pause ${pack.name}` : `Preview ${pack.name}`}
            className={cn(
              "absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-charcoal shadow-lg transition-all duration-300",
              playing ? "opacity-100" : "opacity-100 sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0"
            )}
          >
            {player.loadingId === first.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <Link href={packPath(pack)} className="mt-3 block">
        <p className="truncate font-semibold text-white">{pack.name}</p>
        <p className="mt-0.5 truncate text-sm text-white/40">{meta}</p>
      </Link>
    </div>
  );
}

export function GenrePackGrid({ packs, genre }: { packs: GenrePack[]; genre: string }) {
  const player = usePreviewPlayer();
  const [style, setStyle] = useState<string | null>(null);

  const styles = useMemo(
    () => Array.from(new Set(packs.flatMap((p) => p.styles))).sort((a, b) => a.localeCompare(b)),
    [packs]
  );
  const shown = style ? packs.filter((p) => p.styles.includes(style)) : packs;
  const live = shown.filter((p) => !p.archived);
  const archive = shown.filter((p) => p.archived);

  return (
    <div>
      {styles.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {[null, ...styles].map((s) => (
            <button
              key={s ?? "all"}
              type="button"
              onClick={() => setStyle(s)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                style === s ? "border-white bg-white text-charcoal font-medium" : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
              )}
            >
              {s ?? "All"}
            </button>
          ))}
        </div>
      )}

      {live.length === 0 && archive.length > 0 && !style && (
        <p className="mb-2 rounded-2xl border border-white/10 px-5 py-4 text-white/60">
          No current packs in the catalog feature {genre}, but the archived ones below do. Enough votes and they come back.
        </p>
      )}

      {live.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {live.map((p) => (
            <PackTile key={p.id} pack={p} player={player} />
          ))}
        </div>
      )}

      {archive.length > 0 && (
        <div className={cn(live.length > 0 && "mt-20")}>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-8">
            <h3 className="text-lg font-semibold text-white">From the archive</h3>
            <p className="text-sm text-white/40">These have left the catalog. Open one to vote it back.</p>
          </div>
          {/* Compact on purpose: the archive is a footnote, not the main event */}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {archive.map((p) => (
              <Link key={p.id} href={packPath(p)} className="group" title={p.name}>
                <div className="relative aspect-square overflow-hidden rounded-xl bg-grey-800">
                  {p.cover_image_url && (
                    <Image
                      src={p.cover_image_url}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 25vw, 12vw"
                      className="object-cover grayscale opacity-50 transition-all duration-300 group-hover:opacity-90 group-hover:grayscale-0"
                    />
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] text-white/40 group-hover:text-white/70">{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 && <p className="text-white/50">Nothing in this style yet.</p>}
    </div>
  );
}
