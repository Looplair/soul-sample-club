"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

// Patreon icon
const PatreonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
  </svg>
);

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
  const [isPatreonLoading, setIsPatreonLoading] = useState(false);

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

  const handlePatreonLogin = () => {
    setIsPatreonLoading(true);
    window.location.href = "/api/patreon/login";
  };

  return (
    <div className="space-y-6">
      {patreonLinked && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-success text-body">
          Patreon connected! Please sign in with your email below.
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-4 text-error text-body">
          {error}
        </div>
      )}

      {/* Patreon Login Button */}
      <Button
        type="button"
        variant="secondary"
        className="w-full !bg-[#FF424D] hover:!bg-[#E63E47] !border-[#FF424D] !text-white"
        onClick={handlePatreonLogin}
        disabled={isPatreonLoading}
        isLoading={isPatreonLoading}
        leftIcon={<PatreonIcon />}
      >
        Continue with Patreon
      </Button>

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
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Link
            href="/reset-password"
            className="block text-right text-label text-text-muted hover:text-white mt-2 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      <p className="text-center text-body text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-white hover:underline transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
