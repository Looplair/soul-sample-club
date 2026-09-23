import { NextResponse } from "next/server";

// Patreon OAuth - Login/Signup flow (no existing user required)
export async function GET(request: Request) {
  const clientId = process.env.PATREON_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/patreon/auth-callback`;

  if (!clientId) {
    console.error("PATREON_CLIENT_ID not configured");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=patreon_not_configured`
    );
  }

  // Carried through Patreon's `state` param so the callback knows to hand
  // the finished sign-in back to the desktop app instead of the browser.
  const isDesktop = new URL(request.url).searchParams.get("source") === "desktop";

  // Build Patreon OAuth URL with identity scopes
  const scopes = ["identity", "identity[email]", "identity.memberships"].join(" ");
  const patreonAuthUrl = new URL("https://www.patreon.com/oauth2/authorize");
  patreonAuthUrl.searchParams.set("response_type", "code");
  patreonAuthUrl.searchParams.set("client_id", clientId);
  patreonAuthUrl.searchParams.set("redirect_uri", redirectUri);
  patreonAuthUrl.searchParams.set("scope", scopes);
  patreonAuthUrl.searchParams.set("state", isDesktop ? "login:desktop" : "login");

  return NextResponse.redirect(patreonAuthUrl.toString());
}
