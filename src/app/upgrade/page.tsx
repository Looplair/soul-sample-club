export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { Notice, PageHead } from "@/components/member/MemberUI";
import { getNotificationsForUser } from "@/lib/notifications";
import { dollars } from "@/lib/switch-yearly";
import { getUpgradeState, type UpgradeState } from "@/lib/upgrade-lite";
import { LITE } from "@/lib/lite-plan";
import { UpgradeButton } from "./UpgradeButton";
import type { Profile } from "@/types/database";

// Where the Lite lock leads: Lite -> full membership, with today's price shown first
export const metadata = {
  title: "Upgrade | Soul Sample Club",
  robots: { index: false, follow: false },
};

export default async function UpgradePage({ searchParams }: { searchParams: { from?: string } }) {
  const back = searchParams.from?.startsWith("/") && !searchParams.from.startsWith("//") ? searchParams.from : "/feed";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/upgrade?from=${back}`)}`);

  const [profileResult, { notifications, unreadCount }, state] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getNotificationsForUser(user.id),
    getUpgradeState(user.id).catch((error) => {
      console.error("upgrade page:", error);
      return { kind: "needs-help" } as const;
    }),
  ]);

  return (
    <div className="ssc flex min-h-screen flex-col overflow-x-clip">
      <Navbar user={profileResult.data as Profile | null} notifications={notifications} unreadCount={unreadCount} />
      <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-[1240px]">
          <PageHead
            pill="Membership"
            title="Unlock every pack"
            body={`Go from Lite to the full membership: every pack in the catalog, every week, for ${LITE.fullPrice} a month. Only ${LITE.extra} more.`}
          />
          <div className="mt-8 max-w-xl">
            <UpgradeBody state={state} back={back} />
          </div>
        </div>
      </main>
      <SiteFooter cta={false} />
    </div>
  );
}

function UpgradeBody({ state, back }: { state: UpgradeState; back: string }) {
  const goBack = (
    <Link href={back} className="font-semibold text-white underline underline-offset-4">
      Go back
    </Link>
  );
  switch (state.kind) {
    case "not-lite":
      return (
        <Notice tone="success" title="You've already got everything">
          Your membership already unlocks every pack. {goBack}
        </Notice>
      );
    case "payment-problem":
      return (
        <Notice tone="warning" title="Your last payment didn't go through">
          Sort that first, then come back.{" "}
          <a href="/api/billing/fix-payment" className="font-semibold text-white underline underline-offset-4">
            Fix payment
          </a>
        </Notice>
      );
    case "needs-help":
      return (
        <Notice title="We'll do this one for you">
          Your account needs a quick look first. Get in touch and we&apos;ll upgrade you ourselves. {goBack}
        </Notice>
      );
    case "ready":
      return (
        <div className="ssc-glass ssc-glass--plain max-w-xl rounded-[24px] p-6 sm:p-8">
          <dl className="space-y-4 text-[15px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-white/60">Now</dt>
              <dd className="text-white/75">Lite, {LITE.price} a month</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-white/60">Upgrading to</dt>
              <dd className="font-semibold text-white">Every pack, {dollars(state.fullMonthly)} a month</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-4">
              <dt className="text-white/60">Due today</dt>
              <dd className="ssc-display text-[1.6rem] tabular-nums">{dollars(state.dueToday)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[13px] leading-relaxed text-white/60">
            Today you only pay the difference for what&apos;s left of this month. After that it&apos;s {dollars(state.fullMonthly)} a month on
            your usual date. Cancel anytime.
          </p>
          <div className="mt-6">
            <UpgradeButton label={state.dueToday > 0 ? `Upgrade and pay ${dollars(state.dueToday)}` : "Upgrade now"} back={back} />
          </div>
        </div>
      );
  }
}
