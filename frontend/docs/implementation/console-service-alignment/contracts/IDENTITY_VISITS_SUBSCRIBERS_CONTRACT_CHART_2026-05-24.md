# Identity, Visits, and Subscribers Contract Chart - 2026-05-24

## Status

Exact source contract pass completed for identity, medical history, and subscriber lifecycle drift candidates. No database or Edge Function write was invoked.

## Evidence Scope

Console:

- `frontend/src/components/modals/UserModal.jsx:92-140,210-404`
- `frontend/src/components/modals/InviteUserModal.jsx:17-65,145-187`
- `frontend/src/components/pages/UsersPage.jsx:275-300`
- `frontend/src/components/modals/VisitModal.jsx:105-120,219-470`
- `frontend/src/components/pages/VisitsPage.jsx:425-480`
- `frontend/src/components/pages/SubscriptionManagementPage.jsx:286-299`
- `frontend/src/services/displayIdService.js:62-110`
- `frontend/src/services/profilesService.js:268-395`
- `frontend/src/services/adminService.js:264-396,481-547`
- `frontend/src/services/visitsService.js:13-109,244-385`
- `frontend/src/services/subscriptionService.js:11-75,165-313,407-491`
- `frontend/src/services/subscribersService.js`
- `frontend/supabase/functions/payments/index.ts:22-104`
- `frontend/supabase/functions/payments/sendWelcome/index.ts`
- `frontend/supabase/functions/payments/process-subscribers/index.ts`
- `frontend/supabase/functions/webhooks/index.ts`

SQL and app reference:

- `frontend/supabase/migrations/20260219010000_core_rpcs.sql:465-519`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/visitsService.js:685-715`

## Profile Edit Contract

The user modal validates and submits editable identity/access fields (`UserModal.jsx:95-140,210-404`). Existing-user edits call `profilesService.updateProfile()` (`UsersPage.jsx:275-280`).

| UI field | Service acceptance | Admin RPC receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| `full_name` | Whitelisted (`profilesService.js:321-362`) | Updated (`core_rpcs.sql:478-480`) | aligned | Existing-user admin edit persists this field. |
| `username`, `phone` | Whitelisted | Updated with empty-to-null handling (`core_rpcs.sql:481-486`) | aligned | Null semantics are explicit. |
| `role`, `organization_id`, `provider_type` | Whitelisted; provider consistency enforced (`profilesService.js:364-367`) | Updated (`core_rpcs.sql:487-497`) | aligned with policy review pending | RPC accepts role/org changes for authorized console actors. |
| `bvn_verified`, `address`, `gender`, `date_of_birth` | Whitelisted | Updated (`core_rpcs.sql:498-513`) | aligned | Fields reach SQL receiver. |
| `email` | Editable in modal (`UserModal.jsx:238-252`) and whitelisted (`profilesService.js:322-326`) | Not present in `update_profile_by_admin` update columns (`core_rpcs.sql:478-514`) | confirmed drift | UI accepts an admin email edit that the RPC silently discards. |
| `first_name`, `last_name`, `image_uri` / `avatar_url` | Service accepts these fields (`profilesService.js:322-340`) | Not present in the admin RPC update columns | confirmed drift | Service contract advertises fields that cannot persist for an admin editing another user. |

### Role, Organization, And Provider-Type Field Shape

| UI field/action | Service/receiver behavior | Status | Finding |
| --- | --- | --- | --- |
| Organization select for providers/org admins | Admin modal loads hospitals and maps each option to `hospital.organization_id` (`UserModal.jsx:75-84,317-339`). | drift suspected | The label is a facility name, but the submitted value is an organization UUID. Multi-hospital organizations can appear as duplicate organization choices with facility names, and organizations with no visible hospital are not selectable. |
| Org-admin default organization | Modal defaults `organization_id` to the signed-in org admin's `orgId` for create/edit state (`UserModal.jsx:45,63-66`). | aligned direction | Default scoping is useful, but it depends on `orgId` being an organization UUID, not a hospital UUID from onboarding drift. |
| Provider type selector | UI offers `ambulance`, `doctor`, `nurse`, `paramedic` (`UserModal.jsx:354-357`). Profile check allows `hospital`, `ambulance_service`, `ambulance`, `doctor`, `driver`, `paramedic`, `pharmacy`, `clinic` (`identity.sql:27`). | confirmed UI/enum drift | `nurse` is not allowed by current profile enum, while `driver` is allowed and required by the operations-map driver mode but cannot be selected here. |
| Driver readiness | Ambulance assignment writes `ambulances.profile_id`, while driver availability checks `profiles.assigned_ambulance_id` in `getAvailableDrivers()` (`ambulancesService.js:186-204,270-283`). | confirmed identity drift | A user can be assigned as an ambulance driver without their profile readiness field changing, unless another trigger/RPC updates it. |
| Onboarding completion trigger | `recalculate_onboarding_status` completes onboarding when `role` plus `organization_id`, `assigned_ambulance_id`, admin role, BVN, or Stripe customer exists (`identity.sql:226-272`). | trigger-sensitive | Role/org/driver edits are not just labels; they can change onboarding status and console access readiness. |

### Create And Alternate Admin Mutation Paths

| Action | UI/service boundary | Mutation boundary | Status | Finding |
| --- | --- | --- | --- | --- |
| Create profile | Users page refuses create unless `formData.id` already exists (`UsersPage.jsx:281-287`) | `createProfile()` directly inserts a `profiles` row (`profilesService.js:268-306`) | drift suspected | Guard reduces orphan risk, but the supported origin and validation of the supplied auth UUID still need proof. |
| Suspend, activate, soft-delete, change role | `adminService.js:264-396` | Direct `profiles.update(...)` | drift suspected | These operations do not share the audited `update_profile_by_admin` receiver or one consolidated mutation contract. |
| Approve/reject verification | `adminService.js:481-547` | Direct `profiles.update(...)` with reviewer/time columns | drift suspected | Verification mutation ownership is separate from profile edit and needs policy/trigger comparison. |
| User modal rendering | `UsersPage` renders `UserModal` once inside the main modal block and again near the page footer (`UsersPage.jsx:693-700,1255-1262`). | UI architecture drift | A single modal state can mount duplicate modal instances. This increases the chance of double form state, duplicate submit paths, and confusing focus/overlay behavior. |
| Admin verification/status columns | `adminService` writes `verification_status`, `verified_at`, `verified_by`, `rejection_reason`, `rejected_at`, `rejected_by`, `suspension_reason`, `suspended_at`, and `deleted_at` (`adminService.js:264-396,481-547`). | exposed stale API | Current identity table source declares `onboarding_status` and core profile fields, but not those verification/suspension/delete columns. These methods should not be treated as current receivers without live column proof. |

## Invite User Contract

The invite modal appears to be the intended way to create org-scoped console access without manually inserting profile rows. Its current data path is not aligned with the profile trigger or organization identity model.

| UI/action | Console/Edge behavior | Database/app receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Org-admin invite | Org admins can open the modal and send invites; the client adds `metadata.organization_id = orgId` for their org (`InviteUserModal.jsx:39-48`). | Edge Function checks the caller profile and rejects any authenticated caller whose role is not `admin` (`payments/index.ts:34-56`). | confirmed authorization drift | Org-admin UI can present an invite action that the Edge receiver rejects. If the request lacks auth, the function logs a warning and proceeds, which is a separate security concern. |
| Platform-admin organization picker | For org-scoped roles, the modal loads hospitals and sends the selected `hospital.id` as `metadata.organization_id` (`InviteUserModal.jsx:17-32,47-50,176-184`). | `profiles.organization_id` must reference `organizations.id` (`org_structure.sql:317`). | confirmed identity drift | Admin invites can package a hospital UUID into a metadata field named organization ID. This repeats the hospital-vs-organization drift found in onboarding. |
| Invite email result | The function generates a Supabase invite link and returns it; the email-sending block is commented out (`payments/index.ts:74-104`). | UI toast says `Invitation sent to ${email}` (`InviteUserModal.jsx:58-60`). | confirmed user-feedback drift | Unless another deployed function wraps this code, the user sees "sent" even though no email is sent by this source path. |
| Profile organization assignment | Invite metadata includes role and extra metadata (`payments/index.ts:74-83`). | `handle_new_user()` creates `profiles` with email, phone, username, full name, avatars, role, and pending onboarding, but does not insert `organization_id` or `provider_type` from auth metadata (`automations.sql:5-48`). | confirmed missing linkage | Invited org-admin/provider users can accept an invite and receive role metadata without organization scope, breaking org-admin data visibility and provider readiness. |
| Provider type | Invite modal only selects role, not provider type (`InviteUserModal.jsx:145-163`). | Provider workflows depend on `profiles.provider_type` for doctors, drivers, ambulance services, and provider display IDs (`identity.sql:28-31,289-300`). | missing capability | Inviting a provider does not establish whether the provider is a doctor, driver, paramedic, ambulance service, clinic, or hospital provider. |

## Display ID Resolution Contract

| Consumer type | Call evidence | Resolver receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| Profiles | `profilesService.js:83-85,221-223` passes profile IDs to `getDisplayIds()` | Resolver queries only `hospitals.id, display_id` (`displayIdService.js:85-109`) | confirmed drift | Profile display IDs cannot be resolved by this bulk path unless a UUID accidentally identifies a hospital row. |
| Doctors/providers | `doctorsService.js:72-74` passes profile IDs | Same hospitals-only resolver | confirmed drift | Provider identity labels are mapped through the wrong table. |
| Verification | `verificationService.js:81-83` passes profile IDs | Same hospitals-only resolver | confirmed drift | Verification UI can lose the intended human-readable identity. |
| Hospital/org consumers | `hospitalsService.js:212-214`, `orgVerificationService.js:80` | Hospitals-only resolver | needs field-owner confirmation | Organization ID versus hospital ID input must be established before declaring this path aligned. |

## Visit Field And Ownership Contract

The console visit modal collects a broad medical/history form. `visitsService.buildVisitWritePayload()` maps accepted fields and aliases directly into the `visits` table (`visitsService.js:13-109,244-385`).

| UI field/group | Console write mapping | App ownership signal | Status | Finding |
| --- | --- | --- | --- | --- |
| Patient and facility (`user_id`, `hospital_id`) | Modal fields (`VisitModal.jsx:225-309`) flow through direct insert/update | App resolves both visit rows and emergency-request keys | aligned for administrative non-emergency visits only | These keys are structurally supported, but emergency ownership matters below. |
| Type/status/date (`visit_type`, `status`, `date`) | Aliases `visit_type -> type`; direct CRUD (`visitsService.js:80-109,244-385`) | App identifies request-derived visits separately | drift suspected | Console allows `emergency` type and lifecycle edits without distinguishing DB-synced emergency visits. |
| Logistics/clinical fields (`room_number`, `estimated_duration`, `cost`, `insurance_covered`, `preparation`, `notes`) | Modal fields (`VisitModal.jsx:389-470`) are accepted in direct write set (`visitsService.js:16-68`) | App hydrates emergency/hospital context | aligned for table capability; ownership pending | Field existence is supported, but authority for request-derived rows must be constrained. |
| New/delete visit actions | Page creates and deletes directly (`VisitsPage.jsx:425-480`) | App rule: "Never invent visit rows from emergency request keys; DB sync owns those rows" (`ivisit-app/services/visitsService.js:699-714`) | confirmed cross-surface drift | Console has no visible boundary preventing manual creation/deletion of a visit that belongs to emergency synchronization. |

## Visit Field-To-UI And Payload Contract

This is the exact receiver map for the current visit surface. It shows where the table supports a field, where the UI projects it, and where emergency/app ownership changes the allowed implementation.

| Field or action | UI receiver | Console payload/write path | App/SQL ownership signal | Status | Implementation target |
| --- | --- | --- | --- | --- | --- |
| `id` / `display_id` | Table/list/mobile render `visit.id?.slice(...)`; display ID is not preferred in visible rows (`VisitTableView.jsx:115-118`; `VisitListView.jsx:53-55`; `MobileVisits.jsx` expanded row). | `getVisit()` accepts UUID or display ID, but list rows read `*` directly and render UUID slices (`visitsService.js:199-239`; `VisitsPage.jsx:155-173`). | `visits.display_id` is stamped by trigger; app maps both `displayId` and UUID. | display drift | Render display ID when present, mutate by UUID. Do not use UUID slices as the operator-facing visit identity except as fallback. |
| `request_id` | Emergency detail/list/table call `getVisitByRequestId(req.id)`; VisitsPage hydrates emergency by `visit.request_id || visit.id` (`EmergencyDetailsModal.jsx:87-99`; `EmergencyRequestListView.jsx:129`; `VisitsPage.jsx:184-203,252-277`). | Service first reads `visits.request_id = requestId`, then falls back to `getVisit(requestId)` (`visitsService.js:247-282`). | `create_emergency_v4` creates visit with `request_id = v_request_id`; cash approval/decline update visits by `request_id` (`emergency_logic.sql:579-593`; `core_rpcs.sql:2775-2778,2947-2950`). | mostly aligned lookup; fallback risk | Keep `getVisitByRequestId()` as the only emergency-to-clinical lookup. Remove page fallbacks that treat `visit.id` as an emergency request key unless a migration explicitly proves that legacy shape. |
| `hospital_id` | Modal facility select writes `hospital_id`; org-admin create prefill sets `hospital_id = orgId` when no visit exists (`VisitModal.jsx:82-84,263-309`). | `buildVisitWritePayload()` writes `hospital_id` directly (`visitsService.js:67-83`). | `visits.hospital_id` FK points to `hospitals.id`; org identity is separate. | confirmed ID-boundary drift | Org-admin create must resolve an actual hospital UUID before writing `hospital_id`. Do not place `profiles.organization_id` / `organizations.id` into visit hospital fields. |
| `date` / `time` | Modal date input is populated by `formatVisitDateTime(visit)` and saved as `date`; list/table sort/render use `date || created_at` (`VisitModal.jsx:55-63,347-358`; `VisitTableView.jsx:198-200`). | `visit_type -> type`, `visit_date -> date`; no `time` derivation on save except direct input if present (`visitsService.js:70-109`). | SQL visit rows store `date` and `time` as text; app maps date/time without making `created_at` the primary scheduled time. | drift suspected | Date formatting should prefer scheduled `date`/`time`; `created_at` is a creation timestamp fallback, not the appointment time. |
| `status` | KPI filters and badges use `scheduled`, `in_progress`, `completed`, `cancelled`; modal also offers `upcoming` (`VisitsPage.jsx:125-128,519-532`; `VisitModal.jsx:363-379`). | Direct service updates write the selected status to `visits.status`; completion/cancel/no-show write direct terminal statuses (`visitsService.js:351-425`). | `create_emergency_v4` inserts emergency visits as `pending`; cash approval updates visit to `active`; decline updates to `cancelled` (`emergency_logic.sql:584`; `core_rpcs.sql:2775-2778,2947-2950`). | vocabulary drift | Normalize visit status vocabulary before rendering and writing. Emergency-owned rows should display lifecycle state from emergency/payment receivers, not allow arbitrary modal status edits. |
| `type` / `visit_type` | Modal includes mixed values (`checkup`, `Regular Checkup`, `emergency`, `Bed Booking`, `Ambulance Ride`); page derives type from emergency `service_type` when empty (`VisitModal.jsx:325-341`; `VisitsPage.jsx:273-277`). | Service aliases `visit_type -> type` (`visitsService.js:70-83`). | App maps request-derived visits and service types separately. | display/write drift | Define a canonical visit type enum or mapper. App service types (`ambulance`, `bed`) should not be mixed with marketing labels in write payloads. |
| `summary` / `prescriptions` | Emergency detail renders clinical outcome summary/prescriptions when terminal visit is found (`EmergencyDetailsModal.jsx:446-464`). Visit modal does not expose summary/prescriptions directly in the visible form. | `completeVisit()` writes `summary` and `prescriptions`, but the main modal save path writes `notes`/`preparation` instead (`visitsService.js:351-385`; `VisitModal.jsx:429-470`). | `visits` table has `summary TEXT` and `prescriptions TEXT[]`; no separate authorized console clinical-completion workflow is proven here. | missing authorized UI receiver | Render request-derived clinical completion fields read-only from provider/app-created records. Do not expose console editing of summary/prescriptions until an authorized clinical completion receiver is explicitly established. |
| `patient` / `hospital` / `doctor` context | Page manually joins profiles, emergency requests, doctors, hospitals; modal also calls `fetchVisitContext()` and `fetchEmergencyContext()` (`VisitsPage.jsx:184-277`; `visitContextUtils.js:13-98`). | `getVisits()` service already joins profiles and normalizes some aliases, but page bypasses it for its primary list (`visitsService.js:116-194`; `VisitsPage.jsx:155-173`). | App visits service centralizes row hydration and fallback hospital/request context. | mixed L2 owner | Move visit hydration/count/search into one service/read model. Page should not own multi-table projection logic. |
| Delete visit | Page deletes by `visit.id` and then creates a "cancelled" notification (`VisitsPage.jsx:444-480`). | `deleteVisit()` directly deletes the row (`visitsService.js:335-349`). | Emergency-linked visits are created/synced by emergency lifecycle. | high-risk direct mutation | Disable delete for `request_id` rows unless a backend-owned maintenance action exists. A delete action must not masquerade as cancellation for emergency-owned clinical history. |

### Visit Implementation Boundary

The eventual implementation pass needs two explicit modes:

| Mode | Allowed owner |
| --- | --- |
| Administrative scheduled/clinical visit CRUD | Console visit service, with exact allowed statuses and fields. |
| Emergency-derived visit lifecycle | Database sync/emergency lifecycle owner; console reads and actions must not independently create/delete the correlated history row. |

## Subscriber Lifecycle Contract

`SubscriptionManagementPage` saves through create/update subscriber actions (`SubscriptionManagementPage.jsx:286-299`). The primary subscription service accepts fields and retries writes by deleting columns reported missing by the schema (`subscriptionService.js:11-75`).

| UI/service field or action | Mutation receiver | Status | Finding |
| --- | --- | --- | --- |
| `email`, `type`, `status`, `new_user`, `welcome_email_sent`, `subscription_date` | Direct `subscribers` insert/update (`subscriptionService.js:11-45,165-313`) | drift suspected | Write shape is runtime-degraded by missing-column retries instead of pinned to current schema truth. |
| Create subscriber | Direct insert followed by fire-and-forget `sendWelcomeEmail()` (`subscriptionService.js:165-194,407-491`) | drift suspected | Record creation and email lifecycle are not one observable, retry-safe console operation. |
| Mark welcome sent | Direct update through service (`subscriptionService.js:289-313`) | multiple writers confirmed | The same lifecycle flags can also be changed outside this service. |
| Alternate CRUD service | `subscribersService.js` separately writes the same table | multiple writers confirmed | There are two console service ownership surfaces for one table. |
| Email/automation functions | `sendWelcome`, `process-subscribers`, and `webhooks` each update `subscribers` state | multiple writers confirmed | Welcome status and new-user flags lack one documented writer/idempotency contract. |

## Findings Requiring Implementation Planning

| Priority | Confirmed or suspected contract defect | Required next proof before coding |
| --- | --- | --- |
| High | Admin profile UI/service accepts email and image/name component edits that `update_profile_by_admin` does not persist. | Compare live schema and intended auth/profile ownership read-only; select authoritative admin mutation contract. |
| High | Display ID bulk resolver sends profile/provider IDs to a hospitals-only query. | Establish per-entity display ID owners and every rendered consumer. |
| High | Invite user flow does not actually email from the visible function source and does not persist organization/provider metadata into profiles. | Verify deployed slug ownership, then align invite metadata, profile trigger fields, and org-scoped UI. |
| High | Console direct visit CRUD does not separate administrative visits from emergency-synced visit rows. | Map request/visit triggers and console UI eligibility rules against app lifecycle. |
| Medium | Subscriber flags are written by duplicate services and several Edge Functions with compatibility fallbacks. | Inventory current deployed function ownership/read-only schema, then appoint one lifecycle contract. |
