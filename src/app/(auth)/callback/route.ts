import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const error_param = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");
  // Support both "next" and "redirect" parameters
  const next = requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect") || "/feed";
  const origin = requestUrl.origin;

  // Log all incoming parameters for debugging
  console.log("Auth callback received:", {
    hasCode: !!code,
    type,
    hasTokenHash: !!token_hash,
    error: error_param,
    errorDescription: error_description,
    fullUrl: request.url,
  });

  // Handle errors from Supabase
  if (error_param) {
    console.error("Supabase auth error:", error_param, error_description);
    return NextResponse.redirect(`${origin}/login?error=${error_param}`);
  }

  // Handle token_hash flow (email confirmation)
  if (token_hash && type) {
    console.log("Handling token_hash verification flow");
    const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") || "";
            return cookieHeader.split("; ").filter(Boolean).map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "magiclink" | "recovery" | "invite",
    });

    if (error) {
      console.error("Token hash verification error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
    }

    // Get the user to check subscription status
    const { data: { user } } = await supabase.auth.getUser();
    let finalRedirectUrl = `${origin}/subscribe`;

    if (user) {
      // Check for existing subscription
      const subscriptionResult = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .single();

      const patreonResult = await supabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (subscriptionResult.data || patreonResult.data) {
        finalRedirectUrl = `${origin}/feed`;
      }

      // Sync to Klaviyo
      const hasStripeSubscription = !!subscriptionResult.data;
      const hasPatreonAccess = !!patreonResult.data;
      const stripeData = subscriptionResult.data as { status: string } | null;
      const subscriptionType: "stripe_active" | "stripe_trialing" | "patreon" | "free" = hasStripeSubscription
        ? stripeData?.status === "active"
          ? "stripe_active"
          : "stripe_trialing"
        : hasPatreonAccess
          ? "patreon"
          : "free";

      syncUserToKlaviyo({
        email: user.email!,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name,
        subscriptionType,
        joinedAt: user.created_at,
      }).catch((err) => console.error("Klaviyo sync error:", err));
    }

    const response = NextResponse.redirect(finalRedirectUrl, { status: 302 });
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options as Record<string, unknown>);
    }

    console.log("Token hash verification successful, redirecting to:", finalRedirectUrl);
    return response;
  }

  if (code) {
    // We need to collect cookies that Supabase wants to set, then apply them to the redirect response
    const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Parse cookies from the request
            const cookieHeader = request.headers.get("cookie") || "";
            return cookieHeader.split("; ").filter(Boolean).map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
            // Collect cookies to set on the response later
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    if (data.session) {
      // Determine final redirect URL
      let finalRedirectUrl = `${origin}${next}`;

      // Handle password recovery
      if (type === "recovery") {
        finalRedirectUrl = `${origin}/account?tab=password`;
      } else {
        // Check subscription status for non-recovery flows
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check for Stripe subscription
          const subscriptionResult = await supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing", "past_due"])
            .single();

          // Check for Patreon link
          const patreonResult = await supabase
            .from("patreon_links")
            .select("is_active")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();

          const stripeData = subscriptionResult.data as { status: string } | null;
          const hasStripeSubscription = !!stripeData;
          const hasPatreonAccess = !!patreonResult.data;

          // Sync user to Klaviyo (async, don't wait)
          const subscriptionType: "stripe_active" | "stripe_trialing" | "patreon" | "free" = hasStripeSubscription
            ? stripeData?.status === "active"
              ? "stripe_active"
              : "stripe_trialing"
            : hasPatreonAccess
              ? "patreon"
              : "free";

          syncUserToKlaviyo({
            email: user.email!,
            fullName: user.user_metadata?.full_name || user.user_metadata?.name,
            subscriptionType,
            joinedAt: user.created_at,
          }).catch((err) => console.error("Klaviyo sync error:", err));

          // If no subscription or Patreon, redirect straight to checkout
          if (!hasStripeSubscription && !hasPatreonAccess) {
            finalRedirectUrl = `${origin}/subscribe`;
          }
        }
      }

      // Create redirect response and set ALL collected cookies on it
      const response = NextResponse.redirect(finalRedirectUrl, { status: 302 });

      // Apply all cookies that Supabase collected during exchangeCodeForSession
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options as Record<string, unknown>);
      }

      return response;
    }
  }

  // No code or session - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
