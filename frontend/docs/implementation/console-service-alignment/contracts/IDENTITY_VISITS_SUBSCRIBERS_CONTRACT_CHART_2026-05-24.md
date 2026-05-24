# Identity, Visits, and Subscribers Contract Chart - 2026-05-24

## Status

Exact source contract pass completed for identity, medical history, and subscriber lifecycle drift candidates. No database or Edge Function write was invoked.

## Evidence Scope

Console:

- `frontend/src/components/modals/UserModal.jsx:92-140,210-404`
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

### Create And Alternate Admin Mutation Paths

| Action | UI/service boundary | Mutation boundary | Status | Finding |
| --- | --- | --- | --- | --- |
| Create profile | Users page refuses create unless `formData.id` already exists (`UsersPage.jsx:281-287`) | `createProfile()` directly inserts a `profiles` row (`profilesService.js:268-306`) | drift suspected | Guard reduces orphan risk, but the supported origin and validation of the supplied auth UUID still need proof. |
| Suspend, activate, soft-delete, change role | `adminService.js:264-396` | Direct `profiles.update(...)` | drift suspected | These operations do not share the audited `update_profile_by_admin` receiver or one consolidated mutation contract. |
| Approve/reject verification | `adminService.js:481-547` | Direct `profiles.update(...)` with reviewer/time columns | drift suspected | Verification mutation ownership is separate from profile edit and needs policy/trigger comparison. |

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
| High | Console direct visit CRUD does not separate administrative visits from emergency-synced visit rows. | Map request/visit triggers and console UI eligibility rules against app lifecycle. |
| Medium | Subscriber flags are written by duplicate services and several Edge Functions with compatibility fallbacks. | Inventory current deployed function ownership/read-only schema, then appoint one lifecycle contract. |
