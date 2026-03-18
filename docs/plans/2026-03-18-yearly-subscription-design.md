# Yearly Subscription Design

**Date:** 2026-03-18
**Status:** Approved

## Overview

Add a yearly subscription option ($29/year introductory, first 250 annual members) alongside the existing monthly plan ($3.99/month). Users choose their plan via a toggle on the pricing page before hitting Stripe checkout.

## Pricing

- **Monthly:** $3.99/month (first month $0.99 via existing coupon — unchanged)
- **Yearly:** $29/year introductory rate, first 250 annual members only
- Rate is locked in for life for annual subscribers, even if prices rise later
- No refunds on annual plans
- No $0.99 coupon applied to yearly checkout

## Copy (Yearly Card)

> "Special introductory offer for the first 250 annual members only. Lock in this rate and it's yours for life, even if we raise prices later."

Footer note: "No refunds on annual plans."

CTA button: "Start for $29/year"

## UI Design

- Monthly/Yearly pill toggle above the existing pricing card
- Monthly selected by default (preserves current UX and $0.99 hook prominence)
- Toggling to Yearly morphs the price display and CTA; feature list stays the same
- "You're already subscribed!" state unchanged for existing members
- Existing monthly members switching to yearly: out of scope for now

## Technical Changes

### Stripe (manual, done in dashboard)
- Create a new recurring price on the existing Soul Sample Club product: $29/year
- Note the new Price ID

### Environment Variables
- Add `STRIPE_YEARLY_PRICE_ID` to `.env.local` and Vercel

### API: `/api/create-checkout-session`
- Accept optional `plan` body param: `"monthly"` (default) or `"yearly"`
- If `yearly`: use `STRIPE_YEARLY_PRICE_ID`, skip the $0.99 coupon
- If `monthly`: existing behavior unchanged

### UI: Pricing page
- Add toggle state (monthly/yearly) above the pricing card
- Conditionally render price, subtext, and CTA based on selected plan
- Pass `plan` param to checkout session API call

### SubscribeCTA component
- Accept optional `plan` prop and forward to the checkout API

## Out of Scope
- Existing monthly members switching to yearly (account settings, future work)
- Limiting enforcement of the 250-member cap in code (manual monitoring for now)
