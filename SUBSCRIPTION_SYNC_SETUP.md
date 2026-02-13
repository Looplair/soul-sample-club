# Subscription Sync - Complete Setup Guide

## 🎯 Problem Solved

Fixed the issue where:
- Users converting from trial to paid showed wrong `current_period_end` dates
- Klaviyo wasn't updated when trials converted to active
- Admin panel showed today's date instead of the actual billing cycle end

---

## ✅ What Was Implemented

### 1. **Webhook Fix** (Automatic - Already Live)
**File:** `src/app/api/webhooks/stripe/route.ts`

**What it does:**
- Fetches fresh subscription data from Stripe API on every webhook
- No longer trusts potentially stale webhook object data
- Syncs to Klaviyo on `customer.subscription.updated` events
- Handles trial→active conversions correctly

**Result:** All future subscriptions will have correct data automatically.

---

### 2. **Daily Cron Job** (Automatic - Requires Setup)
**Files:**
- `src/app/api/cron/sync-subscriptions/route.ts`
- `vercel.json`

**What it does:**
- Runs every day at 2am UTC
- Checks all active/trialing subscriptions
- Fetches fresh data from Stripe
- Updates only subscriptions that have changed (efficient)
- Syncs status changes to Klaviyo

**Why it's needed:**
- Catches any webhook failures or race conditions
- Ensures data never drifts out of sync
- Acts as a safety net for edge cases

---

### 3. **One-Time Manual Sync Tool** (For Existing Bad Data)
**Files:**
- `src/app/(admin)/admin/fix-subscriptions/page.tsx`
- `src/app/api/admin/sync-all-subscriptions/route.ts`

**What it does:**
- Admin UI to manually trigger a full sync
- Fixes all existing subscriptions with incorrect dates
- Shows detailed results for each subscription

**When to use:**
- Right now, to fix existing bad data from before the webhook fix
- Anytime you want to force a full sync

---

## 🚀 Setup Instructions

### Step 1: Add CRON_SECRET to Vercel

1. Go to your Vercel dashboard: https://vercel.com/looplairs-projects/soul-sample-club/settings/environment-variables
2. Add a new environment variable:
   - **Name:** `CRON_SECRET`
   - **Value:** `8qNNe2W+CuoX6LR6jgzn4gGNH00qfpBJGbcNnV4lm6o=`
   - **Environment:** Production, Preview, Development
3. Click "Save"
4. Redeploy your site (or wait for next deploy)

### Step 2: Fix Existing Data (One-Time)

1. Wait for Vercel to finish deploying (1-2 minutes)
2. Go to: https://soulsampleclub.com/admin/fix-subscriptions
3. Click "Run Sync"
4. Review the results - you should see all subscriptions updated with correct dates

### Step 3: Verify Cron is Running

After the next deploy, the cron job will be active. You can verify it's working by:

1. Check Vercel Logs tomorrow after 2am UTC
2. Look for `[CRON] Starting daily subscription sync...` messages
3. Or manually test it by visiting: https://soulsampleclub.com/api/cron/sync-subscriptions
   - Add header: `Authorization: Bearer 8qNNe2W+CuoX6LR6jgzn4gGNH00qfpBJGbcNnV4lm6o=`

---

## 🔍 How It All Works Together

### Scenario 1: New Trial Sign-Up
1. User signs up → `checkout.session.completed` webhook fires
2. Webhook handler fetches fresh Stripe data ✅
3. Database gets correct trial end date
4. Klaviyo synced with `stripe_trialing` status

### Scenario 2: Trial Converts to Paid (After 7 Days)
1. Stripe charges card → `invoice.paid` webhook fires
2. Webhook handler fetches fresh Stripe data ✅
3. Database updated with new billing period (30 days from now)
4. Klaviyo synced with `stripe_active` status
5. Also `customer.subscription.updated` fires (uses fresh data too)

### Scenario 3: Edge Case / Webhook Failure
1. Webhook somehow delivers stale data or fails
2. Next day at 2am UTC, cron job runs ✅
3. Cron fetches fresh data from Stripe
4. Database corrected automatically
5. Klaviyo updated if status changed

---

## 📊 Expected Results

### Before Fix:
❌ User paid on Feb 6 → Admin shows "Until Feb 13, 2026" (today)
❌ Klaviyo shows status as "canceled" or "trialing" even though they paid
❌ Users have wrong access dates

### After Fix:
✅ User paid on Feb 6 → Admin shows "Until Mar 6, 2026" (correct)
✅ Klaviyo shows status as "stripe_active"
✅ All dates match Stripe exactly

---

## 🛠️ Maintenance

### Daily Operations
- **Nothing required!** The cron job runs automatically.
- Check Vercel logs occasionally to ensure it's running smoothly.

### If You See Weird Data
1. Check Vercel logs for webhook errors
2. Go to `/admin/fix-subscriptions` and run manual sync
3. Check Stripe dashboard to verify correct data there

### Testing the Cron Locally
```bash
# In your .env.local, add:
CRON_SECRET=8qNNe2W+CuoX6LR6jgzn4gGNH00qfpBJGbcNnV4lm6o=

# Then run your dev server and call:
curl -H "Authorization: Bearer 8qNNe2W+CuoX6LR6jgzn4gGNH00qfpBJGbcNnV4lm6o=" \
  http://localhost:3000/api/cron/sync-subscriptions
```

---

## 🎉 Summary

**You're all set!** Here's what happens now:

1. ✅ **Webhooks are fixed** - All future subscriptions will have correct data
2. ✅ **Cron runs daily** - Catches any edge cases automatically
3. ✅ **Manual tool available** - Fix bad data anytime at `/admin/fix-subscriptions`

**Next Steps:**
1. Add `CRON_SECRET` to Vercel (Step 1 above)
2. Run the one-time sync tool to fix existing data (Step 2 above)
3. Relax - everything is automatic from now on! 🚀

---

**Questions?**
- Check Vercel logs for cron activity
- Stripe dashboard to verify correct subscription data
- Klaviyo to confirm users have correct status
