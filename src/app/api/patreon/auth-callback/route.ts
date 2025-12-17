import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Patreon OAuth callback for login/signup
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    console.error("Patreon auth error:", error);
    return NextResponse.redirect(`${appUrl}/login?error=patreon_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=missing_code`);
  }

  const clientId = process.env.PATREON_CLIENT_ID;
  const clientSecret = process.env.PATREON_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/patreon/auth-callback`;

  if (!clientId || !clientSecret) {
    console.error("Patreon credentials not configured");
    return NextResponse.redirect(`${appUrl}/login?error=patreon_not_configured`);
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
      return NextResponse.redirect(`${appUrl}/login?error=token_failed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

      // Fetch user identity with email + memberships
      const identityResponse = await fetch(
        "https://www.patreon.com/api/oauth2/v2/identity" +
          "?include=memberships,memberships.currently_entitled_tiers" +
          "&fields[user]=email,full_name,image_url" +
          "&fields[member]=patron_status" +
          "&fields[tier]=title",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );


    if (!identityResponse.ok) {
      console.error("Patreon identity fetch failed");
      return NextResponse.redirect(`${appUrl}/login?error=identity_failed`);
    }

    const identityData = await identityResponse.json();
    const patreonUserId = identityData.data.id;
    const patreonEmail = identityData.data.attributes.email;
    const patreonName = identityData.data.attributes.full_name;
    const patreonAvatar = identityData.data.attributes.image_url;

    if (!patreonEmail) {
      console.error("No email returned from Patreon");
      return NextResponse.redirect(`${appUrl}/login?error=no_email`);
    }

    // Check if user is an active patron
    let isActivePatron = false;
    let tierId: string | null = null;
    let tierTitle: string | null = null;

    if (identityData.included) {
      for (const item of identityData.included) {
        if (item.type === "member") {
          const patronStatus = item.attributes?.patron_status;
          if (patronStatus === "active_patron") {
            isActivePatron = true;
            const tiers = item.relationships?.currently_entitled_tiers?.data;
            if (tiers && tiers.length > 0) {
              tierId = tiers[0].id;
            }
          }
        }
      }
    }

    const adminSupabase = createAdminClient();

    // Check if a user already exists with this email
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === patreonEmail.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User exists - use their ID
      userId = existingUser.id;
    } else {
      // Create new user via Supabase Auth
      const tempPassword = crypto.randomUUID(); // Random password they'll never use
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: patreonEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm since Patreon verified the email
        user_metadata: {
          full_name: patreonName,
          avatar_url: patreonAvatar,
          patreon_id: patreonUserId,
        },
      });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return NextResponse.redirect(`${appUrl}/login?error=user_create_failed`);
      }

      userId = newUser.user.id;

      // Create profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase as any).from("profiles").upsert({
        id: userId,
        email: patreonEmail,
        full_name: patreonName,
        avatar_url: patreonAvatar,
      });
    }

    // Upsert patreon link
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (adminSupabase as any)
      .from("patreon_links")
      .upsert(
        {
          user_id: userId,
          patreon_user_id: patreonUserId,
          patreon_email: patreonEmail,
          access_token: accessToken,
          refresh_token: refreshToken,
          is_active: isActivePatron,
          tier_id: tierId,
          tier_title: tierTitle,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Failed to save Patreon link:", upsertError);
      // Continue anyway - the user is still logged in
    }

    // Create a magic link to sign the user in
    const { data: magicLink, error: magicError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: patreonEmail,
      options: {
        redirectTo: `${appUrl}/feed`,
      },
    });

    if (magicError || !magicLink.properties?.hashed_token) {
      console.error("Failed to generate magic link:", magicError);
      // Fallback: redirect to login with success message
      return NextResponse.redirect(
        `${appUrl}/login?patreon_linked=true&email=${encodeURIComponent(patreonEmail)}`
      );
    }

    // Redirect to the magic link to complete sign in
    const verifyUrl = `${appUrl}/auth/confirm?token_hash=${magicLink.properties.hashed_token}&type=magiclink`;
    return NextResponse.redirect(verifyUrl);
  } catch (error) {
    console.error("Patreon auth callback error:", error);
    return NextResponse.redirect(`${appUrl}/login?error=unknown`);
  }
}
