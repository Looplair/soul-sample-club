import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

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

    // Fetch user identity and memberships with campaign info
    const identityResponse = await fetch(
      "https://www.patreon.com/api/oauth2/v2/identity" +
        "?include=memberships,memberships.campaign,memberships.currently_entitled_tiers" +
        "&fields[user]=email,full_name" +
        "&fields[member]=patron_status,currently_entitled_amount_cents" +
        "&fields[tier]=title" +
        "&fields[campaign]=vanity,creation_name",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!identityResponse.ok) {
      const errorText = await identityResponse.text();
      console.error("Patreon identity API error:", identityResponse.status, errorText);
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

    console.log("Looking for campaign ID:", campaignId);
    console.log("Patreon identity data:", JSON.stringify(identityData, null, 2));

    if (identityData.included) {
      for (const item of identityData.included) {
        if (item.type === "member") {
          const patronStatus = item.attributes?.patron_status;
          const memberCampaignId = item.relationships?.campaign?.data?.id;

          console.log("Found member:", { patronStatus, memberCampaignId, targetCampaignId: campaignId });

          // Check if this membership is for our campaign (if campaignId is set)
          // If no campaignId is configured, accept any active patron status
          const isOurCampaign = !campaignId || memberCampaignId === campaignId;

          if (isOurCampaign && patronStatus === "active_patron") {
            isActivePatron = true;
            // Get tier info if available
            const tiers = item.relationships?.currently_entitled_tiers?.data;
            if (tiers && tiers.length > 0) {
              tierId = tiers[0].id;
              // Try to find tier title from included data
              const tierData = identityData.included.find(
                (inc: { type: string; id: string; attributes?: { title?: string } }) =>
                  inc.type === "tier" && inc.id === tierId
              );
              if (tierData?.attributes?.title) {
                tierTitle = tierData.attributes.title;
              }
            }
          }
        }
      }
    }

    console.log("Final patron status:", { isActivePatron, tierId, tierTitle });

    // Save to database
    const adminSupabase = createAdminClient();

    // First, delete any existing link for this user or this patreon account
    // This handles the case where user disconnected and is reconnecting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from("patreon_links")
      .delete()
      .or(`user_id.eq.${state},patreon_user_id.eq.${patreonUserId}`);

    // Now insert the new link
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (adminSupabase as any)
      .from("patreon_links")
      .insert({
        user_id: state,
        patreon_user_id: patreonUserId,
        patreon_email: patreonEmail,
        access_token: accessToken,
        refresh_token: refreshToken,
        is_active: isActivePatron,
        tier_id: tierId,
        tier_title: tierTitle,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.redirect(`${appUrl}/account?patreon_error=db_failed`);
    }

    // Sync user to Klaviyo to update their subscription type
    const klaviyoSubscriptionType = isActivePatron ? "patreon" : "free";
    console.log("Syncing to Klaviyo:", { email: patreonEmail, subscriptionType: klaviyoSubscriptionType, isActivePatron });

    const klaviyoResult = await syncUserToKlaviyo({
      email: patreonEmail,
      subscriptionType: klaviyoSubscriptionType,
    });

    if (!klaviyoResult.success) {
      console.error("Klaviyo sync failed:", klaviyoResult.error);
    } else {
      console.log("Klaviyo sync successful for:", patreonEmail);
    }

    const successParam = isActivePatron ? "patreon_connected" : "patreon_not_patron";
    return NextResponse.redirect(`${appUrl}/account?${successParam}=true`);
  } catch (error) {
    console.error("Patreon callback error:", error);
    return NextResponse.redirect(`${appUrl}/account?patreon_error=unknown`);
  }
}
