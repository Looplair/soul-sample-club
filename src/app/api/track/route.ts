import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

// Records a page view or click for the admin reports (guide views, /free funnel).
// Only the pages and events below are accepted; bots and admins aren't counted.

const EVENTS = new Set(["view", "free_cta"]);
const PATHS = /^\/(free|guides\/[a-z0-9-]{1,120})$/;
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|monitor/i;

export async function POST(request: Request) {
  const ok = new NextResponse(null, { status: 204 });
  try {
    if (BOTS.test(request.headers.get("user-agent") ?? "")) return ok;

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(`track:${ip}`, { limit: 60, windowMs: 60_000 }).success) return ok;

    const body = JSON.parse(await request.text()) as { event?: string; path?: string };
    if (!body.event || !EVENTS.has(body.event) || !body.path || !PATHS.test(body.path)) return ok;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    if (user) {
      const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (profile?.is_admin) return ok;
    }

    await db.from("site_events").insert({ event: body.event, path: body.path, user_id: user?.id ?? null });
  } catch (error) {
    console.error("track:", error);
  }
  return ok;
}
