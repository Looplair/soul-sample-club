# Yearly Subscription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a $29/year introductory plan alongside the existing $3.99/month plan, with a toggle on the pricing page and a separate Stripe checkout flow for annual.

**Architecture:** Add a `plan` param to the checkout API to route to the correct Stripe price. Convert the pricing card in `src/app/page.tsx` to client component with a toggle. Update `SubscribeCTA` to forward the plan param.

**Tech Stack:** Next.js App Router, TypeScript, Stripe, Tailwind CSS v4

---

## Prerequisites (Manual -- Do Before Coding)

1. In the Stripe dashboard, create a new recurring price on the existing Soul Sample Club product:
   - Amount: $29.00
   - Billing period: Yearly
   - Note the new Price ID (starts with `price_`)

2. Add to `.env.local`:
   ```
   STRIPE_YEARLY_PRICE_ID=price_xxxxxxxxxxxxxx
   ```

3. Add the same env var to Vercel (Settings > Environment Variables)

---

### Task 1: Update the checkout API to accept a plan param

**Files:**
- Modify: `src/app/api/create-checkout-session/route.ts`

**Context:**
Currently the route takes no body params and always uses `STRIPE_PRICE_ID` with the `cvoilDO6` coupon. We need it to accept `plan: "monthly" | "yearly"` and skip the coupon for yearly.

**Step 1: Update the import in `src/lib/stripe/index.ts` to export the yearly price ID**

Add this line to `src/lib/stripe/index.ts`:
```ts
export const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID!;
```

**Step 2: Update the checkout route**

In `src/app/api/create-checkout-session/route.ts`, change the `POST` function signature and body:

Replace:
```ts
export async function POST() {
```
With:
```ts
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const plan: "monthly" | "yearly" = body.plan === "yearly" ? "yearly" : "monthly";
```

Then replace the `line_items` + `discounts` + `custom_text` block:
```ts
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      discounts: [
        {
          coupon: "cvoilDO6", // $0.99 first month ($3.00 off)
        },
      ],
      // ...
      custom_text: {
        submit: {
          message: "Your first month is $0.99, then $3.99/month. Cancel anytime.",
        },
      },
```
With:
```ts
      line_items: [
        {
          price: plan === "yearly" ? STRIPE_YEARLY_PRICE_ID : STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      ...(plan === "monthly" && {
        discounts: [{ coupon: "cvoilDO6" }],
      }),
      // ...
      custom_text: {
        submit: {
          message: plan === "yearly"
            ? "Annual membership. No refunds on annual plans."
            : "Your first month is $0.99, then $3.99/month. Cancel anytime.",
        },
      },
```

Also add the import at the top:
```ts
import { stripe, STRIPE_PRICE_ID, STRIPE_YEARLY_PRICE_ID } from "@/lib/stripe";
```

**Step 3: Build check**
```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build
```
Expected: clean build, zero TypeScript errors.

---

### Task 2: Update SubscribeCTA to accept and forward a plan prop

**Files:**
- Modify: `src/components/ui/SubscribeCTA.tsx`

**Context:**
`SubscribeCTA` currently POSTs to `/api/create-checkout-session` with no body. It needs a `plan` prop so the pricing toggle can pass `"yearly"` through.

**Step 1: Add `plan` to the props interface**

```ts
interface SubscribeCTAProps {
  isLoggedIn: boolean;
  hasSubscription: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
  plan?: "monthly" | "yearly";
}
```

**Step 2: Destructure `plan` with default**

```ts
export function SubscribeCTA({
  isLoggedIn,
  hasSubscription,
  className = "",
  size = "lg",
  variant = "primary",
  children,
  plan = "monthly",
}: SubscribeCTAProps) {
```

**Step 3: Pass `plan` in the fetch body**

```ts
const response = await fetch("/api/create-checkout-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ plan }),
});
```

**Step 4: Build check**
```bash
npm run build
```
Expected: clean build.

---

### Task 3: Add plan toggle to the pricing section

**Files:**
- Modify: `src/app/page.tsx`

**Context:**
`page.tsx` is a server component. The pricing card section (lines ~577-653) renders `SubscribeCTA` directly. We need to extract the pricing card into a small client component so it can hold toggle state, or add a thin client wrapper. The simplest approach is a new client component `PricingCard`.

**Step 1: Create `src/components/sections/PricingCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";

const benefits = [
  "Exclusive soul compositions added regularly",
  "Access new releases as they drop",
  "Download full compositions with stems",
  "No clearance needed. Ever.",
  "Cancel anytime",
];

interface PricingCardProps {
  isLoggedIn: boolean;
  hasSubscription: boolean;
  hasUsedTrial: boolean;
}

export function PricingCard({ isLoggedIn, hasSubscription, hasUsedTrial }: PricingCardProps) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="max-w-lg mx-auto">
      {/* Toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex bg-white/5 border border-white/10 rounded-full p-1 gap-1">
          <button
            onClick={() => setPlan("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              plan === "monthly"
                ? "bg-white text-charcoal"
                : "text-text-muted hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPlan("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              plan === "yearly"
                ? "bg-white text-charcoal"
                : "text-text-muted hover:text-white"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="relative bg-charcoal border-2 border-white/20 rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          {plan === "monthly" ? (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">$3.99</span>
                <span className="text-text-muted text-lg">/month</span>
              </div>
              {!(isLoggedIn && hasUsedTrial) && (
                <p className="text-sm text-text-muted mt-2">First month just $0.99</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">$29</span>
                <span className="text-text-muted text-lg">/year</span>
              </div>
              <p className="text-sm text-text-muted mt-2">
                Special introductory offer for the first 250 annual members only. Lock in this rate and it&apos;s yours for life, even if we raise prices later.
              </p>
            </>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              {benefit}
            </li>
          ))}
        </ul>

        {/* Quality Badge */}
        <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Quality over quantity</p>
              <p className="text-xs text-text-muted">New pack every month, minimum. Weekly drops coming.</p>
            </div>
          </div>
        </div>

        <SubscribeCTA
          isLoggedIn={isLoggedIn}
          hasSubscription={hasSubscription}
          className="w-full"
          size="lg"
          plan={plan}
        >
          {plan === "yearly" ? "Start for $29/year" : undefined}
        </SubscribeCTA>

        {hasSubscription && (
          <p className="text-center text-sm text-success mt-4">
            You&apos;re already subscribed!
          </p>
        )}

        {plan === "yearly" && !hasSubscription && (
          <p className="text-center text-xs text-text-muted mt-3">
            No refunds on annual plans.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Replace the pricing card in `src/app/page.tsx`**

Add the import near the top with other section imports:
```ts
import { PricingCard } from "@/components/sections/PricingCard";
```

Find the block starting at line ~587 (`<div className="max-w-lg mx-auto">`) through the closing `</div>` before the Patreon section (~line 651). Replace the entire `<div className="max-w-lg mx-auto">...</div>` block (the card only, NOT the Patreon section below it) with:

```tsx
<PricingCard
  isLoggedIn={isLoggedIn}
  hasSubscription={hasSubscription}
  hasUsedTrial={hasUsedTrial}
/>
```

Also remove the `benefits` array from `page.tsx` if it's only used in this section (check first with grep).

**Step 3: Build check**
```bash
npm run build
```
Expected: clean build, zero TypeScript errors.

**Step 4: Smoke test manually**
- Visit `/` (or `/#pricing`) in the browser
- Toggle should switch between Monthly and Yearly
- Monthly: shows $3.99, "First month just $0.99" for new users
- Yearly: shows $29, introductory copy, "Start for $29/year" button
- Clicking the yearly CTA should route to Stripe checkout with the yearly price (verify the price shown on the Stripe checkout page)
- Do NOT commit until the user has reviewed

---

## Done

No commits until the user reviews. Hand back to user for visual check and Stripe checkout verification.
