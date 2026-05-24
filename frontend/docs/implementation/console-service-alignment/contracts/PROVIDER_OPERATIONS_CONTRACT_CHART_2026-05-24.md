# Provider Operations Contract Chart - 2026-05-24

## Status

Exact source contract pass completed for ambulance fleet, doctor directory, and staff scheduling surfaces. Static audit only; no operational or database mutation was executed.

## Evidence Scope

- `frontend/src/components/modals/AmbulanceModal.jsx:22-82,239-260,459-665`
- `frontend/src/services/ambulancesService.js:92-224,347-366`
- `frontend/src/components/modals/DoctorModal.jsx:24-75,168-214,315-535`
- `frontend/src/services/doctorsService.js:112-213`
- `frontend/src/components/modals/StaffSchedulingModal.jsx:122-274,485-607`
- `frontend/src/services/staffSchedulingService.js:21-160,276-377`
- `frontend/supabase/migrations/20260219000200_org_structure.sql:249-317`
- `frontend/supabase/migrations/20260219000300_logistics.sql:5-28,361-410`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql:1947-2003`
- `frontend/supabase/migrations/20260219000900_automations.sql:86-151,646-812`

## Ambulance Fleet Contract

`AmbulanceModal` submits `formData` directly to create/update services (`AmbulanceModal.jsx:239-260`). Operational ambulance state matters to app dispatch because emergency automation responds to ambulance status, profile assignment, and current call changes.

| UI field/action | Console service payload | Database/automation receiver | Status | Finding |
| --- | --- | --- | --- | --- |
| `call_sign`, `type`, `vehicle_number`, `hospital_id`, driver/profile assignment | Accepted by create/update payload (`ambulancesService.js:92-179`) | Columns exist on `ambulances` (`logistics.sql:5-28`) | aligned for table capability | Authorization/RLS remains part of database audit, but fields map to columns. |
| Status option `busy` | Modal offers `busy` (`AmbulanceModal.jsx:487-502`); update passes status directly (`ambulancesService.js:139-179`) | Check constraint allows `available`, `dispatched`, `on_trip`, `en_route`, `on_scene`, `returning`, `maintenance`, `offline`, `pending_approval`, not `busy` (`logistics.sql:12-16`) | confirmed drift | Selecting Busy produces a payload prohibited by current schema. |
| `image`, `last_maintenance`, `rating` | Visible/editable in modal (`AmbulanceModal.jsx:34-36,522-655`) | Not in create payload or update whitelist and absent from `ambulances` table (`ambulancesService.js:92-179`; `logistics.sql:5-28`) | confirmed drift | UI accepts values that are not persisted. |
| Driver assignment | Modal form can submit `profile_id`/`driver_id`; service maps driver to `profile_id` (`ambulancesService.js:114-116,160-162,186-204`) | Failover trigger observes removal of `profile_id` for an active call (`automations.sql:646-812`) | drift suspected | Direct reassignment is operationally significant; active-call replacement rules need an intentional UI boundary. |
| Status mutation | Modal update writes table directly; hook also exposes direct status writer (`ambulancesService.js:139-179,347-366`) | Canonical RPC can update status/location/ETA/current call and touch hospital availability (`emergency_logic.sql:1947-2003`); failover trigger still observes direct status changes | drift suspected | Direct UI status mutation reaches failover trigger, but does not use the RPC contract that bundles dispatch telemetry. |
| Location mutation API | Service exposes direct `location` update (`ambulancesService.js:209-224`) | A separate `update_ambulance_location` RPC exists (`logistics.sql:361-410`) | needs read-only receiver proof | No rendered console call site was found in this pass; operational telemetry ownership remains unresolved. |

## Doctor Directory And Invite Contract

`DoctorModal` supports linking an existing provider profile or using manual entry/invite. Manual create starts with `profile_id: ''` (`DoctorModal.jsx:30-42,315-351`) and creates the doctor row before attempting invitation (`:168-208`).

| Flow/field | Console behavior | Trigger/schema behavior | Status | Finding |
| --- | --- | --- | --- | --- |
| Doctor directory fields | `createDoctor()` inserts profile, facility, name, specialty, status, license, email and phone (`doctorsService.js:112-146`) | Columns exist in `doctors` (`org_structure.sql:249-273`) | aligned for raw directory row | Basic field mapping is present. |
| Manual create with invite enabled | Inserts a doctor row first; then invokes provider invitation with `provider_type: 'doctor'` (`DoctorModal.jsx:168-208`) | On a new doctor profile insert/update, `sync_doctor_record_from_profile` upserts a doctor row keyed by `profile_id` (`automations.sql:86-151`) | confirmed drift | A manual doctor row without a profile link can coexist with the new trigger-created profile-linked row after invitation. |
| Linked existing profile | UI states that link bypasses invitation (`DoctorModal.jsx:327-351`) and create includes `profile_id` | Trigger uses `ON CONFLICT (profile_id) DO UPDATE` (`automations.sql:114-140`) | aligned direction; runtime proof pending | Linking first matches trigger ownership better than create-then-invite. |
| Direct doctor update/delete | Service writes or deletes `doctors` directly (`doctorsService.js:151-191`) | Profile trigger can later overwrite name/email/phone/hospital fields for linked doctors (`automations.sql:134-151`) | drift suspected | Edit ownership is split between directory CRUD and profile projection. |

## Staff Scheduling Contract

The database defines `doctor_schedules` with actual date/time/shift rows (`org_structure.sql:275-285`). The modal collects those fields (`StaffSchedulingModal.jsx:485-607`), but the service synthesizes schedules from status and never writes that table.

| UI field/action | Service receiver | Table contract | Status | Finding |
| --- | --- | --- | --- | --- |
| `date`, `start_time`, `end_time`, `shift_type`, `notes` on add | Form submits these fields (`StaffSchedulingModal.jsx:122-185,485-607`) | `createStaffSchedule()` writes only `doctors.status` and `updated_at` (`staffSchedulingService.js:276-312`) | confirmed drift | Successful "scheduled" feedback does not persist the shift date, time, type, or notes. |
| Displayed doctor shifts | Service derives today's fixed `09:00` to `17:00` schedule from every doctor row (`staffSchedulingService.js:79-128`) | `doctor_schedules` rows are not read | confirmed drift | UI renders a projection, not stored scheduling data. |
| Edit/delete shift | Service parses synthetic `doctor_{id}` and toggles doctor status (`staffSchedulingService.js:317-377`) | Does not update or delete `doctor_schedules` | confirmed drift | A user cannot manage actual shifts through this scheduling surface. |
| Ambulance crew schedule | Service derives shifts from `ambulances.crew`, then explicitly refuses crew schedule creation (`staffSchedulingService.js:32-77,299-302`) | No persisted crew scheduling receiver shown | confirmed limitation | UI should not imply ambulance shift CRUD until a data owner exists. |

## Implementation Planning Boundary

| Area | Minimum forward contract before code changes |
| --- | --- |
| Ambulance form | Remove or map unsupported fields and replace invalid status choices; decide whether operational status/location are RPC-only controls. |
| Driver assignment | Define whether direct profile assignment is allowed while a call is active and how failover appears to operators. |
| Doctor create/invite | Make profile identity the creation owner or link the created row deterministically; avoid create-then-trigger duplicate doctor rows. |
| Doctor edits | Define which columns are projected from profile versus owned by the doctor directory. |
| Staff scheduling | Either implement `doctor_schedules` CRUD and render stored rows, or rename/reduce the surface to availability status management. |
