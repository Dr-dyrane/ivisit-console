# Doctor Management & Staff Onboarding Plan

## 1. Core Philosophy: "Invite & Unified Identity"
To scale User Management efficiently—without compromising Security or RBAC—we are moving to a **Delegated Invite Model**. This empowers Hospital Admins to manage their own staff while the System ensures data integrity.

*   **Principle**: A "Doctor" is simply a **User** (Identity) who has a **Medical Profile** (Role Extension).
*   **Goal**: Zero friction. Org Admins should not "manage users" and then "manage doctors" separately. They just "Add Staff".

---

## 2. Architecture: The "Provider Extension" Pattern

We will transition the `doctors` table from a standalone directory to a **Profile Extension**.

### Data Model
1.  **Identity (`auth.users` + `public.profiles`)**:
    *   Stores Login creds, Email, Name, Avatar.
    *   **Role**: `provider`.
    *   **Org**: `organization_id` (The Hospital).

2.  **Extension (`public.doctors`)**:
    *   **Foreign Key**: `profile_id` (Links 1:1 to `public.profiles`).
    *   **Metadata**: `specialty`, `license_number`, `bio`, `years_experience`, `rating`.
    *   **Status**: `is_available`, `status` (Busy/On-call).

### Migration Strategy
1.  **Schema Update**: Add `profile_id` (FK to `profiles.id`) to `doctors` table.
2.  **Seeding**: Retroactively create Auth Users for existing seeded doctors and link them (One-time migration).

---

## 3. The "Ideal Flow" (Gold Standard)

This workflow allows an Org Admin to onboard a doctor in **seconds**, entirely from the **Doctors Page**.

### Step 1: "Add Doctor" (Org Admin View)
*   **UI**: Admin clicks "ADD DOCTOR" on the Doctors Page.
*   **Modal**: Opens `DoctorModal` (Apple-style, glassmorphism).
*   **Input**:
    *   **Essential**: Full Name, **Email Address**, Specialty.
    *   **Optional**: Phone, Bio, etc.
*   **Action**: Admin clicks "Send Invite & Add".

### Step 2: System Automation (The "Smart" Link)
*   **Edge Function**:
    1.  **Check**: Does a user with this email exist?
    2.  **Provision**:
        *   Creates `auth.user` (Invite state).
        *   Creates `public.profile` (Role: 'provider', Org: Current Org).
        *   Creates `public.doctors` record (Linked to above Profile, Status: 'Invited').
    3.  **Notify**: Sends formatted Invite Email to the Doctor.
*   **Immediate Feedback**: The Doctor appears in the **Doctors Page** list instantly with a `PENDING` badge.

### Step 3: Doctor Activation
*   **Doctor**: Clicks email link -> Sets Password.
*   **System**: Updates status to `ACTIVE`.
*   **Result**: They can now log in *and* their profile is already live in the patient directory.

---

## 4. Interaction Design (Apple-Style)

We will apply the UI/UX patterns established in `UsersPage` to `DoctorsPage` and `AmbulancesPage`.

### Visuals
*   **Filter Sheet**:
    *   **Smart**: "Specialty" filter only shows relevant medical fields.
    *   **Mobile**: Bottom Drawer with drag handle.
    *   **Interaction**: Hides Global Nav on mobile when open.
*   **Table / List**:
    *   **Sorting**: 3-State Sort headers (Name, Status, Rating).
    *   **Actions**: "More Options" (`...`) dropdown instead of clutter.
    *   **Floating Action Bar**: Multi-select for bulk Availability updates (e.g., "Mark all selected as Off Duty").

### Security & Scope
*   **Org Admins**: Can ONLY invite/view/edit doctors where `hospital_id` matches their own `organization_id`.
*   **Platform Admins**: Can view Global, transfer doctors, and manage Org Assignments.

---

## 5. Implementation Roadmap
1.  **Schema**: Add `profile_id` to `doctors`.
2.  **Migration**: Script to unite current Doctors with Auth Users.
3.  **Service**: Update `doctorsService.createDoctor` to wrap the `inviteUser` Edge Function.
4.  **UI**: Update `DoctorModal` to require Email and trigger the new flow.
