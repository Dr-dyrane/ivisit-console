# Pass 5 Provider Operations, Telemetry, And Scheduling Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, storage, telemetry publish, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers ambulance CRUD, driver assignment, responder telemetry, doctor profile/availability, table-backed doctor scheduling, emergency clinician-assignment integration, map projections, and provider media uploads.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/AmbulancesPage.jsx`
- `frontend/src/components/context/AmbulancesPanel.jsx`
- `frontend/src/components/views/AmbulanceListView.jsx`
- `frontend/src/components/views/AmbulanceTableView.jsx`
- `frontend/src/components/modals/AmbulanceModal.jsx`
- `frontend/src/components/pages/DoctorsPage.jsx`
- `frontend/src/components/context/DoctorsPanel.jsx`
- `frontend/src/components/views/DoctorListView.jsx`
- `frontend/src/components/views/DoctorTableView.jsx`
- `frontend/src/components/modals/DoctorModal.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/views/DoctorProfileCard.jsx`
- `frontend/src/hooks/useDoctorProfile.js`
- `frontend/src/components/modals/StaffSchedulingModal.jsx`
- `frontend/src/components/scheduling/StaffScheduler.jsx`
- `frontend/src/components/pages/GodModeMap.jsx`
- `frontend/src/components/mobile/MobileAmbulances.jsx`
- `frontend/src/components/mobile/MobileDoctors.jsx`
- `frontend/src/components/mobile/MobileMap.jsx`
- `frontend/src/components/context/MapPanel.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
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
- `ContextPanel` mounts `MapPanel` on `/map`; its enabled `Export Data` control downloads JSON containing the raw `emergencyRequests` array, selected marker and local map settings. In its selected-emergency/ambulance branches it also renders Contact, Navigate, Call and Track buttons with no action receiver.
- Ambulance and privileged doctor lists fetch at most `1000` rows, then sort/page locally and publish fetched length as total, silently truncating larger operational registries.
- `AmbulancesPage` first obtains an exact filtered count, then discards it by resetting pagination total to the capped fetched-row length; its org-admin stats query also filters `hospital_id` with `orgId`, repeating facility-versus-organization identity ambiguity.
- `DoctorsPage` uses the same privileged `1000`-row client-pagination path and derives visible management scope from the truncated collection.
- `MobileAmbulances` and `MobileDoctors` render management and KPI variants from their route-provided provider/fleet projection; a responsive variant does not create a separate authority for totals, identity, CRUD or completeness.
- `MobileAmbulances.jsx:94-104,212-237` and `MobileDoctors.jsx:91-101,196-221` fall back from missing statistics to loaded row status counts and filtered-row rating calculations while presenting operational trend labels including `LIVE`. Neither responsive surface has proved fleet/provider availability coverage or a measured trend window.
- `SettingsPage` mounts `DoctorProfileCard` for a signed-in provider; `useDoctorProfile` reads the current provider's `doctors` row by `profile_id`, and the card submits self-service changes for `about`, `experience`, `consultation_fee`, `is_available` and `status` through the same broad `updateDoctor()` table update path used by administration.
- `supabaseMapService` caps emergency map seed rows at `100` but loads ambulance and hospital seeds without comparable feed-window semantics, so operational map completeness is neither bounded consistently nor surfaced to operators.
- `AppLayout` mounts `MapProvider` around every route, while `MapContext` initializes and subscribes without checking authentication or active route. Public/auth routes therefore attempt the emergency, ambulance, hospital and assumed patient-location map paths before any operational map authorization is established.
- On the live `/map` route, `GodModeMap` wraps `GodModeMapContent` in another `MapProvider` despite already being rendered below the shell provider; entering the route can run duplicate initial reads and emergency/ambulance/user-location realtime subscriptions.
- Desktop `MarkerDetailPanel`, mounted by `GodModeMap`, renders selected-emergency patient phone and location and directly invokes dispatch/completion operations from marker status/ambulance state. Its close button also contains a visibly corrupted glyph.
- `GodModeMap` reads browser geolocation, substitutes `LAGOS_CENTER` after denial/unavailability, then uses that value for nearby-hospital lookup and a visible marker; `GoogleMapsRenderer` additionally renders a `Session ID` derived from location coordinates. An unavailable operator location can look like a real Lagos position, while an actual position is unnecessarily encoded on screen.
- `GoogleMapsRenderer` and `GoogleMapsSmartRoute` send active route endpoints to the Google Maps routes library and log raw routing failure objects before drawing a straight-line fallback. Map-route delivery is an external coordinate disclosure and degraded-route truth contract, not only a visual dependency.
- `MapContext` applies broad emergency, ambulance and assumed `users` realtime streams into its local projection after an initially scoped seed query; the subscription/invalidation scope and patient-location table contract are not proved.
- `MobileMap`, mounted by `GodModeMap`, renders a selected emergency's patient phone and location fields, then calls `dispatchEmergency()` when no ambulance id is present or `completeEmergency()` when an ambulance id is present. The mobile map is therefore an active emergency lifecycle/exposure surface, not only a telemetry renderer.
- The invoked `emergencyResponseService.dispatchEmergency()` loads all currently available ambulances without a bound and picks `ambulances[0]`; for critical cases it also loads matching available doctors without a bound and picks the first row. Automated responder/clinician selection is not readiness, proximity or assignment proof.
- Driver map actions call `updateResponderLocation` and `driverManagementService.updateTripStatus`.
- In driver mode `GodModeMap` resolves the signed-in responder's ambulance by matching `profile_id`/`driver_id`, but falls back to `processedAmbulances[0]` when no match exists; its active-request selector then accepts either responder identity or that fallback ambulance id before enabling telemetry/status actions.
- `ambulancesService` and `useAmbulances` expose direct `ambulances.location` and `ambulances.status` mutation functions even though active responder telemetry already has the guarded `console_update_responder_location` receiver.
- `AmbulanceModal` uploads images, selects drivers, checks existing assignments directly, and shows active assignment controls. Its active-assignment load filters by `hospital_id`, not the opened ambulance id, so a modal labelled for one vehicle can render and command another vehicle's active requests at the same hospital.
- `HospitalsPage` actively mounts `StaffSchedulingModal` for its facility scheduling action. The modal collects real doctor shift fields, but `staffSchedulingService` never reads or writes `doctor_schedules`; it derives fixed same-day shifts from doctor and ambulance statuses. Scheduling is therefore a live false-persistence workflow reached through facility operations, not a dormant modal.
- `components/scheduling/StaffScheduler.jsx` defines a second local mock scheduler with hard-coded personnel and shift rows, local-only add/delete behavior and corrupted visible separator text, but no importing/mounted consumer was found. It is explicitly dormant and cannot be cited as schedule capability or used as the implementation target without deliberate replacement.
- `emergency_doctor_assignments` has a shared receiver/RPC boundary while Console has no persisted clinician handoff surface.
- Backend automation assigns, releases and fails over doctors through `emergency_doctor_assignments`, `doctors.current_patients` and `emergency_requests.assigned_doctor_id`; a direct doctor availability/status edit can therefore change an active emergency handoff without any rendered Console assignment consequence.
- Backend driver/resource failover can replace or clear responder/ambulance state and adjust hospital capacity when a vehicle becomes unavailable; generic fleet status edits are not isolated from in-flight emergency consequences.
- `AmbulancesPage` and `DoctorsPage` guard grid-card edit/delete controls by admin/org-admin role, but pass `onEdit` and `onDelete` unconditionally into their mounted list/table renderers. Switching display mode can expose fleet/clinician destructive controls outside the route's own visible grid policy.
- Mounted `AmbulancesPanel` renders `Ready Units` and `Live Fleet` from broad `PageDataContext` rows and says `Off duty` when the recent list is empty; mounted `DoctorsPanel` renders total rows as `Active Faculty` and maps every recent status except `on_call` to an `Active` badge, including busy or off-duty records.
- `PageDataContext.fetchDoctorsData()` converts a doctor-read failure into `mockDoctorsData`, while fleet context errors leave previously held state without a typed failure. Context panels can therefore publish fabricated or stale operational readiness instead of failed/unavailable state.
- `AmbulanceListView` and `DoctorListView` contain corrupted rendered separators in row identity text, adding fleet/provider list views to the implementation encoding gate.

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
| Map data export and incident controls | Mounted map context exports raw emergency/selected-marker JSON and displays contact/navigation/tracking affordances without receivers. | Role-scoped map projection and operation registry: export permitted fields only from bounded truth; disable or implement every incident/responder control deliberately. |
| Fleet and clinician pagination | Client-capped list retrieval is presented as complete paginated management data. | Server-backed filter/sort/page/count owner with truthful scoped totals. |
| Map feed completeness | Mixed bounded/unbounded initial map queries provide no operator-visible coverage contract. | Explicit active/viewport feed bounds, refresh/invalidation ownership and incomplete-data state. |
| Public/auth map-provider mounting | Unguarded `MapProvider` runs map reads/subscriptions for login, password, onboarding, unauthorized and fallback routes because it wraps the entire routed tree. | Authenticated, authorized operational-map mount boundary; public routes acquire no protected operational feed or patient-location subscription. |
| Duplicate map-provider mounting | `/map` mounts a second `MapProvider` beneath the global shell provider. | One authorized scoped map feed/realtime owner consumed by desktop and mobile map compositions. |
| Desktop selected-marker emergency actions | `MarkerDetailPanel` exposes patient phone/location and sends dispatch/complete from local marker state. | Pass 1 emergency detail/action/exposure projection with legal-transition/payment/cash authority shared by all map variants. |
| Operator location, nearby lookup and visible session badge | Browser geolocation failure is replaced with `LAGOS_CENTER`, which is then queried/rendered as location; actual coordinates are encoded in a displayed `Session ID`. | Explicit unavailable/manual/fallback map-location state with no coordinate-derived decorative identifier and no nearby query from fabricated location. |
| Google route endpoint handoff | Route polylines invoke Google Routes with operational endpoints and silently fall back to straight segments after logging raw failures. | Approved external-routing disclosure and visibly degraded route projection with redacted failure handling; never present fallback geometry as traffic-aware route truth. |
| Mobile map emergency lifecycle and exposure | The selected emergency sheet displays patient contact/location and enables dispatch or completion from marker state and ambulance-id presence. | Pass 1 emergency action/exposure projection shared by every map variant; no completion or patient disclosure unless actor scope, payment/cash legality and refreshed lifecycle truth are proved. |
| Driver trip status | Map and modal can call driver management actions. | Trip lifecycle command owner. |
| Automated dispatch responder/clinician selection | Emergency response command chooses first rows from unbounded available ambulance/doctor collections. | Pass 1 command facade consuming bounded provider-readiness/assignment candidates; no first-row automated assignment claim. |
| Driver-mode request identity | A driver without a matched ambulance is assigned the first map ambulance as a UI fallback, which can make another vehicle's active request eligible for telemetry/status controls. | Request-scoped responder projection that never invents vehicle assignment; absence of assignment is an unavailable action state. |
| Ambulance modal trip scope | A vehicle modal obtains all active ambulance requests at its hospital and exposes Cancel/Arrived/Complete over that hospital-wide set. | Vehicle-scoped active-trip projection or deliberate request-detail command surface; do not command unrelated trips from a vehicle record. |
| Doctor profile | Doctor record and profile linkage can drift. | Doctor/provider read and mutation owner. |
| Provider self-service doctor profile | `/settings` lets the signed-in provider write availability/status, fee and profile presentation fields through broad doctor-row update without a named self-service field policy or active-assignment consequence check. | Provider-owned update command with a strict field allowlist, verification/readiness meaning and active-emergency impact projection before operational availability can change. |
| Scheduling | Derived doctor/crew rows and status toggles bypass the real `doctor_schedules` receiver. | Stored doctor-shift owner; ambulance shift CRUD excluded without a receiver. |
| Dormant mock scheduler | `StaffScheduler` defines local hard-coded shifts and local-only edit controls outside the mounted scheduling path. | Keep excluded or retire; do not mount until it consumes the same persisted `doctor_schedules` projection and clean rendered copy. |
| Clinician assignment | Emergency/doctor context can render without a persisted assignment action/status. | Cross-pass assignment owner using `emergency_doctor_assignments` with Pass 1. |
| Facility versus organization fleet scope | Org-admin statistics and lookup paths can filter hospital foreign keys with organization identity. | Canonical organization-to-hospital scope projection before counts, assignment or CRUD. |
| Direct active fleet writers | Generic ambulance status/location functions coexist with request-scoped telemetry receivers. | Ordinary fleet maintenance explicitly separated from active-trip telemetry/status commands. |
| Desktop list/table operation parity | Grid variants role-gate fleet/doctor edit/delete controls, while list/table variants receive and render edit/delete callbacks unconditionally. | One capability projection applied before every renderer receives callbacks; display mode cannot expand CRUD authority. |
| Context-panel operational truth | `AmbulancesPanel` and `DoctorsPanel` turn broad context snapshots, failure fallback and generic statuses into `Live Fleet`, `Ready Units`, `Active Faculty` and `Active` claims. | Scoped provider/fleet summary projection with ready/degraded/failed/unavailable state and status-exact labels; no mock/stale snapshot as live readiness. |

## Surface Read, Exposure, And Operation Closure

| Surface and mounted path | What it reads and renders now | Mutation or receiver path | Deterministic audit result |
| --- | --- | --- | --- |
| `/ambulances` desktop/mobile fleet list | Filters, count, status/type/facility fields and KPI displays; retrieves up to `1000` then slices locally and overwrites exact total. Mobile can calculate availability/on-route/busy and rating trend claims from loaded rows and label them `LIVE`. | Create/edit/delete modal and bulk delete; exposed service/hook status/location writers. | **Blocked.** Registry completion, totals, trend claims and bulk scope truncate; active status/location command authority is not separated from CRUD. |
| Ambulance detail/edit modal | Vehicle, facility, driver/profile, image and active-assignment/utilization context; reads assignments and driver availability. | Direct ambulance CRUD, driver assignment and storage image path. | **Blocked.** Driver/profile and facility/org relationship authority needs one receiver; image storage remains unproved. |
| `/doctors` desktop/mobile directory | Doctor identity, hospital, specialty, status and pagination from privileged capped collection; mobile derives availability/on-call/busy and rating trend claims from loaded rows when aggregate state is missing. | Create/edit/delete/bulk delete over doctor table. | **Blocked.** Count/completeness and mobile operational metrics truncate; directory/profile automation and emergency assignment truth remain separate. |
| Desktop ambulance/doctor list and table view modes | Receive paginated rows and render status/facility/rating details; list text includes corrupted separators. | Render edit/delete actions through callbacks even when grid-card controls would be hidden for the same actor. | **Blocked variant-authority defect.** Command capability must be resolved above all renderers; fix displayed encoding in the same implementation slice touching these views. |
| `AmbulancesPanel` and `DoctorsPanel` through `ContextPanel` | Render broad context stats/recent rows as `Ready Units`, `Live Fleet`, `Active Faculty`, `Ready` and row-level status claims. Doctor recent rows label any non-`on_call` row `Active`; ambulance empty rows say `Off duty`. | Emit create, analytics and filter events paired to route listeners only while the route is mounted. | **Blocked summary/failure defect.** Broad context, mock doctor fallback and stale/empty fleet state cannot represent readiness. Panels must consume the same scoped typed provider projection as the routes. |
| Doctor modal and readiness detail | Provider/profile/facility fields and status/edit controls. | Direct doctor CRUD/image path. | **Blocked.** Status cannot imply schedule or emergency handoff; media policy remains unproved. |
| `/settings` provider professional profile card | For provider actors, renders doctor affiliation, rating, availability, fee, experience and bio; includes editable availability/status, fee, experience and bio inputs. | `useDoctorProfile.updateProfile()` calls broad `doctorsService.updateDoctor()` on the provider's row; no active assignment/preflight or field-specific receiver is rendered. | **Blocked self-service command boundary.** A provider may need allowed profile edits, but operational availability/status cannot silently activate doctor failover or alter app-facing fee/readiness truth. |
| Staff scheduling modal | Collects doctor shift date/time/type/availability and displays generated doctor/ambulance rows. | Service changes doctor status rather than `doctor_schedules`; no ambulance shift receiver exists. | **Missing required implementation.** Use stored doctor schedules only and remove unavailable crew scheduling promises. |
| `/map` initial operational projection | Up to `100` emergencies, unbounded ambulance/hospital seeds and visible selected markers/layers. | Local map refresh and marker lifecycle actions cross Pass 1. | **Blocked.** Operators cannot know omitted emergencies or unbounded resource coverage. |
| Public/auth routes under `MapProvider` | No map UI is required on login/password/onboarding/unauthorized paths, yet provider initialization can run emergency, ambulance and hospital reads plus realtime subscriptions. | Same unguarded map-service acquisition as operational map. | **Blocked exposure/mount defect.** Public route load must not acquire map operations or patient-location streams before signed-in role and surface authorization. |
| `/map` nested map-provider mount | Desktop/mobile operational map content is rendered under a new provider even though `AppLayout` already supplies one. | Duplicates map data initialization and channel ownership on the route that displays and acts on operational markers. | **Blocked duplicate owner.** Map must have one scoped authorized provider and deterministic subscription cleanup. |
| Desktop selected emergency marker detail | Displays emergency phone/location/status and can dispatch or complete an emergency directly. | Calls `dispatchEmergency()` / `completeEmergency()` from local marker data; renders a corrupted close symbol. | **Blocked command/exposure/encoding boundary.** Use Pass 1 eligibility and sensitive-field projection for desktop map controls and repair visible encoding. |
| Browser/operator location projection on `/map` | Requests browser position, falls back to `LAGOS_CENTER`, runs nearby facility lookup and renders user marker/session badge. | `GodModeMap` treats fallback position as a location and exposes coordinate-derived session display. | **Blocked location-truth/privacy boundary.** Denied/unavailable location must not become a real operator marker or proximity query; remove coordinate-derived display identifier. |
| Google route rendering on `/map` | Renders routes between responder/patient/facility endpoints. | `GoogleMapsSmartRoute` sends endpoints to Google Routes and draws straight fallback while logging raw errors. | **External disclosure/degradation gate.** Require approved routing exposure, visible degraded route status and redacted errors before route display is trusted. |
| `MapContext` realtime projection | Local emergency, ambulance and assumed user-location arrays. | Broad subscriptions merge inserts/updates/deletes; recenter event only matches one of several visible commands. | **Blocked.** Scoped acquisition, patient-location source and control receiver parity are unproved. |
| `MapPanel` context controls and export | Renders emergency/responder details from `MapContext` and can serialize raw emergencies, selected marker and local settings to a JSON download. | Enabled Export Data download; Contact/Navigate/Call/Track affordances have no proved click receiver; recenter emits an unmatched event. | **Blocked exposure and receiver gap.** No raw emergency export until authorized fields/scope/completeness are explicit; unavailable controls must not look operational. |
| `/map` mobile selected-emergency sheet | Renders selected marker identity, priority, patient phone and location through `LocationCell`, and uses ambulance-id presence as its action branch. | Calls `dispatchEmergency(id, row)` or `completeEmergency(id)` directly from the sheet. | **Blocked cross-pass lifecycle surface.** It must consume Pass 1 action eligibility and exposure truth; `ambulance_id` is not completion, payment or cash-settlement authority. |
| Active responder telemetry | Marker and driver surfaces can expose location/status updates. | Guarded responder-location RPC exists; generic direct ambulance writers are also exported. | **Blocked.** Active-trip location/status must use request-coupled receiver and refreshed tracking truth only. |
| Driver map action scope | Driver action panel derives one active request by responder match or by an ambulance row that may be a first-row fallback. | Location and lifecycle controls invoke request-scoped RPCs after client-side selection. | **Blocked safety and exposure defect.** No driver action is available unless backend-authorized responder-to-request assignment is positively projected; never use arbitrary fleet fallback. |
| Ambulance modal active trips | A selected ambulance's view modal renders patient/trip rows loaded for every active ambulance request at `ambulance.hospital_id`. | Cancel/Arrived/Complete commands call emergency lifecycle RPC wrappers for each rendered request. | **Blocked scope defect.** A vehicle detail surface cannot expose or mutate hospital-wide trips; constrain to `ambulance_id` or route to an emergency-operation surface with correct role and preflight. |
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
| Desktop list/table command variants | Field rendering and corrupted list separator mapped. | Edit/delete actions rendered without grid role gating. | Display mode can alter visible management authority. | Blocked - capability projection required |
| Fleet/doctor context panels | Context summary labels and route event emissions mapped. | Route-paired create/filter/analytics only. | Mock/stale/empty and status-label truth are unclosed. | Blocked - typed summary state required |
| Provider settings professional card | Own doctor-row render and edit controls mapped. | Self-service update resolves through broad direct doctor update. | Allowed fields, fee visibility and active-assignment/status consequences remain unproved. | Blocked |
| Staff scheduling | Visible shift promise mapped. | Stored `doctor_schedules` not consumed. | Generated rows/statistics are not persisted truth. | Missing required implementation |
| Map operational feed | Seed fields/layers/marker dependencies mapped. | Lifecycle actions cross Pass 1. | Mixed bounds and broad subscriptions unclosed. | Blocked |
| Public/auth map-provider mount | Operational feed and patient-location acquisition can begin without map route or authenticated actor. | No public operational command should exist. | Provider mount authorization missing. | Blocked - disable acquisition before route/auth proof |
| Map context export and quick controls | Raw downloadable emergency/marker data and visible control labels mapped. | Export is live; contact/navigation/tracking receivers absent. | Sensitive export scope and action parity unproved. | Blocked |
| Mobile map selected-emergency commands | Patient/contact/location render and marker action branch mapped. | Direct dispatch/complete wrappers bypass the emergency command projection. | Actor exposure, payment/cash eligibility and refreshed lifecycle outcome are unclosed. | Blocked - Pass 1 dependency |
| Active telemetry | Responder read/write paths mapped. | Guarded RPC and generic CRUD coexist. | Patient tracking-ready convergence unproved. | Blocked |
| Driver map assignment identity | Driver-mode matching and fallback selection traced. | Telemetry/status commands operate on chosen request id. | Arbitrary first-ambulance fallback can select unrelated request. | Blocked - remove fallback first |
| Ambulance modal trip controls | Hospital-scoped active request display traced inside vehicle modal. | Lifecycle commands use rendered emergency id. | Vehicle surface scope is broader than vehicle identity. | Blocked - scope or relocate |
| Clinician handoff | Dependency mapped. | Assignment receiver absent from UI. | Emergency/detail integration required. | Missing required surface |

## Cross-Pass Provider Operations Register

| Dependent pass | Provider/fleet dependency that must not be lost |
| --- | --- |
| Pass 1 - emergency lifecycle | Dispatch, desktop/mobile marker actions, patient contact/location exposure, completion payment/cash legality, telemetry and persisted clinician handoff. |
| Pass 3 - facilities/capacity | Facility dispatch eligibility, hospital assignment and operational bed/ambulance availability. |
| Pass 4 - identity/verification | Organization/facility identity, provider role and readiness authority. |
| Pass 6 - visits/outcomes | Assigned clinician and responder context in clinical outcome projection. |
| Pass 8 - map/shell/analytics | Feed bounds, recenter receivers, aggregate fleet metrics and shared realtime ownership. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View/manage non-active fleet records | Authorized table CRUD after field repair | `ambulances` scoped policy | Use real hospital/org fields and valid status vocabulary. |
| Dispatch/trip/responder telemetry for active emergency | Workflow command | Request-coupled dispatch/telemetry receivers | Direct fleet status/location editing cannot stand in for active-trip truth. |
| Resolve driver's current ambulance/request | Scoped read/eligibility projection | Backend-authorized responder/ambulance/request relation | Do not fall back to the first visible ambulance; no matched assignment means telemetry/status actions are unavailable. |
| Cancel/advance/complete trip from ambulance detail | Workflow command with selected-vehicle scope | Request lifecycle command facade consuming a request proven linked to the opened ambulance | Do not expose hospital-wide request commands in one ambulance modal; route to emergency detail or filter strictly by ambulance id plus role. |
| Center operational map or selected request | UI command over rendered map state | Mounted map controller/refiner | Use the receiving map-control contract and verify the user sees immediate map movement or bounded feedback for both general and targeted centering. |
| Export map operational data | Scoped sensitive data export | Map projection/export owner not yet present | Do not download raw emergency rows or local marker state; define role-safe fields, active-feed bounds, redaction and incomplete-data labels first. |
| Contact, navigate to or track selected map entity | Workflow navigation/communication command or unavailable operation | No mounted receiver proved for current panel buttons | Remove/disable or implement through one explicit receiver; no inert operational affordance. |
| Dispatch or complete an emergency from the mobile map sheet | Emergency lifecycle workflow command | Pass 1 emergency action projection and command facade | Do not infer completion legality from `ambulance_id`; the mobile map must use the same payment/cash/state transition and refreshed-result gates as emergency detail/list surfaces. |
| Manage doctor directory fields | Authorized table CRUD with projection boundary | `doctors`, profile sync automation | Separate directory-owned from profile-projected identity fields. |
| Edit own provider profile from settings | Scoped self-service workflow command | Provider-owned doctor profile command with field allowlist and active-assignment preflight | Bio/experience/fee edits and operational availability/status must not share unchecked broad-row update authority. |
| Manage doctor shifts/conflicts/statistics | Authorized table CRUD | `doctor_schedules` | Replace generated/status-derived shifts with stored rows. |
| Assign doctor to emergency | Workflow command | `assign_doctor_to_emergency`, `emergency_doctor_assignments` | Coordinate with Pass 1 and persist handoff truth. |
| Upload provider/vehicle imagery | Scoped media/storage boundary | Doctor image field and Pass 3 media/storage authority | Do not upload ambulance media without row receiver; hospital provenance belongs to Pass 3. |
| Compute fleet/doctor totals | Scoped aggregate projection | Fleet/provider owner with organization-to-hospital scope | Do not replace exact counts with capped fetched lengths or filter hospital keys by organization id. |
| Show fleet/doctor context summary | Scoped aggregate/read projection | Provider operations summary owner with typed failure/degraded state | Do not label broad, mocked, stale or empty snapshots as live, ready, active or off duty. |
| Edit/delete from any route variant | Authorized CRUD capability | Provider operations capability map before callback composition | Grid, list, table and mobile surfaces expose identical role/row-source command authority. |
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
| Driver map command eligibility | Signed-in responder id, positively assigned ambulance id, request id, relation source, authorization/loading/unassigned state | `driverActiveEmergency` cannot be enabled through a client fallback ambulance; receiver eligibility must agree with displayed assignment. | A driver cannot publish telemetry or advance another responder's incident from a misleading map state. |
| Ambulance detail active trips | Opened ambulance id, request id, responder id, hospital id, status, command eligibility and source-surface label | Active rows shown in a vehicle modal must be linked to that ambulance; otherwise commands remain absent and hospital operations use a deliberate request surface. | Hospital-wide incidents are not mutated while the operator believes they are managing one vehicle. |
| Fleet status/location edits | Ambulance id, maintenance/availability status, non-active location fields, last updated timestamp | Generic fleet edits must not overwrite request-coupled responder telemetry. | App ETA and responder marker stay tied to live trip truth, not stale fleet maintenance coordinates. |
| Responder telemetry row | Request id, responder id, ambulance id, lat, lng, timestamp, heading, route/ETA seed, freshness state | Telemetry publish/storage is out of first-slice scope until receiver and realtime invalidation are named. | App can distinguish fresh live tracking, stale tracking, and unavailable telemetry without fabricated confidence. |
| Doctor identity card | Profile id, doctor id, display name, specialty, license/verification status, hospital/facility id, organization id | Reads must not collapse profile identity, doctor row identity, and provider role into one field. | App visit/emergency handoff can resolve clinician identity without ambiguous provider records. |
| Provider readiness badge | Role, provider type, verification status, availability, current assignment | Badge projection must state which fields are evidence and which are unavailable. | Console does not imply a doctor is schedulable or dispatchable from role alone. |
| Desktop list/table row controls | Actor role, row id, row status, command capabilities, disabled/unavailable reason and source variant | Parent must omit or disable edit/delete callbacks for unauthorized rows before list/table composition; renderer selection cannot grant commands. | Operators do not gain destructive provider/fleet authority by changing view mode. |
| Context panel provider/fleet summary | Query state, aggregate basis/window, row status, source freshness and failed/empty/mock/degraded distinction | Panels consume typed provider summary state; remove misleading `Active`/`Live`/`Off duty` labels where source does not prove them. | Dashboard context does not present stale or synthetic provider availability as dispatch confidence. |
| Provider settings self-edit form | Actor profile id, doctor id, editable-field allowlist, consultation fee basis, availability/status, current assignment and verification/readiness state | Current broad `updateDoctor(doctorProfile.id, updates)` path remains blocked for operational status until self-service authorization and active-assignment effects are named; omit fields not authorized for self-edit. | A signed-in provider cannot unintentionally change emergency handoff availability or patient-facing fee/readiness truth without a reflected authorized result. |
| Doctor schedule row | `doctor_schedules` doctor id, date, start/end, schedule type, availability, source timestamp | Schedule create/update controls stay disabled until exact receiver and required fields are charted. | App appointment/emergency routing can rely on schedule windows instead of generated/status-only rows. |
| Ambulance/crew schedule row | Ambulance id, driver/crew ids, time window, exclusion/unavailable reason | Keep marked unavailable if no receiver table/RPC exists. | Console does not create phantom coverage that app dispatch cannot honor. |
| Emergency clinician handoff | `emergency_doctor_assignments` request id, doctor id, assignment status, notes, timestamps | Assignment mutation must prove receiver table/RPC and status transition rules. | Patient emergency timeline reflects real clinician assignment rather than console-only intent. |
| Map feed completeness | Emergency feed cap, ambulance feed bounds, hospital/facility feed bounds, pagination/incomplete marker | Feed readers must expose incomplete/degraded state instead of silently truncating. | Dispatch map does not hide active demand or supply while app requests are waiting. |
| Map centering actions | Target type, target id, lat/lng, source row, active map event name | Consolidate `centerMap`, `recenter-map-target`, and `recenter-map` before new actions are added. | Operators can locate the same emergency/vehicle/hospital object the app is tracking. |
| Map JSON export | Actor role/scope, selected filters, permitted incident/responder/facility fields, redaction rules, feed limit/incomplete state, generated timestamp | Export remains disabled until it consumes the bounded map projection rather than raw context arrays. | Emergency locations and responder context are not downloaded outside authorized operational need. |
| Selected-marker quick actions | Entity type/id, callable/navigable target, tracking receiver, disabled reason and pending/result state | Current inert Contact/Navigate/Call/Track controls cannot remain as actionable UI. | Operators do not believe response coordination occurred when no command was sent. |
| Mobile selected-emergency sheet | Request id, actor role/scope, patient-contact/location exposure, ambulance/responder relation, lifecycle state, payment/cash completion eligibility, command pending/result and refreshed truth | Direct `dispatchEmergency()` / `completeEmergency()` remain blocked until Pass 1 owns their action capability; ambulance presence alone cannot authorize completion. | A mobile operator cannot expose patient data unnecessarily or prematurely complete an unpaid/unsettled incident. |
| Base map tiles | Tile provider, load/error state, attribution/degraded state | External tile dependency remains view-layer only; no service mutation. | Console map degradation is visible without changing dispatch data truth. |
| Provider/vehicle images | Storage bucket/path, public/private visibility, source provenance, fallback image | Upload controls remain disabled until bucket policy and receiver ownership are documented. | App and console do not expose fragile direct provider URLs or private media by accident. |
| Automation/failover status controls | Target object id, current lifecycle state, requested state, side effects on active request/trip/assignment | Any enablement must include downstream reassignment/clearance consequences. | Console status changes cannot orphan app trips, doctor assignments, or responder tracking. |

Implementation rule: the first slice may centralize read projections, paging, map feed bounds, disabled/unavailable controls, and receiver labels. It must not add telemetry publishing, storage uploads, schedule mutations, or schema changes before the receiver and app consequence charts close.

Generated trace confirmation (May 25): `doctor_schedules` and `emergency_doctor_assignments` now have cross-repo baseline traces and report zero matched Console CRUD surfaces. The scheduling modal's current status-derived behavior is not table-backed shift ownership, and clinician assignment must be added through the persisted command/projection boundary coordinated with Pass 1.

Storage evidence confirmation (May 25): current source provides no active `images` bucket-policy authority outside archive material. Doctor image persistence remains conditional on deployed Storage proof; ambulance image upload remains disabled in scope because no audited row receiver owns the uploaded object.

## Exact Provider, Telemetry, And Scheduling Exhibits

These are the code anchors for the Pass 5 implementation handoff. The audit target is to separate ordinary provider registry edits from active emergency telemetry, shift truth and assignment lifecycle.

| Exhibit | Current code location | Contract implication |
| --- | --- | --- |
| Ambulance page exact count then capped row read | `frontend/src/components/pages/AmbulancesPage.jsx:79-156` builds a count query and a data query capped at `1000`. | Keep exact count and row query in one server-paged owner; do not overwrite count with fetched length or derive bulk scope from capped rows. |
| Ambulance org-admin stat mismatch | `AmbulancesPage.jsx:176-188` filters `ambulances.hospital_id` by `orgId`. | This repeats organization id versus hospital id drift; fleet stats must resolve facility ids under organization scope first. |
| Ambulance variant command drift | `AmbulancesPage.jsx:630-650` role-gates grid edit/delete, while `:886-899` passes edit/delete handlers into list/table unconditionally; `AmbulanceListView.jsx:56-78` and `AmbulanceTableView.jsx:132-146` render them. | One provider capability map must gate commands before every view composition; a layout toggle cannot expand destructive authority. |
| Ambulance panel readiness and empty-state claims | `components/context/AmbulancesPanel.jsx:16-18,43-65,96-131` consumes global stats/recent rows and labels them `Ready Units`, `Live Fleet` and empty state `Off duty`; `PageDataContext.jsx:395-421` provides broad untyped reads and no failed state. | Panel summary must use scoped typed provider truth and distinguish failed/unavailable/empty/stale rather than describing an absent list as off-duty operational fact. |
| Ambulance list visible encoding | `components/views/AmbulanceListView.jsx:34` renders corrupted row separators between type, plate and station. | Include the mounted list variant in the UTF-8/mojibake repair gate when provider views are implemented. |
| Ambulance direct create/update | `frontend/src/services/ambulancesService.js:83-178` inserts/updates `ambulances`, including status, location, current call, profile and organization fields. | Non-active fleet maintenance must be separated from active trip/responder telemetry and lifecycle status commands. |
| Ambulance direct driver assignment | `ambulancesService.js:185-201` updates `ambulances.profile_id` directly. | Driver assignment needs conflict/active-trip proof and canonical profile/ambulance relationship receiver. |
| Ambulance direct location writer | `ambulancesService.js:207-223` updates `ambulances.location`. | Active responder location must use request-coupled telemetry receiver; direct location update is maintenance-only or disabled. |
| Ambulance status writer | `ambulancesService.js:302-319` updates `ambulances.status` directly. | Status changes can trigger or conflict with emergency failover; expose active-assignment impact before mutation. |
| Ambulance modal org id as hospital id | `frontend/src/components/modals/AmbulanceModal.jsx:60-75` sets `hospital_id` from `orgId` for org-admin create. | Creation must select/resolve a real facility id under the organization, not submit organization id into hospital foreign key. |
| Ambulance modal assignment reads | `AmbulanceModal.jsx:100-132` subscribes/loads active assignments and utilization by `ambulance.hospital_id`. | Detail surface should use provider operations projection with role and active-trip exposure, not modal-owned assignment truth. |
| Ambulance modal hospital-wide commands | `AmbulanceModal.jsx:700-781` renders each row returned by the hospital-scoped assignment query and invokes `cancelTrip(assignment.id)`, `updateTripStatus(assignment.id, 'arrived')`, or `completeTrip(assignment.id)`. | The IDs are emergency request ids, but the selected vehicle surface has not proved those requests belong to that ambulance. Keep commands unavailable until vehicle/request scope is exact or move them to request operations. |
| Ambulance modal profile filtering | `AmbulanceModal.jsx:150-173` filters provider profiles by `organization_id` and existing ambulance assignment. | Assignment candidate list needs backend-authorized relationship/conflict projection. |
| Doctor service paged read | `frontend/src/services/doctorsService.js:22-76` reads doctors with count, filter and profile display-id enrichment. | This is closer to the desired owner, but profile display id and doctor id must be shown as separate identities. |
| Doctor direct CRUD | `doctorsService.js:92-161` inserts/updates/deletes `doctors` directly. | Doctor directory CRUD must not imply profile role, schedule readiness or emergency assignment truth. |
| Doctor variant command drift | `components/pages/DoctorsPage.jsx:820-842` role-gates grid edit/delete, while `:855-877` passes edit/delete handlers into list/table unconditionally; `DoctorListView.jsx:56-76` and `DoctorTableView.jsx:147-161` render them. | Resolve directory command authority once above presentation; no unauthorized edit/delete by selecting list or table display. |
| Doctor panel false readiness claims | `components/context/DoctorsPanel.jsx:16-18,43-65,96-131` labels total rows `Active Faculty` and every non-`on_call` recent row `Active`; `PageDataContext.jsx:256-293` substitutes `mockDoctorsData` on fetch failure. | Panel requires exact status labels and typed failed/degraded state; mock/failure content cannot be surfaced as active clinician availability. |
| Doctor list visible encoding | `components/views/DoctorListView.jsx:34` renders corrupted row separators between specialty, facility and experience. | Include the mounted list variant in the UTF-8/mojibake repair gate when provider views are implemented. |
| Provider settings self-service update | `frontend/src/components/pages/SettingsPage.jsx:317` mounts `DoctorProfileCard`; `frontend/src/components/views/DoctorProfileCard.jsx:14-43,216-270` renders and submits fee/experience/availability/status/bio; `frontend/src/hooks/useDoctorProfile.js:11-47` reads by current profile and calls `updateDoctor(...)`. | This is a live provider-owned mutation surface separate from `/doctors`; define self-editable fields and active-assignment impact before retaining availability/status edits. |
| Doctor modal org id as hospital id | `frontend/src/components/modals/DoctorModal.jsx:46-59` sets `hospital_id` from `orgId` for org-admin create. | Same facility identity defect as ambulances; doctor rows need real hospital id resolution. |
| Doctor modal provider linkage | `DoctorModal.jsx:113-154` fetches provider profiles and defaults hospital id from profile organization id. | Profile organization id is not a hospital id; selected doctor linkage must resolve facility context separately. |
| Doctor invite payload drift | `DoctorModal.jsx:178-191` invites provider role with `provider_type: doctor` and `organization_id: submitData.hospital_id`. | Invite metadata must carry organization id, not selected facility id; facility assignment needs separate field/receiver. |
| Staff schedule generated rows | `frontend/src/services/staffSchedulingService.js:21-128` derives schedules from ambulance crew arrays and doctor status for the current day. | Not table-backed scheduling. Shift rows are fabricated projections unless sourced from `doctor_schedules`. |
| Staff schedule create | `staffSchedulingService.js:226-259` creates a "schedule" by updating doctor status. | A successful schedule command must persist date/start/end/type into `doctor_schedules`, not only flip status. |
| Staff schedule update/delete | `staffSchedulingService.js:267-312` parses synthetic `doctor_` ids and updates doctor status. | Editing/deleting synthetic rows cannot be retained as scheduling CRUD. |
| Schedule stats | `staffSchedulingService.js:321-392` computes shift stats from doctor and ambulance status, with ambulance hospital-name matching. | Stats must come from stored schedules or be labelled operational status summary, not shift coverage. |
| Schedule conflict check | `staffSchedulingService.js:399-423` uses doctor status only. | Conflict detection must compare persisted shift windows once scheduling is implemented. |
| Schedule broad realtime | `staffSchedulingService.js:430-468` subscribes to all doctors and ambulances. | Scheduling owner should subscribe/invalidate scoped `doctor_schedules` and detail exceptions, not broad registry tables. |
| Dormant local scheduler | `frontend/src/components/scheduling/StaffScheduler.jsx:27-515` defines hard-coded staff/shifts, local add/delete controls and a corrupted visible separator; no importer was found in the current mounted-source scan. | Source presence is not CRUD coverage. Keep it unmounted/retire it or rebuild it only as a consumer of the canonical stored schedule projection. |
| Map seed bounds | `frontend/src/services/supabaseMapService.js:19-71` caps emergencies at `100` while ambulances/hospitals have no matching feed bounds. | Map projection must expose feed limits and incomplete-data state by source. |
| Mobile fleet/provider KPI fallbacks | `frontend/src/components/mobile/MobileAmbulances.jsx:94-104,212-237` and `MobileDoctors.jsx:91-101,196-221` reduce received rows into status/rating metrics and `LIVE` trend copy whenever aggregate fields are missing. | Mobile variants must consume scoped operational aggregate projections with measurement/completeness state or show unavailable/current-window labels; row data is not provider-network performance truth. |
| Map broad realtime | `supabaseMapService.js:80-146` subscribes broadly to emergency requests, ambulances and a `users` table. | Realtime topology must be scoped to active operations and confirmed patient/responder location tables. |
| Nearby hospital fallback | `supabaseMapService.js:154-174` falls back from `nearby_hospitals` to all available hospitals ordered by name. | Fallback must be labelled non-nearby/unbounded or disabled; it cannot silently preserve proximity semantics. |
| Map panel sensitive export | `frontend/src/components/context/MapPanel.jsx:65-87,253-259` serializes `emergencyRequests`, `selectedMarker` and settings into `map-data-<date>.json`. | Export is a mounted data-exposure path and must consume an authorized bounded/redacted projection, not raw map context. |
| Map panel inert response actions | `MapPanel.jsx:156-160,182-186` renders Contact/Navigate or Call/Track buttons without click receivers in marker detail branches. | Mark unavailable or connect to proved commands with immediate feedback; labels alone are not workflow authority. |
| Nested map context acquisition | `frontend/src/App.js:139-150` provides `MapProvider` to route content and `frontend/src/components/pages/GodModeMap.jsx:735-740` mounts another provider for `/map`; each `MapContext` effect invokes `fetchInitialMapData()` and subscribes to emergency/ambulance/users. | A live map entry can double-fetch and double-subscribe operational/location truth; retain one authorized bounded owner only. |
| Desktop map emergency detail and command | `frontend/src/components/map/MarkerDetailPanel.jsx:16-180` renders patient phone/location and issues dispatch/complete commands; `:57` renders corrupted close-glyph text. | This desktop receiver needs the same Pass 1 lifecycle/exposure/payment contract as mobile and enters the encoding repair gate. |
| Operator location false fallback and display disclosure | `frontend/src/components/pages/GodModeMap.jsx:109-114,152-189` derives a visible session id from browser coordinates and sends `LAGOS_CENTER` through nearby-hospital lookup when geolocation fails; `frontend/src/components/map/MapRenderers/GoogleMapsRenderer.jsx:222-229` displays the derived id. | Map location needs `ready`, `denied`, `unavailable` and explicitly labelled manual/fallback states; do not render or query as though a fabricated center is operator truth or expose coordinate-derived decoration. |
| Google traffic route external boundary | `frontend/src/components/map/MapRenderers/GoogleMapsRenderer.jsx:241-253` sends active route endpoints into `GoogleMapsSmartRoute`; `frontend/src/components/map/MapRefiner/GoogleMapsSmartRoute.jsx:57-117` invokes Google Routes and logs raw error before rendering straight fallback. | Route provider use must be authorized/privacy-reviewed and its fallback visibly degraded; raw provider error objects do not belong in browser logs. |
| Mobile map emergency action sheet | `frontend/src/components/mobile/MobileMap.jsx:247-303` renders selected-emergency phone/location fields and invokes `dispatchEmergency()` or `completeEmergency()` according to `ambulance_id`; `frontend/src/components/pages/GodModeMap.jsx:485` mounts this mobile variant. | This responsive map path directly participates in emergency lifecycle and patient-data exposure. It must consume Pass 1 action legality/payment/cash/exposure state rather than inventing mobile-only eligibility. |
| Driver trip commands | `frontend/src/services/driverManagementService.js:130-224` calls console emergency RPCs and renders success toasts. | Trip status commands belong to emergency lifecycle projection and must refresh request, responder, wallet/capacity consequences. |
| Dispatch provider candidate selection | `frontend/src/services/emergencyResponseService.js:31-39,55-61,119-163` loads available ambulances and matching doctors without limits and chooses the first candidate during dispatch. | Pass 5 must supply bounded/scoped responder and clinician readiness candidates to the Pass 1 command facade; source order is not automatic dispatch authority. |
| Driver map assignment fallback | `frontend/src/components/pages/GodModeMap.jsx:306-328` resolves `assignedAmbulance` with `processedAmbulances[0]` fallback, then selects a request when its `ambulance_id` matches that row; `:353-396` publishes location or status against the selected request. | This is an unauthorized-selection risk before the RPC even runs. Driver UI must project only a proven assignment relation; without one it displays no active trip and offers no command. |

## Provider Operations Projection Boundary Target

The first implementation slice should create provider operations projections for fleet, doctor and scheduling surfaces before mutating records.

```ts
type ProviderOperationsProjection = {
  actor: { userId: string; role: string; organizationId: string | null };
  fleet: {
    rows: AmbulanceRow[];
    totalCount: number | null;
    aggregate: {
      available: number | null;
      onRoute: number | null;
      busy: number | null;
      maintenance: number | null;
      basis: 'server_aggregate' | 'current_page' | 'unavailable';
    };
    feedState: 'ready' | 'truncated' | 'unauthorized' | 'degraded';
  };
  doctors: {
    rows: DoctorRow[];
    totalCount: number | null;
    identityMode: 'doctor_and_profile_separate';
    selfService: {
      doctorId: string | null;
      editableFields: string[];
      activeAssignmentImpact: 'none' | 'requires_confirmation' | 'unavailable' | 'unknown';
    };
  };
  assignments: {
    activeTripsByAmbulance: Record<string, unknown>;
    availableDrivers: DriverCandidate[];
    conflictState: 'checked' | 'unchecked' | 'unavailable';
    driverCommandScope: 'proved_assignment' | 'unassigned' | 'unauthorized' | 'degraded';
  };
  operations: {
    canEditFleetMaintenance: boolean;
    canPublishTelemetry: boolean;
    canAssignDriver: boolean;
    canEditDoctorDirectory: boolean;
    canEditDoctorSchedule: boolean;
  };
};
```

Rules:

- Resolve organization to allowed facility ids before any `hospital_id` filter or payload.
- Display doctor id, profile id and display id separately when they differ.
- Active request/trip/telemetry fields are read-only in registry surfaces unless a request-coupled command owns the mutation.
- Provider self-service profile edits consume the same doctor projection, but must use a deliberately narrower command: ordinary profile presentation fields may not silently inherit operational status, assignment or fee authority.
- A driver-mode map command requires a positively matched responder/ambulance/request relationship. It cannot derive eligibility from the first fleet row or another presentation fallback.
- An ambulance modal may render request commands only for requests proved linked to that ambulance. Hospital-wide operations belong in a request/dispatch surface, not an individual vehicle card.
- Provider media upload remains disabled/unavailable until Storage and row receiver authority are proved.

## Scheduling Projection Boundary Target

Scheduling must be built around `doctor_schedules`, not status-derived rows:

```ts
type DoctorScheduleProjection = {
  rows: Array<{
    id: string;
    doctorId: string;
    profileId: string | null;
    hospitalId: string;
    date: string;
    startTime: string;
    endTime: string;
    scheduleType: string;
    availability: 'available' | 'unavailable' | 'on_call' | 'booked';
    source: 'doctor_schedules';
  }>;
  stats: {
    scheduledToday: number;
    availableToday: number;
    conflicts: number;
    basis: 'stored_shifts' | 'unavailable';
  };
  unsupported: {
    ambulanceCrewScheduling: true;
    reason: string;
  };
};
```

The first implementation must either consume stored `doctor_schedules` or explicitly mark scheduling unavailable. Do not preserve a flow where creating a shift only updates doctor status and then claims "Staff member scheduled successfully."

## Map And Telemetry Projection Boundary Target

Map truth should be a projection with feed bounds, not raw arrays:

```ts
type OperationsMapProjection = {
  emergencies: { rows: EmergencyMapRow[]; limit: number | null; incomplete: boolean };
  ambulances: { rows: AmbulanceMapRow[]; limit: number | null; incomplete: boolean };
  hospitals: { rows: FacilityMapRow[]; limit: number | null; incomplete: boolean; fallback: 'nearby' | 'available_unbounded' | 'none' };
  telemetry: {
    freshnessByResponder: Record<string, 'fresh' | 'stale' | 'missing'>;
    publishEnabled: boolean;
    receiver: 'console_update_responder_location' | 'unavailable';
  };
  controls: {
    recenterEvent: string;
    targetTypes: Array<'emergency' | 'ambulance' | 'hospital' | 'user_location'>;
    exportState: 'unavailable' | 'authorized_bounded';
    unavailableQuickActions: Array<'contact' | 'navigate' | 'call' | 'track'>;
    emergencyActionState: 'owned_by_pass_1' | 'unavailable';
  };
};
```

Do not add map visual work until this projection names what is missing, stale, truncated or unavailable. Tile availability is visual-layer health; it must not change the meaning of emergency/telemetry data.

## Pass 5E Implementation Sequence And Blocker Matrix

This pass touches active operations. Fleet records, doctor availability, map telemetry and shift scheduling can affect emergency dispatch, responder tracking, clinician handoff, capacity and patient-visible readiness. The first implementation must therefore centralize read truth and disable false commands before enabling any new operational mutation.

### Work Order

| Order | Slice | Can start now? | Target | Must not do |
|---|---|---:|---|---|
| 1 | Provider operations projection contract | Yes | Add read-only projections for fleet rows, doctor rows, active assignment state, self-service readiness, schedule state and command capability. | Do not mutate telemetry, schedules, Storage, assignment, status or active-trip state. |
| 2 | False command and export downgrade | Yes | Disable or relabel raw map JSON export, inert Contact/Navigate/Call/Track controls, unmatched recenter actions, hospital-wide trip commands in vehicle modal, and schedule success copy backed only by doctor status. | Do not keep a visible enabled control without a mounted receiver and scoped payload. |
| 3 | Fleet and doctor list migration | After slice 1 | Move `/ambulances`, `/doctors`, mobile variants and panels to server-paged/source-labelled projections with true counts and current-page labels where needed. | Do not overwrite exact counts with fetched `1000`-row length or call row reductions `LIVE` network truth. |
| 4 | Facility-scope repair for provider records | After Pass 4 identity projection | Resolve organization scope to allowed facility ids before any `hospital_id` filter or create payload for ambulances/doctors. | Do not submit organization UUIDs into `hospital_id`. |
| 5 | Provider self-service split | After slice 1 and Pass 4 | Split provider-owned profile presentation edits from operational availability/status/fee/readiness fields. | Do not let `DoctorProfileCard` use broad admin `updateDoctor()` for active-emergency-affecting status without preflight. |
| 6 | Map feed projection | After slice 1 | Replace raw map arrays with bounded/incomplete/degraded feed state for emergencies, ambulances and hospitals. | Do not export or act on a feed whose bounds and redaction are unknown. |
| 6A | Map single-owner mount and desktop selected-marker downgrade | Yes | Remove duplicate provider ownership and route desktop marker patient exposure/dispatch/completion through the Pass 1 unavailable/authorized projection before any new map capability. | Do not retain duplicate subscriptions or desktop-only emergency command eligibility. |
| 6B | Map location and route-provider truth | Yes | Remove coordinate-derived session decoration, distinguish denied/unavailable operator position from fallback map center and label external Google-route fallback/degradation. | Do not perform proximity lookup from fabricated operator location or present straight-line fallback as traffic-aware truth. |
| 7 | Doctor scheduling read model | After slice 1 | Read stored `doctor_schedules` rows or mark scheduling unavailable. | Do not claim schedule creation by flipping `doctors.status`. |
| 8 | Active telemetry and trip commands | Blocked until receiver proof | Route driver map status/location through positively matched request/responder/ambulance assignment and request-coupled receivers. | Do not use first-ambulance fallback or generic `ambulances.location/status` writes for active trips. |
| 9 | Driver/ambulance assignment writes | Blocked until command proof | Add conflict-aware driver/profile/ambulance assignment receiver and reflected active-trip state. | Do not direct-write `ambulances.profile_id` as full assignment truth. |
| 10 | Clinician assignment handoff | Cross-pass with Pass 1 | Implement `emergency_doctor_assignments` command/read state in emergency detail and doctor operations. | Do not represent a suggested doctor as assigned before persisted assignment truth exists. |
| 11 | Provider/vehicle media | Blocked until Storage proof | Enable doctor/ambulance image writes only after bucket policy and row receiver ownership are proved. | Do not persist fragile or private media URLs as operational provider truth. |

### Blocker Matrix

| Status | Work item | Reason |
|---|---|---|
| Ready | Read-only provider operations projection | Existing exhibits identify row fields, active-assignment gaps, mobile metrics, map feed bounds and self-service risks. |
| Ready | Disable raw map export and inert map controls | This is an exposure/false-capability cleanup and does not require backend mutation. |
| Ready | Disable hospital-wide vehicle trip commands | Vehicle modal commands are currently broader than opened ambulance identity; disabling prevents misleading operations. |
| Ready | Schedule copy downgrade | Current scheduling can stop claiming persisted shift success before table-backed schedules are implemented. |
| Ready after projection | Fleet/doctor list migration | Requires shared projection so desktop/mobile/panel totals and actions stay aligned. |
| Ready after projection | Provider self-service read split | Needs explicit editable-field and active-assignment-impact state. |
| Cross-pass | Facility identity for provider records | Depends on Pass 4 organization/facility projection and Pass 3 facility eligibility. |
| Cross-pass | Mobile map emergency actions | Belongs to Pass 1 action/exposure/payment legality and Pass 5 map projection. |
| Cross-pass | Analytics/map shell cleanup | Pass 8 consumes finalized bounded provider/map projections. |
| Blocked | Active telemetry publishing | Requires positive responder/request assignment and request-coupled receiver verification. |
| Blocked | Driver assignment mutation | Requires conflict, active-trip transfer and reflected assignment state proof. |
| Blocked | `doctor_schedules` CRUD | Requires table-backed receiver mapping, conflict checks and reload proof. |
| Blocked | Provider/ambulance image upload | Storage policy and row ownership are not proved. |
| Blocked | Clinician handoff mutation | Requires Pass 1 emergency detail projection and assignment receiver/status contract. |

### First Implementation Ticket Contract

The first code pass should be read/disable only:

- Add or identify a provider operations projection service, for example `frontend/src/services/providerOperationsProjectionService.js`.
- Return stable projection slices for:
  - fleet list/count/aggregate,
  - doctor list/count/identity linkage,
  - provider self-service editable fields,
  - active trip assignment state,
  - doctor schedule source state,
  - map feed bounds and incomplete flags,
  - command readiness.
- Preserve separate identities:
  - ambulance id,
  - driver/profile id,
  - doctor id,
  - provider profile id,
  - hospital/facility id,
  - organization id,
  - emergency request id.
- Expose command readiness as data:
  - `canEditFleetMaintenance`
  - `canAssignDriver`
  - `canPublishTelemetry`
  - `canUpdateTripStatus`
  - `canEditDoctorDirectory`
  - `canEditProviderSelfProfile`
  - `canEditOperationalAvailability`
  - `canCreateDoctorSchedule`
  - `canExportMapData`
  - `canUseMapQuickAction`
- Default unsafe commands to `false` with `disabledReason` and source owner.
- Keep request-owned lifecycle commands out of provider registry pages unless the request projection explicitly grants them.
- Ensure map projection acquisition and realtime channels are not mounted on login, password, onboarding, unauthorized or fallback routes; authorization is a precondition to operational feed reads, not only to showing `/map`.
- Ensure entering `/map` creates exactly one map projection/realtime owner; `GodModeMap` cannot remount a second provider beneath the shell.
- Treat desktop `MarkerDetailPanel` and mobile `MobileMap` as equal emergency action/exposure receivers; both default unsafe dispatch/completion and patient contact/location presentation to unavailable until Pass 1 grants them.
- Treat browser location as a permissioned input with denied/unavailable state; a display center is not an operator position and cannot seed proximity operations or a coordinate-derived session label.
- Treat Google route computation as an external coordinate handoff with explicit degraded fallback state and redacted provider failures.

The first implementation ticket should not touch:

- telemetry publish/write behavior,
- direct `ambulances.location` or `ambulances.status` active-trip writes,
- driver assignment writes,
- doctor schedule writes,
- clinician assignment writes,
- Storage uploads,
- map visual redesign,
- emergency dispatch/completion semantics,
- database migrations or cleanup.

### Acceptance Gates For Implementation

Before the first implementation commit:

- `/ambulances`, `/doctors`, mobile fleet/doctor views and map surfaces have a named source for every total, badge, status, rating, action and trend label.
- Loaded-row metrics are labelled current-page/current-filter or replaced by aggregate proof.
- Driver mode cannot select an active request through a fallback ambulance.
- Vehicle modal cannot show or command hospital-wide trips while scoped to one vehicle.
- Provider self-service distinguishes presentation edits from operational availability/status/fee/readiness edits.
- Scheduling either reads `doctor_schedules` or is labelled unavailable; no status-only update claims schedule persistence.
- Unmounted `StaffScheduler` remains excluded or is retired; it cannot be promoted as an alternate mock/local-only scheduling workflow.
- Map feed projection names per-source bounds and incomplete state.
- Map export remains unavailable until role, redaction, fields, feed bounds and generated artifact scope are proved.
- Active telemetry uses request-coupled receiver truth and never generic fleet-location truth.

Suggested verification once code changes begin:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
npm run build
```

Runtime smoke after code begins should include `/ambulances`, `/doctors`, `/map`, the ambulance modal, doctor modal, provider settings professional card, staff scheduling modal and mobile map/fleet/provider variants. Telemetry, schedule, assignment, Storage and emergency lifecycle mutations remain excluded until a separate implementation pass explicitly authorizes non-production receiver testing.

## Pass 5A Surface-By-Surface Confirmation Ledger

This ledger is the continuation map for the next auditor or implementer. It keeps the audit in the full chain: source truth -> service/RPC/storage -> hook/state -> route/modal/panel/UI -> payload -> receiver -> app consequence.

| Surface or service edge | Current proof to retain | Required disposition before implementation | Stop condition |
| --- | --- | --- | --- |
| `/ambulances` route and mobile fleet | `AmbulancesPage`, `MobileAmbulances`, `useAmbulances`, `ambulancesService` prove a mounted CRUD/list surface with capped/local totals and bulk delete. | Move list/count/aggregate/action capability into provider operations projection; expose loaded-window metrics only as loaded-window values until server totals exist. | Do not call row status/location writes active-trip truth. |
| Ambulance create/edit/detail modal | `AmbulanceModal` owns image upload, driver assignment, active trip display and command affordances. | Split vehicle maintenance, driver assignment, media, and active-trip command projections; active trips must be scoped to opened ambulance id. | No hospital-wide request commands from one vehicle modal. |
| `/doctors` route and mobile provider directory | `DoctorsPage`, `MobileDoctors`, `DoctorModal`, `doctorsService` prove capped directory reads and direct doctor CRUD. | Add provider directory projection with doctor id, profile id, facility id, role scope, schedule state and active-assignment impact. | Do not let direct doctor status edit imply emergency handoff readiness. |
| Provider settings professional card | `SettingsPage`, `DoctorProfileCard`, `useDoctorProfile` allow self-service doctor-row edits through broad doctor update. | Split presentation-profile edits from operational availability/status/fee readiness, with allowed-field capability and active-assignment consequence. | No self-service broad `updateDoctor()` for operational fields. |
| Staff scheduling modal from facility operations | `HospitalsPage` mounts `StaffSchedulingModal`; `staffSchedulingService` does not persist `doctor_schedules`. | Replace status-derived shift success with stored doctor schedule projection or mark scheduling unavailable. | No "scheduled successfully" copy unless `doctor_schedules` persists and reloads the row. |
| Dormant mock staff scheduler | `StaffScheduler` exists with hard-coded rows, local edit state and corrupted rendered text, but no mounted consumer was found. | Keep excluded/retire; any future use must consume the same persisted schedule projection and pass encoding review. | No local-only second scheduler is mounted as operational capability. |
| `/map` operational projection | `GodModeMap`, `MapContext`, `supabaseMapService`, `GoogleMapsRenderer`, `GoogleMapsSmartRoute`, `MarkerDetailPanel`, `MobileMap`, `MapPanel` prove mounted emergency, ambulance, hospital, responder, operator-location, external-route and selected-marker surfaces; `GodModeMap` also nests a second provider beneath the shell provider. | Add one authorized bounded map feed projection with per-source incomplete/degraded state, permissioned operator-location state, approved/degraded external route state, one recenter command API, and redacted/export-unavailable map context. | Do not double-mount map feeds, fabricate operator proximity, expose coordinate-derived decoration, export raw emergency arrays or use unmatched UI events as receiver proof. |
| Driver mode telemetry/status | `GodModeMap`, `driverManagementService`, `emergencyResponseService.updateResponderLocation` prove active command paths and first-ambulance fallback risk. | Require positive responder/ambulance/request projection before telemetry or status command becomes available. | Never select an active trip through `processedAmbulances[0]` fallback. |
| Desktop/mobile map emergency actions | `MarkerDetailPanel` and `MobileMap` call dispatch or complete while rendering selected-emergency patient contact/location from marker state and `ambulance_id`/status presence. | Consume Pass 1 emergency action/exposure/payment/cash legality projection in every map variant. | No map-only emergency lifecycle authority or unrestricted patient contact exposure. |
| Clinician assignment handoff | Shared `emergency_doctor_assignments` receiver exists; no mounted Console assignment surface was found. | Design assignment read/command state jointly with Pass 1 emergency detail and Pass 5 doctor readiness. | Do not represent selected or suggested doctor as assigned before persisted assignment truth. |
| Provider media uploads | Ambulance/doctor modals reach storage paths directly. | Keep upload disabled or unavailable until bucket, path, signed URL, row ownership and cleanup policy are proved. | No fragile or private media URL persistence as operational provider truth. |

## Implementation Packages

### 1. Provider Operations Facades

Create or refine facades for:

- ambulances
- drivers/assignments
- doctors/providers
- schedules
- telemetry/map projection
- provider self-service profile/readiness editing

Acceptance gate:

- Pages and modals do not own independent counts, assignment filters, or active assignment lookups.
- The settings professional card does not use an unrestricted doctor-row update for operational status/availability or unproved fee/readiness fields.

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
- self-service editable fields versus administrator/facility-owned fields
- active emergency assignment effect before a provider changes operational availability/status

Acceptance gate:

- Doctor availability and verification copy does not imply clinical readiness from incomplete profile data.
- Provider settings cannot change active-emergency-affecting status through an unscoped self-update path.

### 5. Staff Scheduling Scope

Implement doctor shifts only through `doctor_schedules`:

- read stored doctor shifts rather than deriving same-day rows
- create/update/delete persisted shift rows through organization-authorized scope
- detect conflicts from stored time overlap
- calculate shift statistics from stored shifts
- keep doctor availability/status separate from shift persistence
- remove ambulance crew generated shifts and leave future driver/crew scheduling unavailable until a receiver exists
- keep `components/scheduling/StaffScheduler.jsx` unmounted or retire it; do not expose its mock workflow instead of implementing the owned `doctor_schedules` path

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

## Git History Decision Context - 2026-07-14

The maintained migration history makes the following intent explicit:

| History | Established decision | Do not regress to |
| --- | --- | --- |
| App `2a5a2ef5` | Dispatcher is an independent `profiles.role`; driver is a provider type; `ambulances.profile_id` and `emergency_requests.responder_id` are canonical staffing/assignment identities; profile reads remain private. | A new responder identity column, dispatcher-as-provider inference, or broad profile-directory RLS. |
| App `79b0ebc5`, `20e74289`; Console `eb61032c` | Temporary fixes were absorbed into App-owned pillar migrations and mirrored to Console through `sync_to_console.js`. | Reintroducing dated or branch-local fix migrations beside owner pillars. |
| App `3459c432`; Console `b6d85487` | `console_dispatch_emergency` owns org checks, row locking, ambulance assignment, and responder derivation from `ambulances.profile_id`. | Client-supplied responder identity or direct dispatch table updates. |
| App `731221d0`, `a44f203f`, `37a3e1f4`; Console `d665f39e` | Lifecycle writes are RPC-owned; reassignment releases old units; failover and responder telemetry have backend consequences. | Treating generic fleet status, direct row writes, or failover as a responder decline command. |
| App `1197657f`, `55cb8823`, `2ce126ee`, `2e67c66a` | Demo identity, staffing, cash approval, fallback assignment, and synthetic movement form a deliberately isolated simulation lane. | Using demo auto-approval, fallback assignment, or heartbeat as proof of live operations. |
| Console `190434e6`, `cc3ef311`; App `b3c547df` | Driver derivation from existing provider type was correct. Removing the dead nested dispatcher grant was correct, but declaring dispatcher illegal was not; later maintained RPC work reaffirmed the role. | Restoring the dead grant or continuing to strand a legal dispatcher at route authorization. |

Absorbed branches remain absorbed: `fix/console-operator-select-rls` (`270d1a4b`),
`fix/revoke-anon-org-financial-fns` (`ed3ffb94`), and `fix/hospital-array-coalesce` (`35c8c969`).
`feature/book-visit-map-sheet-infusion` (`de6bdebc`) contains separate Book Visit design history and must not
be merged to solve emergency-provider contracts.

## Adversarial Readiness Decision - 2026-07-14

This update is a read-only cross-repository decision pass over current Console source, App source, generated
types, maintained migrations, RPCs, RLS, automation, and demo code. It authorizes no database deployment.
Where it conflicts with the May snapshot above, this section is the current decision record.

Decision classes:

1. `frontend derivation` - use already-authorized data; no backend change.
2. `client/service scope` - correct acquisition or projection ownership; no schema change.
3. `narrow backend contract` - add or harden one projection, command, policy, or idempotency guarantee.
4. `keep unavailable` - do not advertise capability until its receiver is proved.
5. `launch-blocking lifecycle` - live emergency operations remain disabled until deployed acceptance proof passes.

| Decision | Data evidence | Required resolution | Class |
| --- | --- | --- | --- |
| Dispatcher is a legal operational role. | Invitation validation accepts `dispatcher` (`../ivisit-app/supabase/migrations/20260219010000_core_rpcs.sql:6392`), and emergency/payment RPCs repeatedly authorize it with org scope. | Admit dispatcher only to Today, Requests, Live Map, and Settings; load emergency data only; use org-resolved hospital scope. The current branch implements this Console correction. | 2 |
| Driver request identity must prefer positive assignment. | Canonical request identity is `emergency_requests.responder_id`; dispatch derives it from `ambulances.profile_id`. Before this pass, organization-linked driver reads could prefer hospital-wide rows. | Current Console reads prioritize `responder_id = auth.uid()` and driver controls require a positive ambulance/profile link. This prevents accidental UI selection, but it is not a security boundary. | 2 |
| Driver row isolation is still not backend-proved. | Emergency SELECT RLS includes the organization-hospital policy (`../ivisit-app/supabase/migrations/20260219000700_security.sql:301-327`), so an organization-linked provider can receive hospital-wide rows even when the UI filters them. | Add a responder-owned projection or policy for the driver feed. Keep privileged operator scope separate. Prove cross-driver denial with live RLS tests. | 3, 5 |
| Driver-to-ambulance staffing stays unavailable. | Canonical linkage is `ambulances.profile_id`, but profiles SELECT permits only owner or admin (`../ivisit-app/supabase/migrations/20260219000700_security.sql:269-273`). That does not prove an organization-safe eligible-driver picker. | Add an org-scoped eligible-responder projection and one atomic staffing command validating organization, provider type, uniqueness, and active-call constraints. Do not broaden profiles RLS or revive a global picker. | 3, 4 |
| An unstaffed ambulance is not dispatch-ready. | Assignment automation can consume staffed profile identity, while dispatch/reassignment paths can preserve or accept incomplete responder linkage. | One server readiness projection must require organization match, active/available unit, positive responder linkage, usable location, supported type, and no conflicting call. Dispatch must reject unstaffed units atomically. | 3, 5 |
| Foreground map tracking is useful but not production telemetry. | Console now uses browser `watchPosition`, throttled canonical responder RPC updates, cleanup, and explicit start/stop while the map remains open. App tracking is also foreground-oriented. | Preserve the current honest foreground UX. Live launch additionally requires background telemetry entitlement, heartbeat/lease, stale-state escalation, and push delivery. | 3, 5 |
| Driver decline cannot reuse patient cancellation. | The existing cancellation receiver cancels the emergency; reassignment can release a prior unit, but no audited responder decline/requeue command exists. | Keep Decline unavailable. Add one atomic release/requeue command with reason, audit evidence, responder ownership, and refreshed assignment truth. | 3, 4, 5 |
| Driver lifecycle controls need role-specific commands. | Generic emergency status paths admit broader field effects, while patient surfaces can currently participate in operational arrival/completion. | Separate responder accept/arrive/complete from patient acknowledgement; enforce the legal transition graph and exactly-once consequences server-side. | 3, 5 |
| Schedule/capacity-aware matching is not proved. | Fleet schema has status, type, location, and loose crew data, but no enforced driver schedule or ambulance capacity contract. | Launch matching may use only staffed, available, located, supported-type units. Keep schedule/capacity optimization unavailable until a stored receiver exists. | 4 |
| Standalone ambulance-service dispatch is not yet coherent. | Onboarding can create an ambulance-service organization without a facility, while current emergencies require a hospital and dispatch expects same-organization ownership. | Exclude standalone ambulance-service organizations from the first live launch, or design and prove an explicit cross-organization dispatch command. | 4, 5 |
| The map is a radius lens, not an ecosystem dump. | Runtime QA found a 5 km summary paired with hundreds of off-area mounted markers. | The current branch keeps the authorized source projection but mounts only radius-scoped points; route resolution still uses authorized loaded data. Lock this with radius and marker-count tests. | 1 |
| Tablet is a composition change, not a new authority. | The same route/controller data can support phone, tablet, and desktop; duplicating tablet services would create drift. Apple HIG treats iPad as regular-width and fluidly resizable rather than a stretched phone. | Keep tablet page composition below 1280 px. Bound lists at 768 px; permit 1024 px only for real two-column recomposition; keep map full-bleed with bounded chrome. Use the bounded dock below 1024 px, then reuse the collapsed desktop navigation owner, toolbar, and overlay context panel from 1024-1279 px without switching page components. | 1 |

Current product verdict:

- Hospital/clinic onboarding intake may continue.
- The curated demo may continue only when labelled as simulation.
- Live Uber-like emergency dispatch is `NO-GO` until all class 5 rows above and the Pass 1 payment/lifecycle
  blockers below pass against the deployed backend.
- No UI fallback, demo automation, or broad client filter counts as backend authorization proof.

## Emergency Responder Production Closure - 2026-07-14

This section supersedes the emergency responder `NO-GO` rows above while preserving their decision history.
The deployed backend now provides an organization-scoped eligible-responder picker, atomic staffing command,
ambulance readiness projection, responder-only feed, offer/accept/arrive/complete commands, atomic
decline/requeue, assignment-bound monotonic telemetry with freshness lease, and standalone ambulance-service
organization support.

Live isolated proof passed `65/65` with zero residue. In particular, it proved cross-driver and cross-org
denial, two dispatcher sessions converging on one offer, two driver sessions converging on one acceptance,
telemetry replay and projection scope, staffing idempotency, stale/unavailable fleet fallback, and service-role
Console completion delegating to the canonical responder lifecycle. Console focused runtime and contract tests
passed `43/43`, and the optimized production build passed all UI, mobile grammar, data-contract, and encoding
hardgates.

The supervised foreground responder lane is `GO`: the map refreshes offers on visibility/focus recovery,
maintains a 20-second foreground heartbeat, restores a fresh position on resume, and names stale/lost signal
states honestly. Unattended background dispatch remains `NO-GO` until a new native binary adds and proves
background location plus APNs/FCM push. EAS OTA alone cannot add those native capabilities.

## Lane 1 Active-State UX Baseline - 2026-07-18

The first seven-lane Console maturity pass reused the App-owned exact-run manifest and cleanup contract rather
than adding a second fixture format. The browser fixture builder can now retain either a staffed `ready` state
or a canonical payment-complete `offered` request. The retained offered graph is created through
`create_emergency_v4`, `approve_cash_payment`, dispatch automation, `staff_ambulance_responder`, and
`report_responder_telemetry`; later states use only the responder and patient lifecycle RPCs.

Three exact runs were used to observe expiry, an offered card, rejected stale-readiness acceptance, successful
acceptance, foreground geolocation denial, arrival, patient-acknowledgement gating, completion, and return to
ready:

- `flow-matrix-1784426983644-0043cfe6`
- `flow-matrix-1784427142967-3af77d92`
- `flow-matrix-1784427288494-0864a515`

Each manifest cleanup removed only its recorded Auth, profile, organization, facility, doctor, ambulance,
staffing, request, assignment, payment, visit, wallet, notification, audit, transition, and mapping graph.
Every second cleanup planned zero actions in every resource class.

Confirmed current strengths:

- the mounted desktop driver card renders the exact offer deadline, request label, pickup, destination, unit,
  location state, decline, and one primary accept action;
- accept, arrive, and complete immediately replace the action label with a disabled pending state and publish
  bounded feedback;
- canonical receiver reflection changes `Offered -> Accepted -> Arrived`, and successful completion removes
  the assignment and returns to `Ready for offers` without a hard refresh;
- completion is backend-gated until `patient_acknowledge_responder_arrival` succeeds.

Confirmed maturity defects:

1. An offer remains visibly actionable after the responder telemetry lease is no longer dispatch-ready. The
   backend correctly rejects acceptance, but the card does not preflight readiness or guide the responder to
   restore location before tapping `Accept call`.
2. The arrived card immediately advertises `Complete trip` even while patient acknowledgement is absent. The
   backend rejects the command with correct copy, but the primary surface should instead show a bounded
   `Waiting for patient confirmation` state and enable completion only after refreshed acknowledgement truth.
3. Geolocation denial is rendered as the raw browser message `User denied Geolocation`. The state is honest,
   but the copy should be app-owned and recovery-oriented.
4. An expired assignment can remain referenced by the request while the responder feed hides it. Canonical
   re-offer correctly refused the previously released responder, so recovery belongs to dispatch/failover
   rather than client replay; the driver surface needs an honest expired/reassignment state when that evidence
   is available.

This is a desktop mounted baseline, not final Lane 1 admission. Tablet and 390 px mobile offered/accepted/
arrived/waiting/completed visual captures, notification permission states, loading/error states, keyboard and
touch-target checks, and foreground reconnect proof remain required before visual implementation is admitted.

### Lane 1 Defect Closure - 2026-07-18

The four baseline defects were closed without schema or migration changes:

- offered assignments now gate acceptance on the existing responder telemetry projection; unknown state
  renders `Checking location`, stale/lost state renders `Restore location`, and `Accept call` appears only
  after a live signal is proven;
- arrived assignments are enriched through `get_current_emergency_responder`; completion remains disabled as
  `Waiting for patient` until `patient_acknowledged_arrival_at` is present, while a failed enrichment renders
  a safe unavailable state;
- the responder feed now refreshes on scoped `emergency_requests` updates as well as assignment updates, so
  patient acknowledgement enables completion without a hard refresh;
- browser geolocation failures are normalized to app-owned recovery copy; and
- an offer removed by the canonical feed at its deadline is retained for a bounded 30-second `Offer expired`
  explanation before returning to the ready state. The client does not attempt to re-offer or mutate dispatch.

Focused verification passed `17/17`; the optimized production build passed data-contract, UI-surface, mobile
grammar, mojibake, database-type encoding, and compilation gates. Mounted exact-run proof used:

- `flow-matrix-1784429125155-893bcadd`: stale telemetry rendered `Restore location`; deadline removal rendered
  `Offer expired` without a hard refresh.
- `flow-matrix-1784429288038-631d631f`: arrived state rendered disabled `Waiting for patient`; canonical
  patient acknowledgement changed it to `Complete trip` by realtime refresh; two-step completion returned the
  driver to `Ready for offers`.

Both exact-run graphs were removed by their own manifests. The second cleanup dry run reported zero residue
for every tracked resource class. Discovered or claimable hospitals were not touched.

## Lane 2 Fleet Operations UX Closure - 2026-07-18

Lane 2 used the App-owned exact-run harness with the new `fleet-rich` profile rather than creating Console-only
seed truth. Run `flow-matrix-1784433009032-e7097c7b` created one organization, one facility, one staffed
accepted emergency, and six manifest-owned ambulances spanning `available`, `on_trip`, `returning`,
`maintenance`, `offline`, and `pending_approval`. The accepted request was reached through canonical staffing,
telemetry, offer, and responder acceptance actions. No schema or migration changed.

Mounted desktop and 390 px mobile proof confirmed:

- the route count and KPI projection agreed on six fleet units, one ready unit, one active unit, and one unit
  in service review;
- the active KPI gave immediate pending feedback and settled to exactly one active row;
- trip-owned status remained read-only and continued to direct lifecycle work to Requests;
- desktop rail, desktop modal, mobile list, and mobile detail sheet rendered the same active request display
  reference and status without exposing the internal request UUID; and
- the mobile composition retained all six states without horizontal overflow or a second data owner.

The rich-state pass found and closed the following presentation and field-shape defects:

1. An unresolved driver leaked an internal profile UUID. The rail now renders `Driver details unavailable`
   and retains no copy action for the unresolved identifier.
2. Legacy JSON crew value `{}` coerced to `[object Object]` in the edit form. Crew normalization now accepts
   arrays, member envelopes, scalar strings, named objects, and empty objects at the form boundary.
3. ETA was treated as free text even though the receiver column is `timestamptz`. Editing now uses a
   controlled `datetime-local` field, converts valid local values to ISO payloads, and renders human time.
4. The first ETA render exposed a missing formatter import and crashed the route. Mounted rich-state proof
   caught the failure; the import and source contract assertion now prevent recurrence.
5. The station picker changed between controlled and uncontrolled values while authorized hospitals loaded.
   It now remains controlled for the modal lifetime; a fresh verification tab produced no warning or error.
6. Mobile mislabeled `maintenance` as `Offline`, leaked `patient_transport`, and built a request label from a
   sliced UUID. Mobile now consumes the canonical fleet status label, normalizes type copy, formats ETA, and
   uses the projected request display reference plus status.

Focused verification passed `40/40`. Targeted ESLint passed, the harness passed `node --check`, and the
optimized production build passed database-type encoding, mojibake, data-contract, UI-surface, mobile-grammar,
and compilation gates. Exact cleanup removed 6 ambulances, 1 request, its responder assignment and transitions,
payment/visit/wallet evidence, the created facility and organization, 4 profiles, and 4 Auth users. The
second cleanup dry run reported zero residue in every tracked class. Discovered or claimable hospitals were
not touched.

## Lane 3 Staff Directory And Scheduling UX Closure - 2026-07-18

Lane 3 extended the App-owned fixture profile with `provider-rich`. Exact run
`flow-matrix-1784434273406-781f37d5` mounted six staff records across assignable available, on-call, busy,
away, and `status=available` plus `is_available=false` states. Four initial schedule rows covered day,
evening, and night shifts with bookable and unavailable evidence. All rows belonged to one manifest-created
organization and facility; no schema or migration changed.

Mounted desktop and 390 px mobile proof confirmed:

- exact staff totals and directory rows rendered the same six people, facility, specialty, contact, caseload,
  rating, and effective status evidence;
- a previously unconfirmed facility timezone kept schedule creation disabled with a clear recovery path;
- confirming `America/Los_Angeles` used the existing timezone receiver, immediately published pending and
  success feedback, and re-rendered the 14-day schedule in facility-local time;
- adding a shift produced one new row, while repeating the same date/time command returned
  `This time overlaps another shift` and created no duplicate;
- status and availability remained workflow-owned, while ordinary directory edits stayed limited to the
  existing metadata allowlist; and
- a fresh browser log scan after desktop, scheduling, modal, and mobile operations reported no warnings or
  errors.

Three maturity defects were closed:

1. Exact `Available` counts and filters used only `status='available'`, while the row projection correctly
   rendered `is_available=false` as `Unavailable for assignment`. Server counts and the single-status
   available lane now also require `is_available` to be true or unset. Mounted proof changed the KPI from the
   incorrect 3 to 2 and the filtered result settled to exactly two assignable rows.
2. Staff edit fields rendered visible labels but did not associate those labels with their controls, so the
   accessibility tree exposed placeholders such as `Primary care` and `Short note`. Full name, specialty,
   email, phone, facility, license, experience, and notes now have stable `id`/`htmlFor` pairs.
3. Mobile could briefly render `No staff found` after the positive exact count arrived but before row
   projection stabilization. A positive scoped count with zero rendered rows now keeps the structural
   skeleton until rows arrive, while true zero and failed states remain distinct.

Focused verification passed `46/46`; targeted ESLint passed without warnings. The optimized production build
passed database-type encoding, mojibake, data-contract, UI-surface, mobile-grammar, and compilation gates.
Cleanup explicitly counted and removed 5 doctor schedule rows (the four fixture shifts plus the idempotency
test shift), 6 doctor rows, 1 ambulance, the created facility and organization, wallet and audit evidence,
4 profiles, and 4 Auth users. The second cleanup dry run reported zero residue in every tracked class,
including `doctorScheduleIds`. Discovered or claimable hospitals were not touched.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on ambulances, doctors, scheduling modal, and map.
- Provider-settings professional-card smoke for allowed and blocked self-edit fields.
- Driver map action smoke in non-production account if available.
- Map context smoke proves Export Data is unavailable until scoped/redacted projection exists and selected-marker communication/navigation controls are disabled or have mounted receivers.
- Map mount smoke proves entering `/map` starts exactly one authorized bounded map feed/channel owner rather than shell plus route duplicate providers.
- Desktop map marker-detail smoke proves patient contact/location visibility and dispatch/completion consume Pass 1 authority, and its visible close control contains no corrupted text.
- Map location/routing smoke proves denied browser geolocation is not rendered or queried as Lagos operator truth, no coordinate-derived session badge is shown, and Google-route fallback is visibly degraded with no raw route-provider failure in console output.
- Mobile map smoke proves selected-emergency dispatch/completion and patient contact/location rendering consume Pass 1 actor/action eligibility, or render unavailable without false completion/payment copy.
- Public/auth route smoke on login, password, onboarding and unauthorized pages proves no emergency/ambulance/hospital/patient-location map fetch or realtime channel starts before authorized map entry.
- Image upload smoke for ambulance/doctor only after storage contract is confirmed.

Backend/RLS/RPC:

- Assignment conflict tests.
- Trip status transition tests.
- Telemetry update authorization tests.
- Schedule conflict tests.
- Provider/doctor profile linkage read-only proof.
- Source/mount assertion proving dormant `StaffScheduler` is not exposed as a second scheduling capability unless deliberately rebuilt against stored shift truth.

Stop conditions:

- Do not change map visuals before telemetry truth is defined.
- Do not export raw emergency or responder map-context arrays during implementation or smoke testing.
- Do not add driver scheduling if service/table support is still doctor-only.
- Do not publish test telemetry against production active requests.
