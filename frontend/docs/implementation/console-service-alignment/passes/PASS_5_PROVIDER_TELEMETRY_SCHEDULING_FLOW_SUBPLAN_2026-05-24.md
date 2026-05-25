# Pass 5 Provider Operations, Telemetry, And Scheduling Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, storage, telemetry publish, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers ambulance CRUD, driver assignment, responder telemetry, doctor profile/availability, staff scheduling, map projections, and provider media uploads.

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

Observed source signals:

- `GodModeMap` projects emergency requests, ambulances, hospitals, responder locations, telemetry freshness, and driver status actions.
- Driver map actions call `updateResponderLocation` and `driverManagementService.updateTripStatus`.
- `AmbulanceModal` uploads images, selects drivers, checks existing assignments directly, and shows active assignment controls.
- `StaffSchedulingModal` creates doctor schedule records but explicitly says only doctor scheduling is currently supported.
- `staffSchedulingService` derives some schedules from ambulance crew arrays and doctor rows, not one canonical schedule table.

## User Flow

Operator/provider path:

1. Manage ambulances and vehicle readiness.
2. Assign or change driver/profile linkage.
3. Manage doctors and clinician availability.
4. Schedule staff shifts and detect conflicts.
5. Open map and see responders, patients, hospitals, and active trips.
6. Driver/provider publishes location and trip status.
7. Console reflects telemetry freshness without implying fake tracking readiness.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Ambulance CRUD | Page/hook/modal/service own overlapping read/write paths. | Ambulance operations facade. |
| Driver assignment | Modal local filtering plus service actions. | Assignment owner with profile/driver/ambulance relationship truth. |
| Provider images | Ambulance/doctor modals use storage directly. | Media owner shared with Pass 3/7. |
| Map telemetry | GodModeMap derives telemetry and writes responder location. | Telemetry projection/command owner tied to active request truth. |
| Driver trip status | Map and modal can call driver management actions. | Trip lifecycle command owner. |
| Doctor profile | Doctor record and profile linkage can drift. | Doctor/provider read and mutation owner. |
| Scheduling | Derived crew schedules plus doctor schedule writes. | Scheduling owner with explicit supported resource types. |

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

Decide scheduling support:

- doctor shifts only
- ambulance crew schedule projections only
- future driver/crew scheduling
- conflict detection receiver

Acceptance gate:

- Scheduling UI labels unsupported resource types as unavailable instead of partially saveable.

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
