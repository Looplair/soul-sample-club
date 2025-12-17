"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

// Patreon icon
const PatreonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
  </svg>
);

const benefits = [
  "Preview all tracks for free",
  "Save favorites to your library",
  "Join the community chat",
  "Subscribe or link Patreon to download",
];

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "patreon_not_configured"
      ? "Patreon is not configured. Please use email signup."
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPatreonLoading, setIsPatreonLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

  const handlePatreonSignup = () => {
    setIsPatreonLoading(true);
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

      {/* Patreon Signup Button */}
      <Button
        type="button"
        variant="secondary"
        className="w-full !bg-[#FF424D] hover:!bg-[#E63E47] !border-[#FF424D] !text-white"
        onClick={handlePatreonSignup}
        disabled={isPatreonLoading}
        isLoading={isPatreonLoading}
        leftIcon={<PatreonIcon />}
      >
        Continue with Patreon
      </Button>

      <p className="text-center text-caption text-text-muted">
        Already a patron? Sign up with Patreon to auto-link your membership.
      </p>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-grey-700" />
        </div>
        <div className="relative flex justify-center text-caption">
          <span className="bg-charcoal px-3 text-text-muted">or</span>
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

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
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

      <p className="text-center text-caption text-text-subtle">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-text-muted transition-colors">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-text-muted transition-colors">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
