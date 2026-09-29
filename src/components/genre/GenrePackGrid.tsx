"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewPlayer } from "@/components/audio/usePreviewPlayer";
import type { GenrePack } from "@/lib/genre-data";
import { packPath } from "@/lib/pack-url";
import { glowStyle } from "@/components/ssc/Glass";

/** A genre pack plus its cover colour ("r, g, b"), so each tile glows like a pack card */
type LitGenrePack = GenrePack & { glow?: string };

function tempo(p: LitGenrePack): string | null {
  const bpms = p.samples.map((s) => s.bpm).filter((b): b is number => !!b && b >= 40 && b <= 200);
  if (!bpms.length) return null;
  const [lo, hi] = [Math.min(...bpms), Math.max(...bpms)];
  return lo === hi ? `${lo} BPM` : `${lo}–${hi} BPM`;
}

function PackTile({ pack, player }: { pack: LitGenrePack; player: ReturnType<typeof usePreviewPlayer> }) {
  const first = pack.samples[0];
  const playing = !!first && player.isTrackPlaying(first.id);
  const count = pack.samples.length;
  const meta = [`${count} composition${count === 1 ? "" : "s"}`, tempo(pack)].filter(Boolean).join(" · ");

  return (
    <div
      className="ssc-glass group relative rounded-[22px] p-2 transition-transform duration-300 hover:-translate-y-1 sm:p-2.5"
      style={glowStyle(pack.glow ?? "196, 160, 120")}
    >
      <div className="relative aspect-square overflow-hidden rounded-[16px] bg-white/[0.04]">
        <Link href={packPath(pack)} aria-label={pack.name}>
          {pack.cover_image_url && (
            <Image
              src={pack.cover_image_url}
              alt={pack.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
              "absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] transition-all duration-300",
              playing ? "opacity-100" : "opacity-100 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
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
      <Link href={packPath(pack)} className="block px-1.5 pb-1.5 pt-3">
        <p className="ssc-display truncate text-[14px] !leading-[1.2] sm:text-[15px]">{pack.name}</p>
        <p className="mt-1 truncate text-[12px] text-white/55">{meta}</p>
      </Link>
    </div>
  );
}

export function GenrePackGrid({ packs, genre }: { packs: LitGenrePack[]; genre: string }) {
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
        <div className="-mx-1 mb-8 flex flex-wrap gap-1.5 px-1">
          {[null, ...styles].map((s) => (
            <button
              key={s ?? "all"}
              type="button"
              onClick={() => setStyle(s)}
              aria-pressed={style === s}
              className={cn(
                "rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
                style === s ? "border-white bg-white text-black" : "border-white/12 bg-white/[0.04] text-white/75 hover:border-white/30 hover:text-white"
              )}
            >
              {s ?? "All"}
            </button>
          ))}
        </div>
      )}

      {live.length === 0 && archive.length > 0 && !style && (
        <p className="ssc-glass ssc-glass--plain mb-2 rounded-[20px] px-6 py-5 text-[15px] font-light leading-relaxed text-white/75">
          No current packs in the catalog feature {genre}, but the archived ones below do. Enough votes and they come back.
        </p>
      )}

      {live.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {live.map((p) => (
            <PackTile key={p.id} pack={p} player={player} />
          ))}
        </div>
      )}

      {archive.length > 0 && (
        <div className={cn(live.length > 0 && "mt-16")}>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-white/[0.08] pt-8">
            <h3 className="ssc-display text-[1.15rem]">From the archive</h3>
            <p className="text-[13px] text-white/55">These have left the catalog. Open one to vote it back.</p>
          </div>
          {/* Compact on purpose: the archive is a footnote, not the main event */}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {archive.map((p) => (
              <Link key={p.id} href={packPath(p)} className="group min-w-0" title={p.name}>
                <div className="relative aspect-square overflow-hidden rounded-[12px] border border-white/[0.08] bg-white/[0.04]">
                  {p.cover_image_url && (
                    <Image
                      src={p.cover_image_url}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 25vw, 12vw"
                      className="object-cover opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                    />
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] text-white/55 group-hover:text-white">{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 && <p className="text-white/55">Nothing in this style yet.</p>}
    </div>
  );
}
