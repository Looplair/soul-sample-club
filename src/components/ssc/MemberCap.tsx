/** "Membership is capped at 5,000": the club's real cap, with a live-looking dot */
export const MEMBER_CAP = 5000;

export function MemberCap({ className }: { className?: string }) {
  return (
    <p className={`flex items-center gap-2.5 text-[13px] text-white/75 ${className ?? ""}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--glow))] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--glow))]" />
      </span>
      Membership is capped at {MEMBER_CAP.toLocaleString("en-US")}
    </p>
  );
}
