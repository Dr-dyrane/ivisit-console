# 🔴 CRITICAL: Production Schema Mismatch Analysis

**Date**: 2026-01-22 03:41 PST  
**Severity**: HIGH - Blocking CRUD operations  
**Impact**: Doctors management completely broken (400 errors on all updates)

---

## Executive Summary

Your production Supabase database schema is **out of sync** with your frontend code. The migration files exist locally but **have NOT been applied** to the remote database.

### Current State:
- ✅ **Doctors have `profile_id` linkage** - All 8 doctors properly linked to auth profiles
- ❌ **Schema migrations NOT applied** - Database still has old column names
- ❌ **PATCH operations failing** - 400 Bad Request: "experience column not found"

---

## Root Cause Analysis

### The Problem:
Your code (frontend + migrations) uses:
- `experience` (new column name)  
- `specialization` (new column name)

Your database (production) still has:
- `years_experience` (old column name) ✅ EXISTS
- `specialty` (old column name) ✅ EXISTS

### Why This Happened:
Migrations were created locally but never pushed to Supabase remote database. The files exist in:
```
supabase/migrations/20260122054500_fix_doctor_roles_and_status.sql
supabase/migrations/20260122063000_doctor_fixes.sql
```

But Supabase is still running the old schema from:
```
supabase/migrations/20260110000000_seed_rich_public_data.sql
```

---

## Evidence from Production Data

### ✅ What's Working:
```json
{
  "profile_id": "e1c66a93-d849-4f54-a4a6-0bad1415effa",
  "email": "dr..robert.taylor.doc@ivisit.bg"
}
```
**Conclusion**: Profile linkage is operational. Trigger `link_doctor_profile()` is working.

### ❌ What's Broken:
```
PATCH /doctors?id=eq.44af2322-cc56-48b4-9be3-64073fb380ba
ERROR 400: Could not find the 'experience' column
```

**Root Cause**: The DoctorModal sends:
```javascript
{
  experience: 5,  // ❌ This column doesn't exist in DB
  specialization: "Surgery"  // ❌ This column doesn't exist in DB
}
```

But the database expects:
```sql
UPDATE doctors SET 
  years_experience = 5,  -- ✅ This is the actual column
  specialty = "Surgery"   -- ✅ This is the actual column
```

---

## Doctor Profile Linkage Status

All doctors are **properly linked** to auth profiles:

| Doctor | profile_id | Email | Status |
|--------|-----------|--------|--------|
| Dr. Robert Taylor | e1c66a93... | dr..robert.taylor.doc@ivisit.bg | ✅ Linked |
| Dr. David Kim | 97daa328... | dr..david.kim.doc@ivisit.bg | ✅ Linked |
| Dr. Sarah Wilson | ad572887... | dr..sarah.wilson.doc@ivisit.bg | ✅ Linked |
| Dr. Michael Ross | b2359dd5... | dr..michael.ross.doc@ivisit.bg | ✅ Linked |
| Dr. Jennifer Lopez | a1d6fbe8... | dr..jennifer.lopez.doc@ivisit.bg | ✅ Linked |
| Dr. Lisa Wong | 813211e4... | dr..lisa.wong.doc@ivisit.bg | ✅ Linked |
| Dr. Emily Brown | bf8709de... | dr..emily.brown.doc@ivisit.bg | ✅ Linked |
| Dr. James Chen | b358c5b8... | dr..james.chen.doc@ivisit.bg | ✅ Linked |

**8/8 doctors** have valid `profile_id` values. The linking migration worked.

---

## Immediate Action Required

### Option 1: Run Migration via Supabase SQL Editor (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/dlwtcmhdzoklveihuhjf/sql
2. Open file: `URGENT_PRODUCTION_MIGRATION.sql`  
3. Copy entire contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify output: "Migration applied successfully!"
7. **CRITICAL**: Refresh schema cache:
   - Go to Settings → Database → Connection Pooling
   - Click "Refresh schema cache" button
   - OR restart the pooler

**Estimated Time**: 2 minutes  
**Downtime**: None (atomic transaction)

### Option 2: Use Supabase CLI (IF CONFIGURED)

```bash
npx supabase db push
```

**Note**: This requires proper `.env` configuration with service role key.

### Option 3: Manual Column Rename (QUICK FIX)

If you can't run migrations immediately, temporarily revert the code to use old column names:

**In `doctorsService.js`:**
```javascript
// TEMPORARY WORKAROUND - Revert to old column names
const payload = {
  years_experience: input.experience,  // Map back to old name
  specialty: input.specialization,      // Map back to old name
};
```

**Not recommended** - This is technical debt. Fix the schema instead.

---

## Post-Migration Verification

After running the migration, test these operations:

### 1. Check Column Exists:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'doctors' 
  AND column_name IN ('experience', 'specialization', 'status');
```

**Expected Result**:
```
experience
specialization
status
```

### 2. Test PATCH Operation:
```bash
curl -X PATCH \
  'https://dlwtcmhdzoklveihuhjf.supabase.co/rest/v1/doctors?id=eq.44af2322-cc56-48b4-9be3-64073fb380ba' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"experience": 25, "status": "busy"}'
```

**Expected**: HTTP 200 OK

### 3. Verify in Frontend:
- Open DoctorModal in edit mode
- Change experience from 22 → 25
- Save
- Refresh page
- Verify experience shows 25

---

## Schema Comparison

### Current Production Schema (WRONG):
```sql
CREATE TABLE doctors (
  id uuid PRIMARY KEY,
  name text,
  specialty text,              -- ❌ OLD NAME
  years_experience integer,    -- ❌ OLD NAME
  hospital_id uuid,
  profile_id uuid,             -- ✅ EXISTS
  email text,                  -- ✅ EXISTS
  is_available boolean,        -- ⚠️  DEPRECATED (use status instead)
  ...
);
```

### Target Schema (CORRECT):
```sql
CREATE TABLE doctors (
  id uuid PRIMARY KEY,
  name text,
  specialization text,         -- ✅ NEW NAME
  experience integer,          -- ✅ NEW NAME
  hospital_id uuid,
  profile_id uuid,             -- ✅ EXISTS
  email text,                  -- ✅ EXISTS
  status text,                 -- ✅ NEW FIELD (available, busy, off_duty, on_call, invited)
  is_available boolean,        -- Still exists but nullable
  ...
);
```

---

## Risk Assessment

### If Migration Is NOT Applied:
- 🔴 **CRITICAL**: All doctor updates will fail (400 errors)
- 🔴 **CRITICAL**: New doctors cannot be created (column mismatch)
- 🟡 **MEDIUM**: Stats may be inaccurate (status vs is_available confusion)
- 🟢 **LOW**: Read operations still work (SELECT doesn't fail)

### If Migration IS Applied:
- ✅ All CRUD operations resume normally
- ✅ Status field becomes source of truth
- ✅ Frontend and backend schemas aligned
- ⚠️  Old `is_available` column becomes deprecated (safe to ignore)

---

## Migration File Breakdown

### What `URGENT_PRODUCTION_MIGRATION.sql` Does:

1. **Fix Profile Roles** (line 8-10)
   - Updates profiles where doctors were incorrectly marked as 'patient'
   - Changes to 'provider' role

2. **Rename Columns** (line 13-21) ⭐ **CRITICAL**
   - `years_experience` → `experience`
   - `specialty` → `specialization`
   - Uses IF EXISTS to avoid errors if already renamed

3. **Add Status Column** (line 23-28)
   - Adds `status` field if missing
   - Defaults to 'available'

4. **Backfill Status** (line 30-37)
   - Migrates data from `is_available` to `status`
   - TRUE → 'available', FALSE → 'off_duty'

5. **Add Status Constraint** (line 39-41)
   - Ensures only valid status values: available, busy, off_duty, on_call, invited

6. **Make is_available Nullable** (line 43-44)
   - Soft deprecation of old field
   - Allows NULL values (no longer required)

**Transaction Safety**: Entire migration wrapped in BEGIN/COMMIT - all or nothing.

---

## Next Steps After Migration

1. ✅ **Apply migration** (via SQL Editor)
2. ✅ **Refresh schema cache** (Supabase dashboard)
3. ✅ **Test CRUD operations** (edit a doctor)
4. ✅ **Verify stats display** (check KPI cards)
5. ✅ **Monitor error logs** (ensure no new issues)
6. 📝 **Update documentation** (mark migration as applied)
7. 🗑️  **Remove temporary files** (delete URGENT_PRODUCTION_MIGRATION.sql after success)

---

## Technical Debt Cleanup (Post-Migration)

After migration succeeds, consider:

1. **Remove `is_available` column** (after confirming status works)
   ```sql
   ALTER TABLE public.doctors DROP COLUMN is_available;
   ```

2. **Update seed data** to use new column names
   - Modify `20260110000000_seed_rich_public_data.sql`
   - Use `specialization` and `experience` from the start

3. **Consolidate duplicate migrations**
   - `20260122054500_fix_doctor_roles_and_status.sql`
   - `20260122063000_doctor_fixes.sql`
   - Both rename the same columns (redundant)

4. **Add migration tracking**
   - Create `schema_migrations` table
   - Track which migrations have been applied
   - Prevents manual SQL execution in future

---

## Contact & Escalation

If migration fails or you need assistance:

1. Check Supabase logs: Dashboard → Logs → Database
2. Look for constraint violations or FK errors
3. If blocked, create backup:
   ```sql
   CREATE TABLE doctors_backup AS SELECT * FROM doctors;
   ```
4. Then retry migration

**Estimated Resolution Time**: 5 minutes (including verification)

---

**Status**: 🟡 PENDING - Awaiting migration execution  
**Next Action**: Run `URGENT_PRODUCTION_MIGRATION.sql` in Supabase SQL Editor

---

