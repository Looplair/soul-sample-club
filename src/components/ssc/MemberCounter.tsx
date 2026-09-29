import { MEMBER_CAP, displayCount, type MemberCount } from "@/lib/member-count";
import { glowStyle } from "./Glass";

/** "2,130+ of 5,000 spots taken": real members against the cap, with a thin fill bar */
export function MemberCounter({ count, glow, className }: { count: MemberCount; glow?: string; className?: string }) {
  const pct = Math.min(100, Math.max(2, (count.total / MEMBER_CAP) * 100));
  return (
    <div className={className} style={glowStyle(glow)}>
      <div className="flex items-baseline gap-2">
        <span className="ssc-display text-[1.6rem]">{displayCount(count.total)}</span>
        <span className="text-[13px] text-white/55">of {MEMBER_CAP.toLocaleString("en-US")} spots taken</span>
      </div>
      <div className="mt-2.5 h-[3px] w-full max-w-[260px] overflow-hidden rounded-full bg-white/[0.12]">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%`, boxShadow: "0 0 10px rgba(var(--glow), 0.9)" }} />
      </div>
      <p className="mt-2 flex items-center gap-2 text-[12px] text-white/55">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        Membership is capped at {MEMBER_CAP.toLocaleString("en-US")}
      </p>
    </div>
  );
}
