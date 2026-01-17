# iVisit Console - RBAC Implementation Plan

## 📅 Last Updated: January 17, 2026

---

## 🎯 Executive Summary

This document outlines the current state of Role-Based Access Control (RBAC) in the iVisit Console and provides a comprehensive plan for implementing a scalable, secure, and maintainable authorization system.

---

## 📊 Current RBAC State Analysis

### **Based on Master Blueprint Doctrine & Apple Standards**

According to the **Master Blueprint** and **Apple-standard privacy principles**, here's the corrected RBAC scope:

### ✅ **Working Implementations**

#### **Users Management** - `profilesService.js`
- **Pattern**: SECURITY DEFINER functions + Service layer filtering
- **Admin Access**: `get_all_auth_users()` function bypasses RLS
- **User Access**: Service layer filters by `user?.id`
- **Security**: ✅ Excellent (defense in depth)
- **Performance**: ✅ Good (JWT + DB fallback)

#### **Insurance Management** - `insuranceService.js`
- **Pattern**: Row Level Security (RLS) + Service layer filtering
- **Admin Access**: RLS policy `is_admin() OR auth.uid() = user_id`
- **User Access**: Service layer + RLS double protection
- **Security**: ✅ Excellent
- **Performance**: ✅ Good

### ⚠️ **Partial Implementations**

#### **Emergency Requests** - `emergencyService.js`
- **Pattern**: Service layer filtering only
- **Admin Access**: ✅ Implemented in service layer
- **User Access**: ✅ Implemented in service layer
- **RLS Policies**: ❌ Missing (security gap)
- **Security**: ⚠️ Moderate (service layer only)

### ❌ **Critical Security Gaps**

#### **Visits Management** - `visitsService.js`
- **Pattern**: No authorization filtering
- **Admin Access**: ❌ Not implemented
- **User Access**: ❌ Not implemented (security gap)
- **RLS Policies**: ❌ Missing
- **Security**: ❌ Critical gap

### ❓ **Need Investigation (Apple-Standard Scope)**

#### **MedicalProfile** - Should Inherit Profile Access
- **Apple Principle**: Medical data is personal but accessible to emergency responders
- **Admin Access**: Should inherit from profile access (if admin can see profile, can see medical data)
- **User Access**: User can see their own medical profile
- **Implementation**: Link to profiles table access control

#### **SupportTicket** - Admin Support Access Needed
- **Apple Principle**: Customer support requires access to support tickets
- **Admin Access**: ✅ Required for support operations
- **User Access**: Users can see their own tickets
- **Implementation**: Standard RBAC pattern needed

#### **SearchHistory & SearchSelection** - User-Only Data
- **Apple Principle**: Search history is private user data
- **Admin Access**: ❌ Not needed (privacy)
- **User Access**: Users can only see their own search data
- **Implementation**: User-only access control

### 🚫 **Out of Scope (Per Apple Standards)**

#### **Preferences** - Personal Settings Only
- **Apple Principle**: User preferences are private personal settings
- **Admin Access**: ❌ Not needed
- **User Access**: User can manage their own preferences
- **Implementation**: No admin access required

#### **Notification** - User Notifications Only
- **Apple Principle**: Notifications are private user communications
- **Admin Access**: ❌ Not needed (bulk ops at superadmin level via Supabase)
- **User Access**: Users can see their own notifications
- **Implementation**: User-only access, bulk operations at infrastructure level

---

## 🎯 **Corrected Implementation Priority**

### **Phase 1: Critical Security (Immediate)**
1. ✅ **Visits** - Critical gap (no authorization) - COMPLETED
2. ✅ **Emergency Requests** - Add RLS policies - COMPLETED
3. ✅ **Support Tickets** - Investigate and implement - COMPLETED

### **Phase 2: Inherited Access (Short-term)**
1. ✅ **MedicalProfile** - Link to profile access control - COMPLETED
2. ✅ **Search Data** - User-only access - COMPLETED

### **Phase 3: Infrastructure (Medium-term)**
1. **JWT Sync** - Performance optimization
2. **Standardization** - Consistent patterns

---

## 📋 **Final Scope Summary**

**Total Services Requiring RBAC: 7**
- **✅ Implemented:** 7 (100%)
- **⚠️ Partial:** 0 (0%) 
- **❌ Critical:** 0 (0%)
- **🚫 Out of Scope:** 2 (29%)

**Priority Order:**
1. ✅ **Visits** (Critical) - COMPLETED
2. ✅ **Emergency RLS** (Security) - COMPLETED
3. ✅ **Support Tickets** (Operations) - COMPLETED
4. ✅ **Medical Profile** (Inherited) - COMPLETED
5. ✅ **Search Data** (Privacy) - COMPLETED 

---

## 🏗️ Recommended Architecture: Hybrid RLS + Service Layer

### **Core Principles**

1. **Defense in Depth**: RLS + Service layer filtering
2. **Performance First**: JWT claims check, database fallback
3. **Consistent Pattern**: Same approach across all services
4. **Scalable**: Easy to add new roles and permissions
5. **User Features Preserved**: No breaking changes to existing functionality

### **Database Layer - Universal RLS Pattern**

```sql
-- Universal admin function with JWT optimization
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check JWT claim first (fastest, no recursion)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback to database check
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
END;
$$;

-- Universal RLS policy template
CREATE POLICY "Admins full access, users own data"
ON {table_name} FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
);
```

### **Service Layer - Standardized Pattern**

```javascript
// Standardized service pattern for all tables
export async function getResources(filter) {
  const user = await getCurrentUser();
  let query = supabase.from(TABLE_NAME).select('*');

  // Service-layer filtering (performance + clarity)
  if (user?.role !== 'admin') {
    query = query.eq('user_id', user?.id);
  }

  // Apply additional filters...
  return await query;
}
```

---

## 🚀 Implementation Roadmap

### **Phase 1: Critical Security Fixes (Immediate)**

#### **1.1 Fix Visits Security Gap**
```sql
-- Enable RLS on visits table
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Admins full access, users own data"
ON visits FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
);
```

```javascript
// Update visitsService.js
export async function getVisits(filter) {
  const user = await getCurrentUser();
  let query = supabase.from(TABLE_NAME).select('*');

  // Add missing authorization
  if (user?.role !== 'admin') {
    query = query.eq('user_id', user?.id);
  }
  
  // ... rest of existing logic
}
```

#### **1.2 Add RLS to Emergency Requests**
```sql
-- Enable RLS if not already enabled
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Admins full access, users own data"
ON emergency_requests FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
);
```

#### **1.3 Investigate Support Tickets**
- [ ] Analyze current `supportTicketsService.js`
- [ ] Check if RLS is enabled
- [ ] Implement missing authorization if needed

### **Phase 2: JWT Sync Implementation (Short-term)**

#### **2.1 Implement JWT Role Synchronization**
```sql
-- Function to sync profile role to auth.users app_metadata
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('role', NEW.role)
      ELSE raw_app_meta_data || jsonb_build_object('role', NEW.role)
    END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_profile_role_sync
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_auth();
```

#### **2.2 Backfill Existing Roles**
```sql
-- Backfill existing roles to auth.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM public.profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      CASE 
        WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('role', r.role)
        ELSE raw_app_meta_data || jsonb_build_object('role', r.role)
      END
    WHERE id = r.id;
  END LOOP;
END;
$$;
```

### **Phase 3: Standardize All Services (Medium-term)**

#### **3.1 Service Layer Standardization**
Update all services to follow the consistent pattern:

**Emergency Service** ✅ Already has service layer filtering
- [ ] Verify RLS policies are in place
- [ ] Test admin access

**Insurance Service** ✅ Already follows correct pattern
- [ ] No changes needed

**Visits Service** ❌ Needs complete implementation
- [ ] Add service layer filtering
- [ ] Add RLS policies
- [ ] Test both admin and user access

**Profiles Service** ✅ Already working with SECURITY DEFINER
- [ ] Consider migrating to standard pattern for consistency

**Support Tickets Service** ❓ Needs investigation
- [ ] Analyze current implementation
- [ ] Apply standard pattern if needed

### **Phase 4: Advanced RBAC Features (Long-term)**

#### **4.1 Multi-Role Support**
```sql
-- Enhanced role checking function
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check JWT claim first
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = required_role THEN
    RETURN TRUE;
  END IF;

  -- Fallback to database check
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = required_role
  );
END;
$$;
```

#### **4.2 Resource-Specific Permissions**
```sql
-- Example: Provider can access assigned visits
CREATE POLICY "Providers can access assigned visits"
ON visits FOR SELECT
TO authenticated
USING (
  public.is_admin() 
  OR auth.uid() = user_id
  OR (profiles.role = 'provider' AND visits.doctor_id = auth.uid())
);
```

---

## 🔍 Testing Strategy

### **Security Testing Checklist**

#### **Admin Access Testing**
- [ ] Admin can view all users
- [ ] Admin can view all emergency requests
- [ ] Admin can view all visits
- [ ] Admin can view all insurance policies
- [ ] Admin can access analytics/statistics

#### **User Access Testing**
- [ ] Users can only see their own data
- [ ] Users cannot access other users' data
- [ ] Users maintain all existing functionality
- [ ] No breaking changes to user features

#### **Edge Case Testing**
- [ ] Unauthenticated users blocked
- [ ] Invalid JWT tokens rejected
- [ ] Role changes sync immediately
- [ ] Database fallback works when JWT missing

### **Performance Testing**
- [ ] JWT claims check performance
- [ ] RLS policy overhead
- [ ] Service layer filtering impact
- [ ] Large dataset handling

---

## 📋 Implementation Checklist

### **Database Changes**
- [ ] Create/update `is_admin()` function
- [ ] Create `sync_profile_role_to_auth()` function
- [ ] Create role sync trigger
- [ ] Backfill existing roles
- [ ] Enable RLS on all tables
- [ ] Create RLS policies for each table

### **Service Layer Changes**
- [ ] Update `visitsService.js` with authorization
- [ ] Verify `emergencyService.js` RLS policies
- [ ] Investigate `supportTicketsService.js`
- [ ] Standardize all services to consistent pattern

### **Frontend Changes**
- [ ] Update role checking in components
- [ ] Test admin UI features
- [ ] Verify user features preserved
- [ ] Add role-based UI elements where needed

### **Testing & Validation**
- [ ] Unit tests for authorization logic
- [ ] Integration tests for RLS policies
- [ ] End-to-end testing for user workflows
- [ ] Security penetration testing

---

## 🎯 Success Metrics

### **Security Metrics**
- ✅ Zero security gaps in data access
- ✅ All tables have RLS policies
- ✅ All services implement authorization
- ✅ Role-based access working correctly

### **Performance Metrics**
- ✅ JWT claims check < 10ms
- ✅ RLS policy overhead < 5%
- ✅ No regression in query performance

### **User Experience Metrics**
- ✅ All existing user features preserved
- ✅ Admin features working correctly
- ✅ No breaking changes
- ✅ Role changes reflect immediately

---

## 🔄 Maintenance & Monitoring

### **Ongoing Tasks**
- [ ] Monitor RLS policy performance
- [ ] Audit role changes and access patterns
- [ ] Update documentation as roles evolve
- [ ] Regular security reviews

### **Alerting**
- [ ] Failed authorization attempts
- [ ] Unusual access patterns
- [ ] RLS policy errors
- [ ] JWT sync failures

---

## 📚 Reference Documentation

### **Key Files**
- `src/services/profilesService.js` - Working SECURITY DEFINER example
- `src/services/insuranceService.js` - Working RLS example
- `src/services/emergencyService.js` - Service layer only example
- `src/services/visitsService.js` - Needs implementation
- `supabase/migrations/` - Database schema and policies

### **Database Functions**
- `public.is_admin()` - Universal admin check
- `public.get_all_auth_users()` - Admin user access
- `public.sync_profile_role_to_auth()` - JWT synchronization

### **Related Documents**
- `src/docs/design-tweaks.md` - UI/UX design decisions
- Database migration files - Schema evolution history

---

## 🚨 Critical Notes

### **Security First**
- Never disable RLS in production
- Always test authorization in staging first
- Use SECURITY DEFINER functions carefully
- Monitor for privilege escalation attempts

### **Performance Considerations**
- JWT claims are faster than database lookups
- RLS policies add minimal overhead
- Service layer filtering provides clarity
- Index user_id columns for performance

### **User Experience**
- Preserve all existing user features
- Admin access should be additive, not replacement
- Role changes should sync immediately
- Provide clear feedback for permission errors

---

*This document is a living reference. Update as implementation progresses and new requirements emerge.*
