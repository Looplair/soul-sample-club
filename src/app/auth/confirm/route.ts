import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/feed";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Successful verification - redirect to the app
      return NextResponse.redirect(`${appUrl}${next}`);
    }

    console.error("OTP verification failed:", error);
  }

  // Redirect to login on error
  return NextResponse.redirect(`${appUrl}/login?error=verification_failed`);
}
