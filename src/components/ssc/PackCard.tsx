import Image from "next/image";
import Link from "next/link";
import { cn, getDaysUntilEndDate, isPackNew } from "@/lib/utils";
import { packPath } from "@/lib/pack-url";
import { glowStyle } from "./Glass";

export interface CardPack {
  id: string;
  slug?: string | null;
  name: string;
  cover_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_returned?: boolean;
  glow: string;
  sampleCount: number;
  archived?: boolean;
}

/** Short status for a pack card: new, returning, ending soon, or archived */
export function packBadge(p: CardPack): string | null {
  if (p.archived) return "Archived";
  if (p.is_returned) return "Returning";
  if (isPackNew(p.release_date)) return "New";
  const days = getDaysUntilEndDate(p.release_date, p.end_date);
  if (days > 0 && days <= 14) return days === 1 ? "Last day" : `${days} days left`;
  return null;
}

/** Cover-lit glass card: the box glows in the cover's own colour */
export function PackCard({ pack, size = "md", className, priority }: { pack: CardPack; size?: "md" | "lg"; className?: string; priority?: boolean }) {
  const badge = packBadge(pack);
  return (
    <Link
      href={packPath(pack)}
      className={cn(
        "ssc-glass group relative block rounded-[22px] p-2.5 transition-transform duration-300 hover:-translate-y-1",
        size === "lg" ? "w-[min(78vw,300px)]" : "w-[min(62vw,232px)]",
        pack.archived && "opacity-70 hover:opacity-100",
        className
      )}
      style={glowStyle(pack.glow)}
    >
      <div className="relative aspect-square overflow-hidden rounded-[16px] bg-white/[0.04]">
        {pack.cover_image_url && (
          <Image
            src={pack.cover_image_url}
            alt={pack.name}
            fill
            sizes={size === "lg" ? "(max-width: 640px) 78vw, 300px" : "(max-width: 640px) 62vw, 232px"}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        {badge && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
            style={glowStyle(pack.glow)}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <p className="ssc-display truncate text-[15px] leading-tight">{pack.name}</p>
        <p className="mt-1 text-[12px] text-white/55">
          {pack.sampleCount} composition{pack.sampleCount === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
