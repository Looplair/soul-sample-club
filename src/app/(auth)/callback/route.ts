import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/feed";

  // Create a response that we'll modify with cookies
  let redirectUrl = `${origin}/login?error=auth_callback_error`;

  if (code) {
    // Create response to collect cookies
    const response = NextResponse.redirect(`${origin}${next}`, {
      status: 302,
    });

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.headers.get("cookie")?.split("; ").map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            }) || [];
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Handle password recovery
      if (type === "recovery") {
        const recoveryResponse = NextResponse.redirect(`${origin}/account?tab=password`, {
          status: 302,
        });
        // Copy cookies from the original response
        response.cookies.getAll().forEach((cookie) => {
          recoveryResponse.cookies.set(cookie.name, cookie.value);
        });
        return recoveryResponse;
      }

      // Check if user has an active subscription (Stripe or Patreon)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check for Stripe subscription
        const subscriptionResult = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
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

        // If no subscription or Patreon, redirect to feed with subscribe prompt
        if (!hasStripeSubscription && !hasPatreonAccess) {
          redirectUrl = `${origin}/feed?subscribe=true`;
        } else {
          redirectUrl = `${origin}${next}`;
        }
      } else {
        redirectUrl = `${origin}${next}`;
      }

      // Create final response with proper redirect and cookies
      const finalResponse = NextResponse.redirect(redirectUrl, { status: 302 });
      response.cookies.getAll().forEach((cookie) => {
        finalResponse.cookies.set(cookie.name, cookie.value);
      });
      return finalResponse;
    } else {
      console.error("OAuth callback error:", error?.message);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
