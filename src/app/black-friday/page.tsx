export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { GlassBox, Pill } from "@/components/ssc/Glass";
import { Notice } from "@/components/member/MemberUI";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { getNotificationsForUser } from "@/lib/notifications";
import { getSwitchState, type SwitchState } from "@/lib/switch-yearly";
import { BLACK_FRIDAY, blackFridayOn } from "@/lib/black-friday";
import { SwitchYearlyBody } from "@/app/switch-yearly/SwitchYearlyBody";
import type { Profile } from "@/types/database";

export const metadata = {
  title: "Black Friday: a whole year for $49 | Soul Sample Club",
  description: "A year of Soul Sample Club for $49. A new pack of soul compositions every week, full stems, all pre-cleared. Ends Mon 30 Nov.",
};

const PERKS = [
  "A new pack of soul compositions every week",
  "Full stems on every release",
  "Pre-cleared and royalty-free, for life",
  "The Drum Vault, members only",
];

// Who's looking, so the button does the right thing for them
type Who =
  | { kind: "guest" }
  | { kind: "new" } // signed in, nothing to switch: straight to yearly checkout
  | { kind: "patreon" }
  | { kind: "member"; state: SwitchState };

async function whoIsLooking(userId: string): Promise<Who> {
  const [state, patreon] = await Promise.all([
    getSwitchState(userId).catch((error) => {
      console.error("black-friday page:", error);
      return { kind: "needs-help" } as const;
    }),
    createAdminClient().from("patreon_links").select("id").eq("user_id", userId).eq("is_active", true).limit(1),
  ]);
  if (state.kind === "no-card-sub") return patreon.data?.length ? { kind: "patreon" } : { kind: "new" };
  return { kind: "member", state };
}

export default async function BlackFridayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const on = blackFridayOn();
  const [profileResult, notifs, who] = user
    ? await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        getNotificationsForUser(user.id),
        on ? whoIsLooking(user.id) : Promise.resolve({ kind: "guest" } as Who),
      ])
    : [null, { notifications: [], unreadCount: 0 }, { kind: "guest" } as Who];

  return (
    <div className="ssc flex min-h-screen flex-col overflow-x-clip">
      <Navbar
        user={(profileResult?.data as Profile | null) ?? null}
        notifications={notifs.notifications}
        unreadCount={notifs.unreadCount}
      />
      <main className="flex-1 px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-[1100px]">
          {on ? <Deal who={who} /> : <Ended />}
        </div>
      </main>
      <SiteFooter cta={false} />
    </div>
  );
}

function Ended() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <Pill>Black Friday</Pill>
      <h1 className="ssc-display mt-6 text-[clamp(2.4rem,6vw,4rem)]">That one&apos;s over</h1>
      <p className="ssc-body mt-4 text-[16px]">Thanks to everyone who joined in. Membership is still open.</p>
      <Link href="/subscribe" className="ssc-btn ssc-btn--primary mt-8 inline-flex">
        See membership
      </Link>
    </div>
  );
}

function Deal({ who }: { who: Who }) {
  return (
    <div className="grid items-start gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
      <header>
        <Pill dot>Black Friday · {BLACK_FRIDAY.endsLabel}</Pill>
        <h1 className="ssc-display mt-6 text-[clamp(2.8rem,7.4vw,5.6rem)] [text-wrap:balance]">
          A whole year for {BLACK_FRIDAY.price}
        </h1>
        <p className="ssc-body mt-6 max-w-lg text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed">
          Twelve months of Soul Sample Club for {BLACK_FRIDAY.price}, against {BLACK_FRIDAY.monthlyYear} paying monthly. One payment, then
          nothing to think about until next year.
        </p>
        <ul className="mt-8 space-y-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-3 text-[15px] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {perk}
            </li>
          ))}
        </ul>
      </header>

      <div>
        <Action who={who} />
      </div>
    </div>
  );
}

function PriceBox({ children, fine }: { children: React.ReactNode; fine: string }) {
  return (
    <GlassBox className="ssc-breathe rounded-[28px] p-7 sm:p-9">
      <p className="ssc-label">Yearly · Black Friday price</p>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl text-white/55 line-through">{BLACK_FRIDAY.monthlyYear}</span>
        <span className="ssc-display text-[clamp(3rem,7vw,4.4rem)]">{BLACK_FRIDAY.price}</span>
        <span className="text-white/55">a year</span>
      </p>
      <div className="mt-8">{children}</div>
      <p className="mt-4 text-center text-[12px] leading-relaxed text-white/55">{fine}</p>
    </GlassBox>
  );
}

const FINE = `Renews at ${BLACK_FRIDAY.price} a year. No refunds on annual plans.`;

function Action({ who }: { who: Who }) {
  switch (who.kind) {
    case "guest":
      return (
        <PriceBox fine={FINE}>
          <Link href={`/signup?redirect=${encodeURIComponent("/checkout?plan=yearly")}`} className="ssc-btn ssc-btn--primary w-full">
            Get a year for {BLACK_FRIDAY.price}
          </Link>
          <p className="mt-4 text-center text-[14px] text-white/65">
            Already a member?{" "}
            <Link href="/login?redirect=/black-friday" className="font-medium text-white underline underline-offset-4">
              Log in
            </Link>{" "}
            to switch to yearly.
          </p>
        </PriceBox>
      );
    case "new":
      return (
        <PriceBox fine={FINE}>
          <SubscribeCTA isLoggedIn hasSubscription={false} plan="yearly" bare className="ssc-btn ssc-btn--primary w-full">
            Get a year for {BLACK_FRIDAY.price}
          </SubscribeCTA>
        </PriceBox>
      );
    case "patreon":
      // Patreon members: the same Black Friday deal, as Patreon's annual discount
      return (
        <GlassBox className="ssc-breathe rounded-[28px] p-7 sm:p-9">
          <p className="ssc-label">For Patreon members · {BLACK_FRIDAY.endsLabel}</p>
          <p className="mt-4 text-[17px] font-semibold text-white">Go annual on Patreon and save 42%</p>
          <p className="ssc-body mt-2 text-[14px] leading-relaxed">
            On Patreon, edit your membership and switch to paying annually. The Black Friday discount comes off automatically, about
            $49 for the year. It ends Monday 30 November.
          </p>
          <a href="https://www.patreon.com/Looplair" target="_blank" rel="noopener noreferrer" className="ssc-btn ssc-btn--primary mt-6 w-full">
            Go annual on Patreon
          </a>
        </GlassBox>
      );
    case "member":
      // Monthly card members switch in place: same membership, now yearly
      return <SwitchYearlyBody state={who.state} />;
  }
}
