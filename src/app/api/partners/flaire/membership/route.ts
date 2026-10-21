import { NextResponse } from "next/server";
import { getFlaireMembershipByEmail, isFlaireRequest, normalizeEmail } from "@/lib/flaire/membership";
import { NOT_A_MEMBER } from "@/lib/flaire/eligibility";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/partners/flaire/membership?email=<email>   (server to server, from Flaire)
 * Authorization: Bearer <FLAIRE_PARTNER_SECRET>
 *
 *   200 { active, eligible, plan }   unknown email -> { active: false, eligible: false, plan: null }
 *   401 wrong or missing secret
 *   503 membership couldn't be worked out right now (e.g. Stripe down): ask again later
 */
export async function GET(request: Request) {
  if (!isFlaireRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const raw = new URL(request.url).searchParams.get("email");
  if (!raw) return NextResponse.json({ error: "email required" }, { status: 400, headers: NO_STORE });

  const email = normalizeEmail(raw);
  if (!email) return NextResponse.json(NOT_A_MEMBER, { headers: NO_STORE });

  try {
    const membership = await getFlaireMembershipByEmail(email);
    return NextResponse.json(membership, { headers: NO_STORE });
  } catch (error) {
    console.error("[flaire] membership lookup failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "try again later" }, { status: 503, headers: NO_STORE });
  }
}
