"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

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
      <div className="text-center py-24">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-24">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-h3 text-snow mb-8">Check your email</h2>
        <p className="text-body text-snow/60 mb-24">
          We&apos;ve sent a password reset link to{" "}
          <span className="text-snow">{email}</span>
        </p>
        <Link href="/login" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
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

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Send Reset Link
      </Button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-body text-velvet-light hover:text-velvet transition-colors inline-flex items-center gap-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
