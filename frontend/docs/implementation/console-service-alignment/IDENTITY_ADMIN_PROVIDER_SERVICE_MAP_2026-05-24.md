# Identity Admin Provider Service Map - 2026-05-24

## Status

Second narrowed Stage 2 audit pass. Static source review only.

## Services Reviewed

Console:

- `frontend/src/services/authService.js`
- `frontend/src/services/displayIdService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/adminService.js`
- `frontend/src/services/ambulancesService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/staffSchedulingService.js`
- `frontend/src/services/driverManagementService.js`

App reference:

- `ivisit-app/services/authService.js`
- `ivisit-app/services/displayIdService.js`
- `ivisit-app/services/ambulanceService.js`
- `ivisit-app/services/dispatchService.js`
- `ivisit-app/services/emergencyRequestsService.js`
- `ivisit-app/supabase/tests/scripts/verify_provider_doctor_automation.js`
- `ivisit-app/supabase/tests/scripts/run_console_direct_mutation_surface_report.js`

## Identity And Admin Matrix

| Flow | Console Entry | Read Path | Mutation Owner | App Reference | Status |
| --- | --- | --- | --- | --- | --- |
| Current user profile | `authService.getCurrentUser()` | Supabase session + `profiles`. Also resolves org admin hospitals. | Read-only. | App `authService.getCurrentUser()` formats richer patient/provider user model and caches locally. | Aligned enough for console scoping, but provider fields are thinner. |
| RBAC query scoping | `applyAuthFilter()` | Client-side filters by role/org/provider. | Read-only query shaping. | App tends to rely on service-specific ownership plus RLS. | Useful but must not be treated as security boundary. RLS/RPC is the boundary. |
| Display ID resolution | `displayIdService.getEntityId()` | `get_entity_id` RPC. | Read-only RPC. | App display ID service resolves beautified IDs and validates UUIDs. | Partially aligned; console `getDisplayIds()` only queries hospitals, causing profile/doctor enrichment gaps. |
| Admin profile list with auth | `profilesService.getProfiles(includeAuthData)` | `get_all_auth_users` RPC. | Read-only privileged RPC. | App has auth/profile mapping for current user, not admin auth listing. | Console-owned and appropriate. |
| Profile update | `profilesService.updateProfile()` | Direct self-update or admin RPC. | Self direct table update; other-user `update_profile_by_admin`. | App self-profile update writes own profile directly. | Good split, but payload field coverage needs schema proof. |
| Profile create | `profilesService.createProfile()` | None. | Direct `profiles.insert`. | App creates via Supabase Auth signup and `handle_new_user` trigger/profile sync. | Drift suspected. Creating profile without auth user can orphan identities. |
| BVN/avatar updates | `verifyProfileBVN()`, `updateProfileAvatar()` | None. | Direct `profiles.update`. | App updates self-profile fields directly for current user; BVN has app-specific onboarding effects. | Needs trigger/onboarding proof. |
| Admin suspend/activate/delete/role | `adminService.suspendUser()`, `activateUser()`, `deleteUser()`, `changeUserRole()` | Permission RPCs. | Direct `profiles.update`. | App provider/doctor automation depends on role/provider changes. | Drift suspected. Direct role/provider/status changes may bypass `update_profile_by_admin` and automation expectations. |
| Verification approve/reject | `adminService.approveVerification()`, `rejectVerification()` | Permission RPCs. | Direct `profiles.update`. | App onboarding/profile completion depends on verification and role fields. | Drift suspected; field names must be confirmed against current schema. |
| Invite user | `adminService.inviteUser()` | Supabase session. | Edge Function `invite-user`. | Stage 1 found local invite implementation under `payments/index.ts` naming drift. | Needs deployed function ownership and auth behavior proof. |
| Audit logging | `logAdminAction()` | Current auth user. | Direct `admin_audit_log.insert`. | App has admin audit table tests/docs. | Reasonable, but failures are swallowed; important actions may appear successful without audit row. |

## Provider Operations Matrix

| Flow | Console Entry | Read Path | Mutation Owner | App Reference | Status |
| --- | --- | --- | --- | --- | --- |
| Ambulance list/get | `getAmbulances()`, `getAmbulance()` | `ambulances`, UUID or display ID lookup. | Read-only. | App `ambulanceService.list/getById` maps DB rows into app domain and resolves display IDs. | Mostly aligned read path. |
| Ambulance create/update/delete | `createAmbulance()`, `updateAmbulance()`, `deleteAmbulance()` | None. | Direct `ambulances` CRUD. | App driver flow mostly reads assigned ambulance; emergency assignment uses RPCs. | Drift suspected; direct delete/update can bypass active-request/resource triggers. |
| Driver assignment | `assignDriverToAmbulance()` | None. | Direct `ambulances.profile_id` update. | App auth profile has `assigned_ambulance_id`; automation docs mention provider/doctor sync. | Drift suspected: assignment may need profile mirror or RPC. |
| Ambulance location/status | `updateAmbulanceLocation()`, `updateAmbulanceStatus()` | None. | Direct `ambulances.update`. | App has `update_ambulance_location` RPC and realtime emergency tracking. | Drift suspected; location/status should use canonical RPCs where available. |
| Doctor list/get | `getDoctors()`, `getDoctor()` | `doctors`, joined hospitals. | Read-only. | App provider automation expects doctors sync from profiles and doctor records. | Read path useful; display ID enrichment likely broken because bulk resolver only queries hospitals. |
| Doctor create/update/delete | `createDoctor()`, `updateDoctor()`, `deleteDoctor()` | None. | Direct `doctors` CRUD. | App tests include provider-to-doctor automation verification. | Drift suspected; direct doctor record CRUD can fight profile-trigger automation. |
| Staff schedule | `staffSchedulingService.*` | `doctors`, `ambulances`, `profiles`. | Direct doctor status updates. | App uses availability/status indirectly through emergency and provider flows. | Thin compatibility layer, not true schedule CRUD. |
| Driver assignment dashboard | `driverManagementService.*` | `emergency_requests`, `hospitals`, `profiles`, `ambulances`. | Emergency RPCs for trip status; read-only for assignments. | App active trip query and dispatch service observe request/ambulance state. | Trip status boundary is good; utilization calculations are approximate. |

## Key Findings

### 1. Display ID Bulk Resolver Is Too Narrow

`frontend/src/services/displayIdService.js#getDisplayIds()` queries only `hospitals`. Yet it is used by:

```text
profilesService.getProfiles()
profilesService.getProfilesWithAuthData()
hospitalsService.getHospitals()
doctorsService.getDoctors()
```

That means profile and doctor display ID enrichment can silently return null unless the IDs happen to be hospital IDs.

Audit implication: Stage 2 field maps must require entity-aware display ID lookup, either through table-specific selects or `id_mappings`.

### 2. Profile Creation Can Orphan Auth

`profilesService.createProfile()` inserts directly into `profiles`. App sign-up uses Supabase Auth and trigger-backed profile creation. Direct profile inserts without matching `auth.users` rows can create console-visible users that cannot sign in.

Audit implication: new console user creation should likely go through invite/auth admin flow, not raw profile insert.

### 3. Admin Mutations Partly Bypass Admin RPC

`profilesService.updateProfile()` correctly uses `update_profile_by_admin` for other-user edits, but `adminService` still directly updates `profiles` for suspend, activate, delete, role change, verification approve, and verification reject.

Audit implication: these direct updates need proof against RLS, triggers, provider sync, doctor sync, onboarding status, and audit requirements. Otherwise move behind RPCs.

### 4. Provider/Resource CRUD Is Mostly Direct Table CRUD

Ambulance and doctor services create/update/delete rows directly. App reference suggests:

- profile role/provider changes can trigger doctor record sync
- ambulance assignment and location are app-visible realtime facts
- emergency dispatch/resource sync is trigger/RPC-owned

Audit implication: provider CRUD needs a dedicated ownership decision. Some admin CRUD may remain direct, but active operational fields should be RPC-owned.

### 5. Staff Scheduling Is A Compatibility Projection

`staffSchedulingService` does not use `doctor_schedules` despite that table existing in migrations. It derives schedules from doctor status and ambulance crew arrays.

Audit implication: the UI may look like scheduling but it is really status toggling. Before implementation, decide whether console should manage `doctor_schedules` or keep a lightweight availability/status model.

## Required Field Maps For Next Pass

### Profiles

- `profiles.id`
- `profiles.display_id`
- `profiles.email`
- `profiles.role`
- `profiles.provider_type`
- `profiles.organization_id`
- `profiles.assigned_ambulance_id`
- `profiles.bvn_verified`
- `profiles.onboarding_status`
- verification/status/suspension/delete fields present in code but not yet proven against current type reference

### Ambulances

- `ambulances.id`
- `ambulances.display_id`
- `ambulances.profile_id`
- `ambulances.organization_id`
- `ambulances.hospital_id`
- `ambulances.status`
- `ambulances.location`
- `ambulances.current_call`
- `ambulances.base_price`
- `ambulances.crew`

### Doctors

- `doctors.id`
- `doctors.display_id`
- `doctors.profile_id`
- `doctors.hospital_id`
- `doctors.status`
- `doctors.specialization`
- `doctors.license_number`
- `doctor_schedules.*`
- `emergency_doctor_assignments.*`

## Recommended Implementation Direction, Not Yet Code

- Replace broad `getDisplayIds()` with entity-aware bulk display ID resolution before relying on display IDs in admin/provider UI.
- Treat raw `profiles.insert` as unsafe unless paired with auth admin creation.
- Prefer `update_profile_by_admin` or purpose-built admin RPCs for role/provider/status changes.
- Audit `update_ambulance_location` and `update_ambulance_status` RPCs before keeping direct ambulance status/location writes.
- Decide whether staff scheduling should use `doctor_schedules` or explicitly remain a status-only console surface.

## Next Service Families

1. Visits/medical/insurance service map.
2. Search/content/subscribers/support service map.
3. Full field-to-UI matrices for all drift-suspected services.
