# Scheduled Pack Publishing - Setup Guide

## 🎯 What This Does

Allows you to schedule packs to automatically go live at a specific date and time without manually publishing them.

---

## ✅ Features Added

### 1. **Database Field**
- `scheduled_publish_at` - Stores the exact datetime when pack should go live
- Indexed for fast cron queries

### 2. **Admin UI**
- Checkbox: "Schedule Auto-Publish"
- Date/time picker for scheduling
- Warning if pack is already published

### 3. **Automatic Publishing**
- Cron job runs every 15 minutes
- Checks for packs scheduled to publish
- Auto-publishes and creates notifications
- Clears the scheduled time after publishing

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Go to your Supabase dashboard SQL Editor and run:

```sql
-- Add scheduled_publish_at field to packs table
ALTER TABLE packs
ADD COLUMN scheduled_publish_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN packs.scheduled_publish_at IS 'When set, pack will automatically be published at this time. Null means no scheduling.';

-- Create index for efficient cron job queries
CREATE INDEX idx_packs_scheduled_publish ON packs(scheduled_publish_at)
WHERE scheduled_publish_at IS NOT NULL AND is_published = false;
```

Or upload the file: `supabase/migrations/004_add_scheduled_publish.sql`

### Step 2: Deploy to Vercel

The code is already pushed! Vercel will automatically:
1. Deploy the new PackForm with scheduling UI
2. Set up the cron job to run every 15 minutes

### Step 3: Verify Cron is Running

After deployment:
1. Check Vercel Logs after 15 minutes
2. Look for `[CRON] Checking for packs to auto-publish...`
3. Or manually test: `https://soulsampleclub.com/api/cron/publish-scheduled-packs`
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 📖 How to Use

### Creating a Scheduled Pack:

1. Go to `/admin/packs/new` or edit existing pack
2. Fill in pack details (name, description, cover, etc.)
3. Check ✅ **"Schedule Auto-Publish"**
4. Select date and time when pack should go live
5. **Leave "Published" UNCHECKED**
6. Click "Save Pack"

### What Happens:

- Pack is saved but NOT visible on the site
- At the scheduled time, the cron job will:
  - ✅ Set `is_published = true`
  - ✅ Clear `scheduled_publish_at`
  - ✅ Create notification for users
  - ✅ Pack becomes visible on site

### Editing a Scheduled Pack:

- You can change the scheduled time before it publishes
- Uncheck "Schedule Auto-Publish" to cancel scheduling
- If you manually publish before scheduled time, schedule is cleared

---

## 🕐 Cron Schedule

**Runs every 15 minutes:**
- `:00`, `:15`, `:30`, `:45` of each hour

**Example:**
- Schedule pack for 3:00 PM
- Cron runs at 3:00 PM and publishes it
- Pack goes live within 0-15 minutes of scheduled time

**Why 15 minutes?**
- Balance between timely publishing and server load
- You can change to `*/5 * * * *` in `vercel.json` for every 5 minutes

---

## 📊 Checking Scheduled Packs

You can check which packs are scheduled in your database:

```sql
SELECT id, name, scheduled_publish_at, is_published
FROM packs
WHERE scheduled_publish_at IS NOT NULL
AND is_published = false
ORDER BY scheduled_publish_at ASC;
```

---

## 🛠️ Admin Panel Updates

### Before (Old):
- Only "Published" checkbox
- Had to manually publish at release time

### After (New):
```
┌─────────────────────────────────────┐
│ ☑ Schedule Auto-Publish             │
│                                     │
│ Publish Date & Time                 │
│ ┌─────────────────────────────────┐ │
│ │ 2026-02-20 @ 12:00 PM          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ℹ️ Pack will auto-publish at this   │
│   time. Leave "Published" unchecked │
└─────────────────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Timezone:**
   - The datetime picker uses YOUR LOCAL TIMEZONE
   - Stored in database as UTC
   - Cron compares against UTC

2. **Already Published Packs:**
   - Can't schedule already-published packs
   - You'll see a warning if you try

3. **Manual Override:**
   - You can still manually publish before scheduled time
   - Just check "Published" and save

4. **Notifications:**
   - Automatically created when pack is auto-published
   - Type: "new_pack"
   - Sent to all users

---

## 🧪 Testing

### Test the Scheduling:

1. Create a test pack
2. Schedule it for 5 minutes from now
3. Leave "Published" unchecked
4. Save
5. Wait 5-20 minutes (cron runs every 15 min)
6. Check if pack is now visible on `/feed`
7. Check if notification was created

### Manual Test Cron:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://soulsampleclub.com/api/cron/publish-scheduled-packs
```

---

## 📝 Example Use Cases

### 1. Weekly Releases
- Schedule new pack every Monday at 9:00 AM
- Consistent release schedule
- No need to remember to publish manually

### 2. Timed Launches
- Big pack coming on specific date/time
- Coordinate with email announcement
- Automatic at exact time

### 3. Time Zone Optimization
- Release at best time for your audience
- E.g., 12:00 PM EST for US users
- Set it and forget it

---

## ✅ Summary

**Before:**
- Had to manually publish packs at release time
- Easy to forget or miss the timing

**After:**
- Schedule packs days/weeks in advance
- Automatic publishing at exact time
- Runs every 15 minutes in background
- Set it and forget it! 🚀

**You're all set!** Just run the database migration and the feature is live.
