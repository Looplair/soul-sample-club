import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { PROMO_COOKIE, PROMO_CODE_PATTERN, PROMO_MAX_AGE, UTM_COOKIE } from "@/lib/promo-cookie";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  // Promo link (/join?promo=CODE): keep the code and any utm_ params for 30 days,
  // so they survive sign-in, sign-up, password reset and OAuth. Checkout looks the
  // code up in Stripe; the cookie value itself is never trusted.
  if (pathname === "/join") {
    const code = searchParams.get("promo");
    const cookie = { path: "/", maxAge: PROMO_MAX_AGE, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const };
    if (code && PROMO_CODE_PATTERN.test(code)) response.cookies.set(PROMO_COOKIE, code, cookie);
    const utm: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (/^utm_[a-z_]{1,20}$/.test(k) && v) utm[k] = v.slice(0, 200);
    });
    if (Object.keys(utm).length) response.cookies.set(UTM_COOKIE, JSON.stringify(utm), cookie);
  }

  // Back from a successful checkout: the promo has been used
  if (pathname === "/feed" && searchParams.get("success") === "true" && request.cookies.has(PROMO_COOKIE)) {
    response.cookies.delete(PROMO_COOKIE);
    response.cookies.delete(UTM_COOKIE);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
