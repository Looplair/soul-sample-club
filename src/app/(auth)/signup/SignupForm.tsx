"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

const benefits = [
  "7-day free trial",
  "Access to new monthly packs",
  "Unlimited downloads",
  "High-quality WAV files",
];

export function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  if (success) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-24">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-h3 text-snow mb-8">Check your email</h2>
        <p className="text-body text-snow/60">
          We&apos;ve sent you a confirmation link to{" "}
          <span className="text-snow">{email}</span>. Click the link to activate
          your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-24">
      {error && (
        <div className="bg-error/10 border border-error/50 rounded-button p-16 text-error text-body">
          {error}
        </div>
      )}

      <div className="bg-velvet/10 border border-velvet/30 rounded-card p-16 mb-24">
        <p className="text-label text-velvet-light mb-12">What you get:</p>
        <ul className="space-y-8">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-8 text-body text-snow/80">
              <Check className="w-4 h-4 text-mint" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

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
        Start Free Trial
      </Button>

      <p className="text-center text-body text-snow/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-velvet-light hover:text-velvet transition-colors"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-caption text-snow/40">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-snow/60">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-snow/60">
          Privacy Policy
        </Link>
      </p>
    </form>
  );
}
