"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile, the bot check Supabase supports for auth (same setup
// as CHOP'D). "interaction-only" means real people almost never see it; it
// only shows a checkbox when Cloudflare is unsure.
//
// Rollout order. CAPTCHA must not be switched on in Supabase first, or every
// email sign-in fails for lack of a token:
//   1. Cloudflare → Turnstile → widget covering soulsampleclub.com
//   2. Site key below (an env var can override it); deploy
//   3. Supabase → Authentication → Attack Protection → CAPTCHA, Turnstile,
//      paste the secret key
//
// The forms never block on the check themselves: with no token they still
// submit, and Supabase decides. So a missing key, an ad blocker or a Cloudflare
// outage can't lock anyone out before step 3, and after it Supabase's error is
// shown as TURNSTILE_BLOCKED_MESSAGE.

// Site keys are public by design (they ship in the page). Empty = check off.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
// The widget only accepts these hostnames; elsewhere (localhost, Vercel
// previews) Cloudflare would reject it, so it's skipped
const HOSTS = ["soulsampleclub.com", "www.soulsampleclub.com"];

export const TURNSTILE_SITE_KEY =
  typeof window === "undefined" || HOSTS.includes(window.location.hostname) ? SITE_KEY : "";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface TurnstileHandle {
  /** Get a fresh token after an attempt (tokens are single-use) */
  reset: () => void;
}

export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void }>(function Turnstile(
  { onToken },
  ref
) {
  const el = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !el.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !el.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(el.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          appearance: "interaction-only",
          callback: (token: string) => cb.current(token),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  // Always render the (empty) slot so server and browser markup match
  return <div ref={el} className="flex justify-center [&:empty]:hidden" />;
});

/**
 * Form helper. `captcha()` hands out the token, waiting briefly if Cloudflare
 * hasn't finished, so a quick click just takes a moment. It resolves to
 * `{ captchaToken }` to spread into Supabase's options, or `{}` when there's
 * no token (check off here, or blocked). Call `reset()` after each attempt.
 */
export function useTurnstile() {
  const ref = useRef<TurnstileHandle>(null);
  const tokenRef = useRef<string | null>(null);
  const onToken = useCallback((t: string | null) => {
    tokenRef.current = t;
  }, []);
  const captcha = useCallback(async (timeoutMs = 8000): Promise<{ captchaToken?: string }> => {
    if (!TURNSTILE_SITE_KEY) return {};
    const start = Date.now();
    while (!tokenRef.current && Date.now() - start < timeoutMs) await new Promise((r) => setTimeout(r, 150));
    return tokenRef.current ? { captchaToken: tokenRef.current } : {};
  }, []);
  const reset = useCallback(() => ref.current?.reset(), []);
  return { ref, onToken, captcha, reset };
}

export const TURNSTILE_BLOCKED_MESSAGE =
  "We couldn't run the quick security check. Turn off ad blockers for this site, refresh and try again.";

/** Supabase's error text when the check fails, swapped for something readable */
export function authErrorMessage(message: string) {
  return /captcha/i.test(message) ? TURNSTILE_BLOCKED_MESSAGE : message;
}

/** Bot trap: off-screen, skipped by keyboard and autofill, so only bots fill it */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="ssc_hp">Leave this empty</label>
      <input id="ssc_hp" name="ssc_hp" type="text" tabIndex={-1} autoComplete="off" data-1p-ignore data-lpignore="true" />
    </div>
  );
}

/** True when the trap was filled: show a normal success screen, create nothing */
export function caughtByHoneypot(form: HTMLFormElement) {
  return !!(new FormData(form).get("ssc_hp") as string | null)?.trim();
}
