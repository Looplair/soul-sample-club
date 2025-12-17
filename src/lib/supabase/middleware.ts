import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow /auth/confirm to pass through without any redirect (magic link verification)
  // This is critical for Patreon login flow
  if (pathname.startsWith("/auth/confirm")) {
    return supabaseResponse;
  }

  // Auth pages - redirect logged-in users away from these
  const authRoutes = ["/login", "/signup", "/reset-password", "/callback"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Public routes - accessible to everyone (logged in or not)
  const publicRoutes = ["/feed", "/packs"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes and static files should pass through
  const isApiRoute = pathname.startsWith("/api");
  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.includes(".");

  if (isApiRoute || isStaticFile) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login (except for auth pages and public routes)
  if (!user && !isAuthRoute && !isPublicRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages only (not public routes)
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // Check admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Check if user is admin
    const profileResult = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profile = profileResult.data as { is_admin: boolean } | null;

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
