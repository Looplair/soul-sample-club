import Link from "next/link";
import { Notice } from "@/components/member/MemberUI";
import { dollars, type SwitchState } from "@/lib/switch-yearly";
import { SwitchYearlyButton } from "./SwitchYearlyButton";

const day = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function SwitchYearlyBody({ state }: { state: SwitchState }) {
  const account = (
    <Link href="/account" className="font-semibold text-white underline underline-offset-4">
      Back to your account
    </Link>
  );

  switch (state.kind) {
    case "already-yearly":
      return (
        <Notice tone="success" title="You're already on yearly">
          Your membership renews on {day(state.renewsAt)}. {account}
        </Notice>
      );
    case "payment-problem":
      return (
        <Notice tone="warning" title="Your last payment didn't go through">
          Sort that first, then come back to this link.{" "}
          <a href="/api/billing/fix-payment" className="font-semibold text-white underline underline-offset-4">
            Fix payment
          </a>
        </Notice>
      );
    case "no-card-sub":
      return (
        <Notice title="Nothing to switch">
          This is for members paying monthly by card. If you&apos;re with us through Patreon, or not a member yet, it doesn&apos;t apply. {account}
        </Notice>
      );
    case "needs-help":
      return (
        <Notice title="We'll do this one for you">
          Your account needs a quick look before switching. Get in touch and we&apos;ll move you to yearly ourselves. {account}
        </Notice>
      );
    case "ready":
      return (
        <div className="ssc-glass ssc-glass--plain max-w-xl rounded-[24px] p-6 sm:p-8">
          <dl className="space-y-4 text-[15px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-white/60">Now</dt>
              <dd className="text-white/75">{dollars(state.currentMonthly)} a month</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-white/60">Switching to</dt>
              <dd className="font-semibold text-white">{dollars(state.yearlyPrice)} a year</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-4">
              <dt className="text-white/60">Due today</dt>
              <dd className="ssc-display text-[1.6rem] tabular-nums">{dollars(state.dueToday)}</dd>
            </div>
          </dl>

          <p className="mt-5 text-[13px] leading-relaxed text-white/60">
            {state.trialing && state.trialEndsAt
              ? `Your trial carries on. Your first yearly payment is taken when it ends on ${day(state.trialEndsAt)}.`
              : "What's left of this month comes off today's payment. Your year starts today and renews at the same price."}
            {state.wasCanceling && " Switching also keeps your membership going, so it won't end at the close of this month."}{" "}
            No refunds on annual plans.
          </p>

          <div className="mt-6">
            <SwitchYearlyButton label={state.dueToday > 0 ? `Switch and pay ${dollars(state.dueToday)}` : "Switch to yearly"} />
          </div>
        </div>
      );
  }
}
