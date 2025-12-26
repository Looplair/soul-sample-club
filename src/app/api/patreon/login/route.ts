import { NextResponse } from "next/server";

// Patreon OAuth - Login/Signup flow (no existing user required)
export async function GET() {
  const clientId = process.env.PATREON_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/patreon/auth-callback`;

  if (!clientId) {
    console.error("PATREON_CLIENT_ID not configured");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=patreon_not_configured`
    );
  }

  // Build Patreon OAuth URL with identity scopes
  const scopes = ["identity", "identity[email]", "identity.memberships"].join(" ");
  const patreonAuthUrl = new URL("https://www.patreon.com/oauth2/authorize");
  patreonAuthUrl.searchParams.set("response_type", "code");
  patreonAuthUrl.searchParams.set("client_id", clientId);
  patreonAuthUrl.searchParams.set("redirect_uri", redirectUri);
  patreonAuthUrl.searchParams.set("scope", scopes);
  patreonAuthUrl.searchParams.set("state", "login"); // marker for login flow

  return NextResponse.redirect(patreonAuthUrl.toString());
}
