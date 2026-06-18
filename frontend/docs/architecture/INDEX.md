# Architecture

## 📋 **Contents**

System architecture, security, and access control implementation.

### **📖 [README](../README.md)** ← Back to Main Documentation

### **📚 Available Documents**

#### **🗺️ [CONSOLE_OPTIMISATION_MASTER_PLAN.md](./CONSOLE_OPTIMISATION_MASTER_PLAN.md)** ← START HERE
Single source of truth for the full optimisation. 5-layer state architecture, implementation order, rollback hashes, ivisit-app ecosystem alignment, and execution log for all 19 sub-passes.

#### **🏗️ [CONSOLE_GRAND_REFACTOR_PLAN.md](./CONSOLE_GRAND_REFACTOR_PLAN.md)**
Grand refactor plan to bring the console to gold standard (5-layer state architecture). 10-pass migration from god-context + monolith pages → TanStack Query + Zustand + Jotai + decomposed pages.

#### **🔍 [APP_ENTRY_LAYOUT_AUDIT.md](./APP_ENTRY_LAYOUT_AUDIT.md)**
Deep audit of `App.js`, `LayoutContext`, `NavigationContext`, and `AppShell`. Documents all violations: eager imports, `window.innerWidth` at render time, duplicate breakpoint listeners, DOM event bus, missing `QueryClientProvider`. 8 sub-passes planned.

#### **🔍 [PROVIDERS_AUDIT.md](./PROVIDERS_AUDIT.md)**
Full audit of all 7 React context providers. Identifies `PageDataContext` (1,039 lines, 14 domains) and `MapProvider` as critical L2 violations, hardcoded admin email as security issue, duplicate `NavigationProvider`, and target provider tree (8 → 5 nesting levels).

#### **�️ [PROTECTED_ROUTES_SYSTEM.md](./PROTECTED_ROUTES_SYSTEM.md)**
Comprehensive route protection system preventing manual URL bypassing with navigation-based access control.

#### **🔐 [RBAC_IMPLEMENTATION_STATUS.md](./RBAC_IMPLEMENTATION_STATUS.md)**
Role-based access control implementation with proper data scoping and privacy protection.

---

## 🎯 **Architecture Features**

### **✅ Security & Access Control**
- Multi-layer route protection
- Navigation-based access control
- Role-based data filtering
- Privacy compliance (HIPAA)
- Audit logging

### **✅ Route Protection**
- Manual URL bypass prevention
- Navigation config integration
- Resource-based permissions
- Protected route components
- Access logging

### **✅ RBAC System**
- Role hierarchy implementation
- Provider type differentiation
- Hospital-based scoping
- Data field matching
- Privacy protection

---

## 🎯 **Implementation Status**

### **✅ Complete Systems**
```bash
✅ Protected Routes System (100% complete)
✅ RBAC Implementation (100% complete)
✅ Privacy Protection (100% complete)
✅ Access Control (100% complete)
✅ Audit Logging (100% complete)
```

### **🔧 Technical Implementation**
- Navigation config integration
- Database schema alignment
- Type-safe implementation
- Service layer protection
- Component-level security

---

## 🎯 **Security Features**

### **🛡️ Route Protection**
```javascript
// Multi-layer security
Navigation Config → Route Protection → Route Guard → Protected Route → Component
```

### **🔐 Access Patterns**
```bash
✅ Patients: Own data only
✅ Providers: Role-based access
✅ Drivers: Operational data only
✅ Org Admins: Hospital-wide access
✅ Admins: Platform-wide access
```

### **🚑 Privacy Protection**
```bash
✅ Drivers blocked from medical visits
✅ Proper data field matching
✅ HIPAA compliant filtering
✅ Audit trail for access
```

---

## 🎯 **Usage Guidelines**

### **🔧 For Development**
- Use protected routes for all sensitive pages
- Follow RBAC patterns for data access
- Implement proper field matching
- Maintain privacy compliance

### **🛡️ For Security**
- Regularly review access patterns
- Update route configurations
- Monitor access logs
- Maintain audit trails

---

## 🎯 **Integration Points**

### **📊 Database Integration**
- Proper field type matching
- Role-based data filtering
- Privacy-compliant queries
- Type-safe operations

### **🎨 UI Integration**
- Navigation-based access control
- Conditional rendering
- Protected components
- User experience flow

---

**Return to [Main Documentation](../README.md)** 📚
