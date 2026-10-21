import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectToFlaire, flaireConfigured, getFlaireMembershipByEmail } from "@/lib/flaire/membership";
import { FLAIRE_CONNECTED_KEY } from "@/lib/flaire/eligibility";

export const dynamic = "force-dynamic";

const COULDNT_REACH = "Couldn't reach Flaire. Try again in a minute.";

/**
 * POST /api/flaire/connect   (the "Connect your Flaire account" button on /account)
 *
 * Works out the member's status here (never from the browser), hands it to
 * Flaire, and answers { url } with Flaire's one-time sign-in link, which the
 * page then opens. { error } otherwise.
 */
export async function POST(request: Request) {
  // Same-site only
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host && new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  if (!flaireConfigured()) return NextResponse.json({ error: COULDNT_REACH }, { status: 503 });

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const email = (profile as { email: string } | null)?.email || user.email;
  if (!email) return NextResponse.json({ error: COULDNT_REACH }, { status: 400 });
  const name = (profile as { full_name: string | null } | null)?.full_name?.trim() || null;

  let membership;
  try {
    membership = await getFlaireMembershipByEmail(email);
  } catch (error) {
    console.error("[flaire] connect: membership lookup failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Something went wrong. Try again in a minute." }, { status: 503 });
  }
  if (!membership.active) {
    return NextResponse.json({ error: "Flaire credits come with an active membership." }, { status: 403 });
  }

  try {
    const url = await connectToFlaire({ email, name, membership });
    // Remember the link so /account shows "Connected". Only the service role can write
    // app_metadata; failing to record it never stops the member getting to Flaire.
    try {
      await createAdminClient().auth.admin.updateUserById(user.id, {
        app_metadata: { ...user.app_metadata, [FLAIRE_CONNECTED_KEY]: new Date().toISOString() },
      });
    } catch (error) {
      console.error("[flaire] couldn't record connection:", error instanceof Error ? error.message : error);
    }
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[flaire] connect failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: COULDNT_REACH }, { status: 502 });
  }
}
