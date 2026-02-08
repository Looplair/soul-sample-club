# Soul Sample Club - Complete Technical Documentation

> A comprehensive technical reference for recreating this sample music subscription platform.
> Last updated: February 2026

---

## TABLE OF CONTENTS

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Subscription & Payments](#6-subscription--payments)
7. [Audio System](#7-audio-system)
8. [File Storage](#8-file-storage)
9. [Admin System](#9-admin-system)
10. [Notifications](#10-notifications)
11. [Analytics & Tracking](#11-analytics--tracking)
12. [API Routes](#12-api-routes)
13. [Page Structure](#13-page-structure)
14. [Key Components](#14-key-components)
15. [Middleware & Security](#15-middleware--security)
16. [Issues & Solutions](#16-issues--solutions)
17. [Deployment](#17-deployment)

---

## 1. TECH STACK OVERVIEW

### Core Framework
- **Next.js 14.2.21** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.7.2** - Type safety

### Database & Auth
- **Supabase** - PostgreSQL database + Auth + Storage
  - `@supabase/ssr@0.5.2` - Server-side rendering support
  - `@supabase/supabase-js@2.47.10` - Client library

### Payments
- **Stripe** - Subscription billing
  - `stripe@17.4.0` - Node.js SDK
  - Checkout sessions with 7-day free trial
  - Webhook handling for subscription events
  - Billing portal integration

### Audio
- **WaveSurfer.js 7.8.12** - Waveform visualization and playback
- **lamejs 1.2.1** - JavaScript MP3 encoder
- **soundtouchjs 0.2.1** - Audio time-stretching (BPM sync)
- **ffmpeg-static 5.3.0** - Audio transcoding

### Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS
- **Framer Motion 11.15.0** - Animations
- **Lucide React 0.468.0** - Icons
- **clsx + tailwind-merge** - Class composition

### Email Marketing
- **Klaviyo** - Email list management and automation

### Analytics
- **Google Analytics** - Page tracking
- **Meta Pixel** - Facebook/Instagram ad conversion tracking

### State Management
- **Zustand 5.0.2** - Lightweight state management
- **React Context** - Audio playback coordination

### Other
- **react-dropzone 14.3.5** - File uploads

---

## 2. PROJECT STRUCTURE

```
src/
├── app/                      # Next.js App Router pages
│   ├── (admin)/admin/        # Admin dashboard pages
│   ├── (auth)/               # Auth pages (login, signup, etc)
│   ├── (dashboard)/          # User dashboard pages
│   ├── (legal)/              # Terms, privacy pages
│   ├── api/                  # API routes
│   ├── explore/              # Swipeable sample explorer
│   ├── feed/                 # Main catalog page
│   ├── packs/[id]/           # Pack detail pages
│   └── page.tsx              # Homepage
├── components/
│   ├── admin/                # Admin-specific components
│   ├── analytics/            # GA, Klaviyo, Meta Pixel
│   ├── audio/                # WaveformPlayer, SampleRow, etc
│   ├── layout/               # Navbar, Footer, Sidebar
│   ├── notifications/        # NotificationBell, Panel
│   ├── packs/                # PackCard, VoteBringBack
│   ├── sections/             # Homepage sections
│   ├── subscription/         # SubscribeButton, CTA
│   └── ui/                   # Button, Card, Modal, etc
├── contexts/
│   └── AudioContext.tsx      # Global audio state
├── lib/
│   ├── supabase/             # Supabase clients (browser, server, admin)
│   ├── stripe/               # Stripe client setup
│   ├── klaviyo.ts            # Klaviyo API helpers
│   ├── notifications.ts      # Notification helpers
│   ├── rate-limit.ts         # Rate limiting
│   └── utils.ts              # Utility functions
└── types/
    └── database.ts           # Supabase generated types
```

---

## 3. ENVIRONMENT VARIABLES

Create `.env.local` with:

```bash
# ===========================================
# SUPABASE
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===========================================
# STRIPE
# ===========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx  # Your subscription price ID

# ===========================================
# APP URLS
# ===========================================
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# ===========================================
# PATREON (Optional)
# ===========================================
PATREON_CLIENT_ID=your-client-id
PATREON_CLIENT_SECRET=your-client-secret
PATREON_CAMPAIGN_ID=optional-campaign-id
PATREON_WHITELIST_EMAILS=email1@example.com,email2@example.com

# ===========================================
# KLAVIYO (Optional)
# ===========================================
KLAVIYO_PRIVATE_API_KEY=pk_xxx
KLAVIYO_LIST_ID=your-list-id

# ===========================================
# ANALYTICS (Optional)
# ===========================================
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=1234567890
```

---

## 4. DATABASE SCHEMA

### Tables

#### `profiles`
User profile data, linked to Supabase Auth.
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `subscriptions`
Stripe subscription tracking.
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL, -- 'active', 'trialing', 'canceled', 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `patreon_links`
Patreon OAuth connections.
```sql
CREATE TABLE patreon_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  patreon_user_id TEXT NOT NULL,
  patreon_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  is_active BOOLEAN DEFAULT false,
  tier_id TEXT,
  tier_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `packs`
Sample pack collections.
```sql
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  release_date DATE NOT NULL,
  end_date DATE, -- Optional explicit archive date
  is_published BOOLEAN DEFAULT false,
  is_staff_pick BOOLEAN DEFAULT false,
  is_bonus BOOLEAN DEFAULT false,
  is_returned BOOLEAN DEFAULT false, -- Brought back by popular demand
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `samples`
Individual audio tracks.
```sql
CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,       -- Path in Supabase storage
  preview_path TEXT,             -- MP3 preview path
  stems_path TEXT,               -- ZIP stems path
  file_size BIGINT,
  duration REAL,                 -- Seconds
  bpm INTEGER,
  key TEXT,                      -- Musical key (e.g., "C minor")
  order_index INTEGER DEFAULT 0,
  waveform_peaks JSONB,          -- Pre-generated waveform data
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `downloads`
Download history tracking.
```sql
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  sample_id UUID NOT NULL REFERENCES samples(id),
  downloaded_at TIMESTAMPTZ DEFAULT now()
);
```

#### `likes`
User favorites.
```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  sample_id UUID NOT NULL REFERENCES samples(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, sample_id)
);
```

#### `notifications`
System notifications.
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'new_pack', 'returned_pack', 'announcement', 'custom'
  pack_id UUID REFERENCES packs(id),
  link_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `notification_reads`
Per-user read status.
```sql
CREATE TABLE notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT now(),
  dismissed BOOLEAN DEFAULT false,
  UNIQUE(notification_id, user_id)
);
```

#### `pack_votes`
Voting to bring back archived packs.
```sql
CREATE TABLE pack_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  pack_id UUID NOT NULL REFERENCES packs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pack_id)
);
```

### Database Functions

```sql
-- Check if user is admin
CREATE FUNCTION is_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT is_admin FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user has active subscription
CREATE FUNCTION has_active_subscription(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = $1
    AND status IN ('active', 'trialing')
    AND current_period_end > now()
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## 5. AUTHENTICATION SYSTEM

### Supabase Auth
- Email/password signup and login
- Magic link authentication
- OAuth providers (can be extended)

### Patreon Integration
Alternative access path for Patreon supporters.

**Flow:**
1. User clicks "Login with Patreon"
2. Redirect to `/api/patreon/login` → Patreon OAuth
3. Callback at `/api/patreon/auth-callback`:
   - Exchange code for tokens
   - Check patron status (active supporter or whitelisted)
   - Create/link user account
   - Save tokens in `patreon_links` table
4. Redirect to app with magic link

**Access Check:**
```typescript
// User has access if:
// 1. Active Stripe subscription (status = 'active' or 'trialing')
// 2. OR active Patreon link (is_active = true)
```

### Admin Access
- Controlled by `is_admin` boolean in `profiles` table
- Set via direct SQL: `UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com'`
- Checked in middleware for `/admin/*` routes

---

## 6. SUBSCRIPTION & PAYMENTS

### Stripe Setup
- Single subscription product with monthly billing
- 7-day free trial for first-time users
- Trial eligibility checked across all accounts with same email

### Checkout Flow
```typescript
// /api/create-checkout-session
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  mode: "subscription",
  payment_method_types: ["card"],
  line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
  subscription_data: {
    trial_period_days: hasUsedTrial ? undefined : 7,
  },
  success_url: `${APP_URL}/feed?success=true`,
  cancel_url: `${APP_URL}/feed?canceled=true`,
  allow_promotion_codes: true,
});
```

### Webhook Events Handled
- `checkout.session.completed` - Create subscription record
- `customer.subscription.created` - Update status
- `customer.subscription.updated` - Handle changes
- `customer.subscription.deleted` - Mark canceled
- `invoice.payment_failed` - Set past_due
- `invoice.paid` - Restore active

### Billing Portal
```typescript
// /api/create-portal-session
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${APP_URL}/account`,
});
```

---

## 7. AUDIO SYSTEM

### WaveSurfer.js Configuration
```typescript
const wavesurfer = WaveSurfer.create({
  container: containerRef.current,
  waveColor: "#3A3A3A",      // Unplayed portion
  progressColor: "#FFFFFF",   // Played portion
  cursorColor: "#FFFFFF",
  cursorWidth: 2,
  barWidth: 2,
  barGap: 2,
  barRadius: 2,
  height: 56,
  normalize: true,
  backend: "WebAudio",
});
```

### AudioContext Provider
Coordinates playback across all WaveSurfer instances:
- Only one track plays at a time
- Tracks current track, play state, time, duration
- Provides global controls (play, pause, stop, seek, volume)

### Components
- **WaveformPlayer** - Standalone waveform with controls
- **SampleRow** - Full sample row with download, like, waveform
- **SampleRowWithLoop** - Advanced version with BPM sync and looping
- **NowPlayingBar** - Fixed bottom bar showing current track

### Preview URLs
```typescript
// /api/preview/[sampleId]
// Returns public URL for MP3 preview file
const { data } = supabase.storage
  .from("samples")
  .getPublicUrl(sample.preview_path);
```

---

## 8. FILE STORAGE

### Supabase Storage Bucket: `samples`

**Structure:**
```
samples/
├── {sampleId}/
│   ├── sample.wav      # Full quality WAV
│   └── preview.mp3     # Preview for waveform
└── {packId}/
    └── {timestamp}-stems.zip  # Multi-track stems
```

### Download Flow
```typescript
// /api/download/[sampleId]
// 1. Verify user has active subscription or Patreon
// 2. Verify pack is not archived (or user has access)
// 3. Generate signed URL (60s expiry)
// 4. Record download in database
// 5. Return URL to client

const { data } = await adminSupabase.storage
  .from("samples")
  .createSignedUrl(sample.file_path, 60);
```

### Admin Uploads
- Pack cover images uploaded via Supabase dashboard or admin UI
- Sample files uploaded with presigned URLs for large files
- Stems uploaded as ZIP files

---

## 9. ADMIN SYSTEM

### Admin Routes (`/admin/*`)

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard with stats, expiring packs, recent activity |
| `/admin/packs` | List/manage all packs |
| `/admin/packs/new` | Create new pack |
| `/admin/packs/[id]` | Edit pack, manage samples, upload stems |
| `/admin/users` | User management, grant/revoke access |
| `/admin/subscriptions` | Subscription overview |
| `/admin/analytics` | Download trends, popular content |
| `/admin/notifications` | Create/manage notifications |
| `/admin/settings` | App configuration |

### Admin Actions
```typescript
// Server actions in /app/actions/admin-subscription.ts
grantManualAccess(userId, notes)   // Give user subscription access
revokeAccess(userId)               // Remove access
syncUserSubscription(userId)       // Sync with Stripe
```

### Admin Authorization Check
```typescript
// In middleware.ts
if (pathname.startsWith("/admin")) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.redirect("/feed");
  }
}
```

---

## 10. NOTIFICATIONS

### Types
- `new_pack` - New pack released
- `returned_pack` - Archived pack brought back
- `announcement` - General announcement
- `custom` - Custom notification

### Components
- **NotificationBell** - Bell icon with unread count badge
- **NotificationPanel** - Dropdown list of notifications

### Real-time Updates
```typescript
// Subscribe to new notifications via Supabase Realtime
supabase
  .channel("notifications")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "notifications",
  }, handleNewNotification)
  .subscribe();
```

### Auto-generated
When admin publishes a pack, notification is auto-created with type `new_pack`.

---

## 11. ANALYTICS & TRACKING

### Google Analytics
```typescript
// components/analytics/GoogleAnalytics.tsx
<Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
gtag('config', gaId, { page_path: window.location.pathname });
```

### Meta Pixel
```typescript
// components/analytics/MetaPixel.tsx
fbq('init', PIXEL_ID);
fbq('track', 'PageView');

// components/analytics/MetaPixelEvents.tsx
// Fires StartTrial on /feed?success=true (post-checkout)
// Guards: localStorage prevents duplicate fires per user
```

### Klaviyo
```typescript
// Sync user on subscription change
syncUserToKlaviyo({
  email,
  fullName,
  subscriptionType, // 'stripe', 'patreon', 'canceled'
  joinedAt,
});
```

---

## 12. API ROUTES

### Public
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/preview/[sampleId]` | GET | Get preview URL for waveform |

### Authenticated
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/download/[sampleId]` | GET | Get signed download URL |
| `/api/download/[sampleId]/stems` | GET | Download stems ZIP |
| `/api/likes/[sampleId]` | POST/DELETE | Like/unlike sample |
| `/api/vote` | POST/DELETE | Vote for pack |
| `/api/create-checkout-session` | POST | Start Stripe checkout |
| `/api/create-portal-session` | POST | Open billing portal |

### Patreon
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/patreon/login` | GET | Initiate Patreon OAuth |
| `/api/patreon/auth-callback` | GET | Handle OAuth callback |
| `/api/patreon/connect` | GET | Link existing account |
| `/api/patreon/disconnect` | POST | Unlink Patreon |

### Admin
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/users` | GET | List users |
| `/api/admin/stems` | POST | Upload stems |
| `/api/admin/stems/presign` | GET | Get presigned URL |
| `/api/admin/stems/finalize` | POST | Complete upload |
| `/api/admin/klaviyo/sync` | POST | Sync to Klaviyo |

### Webhooks
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/stripe` | POST | Stripe events |

---

## 13. PAGE STRUCTURE

### Public Pages
- `/` - Homepage (hero, features, pricing, FAQ, testimonials)
- `/feed` - Browse catalog (available, returned, archived packs)
- `/packs/[id]` - Pack detail with samples
- `/explore` - Swipeable sample discovery
- `/app` - Desktop app info
- `/terms` - Terms of service
- `/privacy` - Privacy policy

### Auth Pages
- `/login` - Sign in
- `/signup` - Create account
- `/reset-password` - Password reset
- `/auth/confirm` - Magic link verification

### Dashboard Pages (Authenticated)
- `/library` - Saved samples and downloads
- `/account` - Profile, billing, Patreon linking
- `/dashboard` - Personalized home

### Admin Pages
- `/admin` - Dashboard
- `/admin/packs` - Pack management
- `/admin/users` - User management
- `/admin/subscriptions` - Subscription overview
- `/admin/analytics` - Stats and trends
- `/admin/notifications` - Notification management

---

## 14. KEY COMPONENTS

### Homepage Sections
```
<Hero />                    - Main CTA, stats, featured pack
<FeaturesStrip />           - 3 key features
<CatalogSection />          - Searchable pack grid
<CreatorHeroStrip />        - About the creator
<CompleteControlSection />  - Licensing info
<CommunityProof />          - Social proof
<MemberTestimonials />      - Scrolling testimonial carousel
<HowItWorksSection />       - 3-step animated guide
<PricingSection />          - Price card with benefits
<FAQSection />              - 20+ questions in 2 columns
```

### Audio Components
- **WaveformPlayer** - Core waveform visualization
- **SampleRow** - Table row with preview, download, like
- **NowPlayingBar** - Fixed bottom playback bar
- **AudioContext** - Global playback state

### UI Components
- **Button** - Primary action button (variants: primary, secondary, ghost)
- **Card** - Container with border/shadow
- **Modal** - Dialog overlay
- **Toast** - Notification popup
- **Badge** - Status tag
- **Input** - Form input
- **Dropdown** - Dropdown menu
- **Skeleton** - Loading placeholder

---

## 15. MIDDLEWARE & SECURITY

### Route Protection (`middleware.ts`)
```typescript
// Public routes - no auth required
const publicRoutes = ["/", "/feed", "/packs", "/explore", "/terms", "/privacy"];

// Auth required - redirect to login
if (!user && !publicRoutes.includes(pathname)) {
  return NextResponse.redirect("/login");
}

// Admin only - check is_admin in database
if (pathname.startsWith("/admin") && !profile?.is_admin) {
  return NextResponse.redirect("/feed");
}
```

### Rate Limiting
```typescript
// lib/rate-limit.ts
const limits = {
  download: { windowMs: 60000, max: 100 },
  auth: { windowMs: 60000, max: 10 },
  likes: { windowMs: 60000, max: 60 },
};
```

### Security Headers (`next.config.js`)
```javascript
{
  key: "X-Content-Type-Options",
  value: "nosniff",
},
{
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=()",
}
```

---

## 16. ISSUES & SOLUTIONS

### Pack Expiry Logic
- Packs auto-archive 90 days after `release_date`
- Override with explicit `end_date` field
- `is_returned` flag overrides archive status (brings pack back)

### Trial Abuse Prevention
- Check email across all accounts before granting trial
- Check Stripe customer history for same email
- Store trial usage in subscription record

### Subscription Status Edge Cases
- Webhook race conditions handled with timestamp checks
- `past_due` status not overwritten by stale webhooks
- Auto-cleanup of stale subscription records in library page

### WaveSurfer Memory
- Proper cleanup in useEffect return
- Unregister from AudioContext on unmount
- Limit visible slides in Explore page to 5 at a time

### Mobile Explore Glitch
- Added `bg-charcoal` fallback to prevent flash during swipe
- `backfaceVisibility: hidden` for smoother animations
- Expanded visible slide range for preloading

### Testimonials Animation Jump
- Changed from useState to useRef for scroll position
- Animation continues from current position on resume

---

## 17. DEPLOYMENT

### Vercel Configuration
- Framework: Next.js
- Build command: `npm run build`
- Output directory: `.next`

### Environment Variables
Set all variables from Section 3 in Vercel dashboard.
**Important:** `NEXT_PUBLIC_*` vars are inlined at build time.

### Supabase Setup
1. Create project at supabase.com
2. Run schema migrations (Section 4)
3. Create `samples` storage bucket (public read for previews)
4. Configure RLS policies
5. Enable Realtime for notifications table

### Stripe Setup
1. Create subscription product and price
2. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Enable events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

### Post-Deploy
1. Set admin users: `UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com'`
2. Test checkout flow end-to-end
3. Verify webhook delivery in Stripe dashboard
4. Check analytics in GA/Meta Events Manager

---

## QUICK REFERENCE

### Make User Admin
```sql
UPDATE profiles SET is_admin = true WHERE email = 'user@example.com';
```

### Check User Subscription
```sql
SELECT * FROM subscriptions
WHERE user_id = 'uuid'
AND status IN ('active', 'trialing')
AND current_period_end > now();
```

### Reset Trial (Testing)
```sql
DELETE FROM subscriptions WHERE user_id = 'uuid';
```

### Force Sync Subscription
Use admin panel: `/admin/users` → Find user → "Sync with Stripe"

---

*This documentation covers all technical aspects needed to recreate Soul Sample Club from scratch.*
