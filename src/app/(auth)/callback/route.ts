import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/feed";

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
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Handle password recovery
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/account?tab=password`);
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
          return NextResponse.redirect(`${origin}/feed?subscribe=true`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("OAuth callback error:", error.message);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
