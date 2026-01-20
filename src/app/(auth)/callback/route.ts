import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  // Support both "next" and "redirect" parameters
  const next = requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect") || "/feed";
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Handle cookies that can't be set
              console.error("Error setting cookies:", error);
            }
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
      // Handle password recovery
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/account?tab=password`);
      }

      // Determine final redirect URL based on subscription status
      let finalRedirectUrl = `${origin}${next}`;

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
          finalRedirectUrl = `${origin}/feed?subscribe=true`;
        }
      }

      return NextResponse.redirect(finalRedirectUrl);
    }
  }

  // No code or session - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
