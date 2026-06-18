# Modal Select Fields & Data Mapping Fixes - Complete

**Date**: 2026-01-22  
**Issues Fixed**: Select dropdown not prefilling, KPI data mapping, table/list view data display

---

## Issues Identified & Fixed

### ✅ 1. DoctorModal - Select Fields Not Prefilling
**Problem**: When opening in view/edit mode, Select dropdowns for `hospital_id` and `status` showed placeholder text instead of current values. When editing one field without touching the other, the untouched field became null.

**Root Cause**: `useState` initialized with defaults, then `setFormData(doctor)` completely replaced state, but Select components need the value to exist in formData from the start.

**Fix Applied**: 
- Spread `...doctor` into initial useState
- Changed `setFormData(doctor)` to `setFormData(prev => ({...prev, ...doctor, ...}))`  
- Added proper fallbacks for each select field

**Files Changed**: `src/components/modals/DoctorModal.jsx`

---

### ✅ 2. AmbulanceModal - Same Select Issue
**Problem**: Identical issue with `hospital_id`, `status`, and `type` Select fields.

**Fix Applied**: Same pattern as DoctorModal - spread initial data and merge on updates.

**Files Changed**: `src/components/modals/AmbulanceModal.jsx`

---

### ✅ 3. HospitalModal - Already Correct
**Status**: ✅ No changes needed

**Pattern Used**: `useState(hospital || {...defaults})`  
This pattern works because it initializes with `hospital` if provided, otherwise defaults.

**Recommendation**: This is the simplest pattern for modals where you don't need dynamic org-based defaults.

---

### ✅ 4. UserModal - Already Correct (Reference Implementation)
**Status**: ✅ No changes needed

**Pattern Used**:
```javascript
const [formData, setFormData] = useState({
  ...defaults,
  ...user // Spread user if provided
});

useEffect(() => {
  if (user) {
    setFormData(prev => ({
      ...prev,
      ...user,
      // Explicit field handling
    }));
  }
}, [user]);
```

This is the **gold standard** pattern for complex modals with conditional defaults and role-based logic.

---

### ✅ 5. Table & List Views - Data Mapping OK
**Checked**: `DoctorListView.jsx` and `DoctorTableView.jsx`

**Status**: ✅ Both views correctly display `experience` field (line 34 in both files)

```javascript
{doctor.experience || '0'}y exp
```

No issues found - data mapping is correct.

---

### ✅ 6. KPI Cards - Data Mapping OK
**Checked**: `DoctorsPage.jsx` KPI cards and `PageDataContext.jsx` stats

**Status**: ✅ Properly mapped

**Data Flow**:
1. PageDataContext fetches doctors
2. Calculates stats: `total`, `available`, `busy`, `off_duty`, `onCall`
3. Sets `doctorsData.stats = {total, available, busy, off_duty, onCall}`
4. DoctorsPage reads `doctorsData.stats.onCall` ✅
5. DoctorsPage reads `doctorsData.stats.available` ✅
6. DoctorsPage reads `doctorsData.stats.busy` ✅
7. DoctorsPage reads `doctorsData.stats.off_duty` ✅

All property names match correctly.

---

## Modal State Management Patterns - Best Practices

### Pattern A: Simple Fallback (Best for simple modals)
```javascript
const [formData, setFormData] = useState(entity || {
  field1: 'default',
  field2: 'default'
});
```

**Used By**: HospitalModal ✅  
**Pros**: Simple, works if no dynamic defaults needed  
**Cons**: Doesn't handle prop updates or conditional logic

---

### Pattern B: Spread Initial + UseEffect Sync (Best for complex modals)
```javascript
const [formData, setFormData] = useState({
  field1: 'default',
  field2: 'default',
  ...entity // Spread entity data for initial prefill
});

useEffect(() => {
  if (entity) {
    setFormData(prev => ({
      ...prev,
      ...entity,
      // Explicit fallbacks for critical fields
      selectField: entity.selectField || 'default'
    }));
  } else if (isCreate && conditionalDefault) {
    setFormData(prev => ({...prev, field: conditionalDefault}));
  }
}, [entity, isCreate, conditionalDefault]);
```

**Used By**: UserModal ✅, DoctorModal ✅ (after fix), AmbulanceModal ✅ (after fix)  
**Pros**: Handles prop updates, supports conditional defaults, prevents null overwrites  
**Cons**: Slightly more verbose

**This is the RECOMMENDED pattern for all future modals.**

---

## Remaining Modals to Audit

Based on the modal list, these may need review:

### Potentially Affected:
- ❓ `VisitModal.jsx` - Check if status/doctor_id selects prefill correctly
- ❓ `EmergencyRequestModal.jsx` - Check priority/status selects
- ❓ `InsuranceModal.jsx` - Check policy_type/status selects
- ❓ `SupportTicketModal.jsx` - Check status/priority selects
- ❓ `HealthNewsModal.jsx` - Check status select
- ❓ `SubscriptionModal.jsx` - Check plan type select

### Likely OK (no Selects or simple text fields):
- ✅ `ProfileEditModal.jsx` - Likely OK (uses similar pattern to UserModal)
- ✅ `ConfirmationModal.jsx` - No form fields
- ✅ `AnalyticsModal.jsx` - Read-only
- ✅ `InviteUserModal.jsx` - Create-only (no edit)
- ✅ `VerificationModal.jsx` - Read-only
- ✅ `SecurityModal.jsx` - Likely OK
- ✅ `ReportsModal.jsx` - Read-only
- ✅ `BulkImportModal.jsx` - File upload only

---

## Testing Checklist

To verify fixes are working:

### DoctorModal:
1. ✅ Open existing doctor in **view** mode
   - Hospital select should show current hospital (not placeholder)
   - Status select should show current status
2. ✅ Open existing doctor in **edit** mode
   - Change hospital, save → hospital updates, status unchanged
   - Change status, save → status updates, hospital unchanged
   - Change both → both update
3. ✅ Create new doctor
   - Defaults should apply (status: 'available', etc.)

### AmbulanceModal:
1. ✅ Open existing ambulance in **view** mode
   - Type select should show current type (not placeholder)
   - Status select should show current status
   - Hospital select should show current hospital
2. ✅ Open existing ambulance in **edit** mode
   - Change type only → type updates, status/hospital unchanged
   - Change status only → status updates, type/hospital unchanged
   - Change hospital only → hospital updates, type/status unchanged
3. ✅ Create new ambulance
   - Defaults should apply (type: 'basic', status: 'available')
   - Org admin should see hospital auto-set

### Table/List Views:
1. ✅ Switch to **list view**
   - Experience should show as "5y exp" or similar
   - Specialization should show
2. ✅ Switch to **table view**
   - Experience column should show "5y" or similar
   - All columns populated

### KPI Cards:
1. ✅ Load DoctorsPage
   - Total should show correct count
   - Available should show correct count
   - Busy should show correct count
   - On Call should show correct count
   - Off Duty should show correct count
2. ✅ Click each KPI card
   - Should filter doctors list
   - Ring indicator should appear on active KPI

---

## Recommended Next Steps

1. **Audit remaining modals** using the patterns documented above
2. **Standardize on Pattern B** for all modals going forward
3. **Create modal template** with Pattern B baked in
4. **Document in component library** with code examples

---

**All  Reported Issues: RESOLVED ✅**
- ✅ Select fields not prefilling → Fixed in DoctorModal & AmbulanceModal
- ✅ Null overwrite on partial edits → Fixed with merge pattern
- ✅ Table/List view data mapping → Confirmed working
- ✅ KPI data sync → Confirmed working
