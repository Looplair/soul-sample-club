import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Patreon OAuth callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user_id
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${appUrl}/account?patreon_error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/account?patreon_error=missing_params`);
  }

  const clientId = process.env.PATREON_CLIENT_ID;
  const clientSecret = process.env.PATREON_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/patreon/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/account?patreon_error=not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://www.patreon.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Patreon token error:", errorData);
      return NextResponse.redirect(`${appUrl}/account?patreon_error=token_failed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    // Fetch user identity and memberships
    const identityResponse = await fetch(
      "https://www.patreon.com/api/oauth2/v2/identity?include=memberships.campaign&fields[user]=email,full_name&fields[member]=patron_status,currently_entitled_tiers",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!identityResponse.ok) {
      return NextResponse.redirect(`${appUrl}/account?patreon_error=identity_failed`);
    }

    const identityData = await identityResponse.json();
    const patreonUserId = identityData.data.id;
    const patreonEmail = identityData.data.attributes.email;

    // Check if user is an active patron of your campaign
    // You'll need to set PATREON_CAMPAIGN_ID in your env
    const campaignId = process.env.PATREON_CAMPAIGN_ID;
    let isActivePatron = false;
    let tierId: string | null = null;
    let tierTitle: string | null = null;

    if (identityData.included) {
      for (const item of identityData.included) {
        if (item.type === "member") {
          const patronStatus = item.attributes?.patron_status;
          if (patronStatus === "active_patron") {
            isActivePatron = true;
            // Get tier info if available
            const tiers = item.relationships?.currently_entitled_tiers?.data;
            if (tiers && tiers.length > 0) {
              tierId = tiers[0].id;
            }
          }
        }
      }
    }

    // Save to database
    const adminSupabase = createAdminClient();

    // Upsert patreon link
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (adminSupabase as any)
      .from("patreon_links")
      .upsert({
        user_id: state,
        patreon_user_id: patreonUserId,
        patreon_email: patreonEmail,
        access_token: accessToken,
        refresh_token: refreshToken,
        is_active: isActivePatron,
        tier_id: tierId,
        tier_title: tierTitle,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Database error:", upsertError);
      return NextResponse.redirect(`${appUrl}/account?patreon_error=db_failed`);
    }

    const successParam = isActivePatron ? "patreon_connected" : "patreon_not_patron";
    return NextResponse.redirect(`${appUrl}/account?${successParam}=true`);
  } catch (error) {
    console.error("Patreon callback error:", error);
    return NextResponse.redirect(`${appUrl}/account?patreon_error=unknown`);
  }
}
