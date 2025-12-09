import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Handle password recovery
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/account?tab=password`);
      }

      // Check if user has an active subscription
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .single();

        // If no subscription, redirect to checkout
        if (!subscription) {
          return NextResponse.redirect(`${origin}/dashboard?subscribe=true`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
