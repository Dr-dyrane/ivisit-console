# User Management & RBAC Documentation

## Overview
This document outlines the User Management flows, Role-Based Access Control (RBAC) rules, and verification steps to ensure stability for both the iVisit Console (SaaS) and the iVisit Patient App.

## Roles & Scopes

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| **Platform Admin** (`admin`) | Global | Full access to all users, organizations, and system settings. Can invite/create any role. |
| **Organization Admin** (`org_admin`) | Organization | Full access ONLY to their assigned Organization. Can invite Providers/Viewers to their Org. Cannot see other Orgs' data. |
| **Provider** (`provider`) | Organization | Limited access to patients/visits within their Organization. |
| **Sponsor** (`sponsor`) | Organization (limited) | View-only or Billing-only access for an Organization (e.g., HMOs). |
| **Viewer** (`viewer`) | Organization | Read-only access to Organization data. |
| **Patient** (`patient`) | Self | Access ONLY to their own profile and medical records (via iVisit Patient App). |

---

## User Management Flows

### 1. Invite User (Secure Flow)
*   **Trigger**: "INVITE USER" button on Users Panel.
*   **Action**: Opens `InviteUserModal`.
*   **Mechanism**: Calls Supabase Edge Function `invite-user`.
*   **RBAC Logic**:
    *   **Platform Admin**: Can select *Target Organization* manually. Can invite any role.
    *   **Org Admin**: *Target Organization* is automatically locked to their own `org_id`. Can invite `provider`, `viewer`. Cannot invite `admin` or other `org_admin`.

### 2. Update User
*   **Trigger**: "EDIT" button on User Card/List/Table.
*   **Action**: Opens `UserModal` (Mode: Edit).
*   **Mechanism**: Calls `profilesService.updateProfile`.
*   **RBAC Logic**:
    *   **Platform Admin**: Can edit any user's details, role, and organization.
    *   **Org Admin**: Can only edit users within their Organization. Cannot change a user's Organization.

### 3. View User
*   **Trigger**: "VIEW" button or "Eye" icon.
*   **Action**: Opens `UserModal` (Mode: View).
*   **Mechanism**: Read-only display of `selectedUser` data.
*   **RBAC Logic**: Fields are disabled.

### 4. Delete User
*   **Trigger**: "DELETE" button (Admin only).
*   **Action**: Deletes profile and auth user (via cascade or separate call).
*   **Safeguard**: Confirmation prompt (UI dependent) or direct action with Toast.

---

## Compatibility: iVisit Patient App
**Critical**: The `profiles` table is shared.
*   **Constraint**: Do NOT rename or delete core columns used by the mobile app: `id`, `email`, `first_name`, `last_name`, `image_uri`.
*   **Validation**:
    *   `profilesService.updateProfile` now uses a whitelist of allowed fields.
    *   `patient` role is preserved in role enums.
    *   `bvn_verified` flag logic is maintained.

## Functional Test Cases

| ID | Test Case | Actor | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UM-01** | Invite Provider to specific Hospital | Platform Admin | Email sent, link contains `org_id` metadata. | ✅ Implemented |
| **UM-02** | Invite Provider to OWN Hospital | Org Admin | Email sent, `org_id` auto-injected from session. | ✅ Implemented |
| **UM-03** | Edit Patient Details | Platform Admin | Changes saved to DB. Mobile app reflects changes immediately. | ✅ Implemented |
| **UM-04** | Prevent Org Admin from seeing Global Users | Org Admin | `getProfiles` query filters by `organization_id`. | ✅ Implemented |
| **UM-05** | Manual "Create" Attempt | Any | Error thrown: "Use Invite Flow". Prevents insecure creation. | ✅ Implemented |
| **UM-06** | View Patient Profile | Any Admin | Read-only view of patient data. | ✅ Implemented |
| **UM-07** | Filter by Role (Multi-select) | Any Admin | Table updates correctly. KPI cards reflect filtered subset. | ✅ Verified |
| **UM-08** | Verify "Admins" KPI Count | Platform Admin | Shows sum of Admins + Org Admins. | ✅ Verified |
| **UM-09** | Verify "Identity Verified" Count | Any Admin | Shows exact count of `bvn_verified=true` users. | ✅ Verified |
| **UM-10** | Global Recent Activity | Any Admin | Recent Activity list shows latest sign-ins across App, ignoring local filters. | ✅ Verified |
| **UM-11** | Org Admin Statistics | Org Admin | "Role Distribution" correctly shows local Org stats (including implicit patients). | ✅ Verified |
| **UM-12** | RPC Data Mapping | Platform Admin | `profile_role` from RPC maps correctly to `role` in UI. | ✅ Verified |

## Recent Fixes & Improvements (Jan 22, 2026)
### 1. Data Integrity & Mapping
*   **RPC Mismatch Resolved**: Fixed issue where `get_all_auth_users` returned `profile_*` prefixed fields (e.g., `profile_role`, `profile_username`, `profile_bvn_verified`) which mismatched UI expectations (`role`, `username`, `bvn_verified`). Implemented an automatic mapping layer in `profilesService.js` to normalize these fields before they reach the UI components.
*   **Implicit Patients**: Users with `role: null` are now correctly counted as "Patients" in Role Distribution statistics for both Platform and Organization Admins.

### 2. Analytics & KPIs
*   **Accurate Calibration**: "Verified Users" KPI now fetches a precise count directly from the database (`count: 'exact'`), bypassing potential pagination or RPC limitations.
*   **Global Activity Monitor**: "Recent Activity" panels (Sidebar & Modal) now fetch the top 5 most recent sign-ins app-wide, ensuring visibility regardless of current page filters.
*   **Org Admin Autonomy**: Implemented client-side statistics derivation for Organization Admins, ensuring they see accurate Role Distribution and Verification counts scoped to their loaded users (up to 1000).

### 3. UI/UX Enhancements
*   **Smart Filtering**: Fixed pagination crash (`setCurrentPage` error) when changing filters. Filters now support multi-select arrays (e.g., "Admin" filter showing both Platform and Org Admins).
*   **Invite Centricity**: "Add User" actions now correctly default to the secure `InviteUserModal` flow.
