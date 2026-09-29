"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Notice, PrimaryButton, StateIcon } from "../AuthUI";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/callback?type=recovery`,
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
      <div className="py-4 text-center">
        <StateIcon>
          <Check className="h-7 w-7" />
        </StateIcon>
        <h2 className="ssc-display text-[1.35rem]">Check your email</h2>
        <p className="ssc-body mb-7 mt-3 text-[15px] leading-relaxed">
          We&apos;ve sent a password reset link to{" "}
          <span className="font-medium text-white">{email}</span>
        </p>
        <Link href="/login" className="ssc-btn ssc-btn--ghost">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}

      <Field
        id="reset-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <PrimaryButton type="submit" loading={isLoading} trailing={<ArrowRight className="h-4 w-4" />}>
        Send Reset Link
      </PrimaryButton>

      <div className="pt-1 text-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-[14px] text-white/75 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
