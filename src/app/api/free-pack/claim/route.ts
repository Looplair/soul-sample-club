import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimFreePack, getFreePack } from "@/lib/free-pack";

// Called when a signed-in visitor lands on /free: records the claim and, the
// first time only, tells Klaviyo so the "Claimed Free Pack" email flow runs.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const pack = await getFreePack();
  if (!pack) return NextResponse.json({ error: "No free pack right now" }, { status: 404 });

  const first = await claimFreePack(user.id, user.email, pack);
  return NextResponse.json({ ok: true, first });
}
