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
- `frontend/src/components/map/MapRenderers/LeafletMapRenderer.jsx`
- `frontend/src/contexts/MapContext.jsx`
- `frontend/src/hooks/useAmbulances.js`
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
- `LeafletMapRenderer` uses third-party CARTO raster tile endpoints with OpenStreetMap/CARTO attribution. The map remains operationally dependent on an external base-map delivery path even after Console data ownership is repaired.
- The shared `/map` primary action dispatches `centerMap`, and `MapPanel` dispatches `recenter-map-target`, while `MapContext` and the mounted map refiners receive `recenter-map`; neither visible centering command is connected to a proved mounted receiver.
- Ambulance and privileged doctor lists fetch at most `1000` rows, then sort/page locally and publish fetched length as total, silently truncating larger operational registries.
- `AmbulancesPage` first obtains an exact filtered count, then discards it by resetting pagination total to the capped fetched-row length; its org-admin stats query also filters `hospital_id` with `orgId`, repeating facility-versus-organization identity ambiguity.
- `DoctorsPage` uses the same privileged `1000`-row client-pagination path and derives visible management scope from the truncated collection.
- `supabaseMapService` caps emergency map seed rows at `100` but loads ambulance and hospital seeds without comparable feed-window semantics, so operational map completeness is neither bounded consistently nor surfaced to operators.
- `MapContext` applies broad emergency, ambulance and assumed `users` realtime streams into its local projection after an initially scoped seed query; the subscription/invalidation scope and patient-location table contract are not proved.
- Driver map actions call `updateResponderLocation` and `driverManagementService.updateTripStatus`.
- `ambulancesService` and `useAmbulances` expose direct `ambulances.location` and `ambulances.status` mutation functions even though active responder telemetry already has the guarded `console_update_responder_location` receiver.
- `AmbulanceModal` uploads images, selects drivers, checks existing assignments directly, and shows active assignment controls.
- `StaffSchedulingModal` collects real doctor shift fields but `staffSchedulingService` never reads or writes `doctor_schedules`; it derives fixed same-day shifts from doctor and ambulance statuses.
- `emergency_doctor_assignments` has a shared receiver/RPC boundary while Console has no persisted clinician handoff surface.
- Backend automation assigns, releases and fails over doctors through `emergency_doctor_assignments`, `doctors.current_patients` and `emergency_requests.assigned_doctor_id`; a direct doctor availability/status edit can therefore change an active emergency handoff without any rendered Console assignment consequence.
- Backend driver/resource failover can replace or clear responder/ambulance state and adjust hospital capacity when a vehicle becomes unavailable; generic fleet status edits are not isolated from in-flight emergency consequences.

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
| Base-map delivery | Operational map renders CARTO/OpenStreetMap tiles directly. | Deliberately approved external map-layer dependency with visible unavailable/degraded behavior; marker/dispatch truth must not be confused with tile availability. |
| Map centering actions | Shared primary action and target-selection panel emit event names not consumed by mounted map implementations. | Single map command API/event shared by map controls and the rendered map receiver, with explicit target support where needed. |
| Fleet and clinician pagination | Client-capped list retrieval is presented as complete paginated management data. | Server-backed filter/sort/page/count owner with truthful scoped totals. |
| Map feed completeness | Mixed bounded/unbounded initial map queries provide no operator-visible coverage contract. | Explicit active/viewport feed bounds, refresh/invalidation ownership and incomplete-data state. |
| Driver trip status | Map and modal can call driver management actions. | Trip lifecycle command owner. |
| Doctor profile | Doctor record and profile linkage can drift. | Doctor/provider read and mutation owner. |
| Scheduling | Derived doctor/crew rows and status toggles bypass the real `doctor_schedules` receiver. | Stored doctor-shift owner; ambulance shift CRUD excluded without a receiver. |
| Clinician assignment | Emergency/doctor context can render without a persisted assignment action/status. | Cross-pass assignment owner using `emergency_doctor_assignments` with Pass 1. |
| Facility versus organization fleet scope | Org-admin statistics and lookup paths can filter hospital foreign keys with organization identity. | Canonical organization-to-hospital scope projection before counts, assignment or CRUD. |
| Direct active fleet writers | Generic ambulance status/location functions coexist with request-scoped telemetry receivers. | Ordinary fleet maintenance explicitly separated from active-trip telemetry/status commands. |

## Surface Read, Exposure, And Operation Closure

| Surface and mounted path | What it reads and renders now | Mutation or receiver path | Deterministic audit result |
| --- | --- | --- | --- |
| `/ambulances` desktop/mobile fleet list | Filters, count, status/type/facility fields and KPI displays; retrieves up to `1000` then slices locally and overwrites exact total. | Create/edit/delete modal and bulk delete; exposed service/hook status/location writers. | **Blocked.** Registry completion, totals and bulk scope truncate; active status/location command authority is not separated from CRUD. |
| Ambulance detail/edit modal | Vehicle, facility, driver/profile, image and active-assignment/utilization context; reads assignments and driver availability. | Direct ambulance CRUD, driver assignment and storage image path. | **Blocked.** Driver/profile and facility/org relationship authority needs one receiver; image storage remains unproved. |
| `/doctors` desktop/mobile directory | Doctor identity, hospital, specialty, status and pagination from privileged capped collection. | Create/edit/delete/bulk delete over doctor table. | **Blocked.** Count/completeness truncates and directory/profile automation and emergency assignment truth remain separate. |
| Doctor modal and readiness detail | Provider/profile/facility fields and status/edit controls. | Direct doctor CRUD/image path. | **Blocked.** Status cannot imply schedule or emergency handoff; media policy remains unproved. |
| Staff scheduling modal | Collects doctor shift date/time/type/availability and displays generated doctor/ambulance rows. | Service changes doctor status rather than `doctor_schedules`; no ambulance shift receiver exists. | **Missing required implementation.** Use stored doctor schedules only and remove unavailable crew scheduling promises. |
| `/map` initial operational projection | Up to `100` emergencies, unbounded ambulance/hospital seeds and visible selected markers/layers. | Local map refresh and marker lifecycle actions cross Pass 1. | **Blocked.** Operators cannot know omitted emergencies or unbounded resource coverage. |
| `MapContext` realtime projection | Local emergency, ambulance and assumed user-location arrays. | Broad subscriptions merge inserts/updates/deletes; recenter event only matches one of several visible commands. | **Blocked.** Scoped acquisition, patient-location source and control receiver parity are unproved. |
| Active responder telemetry | Marker and driver surfaces can expose location/status updates. | Guarded responder-location RPC exists; generic direct ambulance writers are also exported. | **Blocked.** Active-trip location/status must use request-coupled receiver and refreshed tracking truth only. |
| Emergency clinician assignment | No rendered persisted assignment view/command found. | Shared assignment RPC/table exists. | **Missing required cross-pass surface.** Pass 1 detail and Pass 5 doctor selection share this authority. |
| Provider and fleet automation consequences | Doctor or ambulance operational status appears editable as directory/fleet data. | Doctor/ambulance failover writers can reassign or clear active emergency responder/clinician state and update capacity. | **Blocked automation consequence.** Status commands need active-assignment impact state and refreshed emergency/assignment/capacity projections before mutation is exposed. |

## Patient-Facing Dependency Closure

| App-owned operational truth | Evidence | Console implementation obligation |
| --- | --- | --- |
| Tracking-ready responder state | Patient map rules require active request, hospital/service context, ETA/route seed and responder identity or explicit hydration. | A Console marker, dispatch or telemetry surface must not present healthy/live response from a raw ambulance row alone. |
| Responder location recovery | Shared `console_update_responder_location` validates active assigned request telemetry and app tracking consumes responder state. | Retain request-coupled telemetry RPC for active trips; generic fleet location CRUD is limited to non-active administration or unavailable. |
| Facility dispatch eligibility and identity | App reads facility dispatch eligibility and active hospital context; Pass 4 establishes organization/facility split. | Fleet filters, driver assignment and stats use real hospital scope resolved from organization authority. |
| Clinician handoff | Shared assignment receiver belongs to operated emergency and selected doctor. | A suggested/available doctor is not assigned until Pass 1 detail can read persisted assignment result. |

## Pass 5 Deterministic Surface Register

| Surface family | Read/render closure | Command/receiver closure | Completeness/realtime closure | Status |
| --- | --- | --- | --- | --- |
| Ambulance route and modal | Fields, assignment and image exposure mapped. | CRUD/direct status/location paths mapped. | Cap overwrites count; org/hospital stat scope drift. | Blocked |
| Doctor route and modal | Directory/status exposure mapped. | CRUD/media paths mapped. | Privileged `1000` cap and profile linkage remain open. | Blocked |
| Staff scheduling | Visible shift promise mapped. | Stored `doctor_schedules` not consumed. | Generated rows/statistics are not persisted truth. | Missing required implementation |
| Map operational feed | Seed fields/layers/marker dependencies mapped. | Lifecycle actions cross Pass 1. | Mixed bounds and broad subscriptions unclosed. | Blocked |
| Active telemetry | Responder read/write paths mapped. | Guarded RPC and generic CRUD coexist. | Patient tracking-ready convergence unproved. | Blocked |
| Clinician handoff | Dependency mapped. | Assignment receiver absent from UI. | Emergency/detail integration required. | Missing required surface |

## Cross-Pass Provider Operations Register

| Dependent pass | Provider/fleet dependency that must not be lost |
| --- | --- |
| Pass 1 - emergency lifecycle | Dispatch, marker actions, telemetry and persisted clinician handoff. |
| Pass 3 - facilities/capacity | Facility dispatch eligibility, hospital assignment and operational bed/ambulance availability. |
| Pass 4 - identity/verification | Organization/facility identity, provider role and readiness authority. |
| Pass 6 - visits/outcomes | Assigned clinician and responder context in clinical outcome projection. |
| Pass 8 - map/shell/analytics | Feed bounds, recenter receivers, aggregate fleet metrics and shared realtime ownership. |

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
| Compute fleet/doctor totals | Scoped aggregate projection | Fleet/provider owner with organization-to-hospital scope | Do not replace exact counts with capped fetched lengths or filter hospital keys by organization id. |
| Project map realtime feeds | Scoped realtime invalidation/projection | Map operations owner over authorized active feed | Do not merge broad subscriptions into an apparently scoped operational map without bounded/degraded semantics. |
| Render operational base map | External visual dependency | Approved tile provider configuration and attribution | Surface map degradation when external tiles fail; never report telemetry failure solely because the base map is unavailable. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Fleet identity and status | ambulance `hospital_id`, `organization_id`, driver/profile assignment, valid status, location/current call, license plate/vehicle/call-sign display | Join actual facility identity and use valid enum states; active request state cannot be edited as ordinary fleet CRUD. |
| Telemetry and clinician handoff | request/responder/ambulance identity, location/heading/ETA, assignment request/doctor/status/notes | Active telemetry and emergency doctor assignment remain request-coupled commands with refreshed projection truth. |
| Doctor schedule truth | doctor/profile/hospital specialty/license/status; schedule doctor/date/start/end/type/availability | Implement shift UI on stored `doctor_schedules`, not doctor status or generated rows; keep operational availability distinct. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

| Console surface/control | Exact field projection required | Payload/receiver gate | App consequence to prove |
| --- | --- | --- | --- |
| Ambulance identity card | Ambulance id, display/call sign, plate, vehicle type, status, hospital/facility id, organization id, current request/trip if any | Reads must preserve uuid-native ids and display labels separately. | App tracking can resolve the same vehicle without confusing display id with canonical id. |
| Fleet scope filters | Organization id, hospital/facility id, provider role, operator scope | Filter payloads must not treat hospital id as organization id. | Console users only see ambulances they can operate, while app request matching remains org/facility scoped. |
| Driver assignment | Driver profile id, driver/provider id if separate, ambulance id, active assignment, active request/trip lock | Assignment mutation must name the canonical receiver table/RPC and reject active-trip conflicts. | Live ambulance tracking does not lose driver identity during dispatch handoff. |
| Fleet status/location edits | Ambulance id, maintenance/availability status, non-active location fields, last updated timestamp | Generic fleet edits must not overwrite request-coupled responder telemetry. | App ETA and responder marker stay tied to live trip truth, not stale fleet maintenance coordinates. |
| Responder telemetry row | Request id, responder id, ambulance id, lat, lng, timestamp, heading, route/ETA seed, freshness state | Telemetry publish/storage is out of first-slice scope until receiver and realtime invalidation are named. | App can distinguish fresh live tracking, stale tracking, and unavailable telemetry without fabricated confidence. |
| Doctor identity card | Profile id, doctor id, display name, specialty, license/verification status, hospital/facility id, organization id | Reads must not collapse profile identity, doctor row identity, and provider role into one field. | App visit/emergency handoff can resolve clinician identity without ambiguous provider records. |
| Provider readiness badge | Role, provider type, verification status, availability, current assignment | Badge projection must state which fields are evidence and which are unavailable. | Console does not imply a doctor is schedulable or dispatchable from role alone. |
| Doctor schedule row | `doctor_schedules` doctor id, date, start/end, schedule type, availability, source timestamp | Schedule create/update controls stay disabled until exact receiver and required fields are charted. | App appointment/emergency routing can rely on schedule windows instead of generated/status-only rows. |
| Ambulance/crew schedule row | Ambulance id, driver/crew ids, time window, exclusion/unavailable reason | Keep marked unavailable if no receiver table/RPC exists. | Console does not create phantom coverage that app dispatch cannot honor. |
| Emergency clinician handoff | `emergency_doctor_assignments` request id, doctor id, assignment status, notes, timestamps | Assignment mutation must prove receiver table/RPC and status transition rules. | Patient emergency timeline reflects real clinician assignment rather than console-only intent. |
| Map feed completeness | Emergency feed cap, ambulance feed bounds, hospital/facility feed bounds, pagination/incomplete marker | Feed readers must expose incomplete/degraded state instead of silently truncating. | Dispatch map does not hide active demand or supply while app requests are waiting. |
| Map centering actions | Target type, target id, lat/lng, source row, active map event name | Consolidate `centerMap`, `recenter-map-target`, and `recenter-map` before new actions are added. | Operators can locate the same emergency/vehicle/hospital object the app is tracking. |
| Base map tiles | Tile provider, load/error state, attribution/degraded state | External tile dependency remains view-layer only; no service mutation. | Console map degradation is visible without changing dispatch data truth. |
| Provider/vehicle images | Storage bucket/path, public/private visibility, source provenance, fallback image | Upload controls remain disabled until bucket policy and receiver ownership are documented. | App and console do not expose fragile direct provider URLs or private media by accident. |
| Automation/failover status controls | Target object id, current lifecycle state, requested state, side effects on active request/trip/assignment | Any enablement must include downstream reassignment/clearance consequences. | Console status changes cannot orphan app trips, doctor assignments, or responder tracking. |

Implementation rule: the first slice may centralize read projections, paging, map feed bounds, disabled/unavailable controls, and receiver labels. It must not add telemetry publishing, storage uploads, schedule mutations, or schema changes before the receiver and app consequence charts close.

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
