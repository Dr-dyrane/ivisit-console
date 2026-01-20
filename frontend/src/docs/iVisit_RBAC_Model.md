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

## Segment 2: Scopes (Authority Boundary)

Scopes define **where a role is allowed to act**.

```ts
Scope =
  | 'platform'       // Entire system
  | 'organization'   // A specific hospital / company
  | 'self'           // User-owned resources only
  | 'public'         // Read-only access
```

Scopes are the **power dial**.
The same role behaves very differently under different scopes.

---

## Segment 3: Role Assignments (Source of Truth)

A user may have **multiple role assignments**.

```ts
RoleAssignment {
  userId
  role
  scope
  organizationId? // present only for organization scope
}
```

Examples:

* A hospital admin = org_admin + organization scope
* An independent doctor = provider + self scope
* You = admin + platform scope

The dashboard must read from **role assignments**, not hard-coded rules.

---

## Segment 4: Authority Examples (Mental Model)

### Platform Admin (You)

```json
{ "role": "admin", "scope": "platform" }
```

* Full access to all data and settings

### Sponsor

```json
{ "role": "sponsor", "scope": "platform" }
```

* View dashboards and impact metrics
* No CRUD permissions

### Hospital Admin

```json
{ "role": "org_admin", "scope": "organization", "organizationId": "hospital_123" }
```

* Full control inside their hospital only

### Hospital Provider

```json
{ "role": "provider", "scope": "organization", "organizationId": "hospital_123" }
```

* Access assigned resources within hospital

### Independent Provider

```json
{ "role": "provider", "scope": "self" }
```

* Manage own profile, availability, and cases

### Patient

```json
{ "role": "patient", "scope": "self" }
```

* Access own requests and records only

### Viewer

```json
{ "role": "viewer", "scope": "public" }
```

* Read-only content

---

## Segment 5: Permission Resolution Logic (Backend Truth)

All authorization resolves through a single rule:

```ts
can(user, action, resource)
```

Conceptual logic:

* Platform admin: always allowed
* Org admin: allowed if resource.organizationId matches
* Provider (org): allowed if resource belongs to org
* Provider (self): allowed if resource.ownerId matches user
* Patient: allowed only on own data

The dashboard must **never assume permissions** without backend confirmation.

---

## Segment 6: Dashboard Navigation Rules (UI Layer)

Navigation is **permission-derived**, not role-based.

| Role Assignment    | Visible Areas                  |
| ------------------ | ------------------------------ |
| admin + platform   | Full system                    |
| sponsor + platform | Metrics, reports               |
| org_admin + org    | Org settings, staff, resources |
| provider + org     | Tasks, patients, schedules     |
| provider + self    | Personal dashboard             |
| patient + self     | Requests, status               |
| viewer + public    | Content only                   |

If a user cannot perform an action, it should:

* Not appear in navigation
* Not be clickable
* Still be enforced server-side

---

## Segment 7: Apple-Style UX Enforcement

The dashboard must follow these UX rules:

* One primary action per screen
* No competing calls-to-action
* Hidden complexity (no raw permission labels)
* Calm, focused layouts

Users should never feel the RBAC system — only clarity.

---

## Segment 8: Non-Negotiable Rules

* Never check permissions using role only
* Never expose organization data across scopes
* Never rely on frontend checks alone
* Never duplicate permission logic in multiple places

---

## Final Summary

iVisit uses a **Role + Scope RBAC model** to support:

* Multi-tenant organizations
* Independent providers
* Secure sponsorship visibility
* Clean, scalable dashboards

This model is production-grade and must be treated as foundational infrastructure.

I’ve created a **segmented, implementation-ready RBAC model document** in the canvas that you can hand directly to anyone working on the **iVisit dashboard**—frontend or backend.

### Why this document works

* **Segmented** → easy to explain in stages (concept → roles → scopes → UI)
* **Authoritative** → reads like a system contract, not a suggestion
* **Implementation-aligned** → maps cleanly to navigation, permissions, and RLS
* **Apple-minded** → hides complexity while enforcing clarity


