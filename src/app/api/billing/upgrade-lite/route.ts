import { NextResponse } from "next/server";
import Stripe from "stripe";
import { planOf } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUpgradeState, upgradeLite } from "@/lib/upgrade-lite";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  try {
    const state = await getUpgradeState(user.id);
    // A double click lands here after the first one went through
    if (state.kind === "not-lite") return NextResponse.json({ ok: true });
    if (state.kind !== "ready") {
      return NextResponse.json({ error: "This membership can't be upgraded here. Get in touch and we'll sort it." }, { status: 400 });
    }

    const updated = await upgradeLite(state);

    // The webhook syncs this too; writing it now unlocks everything straight away
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createAdminClient().from("subscriptions") as any)
      .update({
        status: updated.status,
        current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        cancel_at_period_end: updated.cancel_at_period_end,
        plan: planOf(updated),
      })
      .eq("stripe_subscription_id", updated.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("upgrade-lite failed:", error);
    const declined = error instanceof Stripe.errors.StripeCardError;
    return NextResponse.json(
      {
        error: declined
          ? "Your card was declined, so nothing changed. You're still on Lite. Update your card in Billing and try again."
          : "Something went wrong and nothing changed. You're still on Lite. Please try again or get in touch.",
      },
      { status: declined ? 402 : 500 }
    );
  }
}
