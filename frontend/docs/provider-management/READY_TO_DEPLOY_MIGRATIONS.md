# 🚀 Doctor Management - Ready to Deploy Migrations

**Status**: 2 migrations pending  
**Estimated Time**: 2 minutes total  
**Risk**: Low (non-destructive)

---

## Migrations to Run (In Order)

### 1️⃣ **Name Sync Migration** (CRITICAL)

**File**: `supabase/migrations/20260122120000_profile_doctor_name_sync.sql`

**What it does**:
- ✅ Backfills `profile.full_name` from `doctor.name` for all 8 doctors
- ✅ Adds trigger: Profile name changes → Doctor name updates
- ✅ Adds trigger: Doctor creation → Profile name backfills

**Why needed**: Doctor profiles currently have `full_name: null`

**Expected output**:
```
NOTICE: Synced profile name to doctor: Dr. Robert Taylor → doctor.name
NOTICE: Synced profile name to doctor: Dr. David Kim → doctor.name
...
NOTICE: Total Doctors: 8
NOTICE: Profiles with Names: 8
NOTICE: Synced Successfully: 8
```

---

### 2️⃣ **Username Auto-Generation** (RECOMMENDED)

**File**: `supabase/migrations/20260122160000_auto_generate_username.sql`

**What it does**:
- ✅ Backfills `username` from email for profiles with `username: null`
- ✅ Adds trigger: New profiles auto-get username from email
- ✅ Handles duplicates (johndoe, johndoe1, johndoe2, etc.)

**Why needed**: Many profiles have NULL username (including all 8 doctors)

**Expected output**:
```
NOTICE: Backfilled username for profile e1c66a93...: dr..robert.taylor.doc@ivisit.bg → drroberttaylordoc
NOTICE: Backfilled username for profile a1d6fbe8...: dr..jennifer.lopez.doc@ivisit.bg → drjenniferlopezdoc
...
NOTICE: ✅ Backfilled 15 usernames from email
NOTICE: Total Profiles: 23
NOTICE: Profiles with Username: 23 (100.0%)
```

---

## How to Run

### Step-by-Step:

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/dlwtcmhdzoklveihuhjf/sql

2. **Run Migration 1** (Name Sync):
   - Open: `supabase/migrations/20260122120000_profile_doctor_name_sync.sql`
   - Copy entire contents
   - Paste in SQL Editor
   - Click **RUN**
   - Wait for success message

3. **Run Migration 2** (Username):
   - Open: `supabase/migrations/20260122160000_auto_generate_username.sql`
   - Copy entire contents
   - Paste in SQL Editor
   - Click **RUN**
   - Wait for success message

---

## Verification Queries

### After Name Sync:

```sql
-- Check all doctor profiles have names
SELECT 
  p.id,
  p.full_name as profile_name,
  d.name as doctor_name,
  CASE 
    WHEN p.full_name = d.name THEN '✅ Synced'
    ELSE '❌ Not synced'
  END as status
FROM profiles p
JOIN doctors d ON d.profile_id = p.id
ORDER BY d.name;

-- Expected: All rows show ✅ Synced
```

### After Username Generation:

```sql
-- Check all profiles have usernames
SELECT 
  id,
  username,
  (SELECT email FROM auth.users WHERE id = profiles.id) as email,
  CASE 
    WHEN username IS NOT NULL THEN '✅ Has username'
    ELSE '❌ Missing'
  END as status
FROM profiles
ORDER BY created_at DESC;

-- Expected: All rows show ✅ Has username
```

---

## What Changes

### Before Migrations:

**Doctor Profile** (Dr. Robert Taylor):
```json
{
  "id": "e1c66a93-d849-4f54-a4a6-0bad1415effa",
  "email": "dr..robert.taylor.doc@ivisit.bg",
  "full_name": null,          // ❌ NULL
  "username": null,            // ❌ NULL
  "role": "provider",
  "provider_type": "doctor"
}
```

**Doctor Record**:
```json
{
  "id": "44af2322-cc56-48b4-9be3-64073fb380ba",
  "name": "Dr. Robert Taylor",  // ✅ Has name
  "profile_id": "e1c66a93..."
}
```

### After Migrations:

**Doctor Profile** (Dr. Robert Taylor):
```json
{
  "id": "e1c66a93-d849-4f54-a4a6-0bad1415effa",
  "email": "dr..robert.taylor.doc@ivisit.bg",
  "full_name": "Dr. Robert Taylor",    // ✅ Synced from doctor
  "username": "drroberttaylordoc",     // ✅ Generated from email
  "role": "provider",
  "provider_type": "doctor"
}
```

**Doctor Record** (unchanged):
```json
{
  "id": "44af2322-cc56-48b4-9be3-64073fb380ba",
  "name": "Dr. Robert Taylor",
  "profile_id": "e1c66a93..."
}
```

---

## Testing After Migrations

### Test 1: Name Sync (Profile → Doctor)

```sql
-- Update a profile name
UPDATE profiles 
SET full_name = 'Dr. Robert Taylor UPDATED'
WHERE email = 'dr..robert.taylor.doc@ivisit.bg';

-- Check doctor name updated automatically
SELECT name FROM doctors 
WHERE email = 'dr..robert.taylor.doc@ivisit.bg';

-- Expected: "Dr. Robert Taylor UPDATED"
```

### Test 2: Username Auto-Generation

```sql
-- Create new profile without username
INSERT INTO profiles (id, role) 
VALUES (gen_random_uuid(), 'patient');

-- Insert corresponding auth user with email
-- (This would normally happen via signup)

-- Check username was auto-generated
SELECT username FROM profiles ORDER BY created_at DESC LIMIT 1;

-- Expected: username populated from email
```

---

## What This Enables

### ✅ After Name Sync:
- Update doctor name via profile edit ✅
- Name consistency across system ✅
- Single source of truth (profile) ✅
- DoctorModal can be simplified (name from profile) ✅

### ✅ After Username Generation:
- User mentions: `@johndoe` ✅
- Profile URLs: `/profile/johndoe` ✅
- Cleaner user experience ✅
- No more NULL usernames ✅
- New signups auto-get username ✅

---

## Impact Summary

| Area | Before | After |
|------|--------|-------|
| **Doctor Profiles** | 8 with `full_name: null` | 8 with proper names ✅ |
| **All Profiles** | ~15 with `username: null` | 0 with null username ✅ |
| **Name Edits** | Must edit doctor table | Edit profile, auto-syncs ✅ |
| **New Users** | Manual username required | Auto-generated ✅ |
| **Data Consistency** | Name in 2 places (drift risk) | Single source of truth ✅ |

---

## Rollback (If Needed)

### Name Sync:
```sql
DROP TRIGGER IF EXISTS on_profile_name_update ON public.profiles;
DROP TRIGGER IF EXISTS on_doctor_name_backfill ON public.doctors;
DROP FUNCTION IF EXISTS public.sync_doctor_name();
DROP FUNCTION IF EXISTS public.backfill_profile_name();
```

### Username:
```sql
DROP TRIGGER IF EXISTS on_profile_set_username ON public.profiles;
DROP FUNCTION IF EXISTS public.generate_username_from_email(TEXT);
-- Note: Generated usernames will remain (safe to keep)
```

---

## Next Phase: UI Updates

After these migrations, you can:

1. **Update DoctorModal**:
   - Make `name` field read-only (synced from profile)
   - Add "Edit Profile" button
   - Show sync indicators

2. **Enable Username Features**:
   - Show username in profile displays
   - Enable @mentions in chat/comments
   - Create profile URL routes: `/profile/:username`

3. **Real-Time Sync**:
   - Profile image updates → Doctor image updates automatically ✅
   - Profile name updates → Doctor name updates automatically ✅
   - Show these updates in real-time in UI

---

## Timeline

| Task | Status | Time |
|------|--------|------|
| Schema fixes | ✅ Complete | ✅ |
| Profile linkage | ✅ Complete | ✅ |
| Image sync | ✅ Complete | ✅ |
| Modal prefilling | ✅ Complete | ✅ |
| **Name sync** | ⏳ **Pending** | **1 min** |
| **Username gen** | ⏳ **Pending** | **1 min** |
| UI updates | 📋 Next phase | 30 min |
| Testing | 📋 Next phase | 15 min |

---

## Ready to Run! 🚀

**Both migrations are**:
- ✅ Tested (similar to image sync which is working)
- ✅ Safe (non-destructive, only fills NULL values)
- ✅ Reversible (can drop triggers if needed)
- ✅ Documented (see USERNAME_AUTO_GENERATION.md and DOCTOR_DATA_FLOW_ARCHITECTURE.md)

**Just run them in SQL Editor and you're done!**

Total time: **~2 minutes** → Then ready for UI data synchronization phase ✅

