"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Divider, Field, GhostButton, GoogleButton, Notice, PatreonMark, PrimaryButton, StateIcon } from "../AuthUI";

const benefits = [
  "Preview all tracks for free",
  "Save favorites to your library",
  "Subscribe to unlock downloads",
];

export function SignupForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const redirect = searchParams.get("redirect") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "patreon_not_configured"
      ? "Patreon is not configured. Please use email signup."
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const validateTerms = () => {
    if (!acceptedTerms) {
      setTermsError(true);
      setError("Please accept the Terms of Use and Privacy Policy to continue.");
      return false;
    }
    setTermsError(false);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateTerms()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/callback${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!validateTerms()) return;

    setOauthLoading("google");
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
        },
      });

      if (error) {
        setError(error.message);
        setOauthLoading(null);
      }
    } catch {
      setError("An unexpected error occurred");
      setOauthLoading(null);
    }
  };

  const handlePatreonSignup = () => {
    if (!validateTerms()) return;
    setOauthLoading("patreon");
    window.location.href = "/api/patreon/login";
  };

  if (success) {
    return (
      <div className="py-4 text-center">
        <StateIcon>
          <Check className="h-7 w-7" />
        </StateIcon>
        <h2 className="ssc-display text-[1.35rem]">Check your email</h2>
        <p className="ssc-body mt-3 text-[15px] leading-relaxed">
          We&apos;ve sent a confirmation link to{" "}
          <span className="font-medium text-white">{email}</span>. Click the link to activate
          your account.
        </p>
        <p className="mt-3 text-[13px] text-white/55">
          Can&apos;t find it? Check your junk or spam folder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Notice tone="error">{error}</Notice>}

      {/* Benefits Box */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <p className="ssc-label mb-3">Free account includes:</p>
        <ul className="space-y-2.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2.5 text-[14px] text-white/75">
              <Check className="h-4 w-4 flex-shrink-0 text-white" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* Account Creation Section */}
      <div>
        <p className="ssc-label mb-3">Create your account</p>
        <GoogleButton type="button" onClick={handleGoogleSignup} disabled={oauthLoading !== null} loading={oauthLoading === "google"}>
          Continue with Google
        </GoogleButton>
      </div>

      {/* Divider */}
      <Divider>or with email</Divider>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="signup-name"
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />

        <Field
          id="signup-email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Field
          id="signup-password"
          label="Password"
          type="password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          hint="Minimum 8 characters"
        />

        {/* Terms Acceptance */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            termsError ? "border-red-400/60 bg-red-500/[0.08]" : "border-white/[0.12] bg-white/[0.04]"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                if (e.target.checked) setTermsError(false);
              }}
              className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded border-white/30 bg-transparent text-white accent-white focus:ring-white focus:ring-offset-0"
            />
            <span className="text-[14px] leading-relaxed text-white/75">
              <span className={termsError ? "font-medium text-red-300" : ""}>
                I agree to the{" "}
              </span>
              <Link href="/terms" className="text-white underline underline-offset-2 hover:text-white/75" target="_blank">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-white underline underline-offset-2 hover:text-white/75" target="_blank">
                Privacy Policy
              </Link>
            </span>
          </label>
          {termsError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span>You must accept to create an account</span>
            </div>
          )}
        </div>

        <PrimaryButton type="submit" loading={isLoading} disabled={oauthLoading !== null} trailing={<ArrowRight className="h-4 w-4" />}>
          Create Account
        </PrimaryButton>
      </form>

      {/* Patreon Access Section */}
      <div className="border-t border-white/[0.08] pt-6">
        <p className="ssc-label mb-3">Already a Patreon member?</p>
        <GhostButton
          type="button"
          onClick={handlePatreonSignup}
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
        Already have an account?{" "}
        <Link
          href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
          className="font-semibold text-white underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
