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
*   **Trigger**: "View Details" from "More Options" dropdown.
*   **Action**: Opens `UserModal` (Mode: View).
*   **Mechanism**: Read-only display of `selectedUser` data.
*   **RBAC Logic**: Fields are disabled.

### 4. Delete User (Secure RPC)
*   **Trigger**: "Delete User" from "More Options" dropdown or Bulk Action.
*   **Action**: Calls `delete_user_by_admin` RPC.
*   **Mechanism**: Safely removes user from `auth.users` and cascades to `public.profiles`.
*   **Safeguard**: `ConfirmationModal` with aggressive styling (red/destructive).

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
| **UM-13** | Assign Organization to Org Admin | Platform Admin | Organization dropdown populates and saves correctly. | ✅ Verified |
| **UM-14** | Delete User via RPC | Platform Admin | User is fully removed from Auth and Profiles. UI updates immediately. | ✅ Verified |
| **UM-15** | Mobile Bottom Sheet Navigation | Mobile User | Global Navigation Bar disappears when Filter Sheet (Drawer) opens. | ✅ Verified |

## Recent Fixes & Improvements (Jan 22, 2026)

### 1. Data Integrity & Mapping
*   **RPC Mismatch Resolved**: Fixed issue where `get_all_auth_users` returned `profile_*` prefixed fields. Implemented automatic mapping layer in `profilesService.js`.
*   **Implicit Patients**: Users with `role: null` are correctly counted as "Patients".

### 2. Analytics & KPIs
*   **Accurate Calibration**: "Verified Users" KPI uses `count: 'exact'` from DB.
*   **Global Activity Monitor**: "Recent Activity" shows top 5 sign-ins regardless of filters.

### 3. Stability & Mapping Fixes (Critical)
*   **Organization Mapping**: Fixed `organization_id` missing in `org_admin` profiles by updating `get_all_auth_users` RPC and frontend mapping.
*   **Notification Payload**: Resolved 400 Bad Request on user deletion (removed invalid `action` column).
*   **Deletion Reliability**: Replaced direct table delete with `delete_user_by_admin` secure RPC to ensure `auth.users` cleanup.

### 4. Advanced Interactions (New Feature Set)
*   **Bulk Actions**: Implemented multi-row selection with a "Ghost" style Floating Action Bar (vertical, middle-right).
*   **Sorting**: Added 3-state sorting (Asc/Desc/Reset) to table headers. Added "Joined Date" column.
*   **Action Menu**: Replaced inline buttons with "More Options" dropdown (`MoreHorizontal`) for cleaner UI.

---

## 6. UI/UX & Component Patterns ("Gold Standard")

The changes made to the Users Page and Filter Sheet set the visual and functional standard for all future management pages:

### A. Smart Filter Sheet
*   **Component**: `FilterSheet.jsx`
*   **Context-Aware**: Filters can now depend on other filters (e.g., "Provider Type" only appears when Role="Provider").
*   **Mobile-First**: Transforms into a **Bottom Drawer** on mobile with a drag handle. Stacks inputs vertically for touch targets.
*   **Visuals**: High opacity (`bg-background/95`) with subtle blur (`backdrop-blur-[2px]`).
*   **Interactions**: 
    *   **Inline Search Reset**: 'X' button inside text input clears search instantly.
    *   **Date Shortcuts**: "Today", "7 Days", "30 Days" presented as a button grid below inputs.
    *   **Smart Nav Hiding**: Automatically hides the global `DynamicBottomBar` on mobile to prevent UI conflict.

### B. Table Experience
*   **Sorting**: Click header once (Asc), twice (Desc), thrice (Reset). Use purely client-side logic for speed on <1000 items.
*   **Actions**: Use a `DropdownMenu` for row actions to reduce visual clutter. 
*   **Bulk Actions**: Use a specialized `AnimatePresence` FAB that appears only on selection. Style: `bg-background/15`, `backdrop-blur-sm`, borderless.

### C. Z-Index Management
*   **Hierarchy**:
    *   `DynamicBottomBar`: `z-50`
    *   `FilterSheet Backdrop`: `z-[60]` (Covers Navigation)
    *   `FilterSheet Content`: `z-[70]` (Topmost interaction layer)
