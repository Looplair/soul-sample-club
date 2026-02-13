import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Auto-publish scheduled packs
 * Runs every 15 minutes to check for packs that should be published
 *
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/publish-scheduled-packs",
 *     "schedule": "*/15 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, require cron secret for security
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        console.error("CRON_SECRET not configured");
        return NextResponse.json(
          { error: "Cron job not configured" },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const adminSupabase = createAdminClient();

    console.log("[CRON] Checking for packs to auto-publish...");

    // Find packs that should be published now
    // - scheduled_publish_at is not null
    // - scheduled_publish_at is in the past or now
    // - is_published is false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: packsToPublish, error: fetchError } = await (adminSupabase
      .from("packs") as any)
      .select("id, name, scheduled_publish_at")
      .eq("is_published", false)
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", new Date().toISOString());

    if (fetchError) {
      console.error("[CRON] Error fetching scheduled packs:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch scheduled packs" },
        { status: 500 }
      );
    }

    if (!packsToPublish || packsToPublish.length === 0) {
      console.log("[CRON] No packs to publish");
      return NextResponse.json({
        message: "No packs to publish",
        published: 0,
      });
    }

    console.log(
      `[CRON] Found ${packsToPublish.length} pack(s) to publish:`,
      packsToPublish.map((p: any) => ({
        id: p.id,
        name: p.name,
        scheduledFor: p.scheduled_publish_at,
      }))
    );

    const results = {
      total: packsToPublish.length,
      published: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Publish each pack
    for (const pack of packsToPublish) {
      try {
        console.log(`[CRON] Publishing pack: ${pack.name} (${pack.id})`);

        // Update pack to published and clear scheduled_publish_at
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (adminSupabase
          .from("packs") as any)
          .update({
            is_published: true,
            scheduled_publish_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pack.id);

        if (updateError) {
          throw new Error(`Failed to publish: ${updateError.message}`);
        }

        // Create notification for users
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: notifError } = await (adminSupabase
          .from("notifications") as any)
          .insert({
            title: `New pack: ${pack.name}`,
            message: `Check out our latest release — ${pack.name}`,
            type: "new_pack",
            pack_id: pack.id,
          });

        if (notifError) {
          console.warn(
            `[CRON] Failed to create notification for ${pack.name}:`,
            notifError
          );
          // Don't fail the whole operation if notification fails
        }

        results.published++;
        console.log(`[CRON] ✅ Successfully published: ${pack.name}`);
      } catch (error) {
        console.error(`[CRON] Failed to publish pack ${pack.id}:`, error);
        results.failed++;
        results.errors.push(
          `${pack.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log("[CRON] Auto-publish complete:", results);

    return NextResponse.json({
      message: `Published ${results.published} of ${results.total} scheduled packs`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Auto-publish error:", error);
    return NextResponse.json(
      {
        error: "Auto-publish failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
