import { NextResponse } from "next/server";
import { publishDuePacks } from "@/lib/pack-schedule";

// Puts scheduled packs live once their time has passed. Called every 5 minutes
// by Supabase pg_cron (job "publish-scheduled-packs"), with GitHub Actions and a
// daily Vercel cron as backups, and by the local uploader. It only ever
// publishes packs whose scheduled time is already up, so it needs no secret:
// calling it early or often changes nothing. ?dry=1 reports without publishing.

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: Request) {
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  try {
    const result = await publishDuePacks({ dryRun });
    return NextResponse.json({ ok: true, dryRun, ...result });
  } catch (error) {
    console.error("Scheduled publish failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
