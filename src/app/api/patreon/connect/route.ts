import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Patreon OAuth - Initiate connection
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const clientId = process.env.PATREON_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/patreon/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "Patreon not configured" }, { status: 500 });
  }

  // Build Patreon OAuth URL
  // identity - basic user info
  // identity[email] - user's email address
  // identity.memberships - user's memberships (patron status)
  const scopes = ["identity", "identity[email]", "identity.memberships"].join(" ");
  const patreonAuthUrl = new URL("https://www.patreon.com/oauth2/authorize");
  patreonAuthUrl.searchParams.set("response_type", "code");
  patreonAuthUrl.searchParams.set("client_id", clientId);
  patreonAuthUrl.searchParams.set("redirect_uri", redirectUri);
  patreonAuthUrl.searchParams.set("scope", scopes);
  patreonAuthUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(patreonAuthUrl.toString());
}
