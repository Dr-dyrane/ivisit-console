# Doctor Data Flow Architecture
## Following Apple's "Single Source of Truth" Principle

**Philosophy**: Clean data boundaries. Profile is identity, Doctor is metadata.

---

## The Apple Way: Layered Data Model

```
┌─────────────────────────────────────────────────────────┐
│                    USER IDENTITY LAYER                   │
│                  (Single Source of Truth)                │
├─────────────────────────────────────────────────────────┤
│  auth.users                                             │
│  └─ id, email, phone, email_confirmed_at                │
│                                                          │
│  public.profiles ⭐ PRIMARY IDENTITY                    │
│  └─ id (= auth.users.id)                                │
│  └─ full_name, username                                 │
│  └─ image_uri ⭐ CANONICAL IMAGE                        │
│  └─ avatar_url (copy of image_uri for backwards compat) │
│  └─ role ('admin', 'org_admin', 'provider', 'patient')  │
│  └─ provider_type ('doctor', 'ambulance', null)         │
│  └─ organization_id                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
                    ONE-WAY SYNC
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   PROVIDER METADATA LAYER                │
│                   (Read-Only Identity)                   │
├─────────────────────────────────────────────────────────┤
│  public.doctors 📋 PROFESSIONAL PROFILE                 │
│  └─ id (UUID, primary key)                              │
│  └─ profile_id ⭐ LINK TO IDENTITY                      │
│  └─ name (synced from profile.full_name)               │
│  └─ image ⭐ SYNCED FROM profile.image_uri              │
│  └─ email (synced from auth.email)                      │
│  └─ specialization, experience, license_number          │
│  └─ hospital_id, consultation_fee, rating               │
│  └─ status ('available', 'busy', 'on_call', 'off_duty') │
└─────────────────────────────────────────────────────────┘
```

---

## Current State: What We Have ✅

### 1. Profile-to-Doctor Image Sync (Working)

**Trigger**: `sync_doctor_image` (from migration `20260122063000_doctor_fixes.sql`)

```sql
CREATE TRIGGER on_profile_image_update
  AFTER UPDATE OF image_uri, avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_doctor_image();
```

**What it does**:
- When a user updates their profile image → Doctor image auto-updates
- One-way sync: **Profile → Doctor**
- Profile is the source of truth ✅

### 2. Current Data Status

**All 8 doctors have valid profile links:**

| Doctor | Profile ID | Image Source | Status |
|--------|-----------|--------------|--------|
| Dr. Robert Taylor | e1c66a93... | Profile image_uri | ✅ Linked |
| Dr. Jennifer Lopez | a1d6fbe8... | Profile image_uri | ✅ Linked |
| Dr. David Kim | 97daa328... | Profile image_uri | ✅ Linked |
| Dr. Sarah Wilson | ad572887... | Profile image_uri | ✅ Linked |
| Dr. Michael Ross | b2359dd5... | Profile image_uri | ✅ Linked |
| Dr. Lisa Wong | 813211e4... | Profile image_uri | ✅ Linked |
| Dr. Emily Brown | bf8709de... | Profile image_uri | ✅ Linked |
| Dr. James Chen | b358c5b8... | Profile image_uri | ✅ Linked |

**Issue**: None have `full_name` in profile yet (all NULL)

---

## The Answer: YES, Follow Apple's Principle ✅

**Question**: "As a doctor, when I update my profile image, should it update doctor.image?"

**Answer**: **YES, and it already does!** 🎉

### Why This is Correct (Apple-Style):

1. **Single Source of Truth**:
   - Profile = Who you are (identity)
   - Doctor = What you do (professional metadata)
   - Your photo is WHO you are → Lives in Profile

2. **Data Ownership**:
   - Users own their profile image
   - Doctor table is a "view" of professional data
   - Doctor.image is a **denormalized copy** for performance

3. **Separation of Concerns**:
   - **Identity Layer** (profile): Manages personal data (name, image, contact)
   - **Metadata Layer** (doctor): Manages professional data (specialization, experience, ratings)

4. **One-Way Flow** (Clean Boundaries):
   ```
   User updates profile.image_uri
   ↓
   Trigger fires
   ↓
   Doctor.image auto-updated
   ✅ Single edit point, consistent everywhere
   ```

---

## What Should Sync vs What Shouldn't

### ✅ Profile → Doctor (One-Way Sync)

These are **identity fields** that should auto-sync:

| Field | Profile Column | Doctor Column | Sync Method | Status |
|-------|---------------|---------------|-------------|--------|
| **Image** | `image_uri` | `image` | Trigger: `sync_doctor_image` | ✅ Working |
| **Name** | `full_name` | `name` | Trigger: `sync_doctor_name` | ⏳ Missing |
| **Email** | (via auth.users) | `email` | Set on creation | ✅ Working |

### ❌ Doctor-Only Fields (No Sync)

These are **professional metadata** unique to doctors table:

- `specialization` - Medical specialty (not in profile)
- `experience` - Years practicing (not in profile)
- `license_number` - Medical license (not in profile)
- `consultation_fee` - Fee structure (not in profile)
- `hospital_id` - Current hospital (not in profile)
- `status` - Availability status (not in profile)
- `rating`, `reviews_count` - Performance metrics (not in profile)

### 🔄 Synced Read-Only in UI

When viewing a doctor:
- **Display** `doctor.name` (fast read from denormalized copy)
- **Edit** → Update `profile.full_name` → Auto-syncs to `doctor.name`

---

## Missing Piece: Name Sync ⚠️

### Current Problem:

Looking at your profile data:
```json
{
  "id": "e1c66a93-d849-4f54-a4a6-0bad1415effa",
  "email": "dr..robert.taylor.doc@ivisit.bg",
  "profile_full_name": null,  // ❌ NULL!
  "profile_role": "provider",
  "profile_provider_type": "doctor"
}
```

But doctor data shows:
```json
{
  "id": "44af2322-cc56-48b4-9be3-64073fb380ba",
  "name": "Dr. Robert Taylor",  // ✅ Has name
  "profile_id": "e1c66a93-d849-4f54-a4a6-0bad1415effa"
}
```

**Issue**: Doctor has name, but profile doesn't!

### Solution: Bidirectional Name Sync

We need triggers for BOTH directions (exception to one-way rule for name only):

1. **Profile → Doctor** (when user updates their profile)
2. **Doctor → Profile** (backfill during creation/migration)

---

## Complete Sync Architecture (Recommended)

### Trigger 1: Profile Image → Doctor Image ✅ (Already exists)

```sql
-- Already implemented in 20260122063000_doctor_fixes.sql
CREATE TRIGGER on_profile_image_update
  AFTER UPDATE OF image_uri ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_doctor_image();
```

### Trigger 2: Profile Name → Doctor Name ⏳ (Need to add)

```sql
CREATE OR REPLACE FUNCTION public.sync_doctor_name()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.doctors
  SET name = NEW.full_name
  WHERE profile_id = NEW.id
    AND NEW.full_name IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_name_update
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION sync_doctor_name();
```

### Trigger 3: Doctor Name → Profile Name ⏳ (Backfill on creation)

```sql
CREATE OR REPLACE FUNCTION public.backfill_profile_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile.full_name is null but doctor.name exists, backfill it
  UPDATE public.profiles
  SET full_name = NEW.name
  WHERE id = NEW.profile_id
    AND (full_name IS NULL OR full_name = '')
    AND NEW.name IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_doctor_name_backfill
  AFTER INSERT OR UPDATE OF name ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION backfill_profile_name();
```

---

## UI/UX Flow: How Users Experience This

### Scenario 1: Viewing Dr. Robert Taylor's Profile

**What happens**:
1. Frontend fetches `doctor` record (with `profile_id`)
2. Displays `doctor.image` (denormalized copy for speed)
3. Displays `doctor.name` (denormalized copy)
4. If needed, can JOIN to get additional profile data

### Scenario 2: Dr. Robert Taylor Updates His Photo

**Flow**:
```
1. Doctor goes to "My Profile" page
2. Uploads new image → Updates profile.image_uri
3. Trigger fires → doctor.image auto-updated
4. All views refresh automatically
5. Patients see new photo on doctor list ✅
```

**Single edit point**: Profile settings  
**Multiple display points**: Doctor list, appointment cards, etc.

### Scenario 3: Admin Edits Doctor Profile

**What should happen**:
- **Can edit**: Specialization, experience, license, hospital, status
- **Cannot edit**: Name, image (read-only, sourced from profile)
- **UI shows**: "To update name/photo, edit provider's profile"

---

## Implementation Checklist

### ✅ Already Done:
- [x] `profile_id` column exists in doctors table
- [x] All 8 doctors linked to auth profiles
- [x] Image sync trigger (`sync_doctor_image`)
- [x] Email field populated on doctor creation

### ⏳ To Do:
- [ ] Add name sync triggers (both directions)
- [ ] Backfill `profile.full_name` from `doctor.name` for existing records
- [ ] Update DoctorModal to make name/image read-only (source from profile)
- [ ] Add "Edit Profile" link in DoctorModal for identity changes
- [ ] Update UI to show profile image as source of truth

---

## Migration: Add Name Sync

Create: `supabase/migrations/20260122_add_name_sync.sql`

```sql
BEGIN;

-- 1. Backfill profile.full_name from doctor.name for existing records
UPDATE public.profiles p
SET full_name = d.name
FROM public.doctors d
WHERE p.id = d.profile_id
  AND (p.full_name IS NULL OR p.full_name = '')
  AND d.name IS NOT NULL;

-- 2. Profile name → Doctor name sync
CREATE OR REPLACE FUNCTION public.sync_doctor_name()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.doctors
  SET name = NEW.full_name, updated_at = NOW()
  WHERE profile_id = NEW.id
    AND NEW.full_name IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_name_update ON public.profiles;
CREATE TRIGGER on_profile_name_update
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION sync_doctor_name();

-- 3. Doctor name → Profile name backfill (for new doctors without profile name)
CREATE OR REPLACE FUNCTION public.backfill_profile_name()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET full_name = NEW.name, updated_at = NOW()
  WHERE id = NEW.profile_id
    AND (full_name IS NULL OR full_name = '')
    AND NEW.name IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_doctor_name_backfill ON public.doctors;
CREATE TRIGGER on_doctor_name_backfill
  AFTER INSERT OR UPDATE OF name ON public.doctors
  FOR EACH ROW
  WHEN (NEW.profile_id IS NOT NULL)
  EXECUTE FUNCTION backfill_profile_name();

COMMIT;
```

---

## Summary: The Apple Way ✅

### Data Flow Principles:

1. **Profile = Source of Truth** for:
   - Identity (name, image)
   - Authentication (email, phone)
   - Role & permissions

2. **Doctor = Professional View** for:
   - Medical credentials
   - Availability status
   - Performance metrics

3. **Sync Strategy**:
   - Identity fields: **Profile → Doctor** (one-way, automatic)
   - Professional fields: **Doctor only** (no sync)
   - Name: **Bidirectional** (backfill only, then profile leads)

### Why This Works:

- ✅ **Single edit point** for user identity
- ✅ **Fast reads** via denormalization
- ✅ **Clean separation** of concerns
- ✅ **Automatic consistency** via triggers
- ✅ **Simple UX**: Edit profile once, updates everywhere

---

## Next Steps

1. **Apply name sync migration** (see SQL above)
2. **Verify all profiles have full_name** populated
3. **Update DoctorModal**:
   - Make name field read-only with link to profile
   - Show "Synced from profile" indicator
4. **Test flow**:
   - Update profile image → Doctor image updates ✅
   - Update profile name → Doctor name updates ✅
   - Edit doctor specialty → Profile unchanged ✅

---

**Status**: 🟢 Architecture is **CORRECT** - following Apple principles  
**Action**: Add name sync to complete the implementation

