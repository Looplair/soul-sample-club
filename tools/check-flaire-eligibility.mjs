// Checks the Flaire credits rules (src/lib/flaire/eligibility.ts) against
// representative members. No network, no database.
//
//   node tools/check-flaire-eligibility.mjs      (Node 22.18+ runs the .ts directly)

import assert from "node:assert/strict";
import { decideMembership, invoiceIsFullPrice } from "../src/lib/flaire/eligibility.ts";

const now = new Date("2026-10-21T12:00:00Z");
const ahead = "2026-11-15T00:00:00Z";
const behind = "2026-10-01T00:00:00Z";
const sub = (id, status, end = ahead) => ({
  status,
  stripe_subscription_id: id,
  stripe_customer_id: "cus_x",
  current_period_end: end,
});
const run = (subscriptions, stripeFacts = {}, patreonActive = false) =>
  decideMembership({ now, subscriptions, patreonActive, stripeFacts });

// Invoices as Stripe sends them (discounts expanded)
const once = { id: "di_once", coupon: { duration: "once" } };
const repeating = { id: "di_rep", coupon: { duration: "repeating" } };
const forever = { id: "di_forever", coupon: { duration: "forever" } };
const inv = (amount_paid, discounts = [], off = 0, extra = {}) => ({
  status: "paid",
  amount_paid,
  subscription: "sub_1",
  discounts,
  total_discount_amounts: discounts.map((d) => ({ amount: off, discount: d.id ?? d })),
  ...extra,
});

const cases = [
  // [name, actual, expected]
  ["intro $0.99 invoice is not full price", invoiceIsFullPrice(inv(99, [once], 600)), false],
  ["free-pack $1.99 x3 invoice is not full price", invoiceIsFullPrice(inv(199, [repeating], 500)), false],
  ["undiscounted $6.99 invoice is full price", invoiceIsFullPrice(inv(699)), true],
  ["forever coupon ($35/yr for life) counts as full price", invoiceIsFullPrice(inv(3500, [forever], 1400)), true],
  ["unexpanded discount that took money off is not full price", invoiceIsFullPrice(inv(99, ["di_unknown"], 600)), false],
  ["$0 invoice (old free trial) is not full price", invoiceIsFullPrice(inv(0)), false],
  ["open invoice is not full price", invoiceIsFullPrice(inv(699, [], 0, { status: "open" })), false],
  ["one-off invoice without a subscription doesn't count", invoiceIsFullPrice(inv(699, [], 0, { subscription: null })), false],

  ["intro month: active, not eligible",
    run([sub("sub_1", "active")], { sub_1: { interval: "month", hasFullPricePaidInvoice: false } }),
    { active: true, eligible: false, plan: "monthly" }],
  ["full-price monthly: eligible",
    run([sub("sub_1", "active")], { sub_1: { interval: "month", hasFullPricePaidInvoice: true } }),
    { active: true, eligible: true, plan: "monthly" }],
  ["yearly: eligible",
    run([sub("sub_1", "active")], { sub_1: { interval: "year", hasFullPricePaidInvoice: true } }),
    { active: true, eligible: true, plan: "yearly" }],
  ["old free trial (trialing, nothing paid): active, not eligible",
    run([sub("sub_1", "trialing")], { sub_1: { interval: "month", hasFullPricePaidInvoice: false } }),
    { active: true, eligible: false, plan: "monthly" }],
  ["past_due: no access",
    run([sub("sub_1", "past_due")], { sub_1: { interval: "month", hasFullPricePaidInvoice: true } }),
    { active: false, eligible: false, plan: null }],
  ["canceled: no access",
    run([sub("sub_1", "canceled")], { sub_1: { interval: "month", hasFullPricePaidInvoice: true } }),
    { active: false, eligible: false, plan: null }],
  ["active row past its period end: no access (same as /feed)",
    run([sub("sub_1", "active", behind)], { sub_1: { interval: "month", hasFullPricePaidInvoice: true } }),
    { active: false, eligible: false, plan: null }],
  ["Patreon: eligible", run([], {}, true), { active: true, eligible: true, plan: "patreon" }],
  ["Patreon plus intro Stripe sub: eligible through Patreon",
    run([sub("sub_1", "active")], { sub_1: { interval: "month", hasFullPricePaidInvoice: false } }, true),
    { active: true, eligible: true, plan: "monthly" }],
  ["Patreon while Stripe is down: still eligible", run([sub("sub_1", "active")], {}, true),
    { active: true, eligible: true, plan: "patreon" }],
  ["manual grant: eligible", run([sub("manual_grant_1", "active")]), { active: true, eligible: true, plan: "manual" }],
  ["no rows: not a member", run([]), { active: false, eligible: false, plan: null }],
];

let failed = 0;
for (const [name, actual, expected] of cases) {
  try {
    assert.deepEqual(actual, expected);
    console.log(`ok    ${name}`);
  } catch {
    failed++;
    console.log(`FAIL  ${name}\n      got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  }
}

// Stripe down and the answer depends on it: refuse rather than say "not eligible"
try {
  run([sub("sub_1", "active")], {});
  failed++;
  console.log("FAIL  Stripe down for a Stripe-only member should throw");
} catch {
  console.log("ok    Stripe down for a Stripe-only member throws (route answers 503, webhook sends nothing)");
}

console.log(failed ? `\n${failed} failed` : `\nall ${cases.length + 1} passed`);
process.exit(failed ? 1 : 0);
