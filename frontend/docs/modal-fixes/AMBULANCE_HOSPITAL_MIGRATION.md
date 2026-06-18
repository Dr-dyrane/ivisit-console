# 🚨 Ambulance Schema Issue - Hospital Field Mismatch

**Date**: 2026-01-22 09:19 PST  
**Status**: 🔴 CRITICAL - Data mismatch causing Select not to prefill

---

## The Problem

**Ambulances table has TWO hospital fields**:
1. `hospital` (TEXT) - Legacy string field: "City General Hospital", "Oakland Trauma Center"
2. `hospital_id` (UUID) - New FK field, mostly NULL

**Current State**:
- 9/10 ambulances have `hospital_id: null`
- 1/10 ambulances have `hospital_id: "2ec3b8cf-ed15-4b6c-a3ba-289cda0a5bb4"`
- ALL ambulances have `hospital: "<hospital name>"`

**Result**: Hospital Select doesn't prefill because it uses `hospital_id` which is NULL for most!

---

## Root Cause

**Migration never completed**: The `hospital_id` field was added but data was never migrated from `hospital` (text) to `hospital_id` (UUID).

### What Should Have Happened:
```sql
-- Step 1: Add hospital_id column ✅ (done)
ALTER TABLE ambulances ADD COLUMN hospital_id UUID;

-- Step 2: Migrate data ❌ (MISSING!)
UPDATE ambulances
SET hospital_id = (
  SELECT id FROM hospitals 
  WHERE name = ambulances.hospital
  LIMIT 1
);

-- Step 3: Make hospital_id NOT NULL ❌ (not done)
ALTER TABLE ambulances ALTER COLUMN hospital_id SET NOT NULL;

-- Step 4: Drop old hospital column ❌ (not done)
ALTER TABLE ambulances DROP COLUMN hospital;
```

---

## Current Data Sample

```json
{
  "call_sign": "Rescue 9",
  "hospital": "Westside Medical Plaza",      // ✅ Has value (TEXT)
  "hospital_id": "2ec3b8cf-ed15-4b6c-a3ba-289cda0a5bb4"  // ✅ Has ID (only 1 of 10!)
}

{
  "call_sign": "Medic 1",
  "hospital": "City General Hospital",       // ✅ Has value (TEXT)
  "hospital_id": null                        // ❌ NULL! (9 of 10 are like this)
}
```

---

## Why Select Doesn't Prefill

**AmbulanceModal.jsx line 355**:
```jsx
<Select
  value={formData.hospital_id}  // ❌ This is null for most ambulances!
  onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
>
```

**Expected**: If `hospital_id` is null, it should fall back to looking up the ID by matching `hospital` text

**Actual**: Shows placeholder because `hospital_id` is null

---

## Solution Options

### Option A: Quick Fix (Frontend Workaround)
Handle lookup in useEffect:

```jsx
useEffect(() => {
  if (ambulance && !ambulance.hospital_id && ambulance.hospital) {
    // Find hospital ID by name match
    const matchingHospital = hospitals.find(h => h.name === ambulance.hospital);
    if (matchingHospital) {
      setFormData(prev => ({
        ...prev, 
        hospital_id: matchingHospital.id
      }));
    }
  }
}, [ambulance, hospitals]);
```

**Pros**: Quick, doesn't touch database  
**Cons**: Doesn't fix underlying data issue

---

### Option B: Data Migration (Proper Fix)
Migrate data from `hospital` text to `hospital_id` UUID:

```sql
-- Create migration: fix_ambulance_hospital_ids.sql
UPDATE public.ambulances a
SET hospital_id = (
  SELECT h.id 
  FROM public.hospitals h
  WHERE h.name = a.hospital
  LIMIT 1
)
WHERE a.hospital_id IS NULL
  AND a.hospital IS NOT NULL;
```

**Pros**: Fixes data permanently, proper schema  
**Cons**: Requires database migration

---

### Option C: Hybrid (Best)
1. Run migration to fix existing data
2. Update modal to handle both fields during transition
3. Eventually remove `hospital` text field

---

## Recommended Action

### 🔴 **URGENT** (Now):
**Option A** - Frontend workaround to unblock users

### 🟡 **Important** (Today/Tomorrow):
**Option B** - Run data migration to fix permanently

### 🟢 **Cleanup** (Later):
Remove `hospital` text column once `hospital_id` is populated for all

---

## Migration Script

```sql
-- File: supabase/migrations/20260122_migrate_ambulance_hospitals.sql

BEGIN;

-- 1. Migrate text hospital names to hospital_id FK
UPDATE public.ambulances a
SET 
  hospital_id = (
    SELECT h.id 
    FROM public.hospitals h
    WHERE LOWER(h.name) = LOWER(a.hospital)  -- Case-insensitive match
    LIMIT 1
  ),
  updated_at = NOW()
WHERE a.hospital_id IS NULL
  AND a.hospital IS NOT NULL
  AND a.hospital != '';

-- 2. Report results
DO $$
DECLARE
  total_ambulances INTEGER;
  with_hospital_id INTEGER;
  with_hospital_text INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_ambulances FROM public.ambulances;
  SELECT COUNT(*) INTO with_hospital_id FROM public.ambulances WHERE hospital_id IS NOT NULL;
  SELECT COUNT(*) INTO with_hospital_text FROM public.ambulances WHERE hospital IS NOT NULL AND hospital != '';
  
  RAISE NOTICE '
═══════════════════════════════════════════════════════════════
  AMBULANCE HOSPITAL MIGRATION REPORT
═══════════════════════════════════════════════════════════════

Total Ambulances:              %
With hospital_id (FK):         %
With hospital (TEXT):          %

Migration Success Rate:        %.1f%%

═══════════════════════════════════════════════════════════════
  ',
    total_ambulances,
    with_hospital_id,
    with_hospital_text,
    (with_hospital_id::FLOAT / NULLIF(total_ambulances, 0) * 100);
END $$;

-- 3. Verify unmatched hospitals
SELECT 
  a.call_sign,
  a.hospital as hospital_text,
  a.hospital_id,
  'No match found' as status
FROM public.ambulances a
WHERE a.hospital_id IS NULL
  AND a.hospital IS NOT NULL
  AND a.hospital != '';

COMMIT;
```

---

## Testing After Fix

### Test Hospital Select Prefilling:
1. Open ambulance "Medic 1" in edit mode
2. Hospital select should show "City General Hospital" (not placeholder)
3. Change hospital, save
4. Reopen - should still show correct hospital

### Verify Data:
```sql
-- Check migration results
SELECT 
  call_sign,
  hospital as old_text_field,
  hospital_id as new_fk_field,
  (SELECT name FROM hospitals WHERE id = hospital_id) as resolved_name
FROM ambulances
ORDER BY call_sign;

-- Should show hospital_id populated for all with matching hospital names
```

---

## Impact

**Before Migration**:
- ❌ 9/10 ambulances can't prefill hospital select (hospital_id is NULL)
- ❌ Creating new ambulances works, editing existing ones doesn't
- ❌ Data split between two fields (hospital TEXT and hospital_id UUID)

**After Migration**:
- ✅ All ambulances have hospital_id populated
- ✅ Hospital select prefills correctly in edit mode
- ✅ Single source of truth (hospital_id FK)
- ✅ Can eventually drop legacy hospital TEXT field

---

## Why This Happened

**Common Migration Issue**: Added new FK column but forgot to:
1. Migrate existing data
2. Make new column NOT NULL
3. Remove old column

**Prevention**: Always complete 4-step FK migration:
1. Add new column (nullable)
2. **Migrate data** ← Often forgotten!
3. Make NOT NULL
4. Drop old column

---

## Next Steps

1. **Apply frontend workaround** (5 minutes) - Option A above
2. **Run data migration** (2 minutes) - Run SQL script
3. **Test in browser** - Verify select prefills
4. **Later**: Remove `hospital` TEXT column once verified

---

**Status**: 🔴 Identified - Data migration needed  
**Severity**: HIGH - Affects 90% of ambulances  
**Time to Fix**: 5 min (workaround) + 2 min (migration) = 7 minutes total

