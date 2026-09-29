"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Divider, Field, GhostButton, GoogleButton, Notice, PatreonMark, PrimaryButton } from "../AuthUI";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/feed";
  const patreonLinked = searchParams.get("patreon_linked");
  const linkedEmail = searchParams.get("email");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState(linkedEmail || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "patreon_not_configured"
      ? "Patreon is not configured. Please contact support."
      : errorParam === "patreon_denied"
      ? "Patreon authorization was denied."
      : errorParam === "verification_failed"
      ? "Link verification failed. Please try again."
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setOauthLoading("google");
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isDesktop = typeof window !== "undefined" && !!(window as any).sscDesktop;

      if (isDesktop) {
        // Desktop app: get the OAuth URL from Supabase without redirecting the
        // Electron window (skipBrowserRedirect keeps the window on the login page),
        // then open it in the system browser via IPC. The browser completes sign-in
        // and redirects to http://127.0.0.1:34523/callback which the Electron
        // local HTTP server catches and loads the real /callback in the app window.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `http://127.0.0.1:34523/callback?redirect=${encodeURIComponent(redirect)}`,
            skipBrowserRedirect: true,
          },
        });
        if (error) { setError(error.message); setOauthLoading(null); return; }
        if (data.url) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).sscDesktop.openExternalOAuth(data.url);
        }
      } else {
        // Normal web flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirect)}`,
          },
        });
        if (error) { setError(error.message); setOauthLoading(null); }
      }
    } catch {
      setError("An unexpected error occurred");
      setOauthLoading(null);
    }
  };

  const handlePatreonLogin = () => {
    setOauthLoading("patreon");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDesktop = typeof window !== "undefined" && !!(window as any).sscDesktop;
    window.location.href = isDesktop ? "/api/patreon/login?source=desktop" : "/api/patreon/login";
  };

  return (
    <div className="space-y-6">
      {patreonLinked && <Notice tone="success">Patreon connected! Please sign in with your email below.</Notice>}

      {error && <Notice tone="error">{error}</Notice>}

      {/* Account Login Section */}
      <div>
        <p className="ssc-label mb-3">Sign in to your account</p>
        <GoogleButton type="button" onClick={handleGoogleLogin} disabled={oauthLoading !== null} loading={oauthLoading === "google"}>
          Continue with Google
        </GoogleButton>
      </div>

      {/* Divider */}
      <Divider>or with email</Divider>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="login-email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div>
          <Field
            id="login-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Link href="/reset-password" className="mt-2 block text-right text-[13px] text-white/55 transition-colors hover:text-white">
            Forgot password?
          </Link>
        </div>

        <PrimaryButton type="submit" loading={isLoading} disabled={oauthLoading !== null} trailing={<ArrowRight className="h-4 w-4" />}>
          Sign In
        </PrimaryButton>
      </form>

      {/* Patreon Access Section */}
      <div className="border-t border-white/[0.08] pt-6">
        <p className="ssc-label mb-3">Already a Patreon member?</p>
        <GhostButton
          type="button"
          onClick={handlePatreonLogin}
          disabled={oauthLoading !== null}
          loading={oauthLoading === "patreon"}
          icon={<PatreonMark />}
        >
          Connect Patreon for access
        </GhostButton>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-white/55">
          Link your Patreon to unlock downloads with your existing membership
        </p>
      </div>

      <p className="text-center text-[15px] text-white/75">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-white underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
