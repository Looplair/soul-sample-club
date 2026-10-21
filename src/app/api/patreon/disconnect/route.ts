import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { afterResponse, emailForUser, sendFlaireStatus } from "@/lib/flaire/membership";

// Disconnect Patreon
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete patreon link
  const { error } = await supabase
    .from("patreon_links")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  // Patreon access may have just ended: tell Flaire. Never throws.
  await afterResponse(async () => sendFlaireStatus(await emailForUser(user.id), "patreon disconnect"));

  return NextResponse.json({ success: true });
}
