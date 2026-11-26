import Link from "next/link";
import { GlassBox } from "@/components/ssc/Glass";
import { LITE } from "@/lib/lite-plan";

export const upgradeHref = (from: string) => `/upgrade?from=${encodeURIComponent(from)}`;

/** The lock a Lite member sees on a pack that isn't a Lite pack: an upgrade, not a sign-up. */
export function LiteLock({ from }: { from: string }) {
  return (
    <GlassBox plain className="rounded-[22px] p-5 sm:p-6">
      <p className="text-[15px] font-semibold text-white">Upgrade to grab this one</p>
      <p className="ssc-body mt-1 text-[14px]">
        Lite gets you one pack a month. For only {LITE.extra} more a month, you get every pack in the catalog, every week.
      </p>
      <Link href={upgradeHref(from)} className="ssc-btn ssc-btn--primary mt-4 inline-flex">
        Upgrade for {LITE.extra} more
      </Link>
    </GlassBox>
  );
}
