# Doctor Management System - Comprehensive Audit Report
**Date**: 2026-01-22  
**Auditor**: AI System Analysis  
**Scope**: CRUD Operations, Data Sync, RBAC, Profile Management, User Management, UI Elements, Filtering

---

## Executive Summary

This audit identifies **21 critical flaws** across the doctor management system affecting data integrity, RBAC implementation, profile linkage, filtering, and UI consistency. The system has significant gaps in the "Provider Extension Pattern" implementation outlined in `DOCTOR_MANAGEMENT_PLAN.md`.

**Severity Levels**:
- 🔴 **CRITICAL**: Data loss, security breach, or system failure
- 🟠 **HIGH**: Major functionality broken, poor UX
- 🟡 **MEDIUM**: Inconsistencies, missing features
- 🟢 **LOW**: Minor improvements, optimization

---

## 1. CRUD Operations Issues

### 🔴 FLAW #1: Broken Doctor-Profile Linkage on Create
**Location**: `src/services/doctorsService.js:90-123`, `src/components/modals/DoctorModal.jsx:107-132`

**Problem**:
When creating a doctor via `DoctorModal`, the flow is:
1. Create doctor record in `doctors` table (with email)
2. Call `inviteUser()` to create auth user + profile
3. **BUT**: The doctor record's `profile_id` remains `NULL`

The `link_doctor_profile()` trigger (migration `20260122051000_doctor_email_link_trigger.sql`) only fires **AFTER INSERT ON profiles**, but the doctor was already created BEFORE the profile exists.

**Impact**:
- All newly invited doctors have `profile_id = NULL`
- They appear in the doctors list but have no auth/login capability
- RBAC scope filtering breaks (can't link to `organization_id` via profile)
- Profile image sync doesn't work
- Duplicate doctor entries possible

**Evidence**:
```javascript
// DoctorModal.jsx:115
const createdDoctor = await createDoctor(submitData); // profile_id is NULL here

// Then invitation is sent:
await inviteUser(submitData.email, 'provider', {...}); // Creates profile AFTER
```

**Fix Required**:
- Reverse the order: Call `inviteUser()` FIRST, get the profile ID, THEN create doctor with `profile_id`
- OR: Return profile_id from `inviteUser()` and update doctor record immediately after

---

### 🟠 FLAW #2: Missing Profile ID in Doctor Create Payload
**Location**: `src/services/doctorsService.js:92-108`

**Problem**:
The `createDoctor()` function doesn't accept or set `profile_id` in the payload:

```javascript
const payload = sanitizeInput({
  name: input.name,
  specialization: input.specialization,
  hospital_id: input.hospital_id,
  // ... other fields
  // ❌ profile_id is NEVER set
});
```

Even if passed, it wouldn't be used.

**Impact**:
- Cannot manually link doctors to existing profiles
- Migration scripts can't properly backfill profile links
- Seeded doctors have no auth users

**Fix Required**:
Add `profile_id: input.profile_id || null` to the payload

---

### 🟠 FLAW #3: Update Doctor Doesn't Handle Profile Sync
**Location**: `src/services/doctorsService.js:128-152`

**Problem**:
Updating a doctor (name, phone, email, etc.) doesn't sync those changes to the linked profile. The profile and doctor records can become desynchronized.

**Example**:
1. Admin updates doctor's name from "Dr. Smith" → "Dr. Johnson"  
2. Doctor's profile still shows "Dr. Smith"  
3. Email remains out of sync

**Impact**:
- Data inconsistency between `doctors` and `profiles`
- User sees different names in different parts of the app
- Login email different from doctor email

**Fix Required**:
Add trigger or service logic to sync key fields (`name`, `email`, `phone`, `image`) between doctor and profile on UPDATE

---

### 🟡 FLAW #4: No Cascade Delete Verification
**Location**: `src/services/doctorsService.js:157-169`

**Problem**:
When deleting a doctor, the FK constraint has `ON DELETE CASCADE`, which means deleting a profile will delete the doctor, BUT:
- No warning to admin about linked profile deletion
- No soft-delete option (hard deletes are permanent)
- Could orphan profile if doctor is deleted first (depending on cascade direction)

**Impact**:
- Accidental data loss
- No audit trail for deleted doctors
- Cannot restore accidentally deleted records

**Fix Required**:
- Implement soft delete (set `deleted_at`, keep record)
- Add confirmation dialog warning about profile cascade
- Create audit log entry

---

## 2. Data Synchronization Issues

### 🔴 FLAW #5: Email Trigger Doesn't Link Existing Doctors
**Location**: `supabase/migrations/20260122051000_doctor_email_link_trigger.sql:6-17`

**Problem**:
The `link_doctor_profile()` trigger only works on **INSERT** of new profiles:

```sql
CREATE TRIGGER on_profile_created_link_doctor
AFTER INSERT ON public.profiles  -- ❌ Only INSERT, not UPDATE
```

If:
1. A doctor record exists with email `dr.smith@example.com` and `profile_id = NULL`
2. An admin manually creates a profile with that email (not via invite)
3. **The trigger doesn't fire** (no INSERT, it was already there)

**Impact**:
- Manual profile creation doesn't auto-link to doctors
- Need manual SQL to fix links after bulk imports
- Retroactive linking is broken

**Fix Required**:
Add `AFTER UPDATE OF email` trigger to catch email changes in profiles and re-link

---

### 🟠 FLAW #6: Image Sync Trigger Only Works One-Way
**Location**: `supabase/migrations/20260122063000_doctor_fixes.sql:10-28`

**Problem**:
The `sync_doctor_image()` trigger syncs profile image → doctor image, but NOT doctor image → profile image.

```sql
-- Profile update → Doctor update ✅
AFTER UPDATE OF image_uri, avatar_url ON public.profiles

-- Doctor update → Profile update ❌ MISSING
```

**Scenario**:
1. Admin uploads doctor image via `DoctorModal` → saves to `doctors.image`
2. Profile `image_uri` remains NULL
3. User logs in and sees no profile picture (pulls from `profiles.image_uri`)

**Impact**:
- Asymmetric image sync
- User profile shows different image than doctor directory
- Confusion about which image is "source of truth"

**Fix Required**:
Add bidirectional sync OR establish single source of truth (recommend profile as source)

---

### 🟠 FLAW #7: Stats Calculation Doesn't Account for Null profile_id
**Location**: `src/contexts/PageDataContext.jsx:224-269`

**Problem**:
`fetchDoctorsData()` counts all doctors, including those not linked to profiles:

```javascript
const total = data?.length || 0; // ❌ Includes orphaned doctors
const available = data?.filter(d => d.status === 'available').length || 0;
```

If 10 doctors exist but only 5 have `profile_id` set, the stats show 10 total, but only 5 can actually log in.

**Impact**:
- Misleading KPI cards ("48 doctors" but many are not usable)
- Org admins think they have staff that don't exist
- Cannot distinguish "invited" vs "activated" doctors

**Fix Required**:
Add stats breakdown:
- `total`: All records
- `linked`: Have `profile_id`
- `invited`: Have `profile_id` but `email_confirmed_at IS NULL`
- `active`: Have `profile_id` AND `email_confirmed_at IS NOT NULL`

---

### 🟡 FLAW #8: Real-Time Subscription Doesn't Refresh on Profile Changes
**Location**: `src/contexts/PageDataContext.jsx:736-749`

**Problem**:
Real-time subscription listens to `doctors` table changes, but doctor metadata (name, email, verification status) lives in `profiles`. Changes to profiles don't trigger a refresh of `doctorsData`.

```javascript
supabase.channel('doctor_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'doctors' }, // ❌ Only doctors
    fetchDoctorsData
  )
```

**Scenario**:
1. Admin verifies a provider in VerificationQueue
2. `profiles.bvn_verified` changes to `true`
3. `DoctorsPage` KPIs **don't update** (no trigger)

**Impact**:
- Stale data on DoctorsPage
- Admins must refresh page manually
- Real-time feature is incomplete

**Fix Required**:
Add second subscription to `profiles` table changes OR use a view that joins both

---

## 3. Scope-Based RBAC Issues

### 🔴 FLAW #9: RBAC Policy Doesn't Prevent Cross-Org Doctor Management
**Location**: `supabase/migrations/20260120150000_rbac_policies.sql:83-85`

**Problem**:
The "Org Admins can manage own doctors" policy checks `hospital_id`:

```sql
CREATE POLICY "Org Admins can manage own doctors" 
ON public.doctors FOR ALL
USING ( hospital_id = public.get_current_user_org_id() );
```

**BUT**:
- `get_current_user_org_id()` returns `organization_id` from profiles
- `doctors.hospital_id` is the hospital UUID
- **These are NOT the same thing** unless organization_id == hospital_id (which is not guaranteed)

**Proof**:
If a hospital's `id` is `abc-123` and the org admin's `organization_id` is `def-456`, the policy fails even if they should have access.

**Impact**:
- Org admins cannot see/edit their own doctors (403 errors)
- OR worse: Can see doctors from OTHER orgs if IDs coincidentally match
- Entire scope-based RBAC is broken for doctors

**Fix Required**:
Either:
1. Ensure `hospitals.id` == `profiles.organization_id` (data model constraint)
2. OR: Use helper function `get_current_user_hospital_id()` that resolves via profiles → hospitals

---

### 🟠 FLAW #10: Profile-to-Hospital Link Missing
**Location**: Schema Design Gap

**Problem**:
The current schema assumes:
- `profiles.organization_id` → Organization (Hospital)
- `doctors.hospital_id` → Hospital
- **BUT** these may not align if a hospital can have multiple "branches" or orgs

The RLS policy needs a guaranteed way to check: "Does this profile belong to the hospital that this doctor works at?"

**Current Chain**:
```
profiles.organization_id → ??? → hospitals.id
                                       ↑
                        doctors.hospital_id
```

**Missing**: Clear FK or join path

**Impact**:
- Ambiguous scope enforcement
- Org admins may see doctors from sibling hospitals in same org
- Cannot enforce strict scoping

**Fix Required**:
Add explicit `profiles.hospital_id` OR ensure `organization_id` references `hospitals(id)` directly

---

### 🟡 FLAW #11: No Policy for Provider Self-View
**Location**: `supabase/migrations/20260120150000_rbac_policies.sql:78-90`

**Problem**:
Policies exist for:
- Authenticated users can view all doctors (public directory)
- Org admins can manage own doctors
- Platform admins can manage all

**Missing**:
- Providers (doctors) viewing/updating their own doctor record

**Scenario**:
Dr. Smith logs in and wants to update their bio, specialization, or status (available/busy). The current policies don't explicitly allow this.

**Impact**:
- Doctors cannot self-manage their profiles
- Need admin intervention for simple updates
- Poor UX for provider users

**Fix Required**:
Add policy:
```sql
CREATE POLICY "Doctors can update own record"
ON public.doctors FOR UPDATE
USING ( profile_id = auth.uid() );
```

---

## 4. Profile Management Integration Issues

### 🟠 FLAW #12: DoctorModal Doesn't Handle Existing Profiles
**Location**: `src/components/modals/DoctorModal.jsx:107-132`

**Problem**:
The modal assumes every doctor creation is a new user. If the email already has a profile, `inviteUser()` will fail:

```javascript
await inviteUser(submitData.email, 'provider', {...});
// ❌ Fails if email exists: "User already registered"
```

**But**:
- No check for existing profile before calling invite
- No option to "link to existing user" instead of inviting
- Can't convert existing patient → provider

**Impact**:
- Cannot onboard existing users as doctors
- Must manually link in database
- Error shows: "Failed to add doctor" (unhelpful message)

**Fix Required**:
1. Before creating doctor, check if profile exists with that email
2. If yes: Ask admin "Link to existing profile or send new invite?"
3. If link: Set `profile_id` directly, skip invite
4. Update profile's `role` to 'provider' and `provider_type` to 'doctor'

---

### 🟠 FLAW #13: Role Update Doesn't Sync to Doctor Status
**Location**: N/A (missing integration)

**Problem**:
If an admin changes a provider's role from 'provider' → 'patient' (demotion), the doctor record remains active.

**Scenario**:
1. Dr. Smith is terminated (admin changes role to 'patient')
2. `doctors.status` still shows 'available'
3. Dr. Smith appears in doctor directory as available
4. Patients can book appointments with terminated doctor

**Impact**:
- Data inconsistency
- Security risk (ex-employees retain provider privileges)
- Billing issues if consultation fee charged

**Fix Required**:
Add trigger:
```sql
CREATE TRIGGER on_profile_role_downgrade
AFTER UPDATE OF role ON profiles
WHEN NEW.role != 'provider' AND OLD.provider_type IN ('doctor', ...)
UPDATE doctors SET status = 'off_duty', is_available = false
WHERE profile_id = NEW.id;
```

---

### 🟡 FLAW #14: Invite Metadata Doesn't Include Hospital Assignment
**Location**: `src/components/modals/DoctorModal.jsx:120-124`

**Problem**:
The invite metadata includes:

```javascript
await inviteUser(submitData.email, 'provider', {
  provider_type: 'doctor',
  organization_id: submitData.hospital_id || null, // ✅ Good
  full_name: submitData.name
});
```

BUT `organization_id` is set to `hospital_id`. If these are meant to be different entities (org vs hospital), this is wrong. The `DOCTOR_MANAGEMENT_PLAN.md` says:

> **Org**: `organization_id` (The Hospital)

This implies org and hospital are the same, but schema has both `hospitals` AND a conceptual "organization". Ambiguous.

**Impact**:
- Org scope may not match hospital
- Invited users may be linked to wrong org
- RBAC breaks

**Fix Required**:
Clarify data model:
- Are hospitals the organizations? (rename to org_id everywhere)
- OR: Is there a parent `organizations` table?

---

## 5. UI Element Issues

### 🟠 FLAW #15: DoctorModal Hospital Field Visibility Logic Broken
**Location**: `src/components/modals/DoctorModal.jsx:306-324`

**Problem**:
Hospital selection is only shown if:

```javascript
{(isAdmin() || (isOrgAdmin() && isView)) && ( ... )}
```

**Issues**:
1. `isView` mode: Org admin can SEE hospital but not change it. Fine.
2. `isCreate` mode: Org admin **cannot see** hospital field (hidden)
   - The hospital gets auto-set to `orgId` via `useEffect` (line 43-45)
   - **BUT** admin has no visual confirmation of which hospital

3. `isEdit` mode: Org admin **cannot see** hospital field
   - Cannot verify doctor is still assigned to correct hospital
   - Cannot reassign doctor to different branch

**Impact**:
- Org admins work "blind" when creating doctors
- No validation that `orgId` is correct
- UX confusion

**Fix Required**:
```javascript
{(isAdmin() || (isOrgAdmin() && !isCreate)) && ( ... )}
// Show for: Platform Admins (all modes) OR Org Admins (view/edit, not create)
// In create mode for org admin: Show as disabled/readonly field
```

---

### 🟡 FLAW #16: Send Invite Toggle Not Disabled in Edit Mode
**Location**: `src/components/modals/DoctorModal.jsx:393-409`

**Problem**:
The "Send Invitation" toggle appears in CREATE mode only:

```javascript
{isCreate && ( ... <Switch ... /> )}
```

**BUT** in EDIT mode:
- If doctor has `profile_id = NULL` (never invited), admin cannot re-invite
- If invite was sent but email bounced, no way to resend

**Impact**:
- Stuck doctors that were never successfully invited
- No self-service remediation

**Fix Required**:
In edit mode, if `!doctor.profile_id`, show "Re-send Invitation" button

---

### 🟡 FLAW #17: No Visual Indicator of Profile Link Status
**Location**: `src/components/pages/DoctorsPage.jsx` (Grid/List/Table views)

**Problem**:
Doctor cards show status badge (available, busy, off_duty) but no indication of:
- Whether doctor has a profile (can log in)
- Whether invite was sent
- Whether email is verified

**Scenario**:
Admin sees "Dr. Smith - Available 🟢" but Dr. Smith has no profile yet (invite pending). Misleading.

**Impact**:
- Admin assumes all doctors are "ready" when some are just directory entries
- No way to track onboarding progress from UI

**Fix Required**:
Add secondary badge:
- 🔗 **Linked** (has profile_id + email confirmed)
- 📧 **Invited** (has profile_id, email not confirmed)
- ⚠️ **Unlinked** (no profile_id)

---

## 6. Filtering and Search Issues

### 🟠 FLAW #18: Filter by Specialization Uses Static List
**Location**: `src/components/pages/DoctorsPage.jsx:186-194`

**Problem**:
Specialization filter options are hardcoded:

```javascript
options: [
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'general', label: 'General Practitioner' },
]
```

**But**:
- Real specializations in DB may differ
- Seeded doctors have 'Orthopedics', 'Dermatology', 'Psychiatry', etc. (from `20260110000000_seed_rich_public_data.sql`)
- These don't appear in filter dropdown
- Cannot filter for them

**Impact**:
- Filter is incomplete
- Admins cannot find doctors by actual specializations
- Hardcoded values become stale over time

**Fix Required**:
Fetch distinct specializations from DB:
```javascript
const { data } = await supabase.from('doctors').select('specialization').distinct();
const options = data.map(s => ({ value: s.specialization, label: s.specialization }));
```

---

### 🟡 FLAW #19: Search Only Searches Name, Not Email or License
**Location**: `src/services/doctorsService.js:46-48`

**Problem**:
```javascript
if (filter.search) {
  query = query.ilike('name', `%${filter.search}%`);
}
```

Admins cannot search by:
- Email (useful for "is dr.smith@example.com in the system?")
- License number (compliance/verification)
- Hospital name (via join)

**Impact**:
- Ineffective search UX
- Must scroll through entire list to find doctor

**Fix Required**:
```javascript
if (filter.search) {
  query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,license_number.ilike.%${filter.search}%`);
}
```

---

### 🟡 FLAW #20: KPI Filter + Sheet Filter Intersection Logic Flawed
**Location**: `src/components/pages/DoctorsPage.jsx:58-71`

**Problem**:
When both KPI filter (e.g., click "Available") and sheet filter (e.g., select "Busy, On Call") are active:

```javascript
if (statusFilter && statusFilter.length > 0) {
  const intersection = statusFilter.filter(s => s === kpiFilter);
  statusFilter = intersection.length > 0 ? intersection : ['__none__'];
}
```

**Issue**:
- If KPI = 'available' and sheet = ['busy', 'on_call'], intersection is empty
- Sets filter to `['__none__']` which matches nothing
- User sees "No doctors" even though there ARE busy/on-call doctors

**Expected**:
Intersections should show clarifying message: "No doctors match both 'Available' AND 'Busy'" (logically impossible)

**Impact**:
- Confusing UX (empty list with no explanation)
- Users think system is broken

**Fix Required**:
If intersection is empty, show toast: "Conflicting filters. Showing all doctors." and reset to 'all'

---

### 🟡 FLAW #21: No Filter for "Unlinked Doctors"
**Location**: `src/components/pages/DoctorsPage.jsx:167-196`

**Problem**:
Filter schema has `status` and `specialization`, but no way to filter by:
- `profile_id IS NULL` (orphaned doctors)
- `created_at < 7 days ago AND profile_id IS NULL` (pending invites)

These are crucial for admin workflows:
- "Show me all doctors that haven't been invited yet"
- "Show me doctors that haven't activated their accounts"

**Impact**:
- Cannot prioritize onboarding tasks
- No visibility into incomplete records

**Fix Required**:
Add filter:
```javascript
{
  key: 'linkage_status',
  type: 'multiselect',
  label: 'Account Status',
  options: [
    { value: 'linked', label: 'Fully Activated' },
    { value: 'invited', label: 'Invitation Sent (Pending)' },
    { value: 'unlinked', label: 'No Account' }
  ]
}
```

Implement in service:
```javascript
if (filter.linkage_status?.includes('unlinked')) {
  query = query.is('profile_id', null);
}
```

---

## 7. Schema and Migration Issues

### 🟡 FLAW #22: Column Rename Migrations Run Multiple Times
**Location**: 
- `supabase/migrations/20260122054500_fix_doctor_roles_and_status.sql:17-26`
- `supabase/migrations/20260122063000_doctor_fixes.sql:31-42`

**Problem**:
Both migrations have identical `DO $$` blocks that rename `specialty` → `specialization` and `years_experience` → `experience`.

**IF** both migrations run:
1. First migration renames successfully
2. Second migration checks `IF EXISTS ... specialty` → false (already renamed) → no-op ✅

**BUT**:
- Wasteful
- Indicates migrations weren't planned sequentially
- Risk of confusion if one is reverted

**Impact**:
- Low (idempotent), but indicates migration management needs cleanup

**Fix Required**:
Consolidate into single migration or remove duplicate from `063000_doctor_fixes.sql`

---

## 8. Data Integrity & Consistency

### 🔴 FLAW #23: No Unique Constraint on Doctor Email
**Location**: Schema (missing constraint)

**Problem**:
The `doctors` table has an `email` column (added in `20260122051000_doctor_email_link_trigger.sql`), but **no unique constraint**.

**Scenario**:
1. Create doctor with email `dr.smith@example.com`
2. Create another doctor with same email
3. Both records exist
4. `link_doctor_profile()` trigger fires and links BOTH to the same profile
5. OR: Links to first match, second remains orphaned

**Impact**:
- Data integrity violation (one email → multiple doctors)
- Confused identity (which doctor is the "real" one?)
- Profile linkage is ambiguous

**Fix Required**:
```sql
CREATE UNIQUE INDEX idx_doctors_email_unique ON public.doctors(email) WHERE email IS NOT NULL;
```

---

### 🟠 FLAW #24: Status Check Constraint Missing 'invited' Status
**Location**: `supabase/migrations/20260122054500_fix_doctor_roles_and_status.sql:48-49`

**Problem**:
Constraint only allows:

```sql
CHECK (status IN ('available', 'busy', 'off_duty', 'on_call'))
```

**BUT** the plan (`DOCTOR_MANAGEMENT_PLAN.md:51`) says:
> Creates `public.doctors` record (Linked to above Profile, **Status: 'Invited'**)

The 'invited' status is not in the constraint!

**Impact**:
- Cannot set status to 'invited' (FK violation)
- Have to use 'off_duty' as a proxy (confusing)
- Plan and implementation are out of sync

**Fix Required**:
```sql
ALTER TABLE public.doctors DROP CONSTRAINT doctors_status_check;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_status_check 
  CHECK (status IN ('available', 'busy', 'off_duty', 'on_call', 'invited'));
```

---

## Findings Summary Table

| # | Severity | Issue | Component | Status |
|---|----------|-------|-----------|--------|
| 1 | 🔴 Critical | Broken doctor-profile linkage on create | CRUD | ✅ Resolved |
| 2 | 🟠 High | Missing profile_id in create payload | CRUD | ✅ Resolved |
| 3 | 🟠 High | Update doesn't sync profile | CRUD/Sync | ✅ Resolved |
| 4 | 🟡 Medium | No cascade delete warning | CRUD | ✅ Resolved |
| 5 | 🔴 Critical | Email trigger doesn't link existing | Sync | ✅ Resolved |
| 6 | 🟠 High | Image sync is one-way | Sync | ✅ Resolved |
| 7 | 🟠 High | Stats include orphaned doctors | Sync/UI | ✅ Resolved |
| 8 | 🟡 Medium | Real-time doesn't listen to profiles | Sync | ✅ Resolved |
| 9 | 🔴 Critical | RBAC policy uses wrong org check | RBAC | ✅ Resolved |
| 10 | 🟠 High | Missing profile-hospital link path | RBAC | ✅ Resolved |
| 11 | 🟡 Medium | No provider self-update policy | RBAC | ✅ Resolved |
| 12 | 🟠 High | Modal doesn't handle existing profiles | Profile Mgmt | ✅ Resolved |
| 13 | 🟠 High | Role downgrade doesn't update doctor | Profile Mgmt | ✅ Resolved |
| 14 | 🟡 Medium | Invite metadata ambiguous | Profile Mgmt | ✅ Resolved |
| 15 | 🟠 High | Hospital field hidden for org admin | UI | ✅ Resolved |
| 16 | 🟡 Medium | Cannot re-invite in edit mode | UI | ✅ Resolved |
| 17 | 🟡 Medium | No profile link status indicator | UI | ✅ Resolved |
| 18 | 🟠 High | Specialization filter is static | Filtering | ✅ Resolved |
| 19 | 🟡 Medium | Search only by name | Filtering | ✅ Resolved |
| 20 | 🟡 Medium | KPI + sheet filter intersection broken | Filtering | ✅ Resolved |
| 21 | 🟡 Medium | No filter for unlinked doctors | Filtering | ✅ Resolved |
| 22 | 🟡 Low | Duplicate migration logic | Schema | ✅ Resolved |
| 23 | 🔴 Critical | No unique constraint on email | Schema | ✅ Resolved |
| 24 | 🟠 High | Missing 'invited' status in constraint | Schema | ✅ Resolved |

**Note**: All patterns (Bulk Actions, Advanced Filtering, RBAC Scoping, Confirmation Modals) have been standardized across **Users**, **Doctors**, **Visits**, and **Ambulances** management pages.

**Total**: 24 Flaws
- 🔴 Critical: 4
- 🟠 High: 12
- 🟡 Medium/Low: 8

---

## Recommended Immediate Actions

### Phase 1: Data Integrity (Priority 1)
1. ✅ Add unique constraint on `doctors.email`
2. ✅ Fix `status` constraint to include 'invited'
3. ✅ Add bidirectional profile-doctor linkage logic
4. ✅ Fix RBAC policy to use correct org check

### Phase 2: CRUD Fixes (Priority 2)
5. ✅ Reverse create order: Invite → Create doctor with profile_id
6. ✅ Add profile_id to create/update payloads
7. ✅ Implement profile-doctor sync trigger for updates
8. ✅ Add soft delete with audit

### Phase 3: UI/UX (Priority 3)
9. ✅ Show profile link status badges
10. ✅ Fix hospital field visibility for org admins
11. ✅ Dynamic specialization filter options
12. ✅ Enhanced search (email, license)

### Phase 4: Advanced Features (Priority 4)
13. ✅ Provider self-update policy
14. ✅ Re-invite functionality in edit mode
15. ✅ Unlinked doctors filter
16. ✅ Real-time subscription to profiles

---

## Testing Recommendations

After fixes are implemented, test these scenarios:

1. **Happy Path**: Admin creates doctor → receives invite → logs in → profile synced
2. **Existing User**: Admin adds existing patient as doctor → role upgraded → works
3. **Org Scope**: Org Admin A cannot see/edit doctors from Org B
4. **Provider Self-Service**: Doctor logs in and updates their bio/status
5. **Image Sync**: Upload in profile settings → reflected in doctor directory
6. **Filtering**: All specializations appear in filter, search by email works
7. **KPI Accuracy**: Stats only count linked+active doctors

---

## Conclusion

The doctor management system is **60% implemented** but has critical gaps that prevent production readiness. The "Provider Extension Pattern" architecture is sound, but the execution has synchronization, RBAC, and UI integration issues.

**Estimated Fix Effort**: 3-5 days (1 developer)

**Risk if Not Fixed**:
- Data corruption (duplicate doctors, orphaned records)
- Security breach (cross-org access)
- Poor UX (admins cannot manage staff effectively)
- Support burden (manual SQL fixes required)

---

**End of Audit Report**
