# iVisit RBAC Model — Dashboard Implementation Guide

## Purpose

This document explains the **Role-Based Access Control (RBAC) model** used in iVisit and how it must be applied consistently across the **dashboard UI, backend authorization, and data access layers**.

The goal is to support:

* Platform-level administration 
* Organization-managed entities (hospitals, ambulance companies)
* Independent providers (doctors, ambulances)
* Patients, sponsors, and public viewers

This model is designed to scale without rewriting permissions.

---

## Core Principle (Read This First)

> **Authorization is never based on role alone.**
> Authority is determined by **Role + Scope + Resource Ownership**.

Roles describe *who* the user is.
Scopes describe *where* their authority applies.

The dashboard must derive **what a user can see and do** from this combination.

---

## Segment 1: Roles (Identity Layer)

Roles are **stable and semantic**. They do not encode ownership or hierarchy.

```ts
Role =
  | 'admin'        // Platform owner
  | 'sponsor'      // Financial supporter (read-only)
  | 'org_admin'    // Organization administrator
  | 'provider'     // Doctor, ambulance, clinic staff
  | 'patient'      // End user
  | 'viewer'       // Public or invited read-only
```

Important rules:

* Do NOT create new roles for hospitals vs ambulances
* Do NOT infer permissions directly from role
* Roles never change behavior without scope

---

## Segment 2: Scopes (Context Layer)

Scopes define **where** authority applies. They are **hierarchical and inheritable**.

```ts
Scope =
  | 'global'       // Platform-wide (admin only)
  | 'org'          // Organization (org_admin, provider)
  | 'hospital'     // Specific hospital (provider)
  | 'ambulance'    // Specific ambulance company (provider)
  | 'personal'     // User's own data (all roles)
```

Scope inheritance:
* `global` includes all organizations
* `org` includes all hospitals/ambulances in that org
* `hospital` includes all providers at that hospital
* `personal` is always available

---

## Segment 3: Resources (Data Layer)

Resources are **typed entities** that can be owned or scoped.

```ts
Resource =
  | 'users'        // User profiles and authentication
  | 'hospitals'    // Hospital facilities
  | 'ambulances'   // Ambulance companies/fleets
  | 'doctors'      // Medical providers
  | 'emergencies'  // Emergency requests
  | 'visits'       // Medical appointments
  | 'analytics'    // Reports and statistics
  | 'settings'     // System configuration
```

---

## Authorization Matrix

| Role | Global Scope | Org Scope | Hospital Scope | Personal Scope |
|------|-------------|----------|---------------|----------------|
| admin | ✅ Full | ✅ Full | ✅ Full | ✅ Own |
| org_admin | ❌ | ✅ Full | ✅ Full | ✅ Own |
| sponsor | ✅ Read | ✅ Read | ✅ Read | ✅ Own |
| provider | ❌ | ✅ Limited | ✅ Assigned | ✅ Own |
| patient | ❌ | ❌ | ❌ | ✅ Own |
| viewer | ✅ Read | ✅ Read | ✅ Read | ❌ |

---

## Dashboard Implementation Patterns

### 1. **Component-Level Authorization**

```jsx
// ❌ WRONG - Role-based only
{user.role === 'admin' && <AdminPanel />}

// ✅ RIGHT - Scope + Resource + Role
{can('manage', 'users') && <UserManagement />}
{can('view', 'analytics') && <AnalyticsDashboard />}
```

### 2. **Data Scoping in Services**

```js
// ❌ WRONG - Hardcoded role checks
if (user.role === 'org_admin') {
  query = query.eq('organization_id', user.org_id);
}

// ✅ RIGHT - Flexible scoping
query = applyAuthFilter(query, user, {
  resourceType: 'hospitals',
  orgIdField: 'organization_id'
});
```

### 3. **Navigation Visibility**

```jsx
// ❌ WRONG - Static role checks
{user.role === 'admin' && <NavItem to="/admin" />}

// ✅ RIGHT - Permission-based
{can('access', 'admin_panel') && <NavItem to="/admin" />}
```

---

## Implementation Status: ✅ COMPLETE

This RBAC model has been **fully implemented** across:

- ✅ **AuthContext** - Role and scope management
- ✅ **Navigation** - Permission-based menu visibility  
- ✅ **Protected Routes** - Route-level authorization
- ✅ **Service Layer** - Data scoping and filtering
- ✅ **UI Components** - Conditional rendering based on permissions
- ✅ **Database Schema** - Proper field alignment for scoping

---

## Migration Notes

**This document represents the FINAL RBAC architecture.** 

Previous planning documents have been archived to prevent drift. All new development should reference this document as the single source of truth for authorization logic.

---

## Quick Reference

### Common Permission Checks
```js
can('manage', 'users')        // Admin only
can('view', 'analytics')      // Provider+  
can('manage', 'hospitals')    // Org Admin+
can('view', 'emergencies')   // Provider+
can('manage', 'visits')       // Provider (own hospital)
```

### Scope Patterns
```js
// Global admin
user.role === 'admin' && user.scope === 'global'

// Organization admin  
user.role === 'org_admin' && user.organization_id

// Hospital provider
user.role === 'provider' && user.hospital_id

// Personal data access
user.id === resource.user_id
```

---

**Status: IMPLEMENTED ✅ | Last Updated: 2026-01-24**
