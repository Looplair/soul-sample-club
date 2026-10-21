// Server only: uses the Supabase service role and the Stripe secret key.
import { createHash, timingSafeEqual } from "crypto";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NOT_A_MEMBER,
  decideMembership,
  invoiceIsFullPrice,
  isStripeSubscription,
  rowGivesAccess,
  type FlaireMembership,
  type StripeSubscriptionFacts,
  type SubscriptionRow,
} from "./eligibility";

/**
 * Soul Sample Club x Flaire: membership includes free Flaire credits.
 *
 *   Flaire asks:   GET  /api/partners/flaire/membership?email=   (Bearer FLAIRE_PARTNER_SECRET)
 *   Member clicks: POST /api/flaire/connect  ->  Flaire /api/partner/v1/connect  ->  redirect
 *   Changes:       Stripe + Patreon webhooks ->  Flaire /api/partner/v1/status
 */

export function flaireUrl(): string {
  return (process.env.FLAIRE_URL || "https://www.flairevocals.com").replace(/\/+$/, "");
}

function flaireSecret(): string | null {
  const secret = process.env.FLAIRE_PARTNER_SECRET?.trim();
  return secret ? secret : null;
}

/** False until FLAIRE_PARTNER_SECRET is set: the card stays hidden and nothing is sent */
export function flaireConfigured(): boolean {
  return !!flaireSecret();
}

/** Constant-time check of `Authorization: Bearer <FLAIRE_PARTNER_SECRET>`. Fails closed. */
export function isFlaireRequest(request: Request): boolean {
  const secret = flaireSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  // Hash both sides so the comparison is always the same length
  const given = createHash("sha256").update(match[1].trim()).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected);
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@*%]+@[^\s@*%]+\.[^\s@*%]+$/.test(email)) return null;
  return email;
}

/** Literal ILIKE pattern: the email itself, with LIKE wildcards escaped */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function stripeFactsFor(rows: SubscriptionRow[]): Promise<Record<string, StripeSubscriptionFacts>> {
  const facts: Record<string, StripeSubscriptionFacts> = {};
  const fullPriceByCustomer = new Map<string, Promise<boolean>>();

  const customerHasPaidFullPrice = (customerId: string) => {
    let pending = fullPriceByCustomer.get(customerId);
    if (!pending) {
      pending = (async () => {
        // Any of this customer's paid subscription invoices, newest first
        for await (const invoice of stripe.invoices.list({
          customer: customerId,
          status: "paid",
          limit: 100,
          expand: ["data.discounts"],
        })) {
          if (invoiceIsFullPrice(invoice as unknown as Parameters<typeof invoiceIsFullPrice>[0])) return true;
        }
        return false;
      })();
      fullPriceByCustomer.set(customerId, pending);
    }
    return pending;
  };

  await Promise.all(
    rows.map(async (row) => {
      const id = row.stripe_subscription_id as string;
      const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(id);
      const interval = subscription.items.data[0]?.price?.recurring?.interval ?? null;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const hasFullPricePaidInvoice = interval === "year" ? true : await customerHasPaidFullPrice(customerId);
      facts[id] = { interval, hasFullPricePaidInvoice };
    })
  );
  return facts;
}

/** Membership across a set of SSC accounts (normally the one or more with the same email) */
export async function getFlaireMembershipForUsers(userIds: string[]): Promise<FlaireMembership> {
  if (userIds.length === 0) return NOT_A_MEMBER;
  const admin = createAdminClient();
  const now = new Date();

  const [subsResult, patreonResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("status, stripe_subscription_id, stripe_customer_id, current_period_end")
      .in("user_id", userIds)
      .in("status", ["active", "trialing"]),
    admin.from("patreon_links").select("id").in("user_id", userIds).eq("is_active", true).limit(1),
  ]);
  if (subsResult.error) throw new Error(`subscriptions lookup failed: ${subsResult.error.message}`);
  if (patreonResult.error) throw new Error(`patreon lookup failed: ${patreonResult.error.message}`);

  const subscriptions = (subsResult.data || []) as SubscriptionRow[];
  const patreonActive = (patreonResult.data?.length ?? 0) > 0;
  const stripeRows = subscriptions.filter((row) => rowGivesAccess(row, now) && isStripeSubscription(row));

  let stripeFacts: Record<string, StripeSubscriptionFacts> = {};
  if (stripeRows.length) {
    try {
      stripeFacts = await stripeFactsFor(stripeRows);
    } catch (error) {
      // decideMembership throws if the answer really depends on Stripe
      console.error("[flaire] Stripe lookup failed:", error instanceof Error ? error.message : error);
    }
  }

  return decideMembership({ now, subscriptions, patreonActive, stripeFacts });
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

async function profilesByEmail(email: string): Promise<ProfileRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", likeLiteral(email))
    .limit(10);
  if (error) throw new Error(`profile lookup failed: ${error.message}`);
  return ((data || []) as ProfileRow[]).filter((p) => p.email?.trim().toLowerCase() === email);
}

/** Membership for an email, case-insensitive, across every SSC account with it */
export async function getFlaireMembershipByEmail(rawEmail: string): Promise<FlaireMembership> {
  const email = normalizeEmail(rawEmail);
  if (!email) return NOT_A_MEMBER;
  const profiles = await profilesByEmail(email);
  return getFlaireMembershipForUsers(profiles.map((p) => p.id));
}

export class FlaireConnectError extends Error {}

/**
 * Tells Flaire this member wants their credits and returns Flaire's one-time
 * sign-in URL. Only ever returns a URL on Flaire's own site.
 */
export async function connectToFlaire(args: {
  email: string;
  name: string | null;
  membership: FlaireMembership;
}): Promise<string> {
  const secret = flaireSecret();
  if (!secret) throw new FlaireConnectError("FLAIRE_PARTNER_SECRET is not set");

  let response: Response;
  try {
    response = await fetch(`${flaireUrl()}/api/partner/v1/connect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: args.email,
        active: args.membership.active,
        eligible: args.membership.eligible,
        ...(args.name ? { name: args.name } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new FlaireConnectError(`request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new FlaireConnectError(`Flaire answered ${response.status}`);

  const body = (await response.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url : "";
  if (!isFlaireSiteUrl(url)) throw new FlaireConnectError("Flaire returned no usable URL");
  return url;
}

function isFlaireSiteUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const expected = new URL(flaireUrl());
    const bare = (h: string) => h.replace(/^www\./, "");
    return url.protocol === "https:" && bare(url.hostname) === bare(expected.hostname);
  } catch {
    return false;
  }
}

/**
 * Sends Flaire the current status for one email. Never throws. If membership
 * can't be worked out (e.g. Stripe is down) nothing is sent rather than a
 * wrong answer.
 */
export async function sendFlaireStatus(rawEmail: string | null | undefined, source: string): Promise<void> {
  try {
    const secret = flaireSecret();
    const email = normalizeEmail(rawEmail);
    if (!secret || !email) return;
    const membership = await getFlaireMembershipByEmail(email);
    const response = await fetch(`${flaireUrl()}/api/partner/v1/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, active: membership.active, eligible: membership.eligible }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) console.error(`[flaire] status from ${source} answered ${response.status}`);
  } catch (error) {
    console.error(`[flaire] status from ${source} failed:`, error instanceof Error ? error.message : error);
  }
}

/**
 * Runs work after the response when the platform allows it (Vercel's
 * request-context waitUntil, the same hook @vercel/functions uses), otherwise
 * waits for it, capped. Never throws and never changes the caller's response.
 */
export async function afterResponse(work: () => Promise<void>, capMs = 8_000): Promise<void> {
  try {
    const run = work().catch(() => undefined);
    const ctx = (globalThis as unknown as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[
      Symbol.for("@vercel/request-context")
    ]?.get?.();
    if (typeof ctx?.waitUntil === "function") {
      ctx.waitUntil(run);
      return;
    }
    await Promise.race([run, new Promise((resolve) => setTimeout(resolve, capMs))]);
  } catch {
    // never let this reach the caller
  }
}

/** Email of an SSC user, for status updates */
export async function emailForUser(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const { data } = await createAdminClient().from("profiles").select("email").eq("id", userId).maybeSingle();
  return (data as { email: string } | null)?.email ?? null;
}

/**
 * The SSC email behind a Stripe subscription/invoice event: the user on the
 * subscription row, then the user in Stripe metadata, then the invoice's email.
 */
export async function emailForStripeObject(event: Stripe.Event): Promise<string | null> {
  const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
  const admin = createAdminClient();

  let subscriptionId: string | null = null;
  let metadataUserId: string | null = null;
  let invoiceEmail: string | null = null;
  if (obj.object === "subscription") {
    subscriptionId = obj.id;
    metadataUserId = obj.metadata?.supabase_user_id ?? null;
  } else if (obj.object === "invoice") {
    const sub = obj.subscription;
    subscriptionId = typeof sub === "string" ? sub : sub?.id ?? null;
    metadataUserId = obj.subscription_details?.metadata?.supabase_user_id ?? null;
    invoiceEmail = obj.customer_email ?? null;
  }

  if (subscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .limit(1);
    const email = await emailForUser((data?.[0] as { user_id: string } | undefined)?.user_id);
    if (email) return email;
  }
  return (await emailForUser(metadataUserId)) ?? invoiceEmail;
}
