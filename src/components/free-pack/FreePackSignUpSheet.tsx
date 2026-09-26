"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Sign-up without leaving /free. Both routes come back to /free (the login
// handler lets /free through instead of sending people to /subscribe).
export function FreePackSignUpSheet({ packName, open, onClose }: { packName: string; open: boolean; onClose: () => void }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "google" | "email">(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [exists, setExists] = useState(false);

  const back = () => `${window.location.origin}/callback?redirect=${encodeURIComponent("/free")}`;

  const google = async () => {
    setBusy("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back() } });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  };

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: back() } });
    setBusy(null);
    if (error) return setError(error.message);
    // Supabase hides existing accounts by returning a user with no identities
    if (data.user && (data.user.identities?.length ?? 0) === 0) return setExists(true);
    if (data.session) return window.location.reload();
    setSent(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[28px] bg-[#222] px-6 pb-8 pt-3 shadow-2xl sm:bottom-8 sm:rounded-[28px]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20 sm:hidden" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 hidden p-1 text-white/40 hover:text-white sm:block">
          <X className="h-5 w-5" />
        </button>

        {sent ? (
          <div className="py-4 text-center">
            <p className="text-xl font-bold text-white">Check your email</p>
            <p className="mt-2 text-[15px] leading-relaxed text-white/60">
              We&apos;ve sent a link to <span className="text-white">{email}</span>. Tap it and you&apos;ll come straight back here to
              download {packName}.
            </p>
          </div>
        ) : exists ? (
          <div className="py-4 text-center">
            <p className="text-xl font-bold text-white">You already have an account</p>
            <p className="mt-2 text-[15px] leading-relaxed text-white/60">Log in and you&apos;ll come straight back here to download.</p>
            <Link
              href={`/login?redirect=${encodeURIComponent("/free")}`}
              className="mt-5 flex h-[52px] items-center justify-center rounded-2xl bg-white font-semibold text-charcoal"
            >
              Log in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[22px] font-bold text-white">Get {packName} free</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">
              Create your free account and your download is ready straight away.
            </p>

            <button
              type="button"
              onClick={google}
              disabled={!!busy}
              className="mt-5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-white font-semibold text-charcoal disabled:opacity-70"
            >
              {busy === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
                  <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z" />
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
                </svg>
              )}
              Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-white/35">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={signUpWithEmail} className="space-y-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="h-[50px] w-full rounded-2xl border border-white/15 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-white/40"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                className="h-[50px] w-full rounded-2xl border border-white/15 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-white/40"
              />
              <button
                type="submit"
                disabled={!!busy}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-white/20 font-semibold text-white disabled:opacity-70"
              >
                {busy === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue with email
              </button>
            </form>

            {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

            <p className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
              No card needed. We&apos;ll never share your email.
              <br />
              By continuing you agree to the{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
