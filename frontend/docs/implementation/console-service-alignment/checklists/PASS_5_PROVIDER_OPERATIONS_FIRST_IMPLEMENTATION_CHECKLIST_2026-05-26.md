# Pass 5 Provider Operations First Implementation Checklist - 2026-05-26

## Status

Implementation-control checklist only. This document does not authorize telemetry publish, trip status mutation, emergency dispatch/completion, doctor or ambulance CRUD, driver assignment, doctor schedule writes, Storage upload, map export, database migration, cleanup, seed, reset, Edge Function invocation, or production data repair.

Pass 5 starts by making provider, fleet, schedule and map truth bounded and honest before enabling operational commands.

## Source Chain Read Before Editing

Read these docs first:

- `frontend/docs/implementation/console-service-alignment/passes/PASS_5_PROVIDER_TELEMETRY_SCHEDULING_FLOW_SUBPLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/service-maps/IDENTITY_ADMIN_PROVIDER_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/PROVIDER_OPERATIONS_CONTRACT_CHART_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md`

Then re-run mounted-source scans:

```powershell
rg -n "AmbulancesPage|MobileAmbulances|AmbulanceModal|DoctorsPage|MobileDoctors|DoctorModal|DoctorProfileCard|useDoctorProfile|GodModeMap|MapContext|MarkerDetailPanel|MobileMap|MapPanel|LeafletMapRenderer|MapErrorBoundary" frontend/src
rg -n "console\.log|console\.error|hospital_id|organization_id|driver|ambulance|doctor|schedule|status|availability|fee|assigned|current_call|location|telemetry|Export|download|quick|marker|trip|request_id|emergency_request_id|onDelete|assign|complete|cancel" frontend/src/components frontend/src/contexts frontend/src/hooks frontend/src/services
```

## Runtime Files In Scope

Primary files:

- `frontend/src/components/pages/AmbulancesPage.jsx`
- `frontend/src/components/mobile/MobileAmbulances.jsx`
- `frontend/src/components/modals/AmbulanceModal.jsx`
- `frontend/src/components/context/AmbulancesPanel.jsx`
- `frontend/src/components/views/AmbulanceListView.jsx`
- `frontend/src/components/views/AmbulanceTableView.jsx`
- `frontend/src/hooks/useAmbulances.js`
- `frontend/src/services/ambulancesService.js`
- `frontend/src/services/driverManagementService.js`
- `frontend/src/components/pages/DoctorsPage.jsx`
- `frontend/src/components/mobile/MobileDoctors.jsx`
- `frontend/src/components/modals/DoctorModal.jsx`
- `frontend/src/components/context/DoctorsPanel.jsx`
- `frontend/src/components/views/DoctorListView.jsx`
- `frontend/src/components/views/DoctorTableView.jsx`
- `frontend/src/components/views/DoctorProfileCard.jsx`
- `frontend/src/hooks/useDoctorProfile.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/components/modals/StaffSchedulingModal.jsx`
- `frontend/src/services/staffSchedulingService.js`
- `frontend/src/components/pages/GodModeMap.jsx`
- `frontend/src/contexts/MapContext.jsx`
- `frontend/src/components/mobile/MobileMap.jsx`
- `frontend/src/components/context/MapPanel.jsx`
- `frontend/src/components/map/MarkerDetailPanel.jsx`
- `frontend/src/components/map/ErrorBoundary.jsx`
- `frontend/src/components/map/MapRenderers/LeafletMapRenderer.jsx`
- `frontend/src/components/map/MapRenderers/GoogleMapsRenderer.jsx`
- `frontend/src/components/map/MapRefiner/GoogleMapsSmartRoute.jsx`
- `frontend/src/services/supabaseMapService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/storageService.js`

Secondary files only when required:

- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/hooks/useContextAction.js`
- `frontend/src/utils/errorHandler.js`

## Explicitly Excluded

Do not include these in the first implementation slice:

- Emergency dispatch, complete, cancel, accept, arrive, or request lifecycle command repair.
- Driver telemetry publish or trip status mutation.
- Direct `ambulances.location`, `ambulances.status`, `ambulances.profile_id`, `doctors.status`, or `doctors.is_available` mutation.
- Ambulance, doctor, driver, profile, facility or organization CRUD repair.
- Doctor schedule create/update/delete against `doctor_schedules`.
- Provider, doctor or ambulance image upload.
- Map visual redesign, tile-provider replacement or geospatial tuning beyond truth/unavailable labelling.
- Map export generation or download.
- Clinician assignment mutation through `emergency_doctor_assignments`.
- Schema/RLS/RPC/trigger migration, historical repair, cleanup, seed or reset.

## First Safe Slice

The first implementation package is read/disable/projection only.

Allowed:

- Add or identify a provider operations projection boundary.
- Route `/ambulances`, `/doctors`, mobile variants and panels through a common read/capability shape where touched.
- Label local/capped row counts as current page/window or mark aggregate unavailable.
- Disable or remove false provider/fleet/map commands without receivers.
- Remove first-ambulance fallback eligibility in driver mode, or render unassigned/unavailable without publishing or status actions.
- Disable map raw-data export until role, feed bounds, redaction and generated artifact scope exist.
- Disable selected-marker Contact, Navigate, Call, Track, dispatch and completion controls where no mounted receiver/capability exists.
- Downgrade scheduling copy to unavailable if it does not read/write `doctor_schedules`.
- Remove or gate payload-bearing console diagnostics in map, fleet, telemetry and scheduling surfaces.
- Repair visible mojibake in touched fleet/provider/map/schedule files.

Blocked:

- Any write receiver implementation listed in the excluded section.
- Any backend, Storage or live telemetry action.

## Projection Contract

Create a stable provider operations projection with these slices:

| Slice | Required fields |
| --- | --- |
| `fleetList` | `rows`, `page`, `pageSize`, `totalCount`, `countBasis`, `filterBasis`, `sortBasis`, `isComplete`, `degradedReason`. |
| `fleetRow` | `ambulanceId`, `displayId`, `callSign`, `vehicleLabel`, `status`, `statusSource`, `facilityId`, `facilityLabel`, `organizationId`, `driverProfileId`, `driverLabel`, `activeRequestId`, `activeTripState`. |
| `doctorList` | `rows`, `page`, `pageSize`, `totalCount`, `countBasis`, `filterBasis`, `isComplete`, `degradedReason`. |
| `doctorRow` | `doctorId`, `profileId`, `displayId`, `name`, `specialty`, `licenseState`, `facilityId`, `organizationId`, `status`, `availability`, `verificationState`, `activeAssignmentState`. |
| `providerSelfProfile` | `doctorId`, `profileId`, `editablePresentationFields`, `blockedOperationalFields`, `activeAssignmentImpact`, `disabledReason`. |
| `scheduleState` | `source`, `rows`, `isStoredSchedule`, `unsupportedResourceTypes`, `disabledReason`. |
| `mapFeed` | `isAuthorized`, `sourceBounds`, `emergencyWindow`, `ambulanceWindow`, `hospitalWindow`, `incompleteSources`, `realtimeOwner`, `degradedSources`. |
| `operatorLocation` | `permissionState`, `actualLocationAvailable`, `displayCenter`, `canRunNearbyLookup`, `disabledReason`. |
| `routeProvider` | `provider`, `externalDisclosureState`, `routeTruth`, `fallbackState`, `diagnosticState`. |
| `commandCapabilities` | Named command booleans plus `disabledReason` and receiver owner. |

Required command capability names:

- `canCreateAmbulance`
- `canEditFleetMaintenance`
- `canDeleteAmbulance`
- `canAssignDriver`
- `canPublishTelemetry`
- `canUpdateTripStatus`
- `canEditDoctorDirectory`
- `canDeleteDoctor`
- `canEditProviderSelfProfile`
- `canEditOperationalAvailability`
- `canCreateDoctorSchedule`
- `canEditDoctorSchedule`
- `canExportMapData`
- `canUseMapQuickAction`
- `canExposePatientContactOnMap`
- `canDispatchFromMap`
- `canCompleteFromMap`

Every unsafe command defaults to `false`.

## Surface Disposition Matrix

| Surface | Retain first | Disable or relabel first | Receiver proof before enabling |
| --- | --- | --- | --- |
| `/ambulances` grid/list/table | Fleet row browsing, filters, stable empty/loading states. | Create/edit/delete/bulk delete when capability is absent; invalid status labels like `busy` or `on_route`; complete-network totals from capped rows. | Fleet maintenance receiver, valid status enum, org/facility scope and reflected read. |
| `MobileAmbulances` | Mobile layout and row browsing. | `LIVE` trend/KPI claims from loaded rows; destructive controls without shared capability. | Same projection and command state as desktop. |
| `AmbulanceModal` | View vehicle metadata and station/driver labels from projection. | Image upload, driver assignment, active trip commands, unsupported fields, hospital-wide trip list. | Vehicle-scoped active-trip projection, assignment receiver, Storage policy, reflected row. |
| `/doctors` grid/list/table | Doctor/provider directory browsing. | Create/edit/delete where profile/doctor owner is ambiguous; operational status edits without active-assignment impact. | Directory receiver, profile/doctor sync rule, field allowlist and reflected read. |
| `MobileDoctors` | Mobile directory layout. | `LIVE` metrics, rating/availability trends from loaded rows, unsupported commands. | Same projection and command state as desktop. |
| `DoctorModal` | View/link existing provider profile where identity is proved. | Manual create-then-invite path, broad status/fee/availability edits, Storage upload. | Auth/profile-backed doctor creation, profile sync behavior, Storage policy and field allowlist. |
| `DoctorProfileCard` in settings | Own-provider presentation view. | Operational availability/status/fee edits unless allowlisted and active-assignment-safe. | Self-service provider receiver, active emergency impact projection and reflected read. |
| `StaffSchedulingModal` | Open shell and unavailable/explainer state. | Status-derived schedule success, ambulance crew schedule, local-only conflict checks. | `doctor_schedules` read/write/conflict/statistics receiver. |
| Dormant `StaffScheduler` | Keep excluded or retire. | Do not mount local hard-coded rows. | Same persisted schedule projection and clean encoding. |
| `/map` via `GodModeMap` | Map view shell and read-only bounded markers when authorized. | Duplicate `MapProvider`, public-route feed acquisition, raw export, inert incident controls, patient contact exposure without capability. | One authorized map feed owner, role scope, source bounds, redaction and mounted receivers. |
| `MapPanel` | Read-only map summary when source-labelled. | Export Data, Contact, Navigate, Call, Track, target events whose receiver is unproved. | Map command API, redacted export receiver and mounted target receiver. |
| `MarkerDetailPanel` | Selected marker read-only summary after exposure gate. | Emergency dispatch/complete and patient contact/location exposure without Pass 1 action state. | Pass 1 emergency action/exposure/payment/cash legality projection. |
| `MobileMap` | Mobile map composition. | Dispatch/complete from `ambulance_id` presence, patient contact/location without Pass 1 state. | Same Pass 1 action/exposure projection as desktop. |
| Driver mode map actions | Read-only assignment/unassigned state. | First ambulance fallback, telemetry publish and status changes without positive request assignment. | Request-coupled responder/ambulance projection and guarded telemetry/lifecycle receivers. |
| External route rendering | Show route unavailable/degraded state. | Raw provider error logging, straight-line fallback presented as routed truth, coordinate-derived session decoration. | Approved external coordinate disclosure and route fallback semantics. |

## Field And Parser Gates

Run before implementation:

```powershell
rg -n "JSON\.parse|Number\(|new Date\(|\|\||hospital_id|organization_id|profile_id|driver_id|assigned_ambulance_id|status|busy|on_route|en_route|location|lat|lng|current_call|rating|image|doctor_schedules|emergency_doctor_assignments" frontend/src/components/pages/AmbulancesPage.jsx frontend/src/components/pages/DoctorsPage.jsx frontend/src/components/modals/AmbulanceModal.jsx frontend/src/components/modals/DoctorModal.jsx frontend/src/components/modals/StaffSchedulingModal.jsx frontend/src/components/views/DoctorProfileCard.jsx frontend/src/components/pages/GodModeMap.jsx frontend/src/contexts/MapContext.jsx frontend/src/components/map frontend/src/services/ambulancesService.js frontend/src/services/doctorsService.js frontend/src/services/driverManagementService.js frontend/src/services/staffSchedulingService.js frontend/src/services/emergencyResponseService.js
```

Rules:

- Never submit an organization UUID as `hospital_id`.
- Never derive fleet availability from invalid `busy` or `on_route` enum values.
- Never treat `ambulances.profile_id` and `profiles.assigned_ambulance_id` as equivalent unless a receiver sync is proved.
- Never treat a doctor row as a full provider identity without profile linkage and verification/readiness context.
- Never treat doctor status as schedule persistence.
- Never reduce a capped local collection into a complete provider/fleet KPI.
- Never publish telemetry or update trip status from a fallback vehicle assignment.
- Never run proximity lookup from a fabricated fallback operator location.
- Never present external route fallback geometry as traffic-aware route truth.

## App Consequences

Pass 5 changes affect the patient app and emergency workflow.

- Ambulance status, responder location and active request identity drive patient tracking and ETA trust.
- Doctor status and availability can trigger or affect clinician assignment, release and failover.
- Facility and organization scope affects which vehicles and clinicians are eligible for dispatch.
- Provider self-service status/fee edits can change patient-facing booking and availability meaning.
- Map exposure of patient phone/location is patient-safety and privacy relevant, not a local visual decision.
- A raw map export can disclose emergency, patient, facility and responder data outside normal route controls.

## Implementation Packages

### Package 5.1 - Projection And False Capability Removal

Allowed:

- Add provider operations projection scaffolding.
- Normalize fleet/provider command capability states.
- Label or remove capped/local aggregate claims.
- Remove duplicate map-provider ownership where it can be done without changing data semantics, or mark it as the first blocking runtime cleanup.
- Disable raw map export and inert map controls.
- Disable vehicle-modal hospital-wide trip commands.
- Disable driver-mode fallback assignment actions.
- Downgrade schedule UI to unavailable unless stored schedule rows are read.

Acceptance:

- No route/mobile/panel variant expands authority by receiving callbacks that another variant hides.
- Driver mode cannot select an active request through first-visible-ambulance fallback.
- Map export is unavailable until redaction and source bounds are proved.
- Scheduling does not claim persisted shifts from status-derived rows.
- Fleet and provider totals state their basis or render unavailable.

### Package 5.2 - Read Projection Repair

Allowed after Package 5.1:

- Move ambulance and doctor lists to server-paged/read-owned projections.
- Join station/facility names and keep organization id separate.
- Add provider self-service read model and field allowlist.
- Add map feed bounds and incomplete/degraded states.

Blocked:

- Telemetry publish, status mutation, schedule writes, assignment writes and emergency lifecycle commands.

Acceptance:

- Desktop and mobile fleet/provider rows render the same status vocabulary and capability reasons.
- `hospital_id`, `organization_id`, `doctorId`, `profileId`, `ambulanceId`, `driverProfileId` and `requestId` remain distinct in the projection.
- Public/auth routes do not acquire protected map feeds.

### Package 5.3 - Receiver Planning Only

Produce follow-up specs for:

- Fleet maintenance CRUD.
- Driver assignment/conflict/transfer.
- Request-coupled telemetry publish.
- Trip status command surface.
- Provider self-service profile edits.
- Doctor schedule CRUD/conflict/statistics.
- Clinician assignment handoff.
- Provider/vehicle media upload.
- Map export and quick actions.

Each spec must name payload fields, receiver, actor scope, active-trip/active-assignment consequence, audit event, reflected read, failure copy and non-production test path.

## Verification

Docs-only checklist verification:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_5_PROVIDER_OPERATIONS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_5_PROVIDER_OPERATIONS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation verification, once code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
rg -n "console\.log|console\.warn|console\.error" frontend/src/components/pages/AmbulancesPage.jsx frontend/src/components/pages/DoctorsPage.jsx frontend/src/components/modals/AmbulanceModal.jsx frontend/src/components/modals/DoctorModal.jsx frontend/src/components/modals/StaffSchedulingModal.jsx frontend/src/components/views/DoctorProfileCard.jsx frontend/src/components/pages/GodModeMap.jsx frontend/src/contexts/MapContext.jsx frontend/src/components/map frontend/src/services/ambulancesService.js frontend/src/services/doctorsService.js frontend/src/services/driverManagementService.js frontend/src/services/staffSchedulingService.js
npm run build
```

Browser smoke, no mutation:

- `/ambulances` desktop and mobile read-only list.
- `/doctors` desktop and mobile read-only list.
- Ambulance modal open/close and disabled active-trip/driver/media states.
- Doctor modal open/close and disabled create/invite/media states.
- Provider settings professional card shows safe/unavailable field states.
- Staff scheduling modal shows stored schedule or unavailable state, not status-derived persistence.
- `/map` starts one authorized feed owner only after protected map entry.
- Login, set-password, onboarding, unauthorized and fallback routes do not start operational map feeds.
- Driver mode without matched ambulance renders unassigned/unavailable, with no telemetry/status command.
- Map export and selected-marker communication/navigation controls are unavailable without receivers.
- Browser console contains no raw telemetry, route-provider, selected-marker, patient, provider, vehicle, schedule or Storage payload errors in normal runtime.

## Commit Boundary

Commit Package 5.1 as one coherent provider-operations truth checkpoint after code verification. Package 5.2 and Package 5.3 should remain separate checkpoints unless a projection refactor is inseparable.

This checklist itself belongs to the implementation-plan pack and may be committed with the checklists index after docs-only verification.
