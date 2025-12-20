"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

// OAuth Icons
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PatreonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
  </svg>
);

const benefits = [
  "Preview all tracks for free",
  "Save favorites to your library",
  "7-day free trial when you subscribe",
  "Subscribe or link Patreon to download",
];

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

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
          emailRedirectTo: `${window.location.origin}/callback`,
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

  const handleOAuthSignup = async (provider: "google" | "apple" | "facebook") => {
    if (!validateTerms()) return;

    setOauthLoading(provider);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/callback`,
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
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-h3 text-white mb-2">Check your email</h2>
        <p className="text-body text-text-muted">
          We&apos;ve sent you a confirmation link to{" "}
          <span className="text-white">{email}</span>. Click the link to activate
          your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-4 text-error text-body">
          {error}
        </div>
      )}

      {/* Benefits Box */}
      <div className="bg-grey-800/50 border border-grey-700 rounded-xl p-4">
        <p className="text-label text-white mb-3">Free account includes:</p>
        <ul className="space-y-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-body-sm text-text-secondary">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full !bg-white hover:!bg-grey-100 !border-grey-300 !text-charcoal"
          onClick={() => handleOAuthSignup("google")}
          disabled={oauthLoading !== null}
          isLoading={oauthLoading === "google"}
          leftIcon={<GoogleIcon />}
        >
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full !bg-black hover:!bg-grey-900 !border-grey-700 !text-white"
          onClick={() => handleOAuthSignup("apple")}
          disabled={oauthLoading !== null}
          isLoading={oauthLoading === "apple"}
          leftIcon={<AppleIcon />}
        >
          Continue with Apple
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full !bg-[#1877F2] hover:!bg-[#166FE5] !border-[#1877F2] !text-white"
          onClick={() => handleOAuthSignup("facebook")}
          disabled={oauthLoading !== null}
          isLoading={oauthLoading === "facebook"}
          leftIcon={<FacebookIcon />}
        >
          Continue with Facebook
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full !bg-[#FF424D] hover:!bg-[#E63E47] !border-[#FF424D] !text-white"
          onClick={handlePatreonSignup}
          disabled={oauthLoading !== null}
          isLoading={oauthLoading === "patreon"}
          leftIcon={<PatreonIcon />}
        >
          Continue with Patreon
        </Button>
      </div>

      <p className="text-center text-caption text-text-muted">
        Already a patron? Sign up with Patreon to auto-link your membership.
      </p>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-grey-700" />
        </div>
        <div className="relative flex justify-center text-caption">
          <span className="bg-charcoal px-3 text-text-muted">or sign up with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          hint="Minimum 8 characters"
        />

        {/* Terms Acceptance - Required - Moved below form fields */}
        <div
          className={`rounded-xl p-4 transition-colors ${
            termsError
              ? "bg-error/10 border-2 border-error"
              : "bg-grey-800/50 border border-grey-700"
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                if (e.target.checked) setTermsError(false);
              }}
              className="mt-1 w-5 h-5 rounded border-grey-600 bg-grey-700 text-white focus:ring-white focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-body-sm text-text-secondary">
              <span className={termsError ? "text-error font-medium" : ""}>
                I agree to the{" "}
              </span>
              <Link href="/terms" className="text-white underline hover:text-grey-200" target="_blank">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-white underline hover:text-grey-200" target="_blank">
                Privacy Policy
              </Link>
              . I understand that samples are licensed, not sold, and may only be used in accordance with the license terms.
            </span>
          </label>
          {termsError && (
            <div className="flex items-center gap-2 mt-3 text-error text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>You must accept to create an account</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={oauthLoading !== null}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-body text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-white hover:underline transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
