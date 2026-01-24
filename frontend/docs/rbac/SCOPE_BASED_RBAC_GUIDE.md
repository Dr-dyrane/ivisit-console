# Scope-Based RBAC Implementation Guide

## Overview
This document outlines the implementation of comprehensive scope-based RBAC filtering at the service level, ensuring that data access is automatically scoped based on user roles.

---

## ✅ Enhanced `applyAuthFilter` Function

### Location
`frontend/src/services/authService.js`

### Implementation Complete
The `applyAuthFilter` function now supports:

```javascript
export function applyAuthFilter(baseQuery, user, options = {}) {
  const {
    userIdField = 'user_id',
    orgIdField = 'organization_id',
    providerIdField = 'doctor_id',      // NEW
    bypassForAdmin = true,
    additionalFilters = {},
    resourceType = null                  // NEW
  } = options;
  
  // Role-based filtering logic:
  // - admin: No filtering (sees all)
  // - org_admin: Filtered by orgIdField
  // - provider/doctor: Filtered by providerIdField for visits/emergencies
  // - others: Filtered by userIdField
}
```

### New Features
1. **`providerIdField`**: Specifies which field links a record to a provider (e.g., `doctor_id`)
2. **`resourceType`**: Enables smart scoping based on resource type (`'visit'`, `'emergency'`, `'support'`, `'news'`)

### Logging
- All RBAC decisions are logged to console for debugging
- Format: `[RBAC] Role - action taken`

---

## 🔧 Service Updates Required

### 1. ✅ Visits Service (COMPLETE)
**File**: `frontend/src/services/visitsService.js`

**Changes Applied**:
```javascript
query = applyAuthFilter(query, user, {
  userIdField: 'user_id',
  orgIdField: 'hospital_id',
  providerIdField: 'doctor_id',
  resourceType: 'visit'
});
```

**Result**:
- **Admins**: See all visits
- **Org Admins**: See visits at their hospital
- **Providers (Doctors)**: See only visits where `doctor_id` = their user ID
- **Patients**: See only their own visits

---

### 2. 🔄 Emergency Service (NEEDS UPDATE)
**File**: `frontend/src/services/emergencyService.js`

**Current Code** (lines 26-40):
```javascript
export async function getEmergencyRequests(filter) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Manual role checking (OLD WAY)
    if (user?.role === 'admin') {
      // Full access
    } else if (user?.role === 'org_admin' && user?.organization_id) {
      query = query.eq('hospital_id', user.organization_id);
    } else {
      query = query.eq('user_id', user?.id);
    }
```

**Required Update**:
```javascript
export async function getEmergencyRequests(filter) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply RBAC Scoping (NEW WAY)
    query = applyAuthFilter(query, user, {
      userIdField: 'user_id',
      orgIdField: 'hospital_id',
      providerIdField: 'assigned_doctor_id', // Or 'doctor_id' if column exists
      resourceType: 'emergency'
    });
```

**Don't forget to import**:
```javascript
import { getCurrentUser, applyAuthFilter } from './authService';
```

---

### 3. ✅ Support Tickets Service (REVIEW)
**File**: `frontend/src/services/supportTicketsService.js`

**Should have**:
```javascript
query = applyAuthFilter(query, user, {
  userIdField: 'created_by',  // Who created the ticket
  orgIdField: 'organization_id',
  resourceType: 'support'
});
```

**Logic**:
- **Providers**: See tickets they created (`created_by` = their ID)
- **Org Admins**: See tickets from their organization
- **Platform Admins**: See all tickets

---

### 4. Health News Service
**File**: `frontend/src/services/healthNewsService.js` (if exists)

**Should have**:
```javascript
query = applyAuthFilter(query, user, {
  resourceType: 'news'
  // No filtering - providers can read all news
  // Write permissions handled at UI level
});
```

---

## 🛡️ Protected Routes Update

### Current vs Required

**File**: `frontend/src/App.jsx` or routing configuration

### Navigation RBAC Summary

| Route | Admin | Org Admin | Provider | Patient |
|-------|-------|-----------|----------|---------|
| `/` (Dashboard) | ✅ | ✅ | ✅ | ✅ |
| `/map` | ✅ | ✅ | ✅ | ❌ |
| `/analytics` | ✅ | ✅ | ❌ | ❌ |
| `/visits` | ✅ | ✅ | ✅ (filtered) | ✅ (own) |
| `/emergencies` | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| `/hospitals` | ✅ | ✅ | ❌ | ❌ |
| `/ambulances` | ✅ | ✅ | ❌ | ❌ |
| `/doctors` | ✅ | ✅ | ❌ | ❌ |
| `/support-tickets` | ✅ | ✅ | ✅ (filtered) | ✅ (own) |
| `/health-news` | ✅ | ✅ | ✅ (read-only) | ✅ |
| `/verification` | ✅ | ✅ | ❌ | ❌ |
| `/users` | ✅ | ✅ | ❌ | ❌ |
| `/insurance` | ✅ | ❌ | ❌ | ❌ |
| `/subscriptions` | ✅ | ❌ | ❌ | ❌ |

### Protected Route Component Pattern

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { getAccessibleNav, NAV_CONFIG } from './config/navigation';

function ProtectedRoute({ children, resource }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has access to this resource
  const accessibleItems = getAccessibleNav(user);
  const flatItems = [
    ...accessibleItems.main,
    ...(accessibleItems.ops?.items || []),
    ...(accessibleItems.mgmt?.items || [])
  ];
  
  const hasAccess = flatItems.some(item => item.resource === resource);
  
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

// Usage in routes:
<Route
  path="/visits"
  element={
    <ProtectedRoute resource="visits">
      <VisitsPage />
    </ProtectedRoute>
  }
/>
```

---

## 🎯 Testing Scenarios

### Test as Provider (Doctor)

#### 1. Visits Page
```sql
-- What provider should see:
SELECT * FROM visits WHERE doctor_id = <provider_user_id>;

-- NOT all visits at their hospital
```

**Test Steps**:
1. Login as provider
2. Navigate to `/visits`
3. Verify only sees visits assigned to them
4. Try to view another doctor's visit → should fail/redirect

#### 2. Emergencies Page
```sql
-- What provider should see:
SELECT * FROM emergency_requests 
WHERE assigned_doctor_id = <provider_user_id>;
```

**Test Steps**:
1. Login as provider
2. Navigate to `/emergencies`
3. Verify only sees emergencies assigned to them
4. Unassigned emergencies should not appear

#### 3. Support Tickets
```sql
-- What provider should see:
SELECT * FROM support_tickets 
WHERE created_by = <provider_user_id>;
```

**Test Steps**:
1. Login as provider
2. Navigate to `/support-tickets`
3. Verify only sees tickets they created
4. Cannot see other providers' tickets

#### 4. Health News
**Expected**: Sees all news (read-only)
**Test**: Cannot create/edit news (buttons hidden)

---

### Test as Org Admin

#### 1. All Resources
```sql
-- What org admin should see:
SELECT * FROM [table] 
WHERE hospital_id = <org_admin_org_id>
-- OR organization_id = <org_admin_org_id>
```

**Test Steps**:
1. Login as org_admin
2. Visit each page (Visits, Emergencies, Doctors, etc.)
3. Verify data is scoped to their organization only
4. Dashboard stats should reflect org-scoped numbers

#### 2. Users Management
- Should see users from their organization
- Can create users in their organization
- Cannot see users from other organizations

---

## 📝 Database Schema Requirements

### Required Columns for RBAC

#### Visits Table
```sql
visits (
  id UUID,
  user_id UUID,          -- Patient
  doctor_id UUID,        -- Provider assignment
  hospital_id UUID,      -- Org scoping
  ...
)
```

#### Emergency Requests Table
```sql
emergency_requests (
  id UUID,
  user_id UUID,               -- Patient
  assigned_doctor_id UUID,    -- Provider assignment (ADD IF MISSING)
  hospital_id UUID,           -- Org scoping
  ...
)
```

#### Support Tickets Table
```sql
support_tickets (
  id UUID,
  created_by UUID,       -- Who created it
  organization_id UUID,  -- Org scoping
  assigned_to UUID,      -- Optional: who's handling it
  ...
)
```

---

## 🔍 Debugging RBAC

### Console Logging
All `applyAuthFilter` calls now log their decisions:

```
[RBAC] Provider - applying specialized filtering for visit
[RBAC] Provider - filtering by doctor_id = abc-123-def
```

### Verify Filtering in Browser DevTools

1. Open Network tab
2. Filter by `from=visits` or relevant table
3. Check the PostgREST query parameters:
   - Should see `?doctor_id=eq.<user_id>` for providers
   - Should see `?hospital_id=eq.<org_id>` for org admins

---

## 🚀 Implementation Checklist

### Immediate Actions
- [ ] Update `emergencyService.js` to use `applyAuthFilter`
- [ ] Verify `supportTicketsService.js` uses resource type
- [ ] Check if `emergency_requests` table has `assigned_doctor_id` column
- [ ] If not, add migration to create it
- [ ] Update protected routes to use RBAC from navigation config
- [ ] Test with each role (admin, org_admin, provider, patient)

### Database Migrations Needed
- [ ] Add `assigned_doctor_id` to `emergency_requests` if missing
- [ ] Ensure all tables have `organization_id` or `hospital_id`
- [ ] Add indexes on RBAC filter columns for performance

### UI Updates
- [ ] Health News: Hide edit/create buttons for providers
- [ ] Context panels: Ensure analytics buttons work
- [ ] Error page for unauthorized access

---

## 🎯 Success Criteria

✅ Provider logs in and sees:
- Only their assigned visits (by `doctor_id`)
- Only their assigned emergencies (by `assigned_doctor_id`)
- Only support tickets they created
- All health news (read-only)
- Navigation: Dashboard, Map, Visits, Emergencies, Support, News

✅ Org Admin logs in and sees:
- All data from their organization (by `hospital_id` or `organization_id`)
- Can manage doctors, hospitals, ambulances in their org
- Can see verification queue for their org
- Can manage users in their org

✅ Platform Admin logs in and sees:
- Everything (no filters applied)

✅ All RBAC filtering happens at service level
- No manual role checks in components
- Components just call `getVisits()` and get correct data
- Logs show filtering decisions for debugging

---

**Next Steps**: 
1. Apply emergency service update
2. Test with actual users of each role
3. Monitor console logs to verify RBAC working
4. Add missing database columns if needed
