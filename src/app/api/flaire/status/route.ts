import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFlaireCreditsState } from "@/lib/flaire/membership";
import { FLAIRE_CONNECTED_KEY } from "@/lib/flaire/eligibility";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/flaire/status  ->  { state: "connected" | "eligible" | "pending" | null }
 *
 * For the catalog's Flaire card. Asked from the browser after the page loads,
 * so the catalog never waits on Stripe. Any failure answers null (no card).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ state: null }, { headers: NO_STORE });

  const { data: profile } = await createAdminClient().from("profiles").select("email").eq("id", user.id).maybeSingle();
  const email = (profile as { email: string } | null)?.email || user.email || "";
  const state = await getFlaireCreditsState(email, !!user.app_metadata?.[FLAIRE_CONNECTED_KEY]);
  return NextResponse.json({ state }, { headers: NO_STORE });
}
