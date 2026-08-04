import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("md5", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const secret = process.env.PATREON_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PATREON_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-patreon-signature");
  const event = request.headers.get("x-patreon-event");

  if (!signature || !event) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  const body = await request.text();

  try {
    if (!verifySignature(body, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  let payload: {
    data?: {
      attributes?: { patron_status?: string };
      relationships?: { user?: { data?: { id?: string } } };
    };
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patreonUserId = payload.data?.relationships?.user?.data?.id;
  if (!patreonUserId) {
    console.warn("Patreon webhook: no user ID in payload", { event });
    return NextResponse.json({ ok: true });
  }

  const adminSupabase = createAdminClient();

  if (event === "members:pledge:cancel" || event === "members:pledge:delete") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from("patreon_links")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("patreon_user_id", patreonUserId);

    if (error) {
      console.error("Failed to deactivate Patreon link:", error, { patreonUserId, event });
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log(`Patreon ${event}: deactivated access for user ${patreonUserId}`);
  } else if (event === "members:pledge:create" || event === "members:pledge:update") {
    const patronStatus = payload.data?.attributes?.patron_status;
    const isActive = patronStatus === "active_patron";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from("patreon_links")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("patreon_user_id", patreonUserId);

    if (error) {
      console.error("Failed to update Patreon link:", error, { patreonUserId, event, isActive });
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log(`Patreon ${event}: set is_active=${isActive} for user ${patreonUserId}`);
  }

  return NextResponse.json({ ok: true });
}
