# Pass 5 Provider Operations, Telemetry, And Scheduling Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, storage, telemetry publish, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers ambulance CRUD, driver assignment, responder telemetry, doctor profile/availability, table-backed doctor scheduling, emergency clinician-assignment integration, map projections, and provider media uploads.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/AmbulancesPage.jsx`
- `frontend/src/components/modals/AmbulanceModal.jsx`
- `frontend/src/components/pages/DoctorsPage.jsx`
- `frontend/src/components/modals/DoctorModal.jsx`
- `frontend/src/components/modals/StaffSchedulingModal.jsx`
- `frontend/src/components/pages/GodModeMap.jsx`
- `frontend/src/services/ambulancesService.js`
- `frontend/src/services/driverManagementService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/staffSchedulingService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/supabaseMapService.js`
- `frontend/src/services/storageService.js`
- Shared receivers `doctor_schedules` and `emergency_doctor_assignments`, including organization-scoped management policy and assignment RPC evidence.

Observed source signals:

- `GodModeMap` projects emergency requests, ambulances, hospitals, responder locations, telemetry freshness, and driver status actions.
- The shared `/map` primary action dispatches `centerMap`, and `MapPanel` dispatches `recenter-map-target`, while `MapContext` and the mounted map refiners receive `recenter-map`; neither visible centering command is connected to a proved mounted receiver.
- Ambulance and privileged doctor lists fetch at most `1000` rows, then sort/page locally and publish fetched length as total, silently truncating larger operational registries.
- `supabaseMapService` caps emergency map seed rows at `100` but loads ambulance and hospital seeds without comparable feed-window semantics, so operational map completeness is neither bounded consistently nor surfaced to operators.
- Driver map actions call `updateResponderLocation` and `driverManagementService.updateTripStatus`.
- `AmbulanceModal` uploads images, selects drivers, checks existing assignments directly, and shows active assignment controls.
- `StaffSchedulingModal` collects real doctor shift fields but `staffSchedulingService` never reads or writes `doctor_schedules`; it derives fixed same-day shifts from doctor and ambulance statuses.
- `emergency_doctor_assignments` has a shared receiver/RPC boundary while Console has no persisted clinician handoff surface.

## User Flow

Operator/provider path:

1. Manage ambulances and vehicle readiness.
2. Assign or change driver/profile linkage.
3. Manage doctors and clinician availability.
4. Schedule staff shifts and detect conflicts.
5. Open map and see responders, patients, hospitals, and active trips.
6. Driver/provider publishes location and trip status.
7. Console reflects telemetry freshness without implying fake tracking readiness.
8. Assign and observe emergency clinician handoff through persisted assignment truth where the emergency workflow requires it.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Ambulance CRUD | Page/hook/modal/service own overlapping read/write paths. | Ambulance operations facade. |
| Driver assignment | Modal local filtering plus service actions. | Assignment owner with profile/driver/ambulance relationship truth. |
| Provider images | Ambulance/doctor modals use storage directly. | Media owner shared with Pass 3/7. |
| Map telemetry | GodModeMap derives telemetry and writes responder location. | Telemetry projection/command owner tied to active request truth. |
| Map centering actions | Shared primary action and target-selection panel emit event names not consumed by mounted map implementations. | Single map command API/event shared by map controls and the rendered map receiver, with explicit target support where needed. |
| Fleet and clinician pagination | Client-capped list retrieval is presented as complete paginated management data. | Server-backed filter/sort/page/count owner with truthful scoped totals. |
| Map feed completeness | Mixed bounded/unbounded initial map queries provide no operator-visible coverage contract. | Explicit active/viewport feed bounds, refresh/invalidation ownership and incomplete-data state. |
| Driver trip status | Map and modal can call driver management actions. | Trip lifecycle command owner. |
| Doctor profile | Doctor record and profile linkage can drift. | Doctor/provider read and mutation owner. |
| Scheduling | Derived doctor/crew rows and status toggles bypass the real `doctor_schedules` receiver. | Stored doctor-shift owner; ambulance shift CRUD excluded without a receiver. |
| Clinician assignment | Emergency/doctor context can render without a persisted assignment action/status. | Cross-pass assignment owner using `emergency_doctor_assignments` with Pass 1. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View/manage non-active fleet records | Authorized table CRUD after field repair | `ambulances` scoped policy | Use real hospital/org fields and valid status vocabulary. |
| Dispatch/trip/responder telemetry for active emergency | Workflow command | Request-coupled dispatch/telemetry receivers | Direct fleet status/location editing cannot stand in for active-trip truth. |
| Center operational map or selected request | UI command over rendered map state | Mounted map controller/refiner | Use the receiving map-control contract and verify the user sees immediate map movement or bounded feedback for both general and targeted centering. |
| Manage doctor directory fields | Authorized table CRUD with projection boundary | `doctors`, profile sync automation | Separate directory-owned from profile-projected identity fields. |
| Manage doctor shifts/conflicts/statistics | Authorized table CRUD | `doctor_schedules` | Replace generated/status-derived shifts with stored rows. |
| Assign doctor to emergency | Workflow command | `assign_doctor_to_emergency`, `emergency_doctor_assignments` | Coordinate with Pass 1 and persist handoff truth. |
| Upload provider/vehicle imagery | Scoped media/storage boundary | Doctor image field and Pass 3 media/storage authority | Do not upload ambulance media without row receiver; hospital provenance belongs to Pass 3. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Fleet identity and status | ambulance `hospital_id`, `organization_id`, driver/profile assignment, valid status, location/current call, license plate/vehicle/call-sign display | Join actual facility identity and use valid enum states; active request state cannot be edited as ordinary fleet CRUD. |
| Telemetry and clinician handoff | request/responder/ambulance identity, location/heading/ETA, assignment request/doctor/status/notes | Active telemetry and emergency doctor assignment remain request-coupled commands with refreshed projection truth. |
| Doctor schedule truth | doctor/profile/hospital specialty/license/status; schedule doctor/date/start/end/type/availability | Implement shift UI on stored `doctor_schedules`, not doctor status or generated rows; keep operational availability distinct. |

Generated trace confirmation (May 25): `doctor_schedules` and `emergency_doctor_assignments` now have cross-repo baseline traces and report zero matched Console CRUD surfaces. The scheduling modal's current status-derived behavior is not table-backed shift ownership, and clinician assignment must be added through the persisted command/projection boundary coordinated with Pass 1.

Storage evidence confirmation (May 25): current source provides no active `images` bucket-policy authority outside archive material. Doctor image persistence remains conditional on deployed Storage proof; ambulance image upload remains disabled in scope because no audited row receiver owns the uploaded object.

## Implementation Packages

### 1. Provider Operations Facades

Create or refine facades for:

- ambulances
- drivers/assignments
- doctors/providers
- schedules
- telemetry/map projection

Acceptance gate:

- Pages and modals do not own independent counts, assignment filters, or active assignment lookups.

### 2. Ambulance And Driver Assignment

Define:

- ambulance `profile_id` versus `driver_id`
- provider role/type requirements
- one-driver-to-one-active-ambulance constraints
- hospital/organization assignment inheritance
- active trip constraints before reassignment

Acceptance gate:

- UI cannot assign a driver who is already actively assigned unless the backend receiver permits and explains transfer semantics.

### 3. Telemetry And Trip Status

Telemetry must be active-request-coupled:

- location publish requires active assigned emergency
- stale/lost/fresh labels derive from backend timestamps and responder location presence
- status transitions use legal emergency/trip lifecycle states
- fallback map locations are visually degraded or omitted

Acceptance gate:

- Map never implies tracking-ready unless request identity, responder identity, patient/pickup location, route/ETA seed, and active lifecycle state are present.

### 4. Doctor And Provider Readiness

Define doctor/provider truth:

- profile linkage
- specialization/licensure fields
- availability/status
- hospital/organization affiliation
- verification requirement
- schedule relation

Acceptance gate:

- Doctor availability and verification copy does not imply clinical readiness from incomplete profile data.

### 5. Staff Scheduling Scope

Implement doctor shifts only through `doctor_schedules`:

- read stored doctor shifts rather than deriving same-day rows
- create/update/delete persisted shift rows through organization-authorized scope
- detect conflicts from stored time overlap
- calculate shift statistics from stored shifts
- keep doctor availability/status separate from shift persistence
- remove ambulance crew generated shifts and leave future driver/crew scheduling unavailable until a receiver exists

Acceptance gate:

- Scheduling UI labels unsupported resource types as unavailable instead of partially saveable.
- A successful doctor shift action persists and reloads the same date/time/type/availability row.

### 6. Emergency Clinician Assignment Integration

Coordinate with Pass 1:

- doctor readiness/search remains a provider-operations concern
- assignment to an emergency must create/update/read the canonical `emergency_doctor_assignments` receiver through guarded command paths
- assigned/accepted/completed/cancelled handoff status is visible in the emergency detail projection

Acceptance gate:

- Console never represents a suggested or selected doctor as assigned unless persisted assignment truth confirms it.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on ambulances, doctors, scheduling modal, and map.
- Driver map action smoke in non-production account if available.
- Image upload smoke for ambulance/doctor only after storage contract is confirmed.

Backend/RLS/RPC:

- Assignment conflict tests.
- Trip status transition tests.
- Telemetry update authorization tests.
- Schedule conflict tests.
- Provider/doctor profile linkage read-only proof.

Stop conditions:

- Do not change map visuals before telemetry truth is defined.
- Do not add driver scheduling if service/table support is still doctor-only.
- Do not publish test telemetry against production active requests.
