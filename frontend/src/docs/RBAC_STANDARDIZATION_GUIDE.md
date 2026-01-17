# RBAC Standardization Guide

## 📋 Purpose

This guide ensures consistent RBAC implementation across all iVisit Console services following the hybrid RLS + Service Layer pattern.

## 🏗️ Standard Patterns

### **1. Import Standardization**
```javascript
import { getCurrentUser } from './authService';
import { requireAdminOrUserAccess, requireUserAccess, handleServiceError } from './rbacPatterns';
```

### **2. Authorization Function Selection**

#### **Admin + User Access (Oversight Services)**
```javascript
export async function getServiceData(filter) {
  try {
    const user = await requireAdminOrUserAccess(filter.user_id);
    let query = supabase.from(TABLE_NAME).select('*');
    
    // Service layer filtering for performance
    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    // ... rest of logic
  } catch (error) {
    handleServiceError(error, 'serviceName', 'getServiceData');
  }
}
```

#### **User-Only Access (Privacy Services)**
```javascript
export async function getUserData(filter) {
  try {
    const user = await requireUserAccess(filter.user_id);
    let query = supabase.from(TABLE_NAME).select('*').eq('user_id', user.id);
    
    // ... rest of logic
  } catch (error) {
    handleServiceError(error, 'serviceName', 'getUserData');
  }
}
```

### **3. RLS Policy Template**
```sql
-- Admin + User Access
CREATE POLICY "Admins full access, users own data"
ON {table_name} FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
)
WITH CHECK (
  public.is_admin() OR auth.uid() = user_id
);

-- User-Only Access
CREATE POLICY "Users can only access own data"
ON {table_name} FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## 📊 Service Classification

### **Oversight Services (Admin + User Access)**
- **Users Management** - Admin needs full visibility
- **Insurance Management** - Admin oversight required
- **Visits Management** - Admin operational access
- **Emergency Requests** - Admin coordination needed
- **Support Tickets** - Admin support operations
- **Medical Profiles** - Admin emergency access

### **Privacy Services (User-Only Access)**
- **Search History** - Private user data
- **Search Selections** - Private user data
- **User Preferences** - Personal settings
- **User Notifications** - Private communications

## 🔧 Implementation Checklist

### **New Service Development**
- [ ] Import standard patterns
- [ ] Choose authorization type (Oversight vs Privacy)
- [ ] Implement service-layer authorization
- [ ] Create RLS policies
- [ ] Add error handling
- [ ] Test both admin and user access
- [ ] Update documentation

### **Existing Service Updates**
- [ ] Review current authorization
- [ ] Apply standard patterns
- [ ] Update RLS policies if needed
- [ ] Test for regressions
- [ ] Update documentation

## 🎯 Quality Standards

### **Performance Requirements**
- Admin role checks must use JWT optimization
- Service layer filtering for performance
- Database queries minimized

### **Security Requirements**
- Defense in depth (Service + RLS)
- Consistent error messages
- Audit logging for all authorization events

### **Maintainability Requirements**
- Standardized error handling
- Consistent function naming
- Clear documentation
- Reusable patterns

## 📚 Reference Implementations

### **Perfect Examples**
- `insuranceService.js` - Oversight service
- `medicalProfilesService.js` - Inherited access
- `searchHistoryService.js` - Privacy service

### **Common Patterns**
```javascript
// Standard authorization check
if (user?.role !== 'admin' && user?.id !== requestedUserId) {
  throw new Error('Unauthorized: Access denied');
}

// Standard query building
let query = supabase.from(TABLE_NAME).select('*');
if (user?.role !== 'admin') {
  query = query.eq('user_id', user.id);
}

// Standard error handling
catch (error) {
  handleServiceError(error, serviceName, operationName);
}
```

## 🔄 Migration Path

### **Phase 1: Pattern Adoption**
1. Import `rbacPatterns.js` in all services
2. Replace custom authorization with standard functions
3. Test for functional equivalence

### **Phase 2: Consistency Review**
1. Audit all services for pattern compliance
2. Update any remaining custom implementations
3. Document any exceptions

### **Phase 3: Optimization**
1. Profile performance bottlenecks
2. Optimize frequently accessed services
3. Implement caching where appropriate

---

*This guide ensures maintainable, secure, and consistent RBAC across the entire iVisit Console.*
