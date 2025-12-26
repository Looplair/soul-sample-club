# Soul Sample Club - Deployment Guide

This guide walks you through deploying the Soul Sample Club platform to production using Vercel and Supabase.

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Vercel account](https://vercel.com)
- [Supabase account](https://supabase.com)
- [Stripe account](https://stripe.com)

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `soul-sample-club`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Wait for project to provision (~2 minutes)

### Run Database Migrations

1. Go to **SQL Editor** in your Supabase dashboard
2. Run the migrations in order:

```sql
-- Copy contents from: supabase/migrations/001_initial_schema.sql
-- Then click "Run"
```

```sql
-- Copy contents from: supabase/migrations/002_rls_policies.sql
-- Then click "Run"
```

```sql
-- Copy contents from: supabase/migrations/003_storage_setup.sql
-- Then click "Run"
```

### Configure Authentication

1. Go to **Authentication > URL Configuration**
2. Set Site URL: `https://your-domain.com`
3. Add Redirect URLs:
   - `https://your-domain.com/callback`
   - `http://localhost:3000/callback` (for development)

### Get API Keys

1. Go to **Settings > API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Stripe Setup

### Create Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products > Add Product**
3. Create your subscription:
   - **Name**: "Soul Sample Club Membership"
   - **Price**: Your monthly price (e.g., $9.99/month)
   - Copy the **Price ID** → `STRIPE_PRICE_ID`

### Configure Customer Portal

1. Go to **Settings > Billing > Customer Portal**
2. Enable the portal
3. Configure allowed actions:
   - Cancel subscription
   - Update payment method
   - View invoices

### Set Up Webhook

1. Go to **Developers > Webhooks**
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy **Webhook Secret** → `STRIPE_WEBHOOK_SECRET`

### Get API Keys

1. Go to **Developers > API Keys**
2. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

---

## 3. Vercel Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or your project root)

### Add Environment Variables

In Vercel project settings, add these environment variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Deploy

Click "Deploy" and wait for the build to complete.

---

## 4. Post-Deployment

### Make Yourself Admin

Run this SQL in Supabase SQL Editor:

```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@example.com';
```

### Test the Flow

1. Create an account
2. Start a free trial
3. Verify webhook delivery in Stripe dashboard
4. Test the admin panel
5. Upload a sample pack
6. Test preview playback
7. Test downloads

---

## 5. Storage Configuration (Production)

### File Size Limits

Supabase has default file upload limits. For larger sample packs:

1. Go to **Storage > Policies**
2. Edit bucket settings to increase limits if needed

### CDN Caching

For better performance with cover images:

1. Cover images are served from the public `covers` bucket
2. Consider adding Vercel Image Optimization for covers

---

## 6. Monitoring

### Supabase Dashboard

- Monitor database usage
- Check storage consumption
- View authentication logs

### Stripe Dashboard

- Monitor subscription health
- View payment history
- Check webhook delivery

### Vercel Dashboard

- View deployment logs
- Monitor function execution
- Check error tracking

---

## Environment Variables Reference

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | Supabase Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key | Supabase Settings > API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | Stripe Developers > API Keys |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Stripe Webhooks endpoint |
| `STRIPE_PRICE_ID` | Subscription price ID | Stripe Products |
| `NEXT_PUBLIC_APP_URL` | Your domain | Your domain |

---

## Troubleshooting

### "Unauthorized" on Login

- Check Supabase URL and anon key
- Verify redirect URLs in Supabase Auth settings

### Webhook Failures

- Verify webhook URL is correct
- Check webhook secret
- View delivery attempts in Stripe dashboard

### Downloads Not Working

- Verify service role key has storage access
- Check RLS policies on samples table
- Verify file paths in database match storage

### Admin Access Denied

- Run the admin update SQL
- Clear browser cache
- Sign out and back in

---

## Security Checklist

- [ ] Never commit `.env.local` to git
- [ ] Use production Stripe keys in production
- [ ] Verify RLS policies are working
- [ ] Test subscription access restrictions
- [ ] Enable Supabase MFA for admin accounts
- [ ] Set up Stripe fraud protection

---

## Support

For issues with this codebase, check:
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
