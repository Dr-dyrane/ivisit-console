# Pass 3 Hospital, Capacity, And Pricing Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Edge Function, import, storage, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers hospital/facility management, provider catalog classification, hospital media provenance, Google discovery/import provenance, bed/capacity truth, storage/media uploads, pricing scope, and dispatch/app visibility.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/modals/HospitalModal.jsx`
- `frontend/src/components/pages/PricingManagementPage.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`
- `frontend/src/components/onboarding/OrganizationDetailsStep.jsx`
- `frontend/src/components/navigation/QuickSearch.jsx`
- `frontend/src/components/map/MarkerDetailPanel.jsx`
- `frontend/src/components/context/PricingContextPanel.jsx`
- `frontend/src/components/views/PricingTableView.jsx`
- `frontend/src/components/mobile/MobileHospitals.jsx`
- `frontend/src/components/mobile/MobilePricing.jsx`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/hospitalImportService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/pricingService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/services/onboardingService.js`
- `frontend/src/services/orgVerificationService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/discover-hospitals/index.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/discovery/discover-hospitals/handler.ts`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/hospital-media/index.ts`
- `frontend/src/services/searchService.js`
- `frontend/src/contexts/PageDataContext.jsx`
- Shared receivers `providers`, `hospital_media`, and `hospital_import_logs` from the app-owned organization schema/policy source.

Patient-app downstream files inspected:

- `ivisit-app/components/map/surfaces/hospitals/useMapHospitalDetailModel.js`
- `ivisit-app/components/map/surfaces/hospitals/mapHospitalDetail.helpers.js`
- `ivisit-app/components/emergency/HospitalCard.jsx`
- `ivisit-app/hooks/emergency/useHospitalSelection.js`
- `ivisit-app/services/hospitalsService.js`
- `ivisit-app/services/pricingService.js`
- `ivisit-app/docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `ivisit-app/docs/flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md`

Audit docs:

- Stage 2 service data flow audit.
- Stage 3 capability gap audit.
- Stage 4 L5 ownership audit.
- Stage 5 service coverage audit.
- Stage 6 implementation pass plan.
- Emergency/payment/capacity contract chart.

Observed source signals:

- `HospitalsPage` requests a service-backed page window for displayed rows, but consumes `PageDataContext` stats derived from unbounded `getHospitals()` results; at the backend response ceiling this can display `1000` as total network/capacity truth.
- `HospitalsPage` owns a global `hospitals` realtime channel.
- `HospitalModal` uploads images through `storageService`, calls `discover-hospitals` through raw `fetch`, and uses `bedManagementService` for reservations/utilization.
- `hospitalsService.updateHospital` uses `update_hospital_by_admin`, while some status/bed count updates still write direct table fields.
- `hospitalImportService` invokes `discover-hospitals`, falls back to `nearby_hospitals`, and includes approval/rejection/assignment paths.
- `pricingService` maps hospital-scoped pricing back to organization scope and chooses the first hospital for organization writes.
- `PricingContextPanel` emits `openAnalyticsModal` for Reports although `PricingManagementPage` does not listen for that event, and it renders an `Execute Bulk Sync` button without a click handler.
- `HospitalsPage` stores search/status filters, KPI selection and table sort state without routing them into its hospital window query or applying them to the rendered rows; its visible controls do not establish authoritative query behavior.
- `AppLayout` mounts `MapProvider` and `PageDataProvider` around all routes, so opening the hospitals surface can coincide with additional unbounded hospital reads for global KPI data, map data and both pricing mappings.
- Hospital displayed rows request a service-backed page window, while summary/bootstrap and pricing paths still load unbounded hospital collections.
- Console has no runtime `providers` or `hospital_media` owner beyond base hospital/image editing, while `hospitalImportService` references `hospital_import_logs` without a proven rendered import-history owner.
- The patient map hospital-detail model reads hospital-scoped `service_pricing` and `room_pricing`, applies billing quote maps, and renders those selections before a care request is committed.
- The patient hospital card and selection flow expose availability, wait, media, verification/import state, and request/secure-bed actions; those visible decisions depend on truthful Console-maintained facility state.
- `/pricing` is reachable to `org_admin` and above, renders service/room rows and summary values from unwindowed service results, and describes organization-local overrides even though writes resolve to one earliest hospital when no explicit `hospital_id` is supplied.
- `PricingContextPanel` is mounted for `/pricing`; its Reports event has no page listener and its Execute Bulk Sync control has no operation handler.
- Shared navigation action wiring exposes `Top Up` while the current route is `/pricing`, dispatching wallet mutation UI from a pricing surface; that action must be owned by Pass 2 rather than implied as pricing CRUD.
- Live app code applies billing quote maps in hospital-detail service/room rails, while the current app billing plan still carries hospital-browsing price cards as pending; Pass 3 must prove coverage surface by surface rather than assume every facility price display is quoted.
- The Console map route reads hospital markers through `MapContext`/`supabaseMapService`, falls back from nearby lookup to an unbounded available-hospitals query, and renders hospital available-bed values in marker detail/mobile map surfaces.
- The Console analytics route performs an exact hospital count but calculates bed/ICU capacity by reducing returned hospital rows, so a response ceiling can preserve a truthful facility count while still truncating capacity totals.
- `MobileHospitals.jsx:95-104,192-216` falls back from absent statistics to its supplied hospital rows for facility, available-bed and fleet totals, then labels fallback/derived measures as `LIVE`. The mobile facility view can reproduce the same incomplete-capacity claim even when the desktop route is later paged correctly.
- `MobilePricing.jsx:53-104,125-203` calculates average price, global/override counts and time-window trend ratios from the locally supplied `allPricing` collection and labels unproved values `LIVE`. A mobile scope summary is not price-rule completeness or patient-quote truth.
- Dashboard variants expose hospital and bed claims derived from analytics/context state, including an `activeHospitals || 8` fallback and a bed estimate derived from available ambulances rather than hospital capacity truth.
- Organization onboarding searches and creates records in `hospitals`, and the verification queue updates `hospitals.verification_status`/`verified`; because dispatch eligibility derives from facility verification state, an identity/onboarding action can alter patient-visible facility eligibility unless the contract is separated.
- Global QuickSearch reads hospital identity/type/address separately from the facility projection and its result subtitle contains corrupted separator bytes in current source; facility discovery is therefore also a shell-visible read-quality concern.

## User Flow

Operator path:

1. Open hospitals/facilities page.
2. Search, filter, view, create, edit, or delete facilities.
3. Open facility detail and see availability, capacity, bed reservations, and schedule entry points.
4. Search/discover facilities/providers from Google/Edge source and explicitly import or fill details through an authorized path.
5. Upload/update facility image.
6. Update capacity/availability in a way the patient app can consume.
7. Manage service and room pricing with clear global, organization, and hospital scope.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Hospital list/stats | Page rows are windowed, but global `PageDataContext` calls unbounded `getHospitals()` and derives network/capacity totals from a potentially capped collection; page filter/KPI/sort state is not authoritative for rendered rows. | Facility read owner with paged/filterable/sortable row query plus scoped aggregate/count projections. |
| Hospital detail | Page URL path and modal state fetch independently. | Facility detail projection. |
| Capacity/bed truth | Direct scalar updates plus bed reservation service. | Capacity owner that reconciles scalar fields, `bed_availability`, reservations, and app-visible availability. |
| Discovery/import | Modal raw `fetch` plus `hospitalImportService` Edge flow. | Discovery/import owner with live/fallback/source labels. |
| Provider classification | Console edits hospital rows without `providers` taxonomy/eligibility control. | Authorized provider-catalog owner for app-visible classification. |
| Image upload/provenance | Modal direct upload path and raw `hospitals.image`; `hospital_media` is unoperated. | Storage/media owner with bucket/path/auth and media-provenance semantics. |
| Import history | `hospitalImportService` uses `hospital_import_logs` but visible provenance/error ownership is not proven. | Operator-visible import log/provenance read owner. |
| Pricing | Organization filter plus hospital first-choice write semantics. | Facility-scoped `service_pricing` / `room_pricing` owner with explicitly labelled platform fallback rows only. |
| Pricing panel operations | Reports dispatches without a mounted receiver and Bulk Sync is rendered without an operation. | Mounted pricing report projection plus disabled/removed sync until an authorized import/pricing command exists. |
| Pricing list retrieval | Service joins all facilities and all price rows in memory before page-local slicing. | Scoped server-paged pricing read owner with explicit hospital/organization identity and independent summary state. |
| Realtime | Page and modal own separate channels. | Domain owner invalidation with modal-scoped detail exceptions. |

## Surface Read, Exposure, And Operation Closure

This table is the first application of the Stage 5 surface-first closure protocol. It is not an implementation authorization; it identifies what the live facility surfaces are trying to expose or mutate and why Pass 3 remains blocked.

| Surface and current actor signal | Rendered/read promise | Proven source or exposure defect | Visible operation promise | CRUD/command authority disposition |
| --- | --- | --- | --- | --- |
| `/hospitals` grid/list/table/mobile; route permits `org_admin` and above while the context panel advertises admin/org-admin management. | Facility identity, address/image, verification/status, beds/ICU, fleet, ER wait and rating; table/page count. Mobile also renders operational KPI and trend panels. | Rows are page-windowed, but page filters/KPI selection/table sort do not govern retrieval/rendered rows; mobile falls back to row reductions for total/available beds/fleet and labels the result `LIVE`. Read scope and role contract still need one facility projection. | View, edit, delete and scheduling controls are rendered across variants. | Read remains open for role/source closure; mobile capacity metrics require scoped aggregates or unavailable state; edit/delete/schedule require field-by-field command/RLS proof before retained. |
| Hospital KPI cards and `HospitalsPanel`; available wherever the hospital route context is mounted. | Network total, available/full facilities, total beds, total ambulances and recent hospitals. Panel labels total as `Active` and available as `Nearby`. | `PageDataContext` derives claims from unbounded `getHospitals()`; 1000 returned rows can masquerade as full network truth. `Nearby` is a label mismatch unless proximity is supplied. | Panel Add opens create modal; Analytics opens stats modal; Filter dispatches page event; Contact is disabled. | Replace summary source with scoped aggregates and correct labels; keep create/analytics/filter only after role and receiver closure. |
| `HospitalModal` view mode reached from facility row. | Full facility metadata plus active reservations and bed-utilization context, including request/patient-linked bed evidence. | Detail independently loads bed data/realtime; exposure of reservation/clinical context needs explicit operational role authorization and consistent capacity semantics. Existing contract evidence shows occupied/reserved math drift. | View-only surface still supplies entry context for schedule and subsequent edit flows. | Detail read projection must declare permitted actors and minimum clinical exposure before use as authoritative facility detail. |
| `HospitalModal` create/edit mode and page save handlers; header create currently admin/org-admin. | Form captures metadata, image, status/verification, beds, ICU, fleet count, ER wait, coordinates/place identity and discovery-selected values. | Existing contract evidence proves ER wait can be silently ignored by `update_hospital_by_admin`, taxonomy/eligibility/media provenance fields required by the app are omitted, and raw discovery contract is drifted. | Create/edit facility, upload image, search/select discovered hospital/provider. | Split metadata from operational availability; prove create/update/Storage/discovery authority; disable or remove unsupported fields until receiver persists their meaning. |
| Row and bulk destructive controls across responsive variants. | Selection implies a manageable facility record set. | Role checks are not uniform: grid gates row edit/delete to admin/org-admin, `HospitalTableView` includes provider in `canManage`, and bulk-delete buttons check admin/provider rather than org-admin. | Delete one or multiple facilities. | No destructive action is ready until route/component role doctrine and audited delete receiver/auditability are aligned. |
| Facility scheduling entry point. | Facility is selectable as context for staff scheduling. | Pass 5 evidence is required because existing scheduling service does not yet establish persisted ambulance-shift authority and doctor schedule ownership is separate. | Open/manage schedule from hospital card or mobile action. | Retain as cross-pass dependency only after Pass 5 defines authorized stored schedule commands; do not imply facility CRUD owns schedules. |
| `HospitalModal` active reservation and utilization region; visible from facility detail to permitted facility operators. | Bed request rows expose patient/request context, bed number/category, reservation state and occupied/reserved utilization against facility totals. | `bedManagementService` joins request and hospital rows in the client; utilization counts completed requests as occupied while the modal also renders scalar-bed math. Room-price/capacity-bucket linkage is unproved. | Cancel reservation, mark arrived and discharge. | `updateReservationStatus(..., 'arrived')` and discharge route through guarded emergency commands; Cancel calls nonexistent `cancelReservation()` instead of exposed `cancelBedReservation()`. This operational surface is blocked until command wiring, role exposure and capacity semantics align. |
| `/pricing` desktop table/list and mobile pricing surface; route permits `org_admin` and above. | Service and room pricing rules, global/override classification, dollar amounts, units, average price, filters, totals and pagination. Mobile renders local scope ratios and trend language. | `getPricing()` reads all facility mappings and all price rows then filters/slices in the client. Mobile further reduces `allPricing` for averages/global/override time-window trends and labels values `LIVE`. Classification treats a hospital-scoped row as an organization override, while patient price resolution is explicitly hospital-scoped and may use global fallback. Display is raw USD while patient hospital detail uses billing quote maps. | View, add, edit, delete and bulk delete service or room pricing rows. | Read is neither server-paged nor patient-quote equivalent. Mobile metrics require an explicit scoped price-rule aggregate basis; CRUD is blocked on facility scope, receiver/RLS proof, currency-display doctrine and deletion authority. |
| `/pricing` create/edit dialog; `org_admin` copy promises a local organization override. | Name, type, unit, description and USD economic value for either a service or room rule. | The form has no hospital selector. `saveServicePricing()` and `saveRoomPricing()` translate `organization_id` into the earliest-created hospital, so the rendered organization promise can silently alter only one facility consumed by the app. | Apply changes through pricing upsert RPCs. | Do not retain the organization-override promise or allow save until the selected facility or a deliberate propagation command is explicit and auditable. |
| `PricingContextPanel` and shared navigation action on `/pricing`. | Scope distribution and blended average values described as global standard rates and organization-specific overrides. | The panel receives globally/bootstrap-loaded service and room collections and repeats the same scope error; the average blends dissimilar service and room amounts without patient quote/currency context. Shared action wiring presents wallet `Top Up` while on a pricing route. | Add Item, Reports, Execute Bulk Sync and Top Up. | Add Item has a mounted receiver; Reports dispatches an event not listened to by `PricingManagementPage`; Bulk Sync has no handler; Top Up is a Pass 2 wallet command and must not imply pricing authority. Keep only proved actions and truthful scoped aggregates. |
| Provider taxonomy, discovery/import history and public media provenance required by app hospital browsing. | The patient product renders provider identity, eligibility-dependent selection, imported/unverified warning state and stable image choices. | `HospitalModal` imports `hospitalImportService` but autocomplete performs a raw Edge fetch; the service has import/approve/reject/assign/log capabilities without found rendered consumers. No rendered management surface for the facility `providers` table, `hospital_media`, or `hospital_import_logs` was found. Base `hospitals.image` editing is not provenance ownership. | Correct provider type/eligibility, approve or reject import, inspect provenance, and select public media should be operator capabilities. | Missing surface, not optional scope. Do not call the lane implemented until these backend-supported tables/actions have explicit Console read and command owners. |
| Edge discovery and media receiver topology. | Console service and modal target `discover-hospitals`; patient surfaces consume canonical discovery/media output. | The deployable `discover-hospitals` wrapper and handler plus `hospital-media` proxy are in `ivisit-app/supabase/functions`; Console-local `frontend/supabase/functions/discovery/index.ts` instead contains `check-user` logic and is not discovery receiver proof. | Import/discovery and canonical media remain shared app-owned backend commands/dependencies. | Do not implement against Console folder names or raw modal response guesses; align request, provenance, fallback and media proxy behavior with the app-owned receivers. |
| `/map`, map marker detail and mobile map facility selection; route permits provider and above. | Facility markers and selected-facility location/status/available-bed context for operations. | `MapContext` loads `supabaseMapService.fetchInitialMapData()` globally; hospital query has no window and nearby fallback reads available hospitals without a bound. Marker detail renders `available_beds` from whichever collection won. | Marker detail displays `Call Facility`, but the traced desktop button has no `onClick` receiver; editing remains on facility surfaces. | Define scoped viewport/nearby feed, fallback labeling and role-visible capacity fields; remove/disable or implement call intent before treating the operations map as actionable facility truth. Pass 5 owns adjacent fleet/dispatch behavior. |
| `/analytics` desktop/mobile hospital resource metrics; analytics route permits provider and above with role-specific panels. | Total hospitals, occupied/total beds, ICU availability and capacity percentage. | Route query requests exact hospital count but also selects hospital rows and reduces row data for capacity; total may be complete while bed metrics truncate at response limits. Global analytics bootstrap separately derives hospital values from unwindowed `getHospitals()`. | Analytics/report viewing only for this facility cluster. | Split exact/scoped aggregate projections from row windows; label authorization and unavailable data before rendering capacity or exporting reports. Pass 8 owns reporting orchestration. |
| Dashboard facility shortcuts and mobile facility metrics. | Active/facility totals and bed signals used to summarize network readiness and navigate to facilities. | Dashboard consumes global analytics truth; one path renders `analyticsData?.activeHospitals || 8`, and another estimates beds as available ambulances multiplied by `13`, neither of which is facility capacity evidence. | Navigate to hospitals; no facility mutation proved on dashboard row. | Remove fabricated/fallback operational numbers or label unavailable/demo truth; dashboard cannot publish capacity until Pass 3 aggregates and Pass 8 dashboard projection exist. |
| Organization onboarding facility lookup/create and organization verification queue. | Prospective org admin selects or registers a facility; admin reviews an organization/facility row and approves or rejects verification. | `OrganizationDetailsStep` uses `onboardingService`, which creates/searches `hospitals` rows as organizations. `VerificationQueue` calls `orgVerificationService.verifyOrganization()`, which updates `hospitals.verification_status` and `verified`; app schema derives dispatch eligibility from verification/status. | Register/claim facility and approve/reject organization. | Pass 4 owns actor/verification authorization, but Pass 3 must define whether an onboarding organization row is an operational patient-visible facility and prevent administrative approval from unintentionally asserting dispatch/capacity readiness. |
| Shell `QuickSearch` hospital result category. | Search result exposes hospital name, type, address and rating and links to `/hospitals?id=...`. | `searchService.searchHospitals()` performs an independent bounded direct table read without facility eligibility/provenance fields; current result formatting includes corrupted separator bytes. | Navigate to facility result only. | Pass 8 owns shell search resilience/encoding; Pass 3 requires the result projection to label operational eligibility correctly or remain a neutral facility lookup. |

## Patient-Facing Dependency Closure

The Console is not complete when its own page saves successfully. For this lane, every retained operation must preserve the live patient read contract below.

| Patient surface or decision | What the patient sees or chooses | Current downstream source behavior | Console obligation before implementation |
| --- | --- | --- | --- |
| Map hospital list, card and selected facility CTA. | Image, hospital name, verification/import warning, specialty text, distance/ETA, wait or available-bed count, and `Request Now` / `Secure a Bed` / call fallback. | `HospitalCard` renders `image`, `verified`/import flags, `availableBeds`, `waitTime` and phone; `useHospitalSelection` permits selection only for available facilities and changes behavior when beds/ambulances are unavailable. | Facility edit, availability and discovery/media actions must write the exact visible eligibility, status, capacity, wait and media truth; no Console-only label may stand in for these fields. |
| Map hospital detail service and room rails. | Hospital-specific ambulance/service and bed/room choices with quoted prices before commit. | `useMapHospitalDetailModel` fetches `getServicePricing(hospitalId)` and `getRooms(hospitalId)`, then applies `useQuotedPriceMap` using billing preferences/overrides. `hospitalsService` prefers hospital rows over null-hospital fallbacks. The app billing plan still lists hospital-browsing price cards as pending, so this proof is specific to the detail rails. | Pricing management must identify the facility row being changed, distinguish global fallback rows, and not describe first-hospital writes as organization overrides. Display/review must account for the patient quote lane and must not assert quote closure for other hospital cards until traced. |
| Bed request and emergency commit. | Selected facility availability and selected service/room pricing become the basis for a request and payment calculation. | App pricing resolves hospital `room_pricing` or `service_pricing`, then hospital base price, then null-hospital defaults; room rendering combines facility bed snapshot with room pricing. | Capacity and price mutations must be reflected through one facility-specific read model and tested against patient request/payment projection before this pass closes. |
| Explore-care provider discovery and public facility imagery. | A facility/provider may appear or be excluded based on provider taxonomy, emergency/dispatch eligibility and image provenance. | `hospitalsService` maps `provider_type`, `emergency_eligible`, `dispatch_eligible`, `provider_source`, category and image source/confidence into app-visible projection. | Console must expose authorized management or deliberate read-only review of taxonomy/media/import provenance instead of treating base hospital tier/image edits as the full app catalog contract. |

## Pass 3 Deterministic Surface Register

This register prevents this lane from being called complete based on the main `/hospitals` route alone. `Proved` means a runtime surface and its source/operation have been traced; it does not mean the behavior is acceptable or implemented.

| Surface family | Surface variants or absence tested | Read/render trace | Mutation/command trace | Closure state |
| --- | --- | --- | --- | --- |
| Facility browse and summary | `/hospitals` grid/list/table/mobile, KPI cards and `HospitalsPanel` | Proved, with count/filter/sort/bootstrap defects | Proved for modal launch, row/bulk actions and schedule dependency | Blocked |
| Facility detail and capacity | `HospitalModal` view, bed reservations and utilization | Proved, with exposure/capacity math drift | Proved for arrive/discharge and broken cancel receiver | Blocked |
| Facility create/edit and discovery selection | `HospitalModal` create/edit and raw discovery autocomplete | Proved, with unsupported/missing app fields | Proved as mixed metadata/upload/raw discovery paths | Blocked |
| Provider taxonomy/media/import provenance | Search for rendered `providers`, `hospital_media` and `hospital_import_logs` owners | Absence proved; required app-visible truth has no Console surface | Service capabilities exist without complete rendered ownership | Missing required surface |
| Pricing read and aggregates | `/pricing` table/list/mobile and `PricingContextPanel` | Proved, with unwindowed reads, scope naming and currency/quote drift | Not applicable for display-only metrics | Blocked |
| Pricing CRUD and panel commands | `/pricing` dialog, row/bulk delete, context quick actions and inherited `Top Up` FAB/bottom-bar action | Proved from visible controls | Proved first-hospital save behavior, delete RPC paths, unhandled pricing actions and cross-pass wallet command | Blocked; Pass 2 dependency |
| Operational map projection | `/map`, marker detail and mobile map hospital data | Proved, with unbounded/fallback map collection and capacity exposure | No facility write proved; desktop `Call Facility` action has no handler; dispatch dependencies remain adjacent | Blocked; Pass 5 dependency |
| Analytics and dashboard capacity projection | `/analytics`, mobile analytics, dashboard/mobile dashboard facility claims | Proved, with truncated aggregation risk and fabricated/fallback values | No facility write proved; report/navigation only | Blocked; Pass 8 dependency |
| Onboarding and verification projection | Organization onboarding facility selection and `VerificationQueue` organization tab | Proved, with shared organization/facility row meaning | Proved verification write affecting facility-visible status fields | Blocked; Pass 4 dependency |
| Global facility search projection | Shell `QuickSearch` hospital result category | Proved, with partial field projection and corrupted separator rendering | Navigation only | Blocked; Pass 8 dependency |
| Patient downstream projection | Map card/detail/service rails and request price hierarchy in `ivisit-app` | Proved as cross-surface read contract | Console mutations must be compared against it; no patient mutation is authorized here | Dependency open |

## Cross-Pass Facility Foreign-Key Register

These flows are not re-owned by Pass 3, but none can close until their facility reference uses the facility identity, scope and eligibility contract defined here.

| Owning pass | Facility-bearing surface or service found | Facility dependency that must be reconciled |
| --- | --- | --- |
| Pass 1 emergency operations | `EmergencyRequestsPage`, emergency detail/create modals, `emergencyService` and `emergencyResponseService` carry `hospital_id`/`hospital_name` and may select suitable hospitals. | Request assignment and bed/emergency actions must use patient-visible facility eligibility and capacity, not a stale name or broad hospital list. |
| Pass 2 financial history | Wallet payment detail joins emergency requests to hospital name/address. | Ledger/payment evidence must retain the exact facility identity used for pricing and patient commitment. |
| Pass 4 identity/onboarding | `OrganizationDetailsStep`, `OnboardingContext`, `VerificationQueue` and `orgVerificationService` create/verify hospital-backed organization records. | Organization verification must not silently mean emergency-ready facility availability or media/taxonomy completeness. |
| Pass 5 providers/fleet | `AmbulancesPage`, `AmbulanceModal`, `DoctorModal`, doctor/ambulance/scheduling services load or submit `hospital_id`. | Staff/fleet assignment must resolve real facility identity and authorized org scope; org UUID must not be submitted as hospital UUID. |
| Pass 6 visits | `VisitsPage`, `VisitModal` and `visitsService` enrich and submit hospital references. | Follow-up care detail must display and submit the same canonical facility identity carried from emergency/booking handoff. |
| Pass 8 shell/global surfaces | `QuickSearch`, map, dashboard and analytics render or aggregate facility rows outside `/hospitals`. | Shell queries must apply bounded/scoped retrieval, consistent facility projection, honest aggregates and encoding-safe display. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View facility/provider catalog | Scoped read projection | `hospitals`, `providers`, `hospital_media` | Include app-visible taxonomy and provenance fields. |
| Create/edit provider classification and media provenance | Authorized table CRUD once implemented | `providers`, `hospital_media` organization-scoped policies | Do not reduce app catalog truth to base `hospitals.image` or tier fields. |
| Edit facility metadata | Workflow/admin command | `update_hospital_by_admin` contract | Keep separate from operational availability changes. |
| Edit beds, wait, operational status | Workflow command | `update_hospital_availability` | Use one app-visible operational receiver. |
| Discover/import facility/provider | Workflow command with provenance read | Authorized discovery/import boundary plus `hospital_import_logs` | No unlabelled public canonical writes or silent fallback success. |
| Manage service/room prices | Authorized CRUD through scoped command | Pricing RPC family with explicit `hospital_id` | Never label first-hospital pricing as organization-wide override. |
| View pricing report or run bulk synchronization | Read projection or excluded workflow command | Pricing report owner; no Bulk Sync receiver proved | Report must open a mounted truthful view; Bulk Sync remains unavailable without an authorized auditable receiver. |
| View reservation/capacity relationship | Read projection plus emergency commands | Request-owned bed reservation and capacity receivers | Cancel/discharge only through correct command; no contradictory occupancy math. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Facility eligibility and operational capacity | hospital/organization identity, verification status, `emergency_eligible`, `dispatch_eligible`, `booking_eligible`, wait and bed-availability fields | Metadata edits and availability commands remain split; app-visible operational changes route through the availability receiver. |
| Provider/media/import provenance | provider type/source/category confidence; hospital media role/source/status/primary; import-log status/failure/provenance | Console facility operations include app-visible classification/media truth; discovery/import cannot persist silently. |
| Pricing and reservation identity | explicit `hospital_id`, service/room category, price/active state, linked request/capacity state | Never imply organization-wide pricing or occupancy from one facility row or inconsistent terminal request counts. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

| Console surface/control | Exact field projection required | Payload/receiver gate | App consequence to prove |
| --- | --- | --- | --- |
| Facility identity row | Hospital id, display id/name, organization id, facility type, verification status, active status | Reads must preserve hospital id and organization id as separate values. | App bed search and emergency matching resolve the same facility without org/hospital id drift. |
| Facility eligibility badges | `emergency_eligible`, `dispatch_eligible`, `booking_eligible`, verification state, operational status | Badge values must come from explicit fields, not inferred from presence in a list. | App does not offer dispatch, bed booking, or visit paths for ineligible facilities. |
| Capacity card | Total beds, available beds, occupied/reserved beds, wait estimate, last capacity update | Availability edits must route through `update_hospital_availability` or named receiver, not metadata save. | App capacity display and request matching share one operational truth. |
| Room/service pricing row | Hospital id, service/room category, price, currency, active flag, source timestamp | Pricing payloads must target explicit `hospital_id`; organization-wide copy stays unavailable until receiver exists. | App quote/payment lanes do not inherit a first-hospital price as system truth. |
| Reservation/capacity relation | Request id, hospital id, reservation status, occupancy impact, terminal state | Cancel/discharge controls require request-owned receiver and capacity side-effect proof. | App request history and bed availability reconcile after reservation changes. |
| Provider classification | Provider id, hospital id, type, category, source, confidence, provenance | Import/discovery writes require provenance and failure state. | App listings do not show unverified or silently imported provider truth as canonical. |
| Facility media | Hospital id, media role, storage path/url, primary flag, source, status | Upload/edit disabled until Storage policy and `hospital_media` receiver are proved. | App uses stable app-owned media and does not expose private or fragile URLs. |
| Import/discovery action | Query/source, candidate id, match confidence, selected hospital id, import log id/status/error | No silent success; every write must create auditable provenance. | Public or provider data cannot overwrite app-visible facility truth without trace. |
| Bulk sync/report action | Report fields, sync target, affected rows, actor, audit state | Bulk sync remains unavailable without authorized auditable receiver. | Console cannot mass-change app capacity/pricing through a dead or unproved button. |

Implementation rule: the first slice may centralize facility/capacity/pricing/media read projections and disable unsupported controls. It must not add Storage writes, import persistence, bulk sync, or pricing mutations until the exact receiver and app-visible consequence are charted.

Generated trace confirmation (May 25): `providers` and `hospital_media` now have cross-repo baseline traces and both report zero matched Console CRUD surfaces. Console currently lacks the app-visible provider/media management lane required by this pass even though provider-related labels exist elsewhere in the UI.

Storage evidence confirmation (May 25): current App/Console migration and maintained docs sources contain no active `storage.objects`/bucket policy authority; only archived legacy SQL mentions an `images` policy. The current `storageService` public-URL assumption cannot authorize facility media changes, so this pass remains blocked on read-only deployed Storage proof and `hospital_media` provenance ownership.

## Exact Facility, Pricing, And Receiver Exhibits

These are the code anchors for the next implementation handoff. They identify where the live Console currently changes meaning between facility source truth, UI render, payload and downstream app consequence.

| Exhibit | Current code location | Contract implication |
| --- | --- | --- |
| Hospitals route paged row read | `frontend/src/components/pages/HospitalsPage.jsx:70-99` reads either one URL-selected facility or a paged `getHospitals({ limit, offset, count })` window. | Keep page rows windowed, but move filter, KPI and sort into the read owner before claiming the page controls are authoritative. |
| Hospitals route global realtime owner | `HospitalsPage.jsx:103-117` subscribes to all `hospitals` changes and refetches the route. | Realtime should invalidate the facility query owner; page-level all-table subscriptions are a temporary source of duplicate refresh and scope drift. |
| Hospitals route context dependency | `HospitalsPage.jsx:37-40` consumes `usePageData().hospitalsData` while route rows come from `getHospitals()`. | Summary/KPI and route row truth must share one facility projection, or the UI can display contradictory totals/rows. |
| Hospital create/update payload allowlist | `frontend/src/services/hospitalsService.js:11-48` omits app-visible `provider_type`, `provider_source`, `emergency_eligible`, `dispatch_eligible`, `booking_eligible`, `hospital_media`, and provenance fields. | Base hospital save cannot be treated as full patient-visible provider catalog management. |
| Hospital read service paging | `hospitalsService.js:179-214` supports limit/offset but only status, verified, verification status and specialty filters. | Search, KPI and sort state from the page need explicit query contract before implementation. |
| Display-id enrichment bug risk | `hospitalsService.js:207-214` maps display IDs using hospital ids while comment says `ORG-XXXXXX`. | Facility identity projection must distinguish `HSP-` display id, organization id and any org display id. |
| Hospital metadata update receiver | `hospitalsService.js:286-300` calls `update_hospital_by_admin`. | This is an admin metadata receiver, not proof that availability, wait, media or app catalog fields are persisted with patient-visible semantics. |
| Direct capacity updates | `hospitalsService.js:362-406` updates `available_beds` and `status` directly on `hospitals`. | Operational capacity/status should route through the availability receiver that preserves bed JSON, status normalization and app-visible availability side effects. |
| Hospital detail discovery raw fetch | `frontend/src/components/modals/HospitalModal.jsx:156-184` calls `/functions/v1/discover-hospitals` with anon key and expects `data.hospitals`. | Discovery must use one service receiver contract and response shape; raw modal fetch bypasses import provenance/fallback handling. |
| Hospital image upload | `HospitalModal.jsx:130-145` uploads to a generic `hospitals` path and writes `image`. | Facility media changes remain blocked until Storage policy and `hospital_media` role/source/status/primary ownership are proved. |
| Reservation command receiver mismatch | `HospitalModal.jsx:721-745` renders Cancel, Arrived and Discharge actions; Cancel calls `bedManagementService.cancelReservation(...)`, while `bedManagementService.js:121-159` exposes `dischargePatient(...)` and `cancelBedReservation(...)` and has no `cancelReservation` method. | The visible cancel action is broken before authorization is even considered; rewire only through the request-owned guarded cancellation command after role/exposure/capacity reflection is proved. |
| Pricing route all-row load | `frontend/src/components/pages/PricingManagementPage.jsx:68-83` calls `getPricing()` and sets total count to loaded array length. | Pricing reads are not server-paged; totals and filters are client-window semantics over whatever the service returned. |
| Pricing modal save payload | `PricingManagementPage.jsx:106-132` submits org id but no selected hospital id. | Org-admin pricing save cannot honestly mean "organization override" when the service resolves to one facility. |
| Pricing client filters and paging | `PricingManagementPage.jsx:170-213` filters/searches/slices in memory and mutates total count inside `useMemo`. | Server-owned search/filter/page/count is required before pricing list totals can be trusted. |
| Pricing footer mojibake | `PricingManagementPage.jsx:241-244` renders a corrupted separator between page and rule count. | Encoding gate must be run on pricing files before any implementation commit touching this surface. |
| Pricing service broad joins | `frontend/src/services/pricingService.js:9-23` loads all hospitals and all service/room rows before mapping `organization_id`. | Replace with scoped facility pricing projection; broad joins are not acceptable for multi-hospital org truth. |
| Pricing first-hospital write | `pricingService.js:33-50` resolves an org pricing item to the earliest-created hospital when `hospital_id` is absent. | This is the core blocker: no implementation may keep organization-wide copy while writing one hospital row. |
| Pricing RPC payload | `pricingService.js:52-99` sends `hospital_id`, service/room fields and description to upsert RPCs. | The actual receiver is hospital-scoped. UI must expose hospital selection or disable org-wide save until a propagation receiver exists. |
| Import service Edge receiver | `frontend/src/services/hospitalImportService.js:18-35` invokes `discover-hospitals` with merge/import options. | This is closer to the desired owner than the modal raw fetch, but its response/provenance must be matched to the shared app-owned Edge source. |
| Import fallback | `hospitalImportService.js:74-89` falls back to `nearby_hospitals` and returns no new imports. | Fallback results must be labelled existing/read-only, not import success. |
| Import direct approval writes | `hospitalImportService.js:148-186` approves/rejects by direct `hospitals` update. | Approval is a workflow command that affects verification/dispatch eligibility; direct table update needs receiver/authorization proof or must be moved. |
| Import assignment drift | `hospitalImportService.js:192-205` writes `org_admin_id`, while current schema/role doctrine centers organization ownership. | Assignment semantics need Pass 4 identity alignment; `org_admin_id` cannot be assumed canonical facility ownership. |
| Import log read | `hospitalImportService.js:266-285` reads `hospital_import_logs` and returns empty if relation is missing. | Missing log table/scope should produce an unavailable provenance state, not silent proof that there were no imports. |
| Global pricing realtime | `frontend/src/contexts/PageDataContext.jsx:753-765` subscribes to `service_pricing` and `room_pricing` globally. | Pricing route should own pricing invalidation through its read owner; global domain realtime stays a Pass 8 cleanup dependency. |

## Facility Projection Boundary Target

The first implementation slice should define a facility projection service/query boundary, not a new broad context. Minimum target shape:

```ts
type FacilityProjection = {
  actor: { userId: string; role: string; organizationId: string | null };
  query: {
    page: number;
    pageSize: number;
    filters: Record<string, unknown>;
    sort: { key: string; direction: 'asc' | 'desc' };
  };
  rows: FacilityRow[];
  totalCount: number | null;
  aggregate: {
    totalFacilities: number | null;
    availableFacilities: number | null;
    totalBeds: number | null;
    availableBeds: number | null;
    icuBedsAvailable: number | null;
    basis: 'server_aggregate' | 'current_page' | 'unavailable';
  };
  detail?: {
    hospitalId: string;
    displayId: string | null;
    organizationId: string | null;
    metadata: FacilityMetadata;
    eligibility: {
      verified: boolean;
      verificationStatus: string | null;
      emergencyEligible: boolean | null;
      dispatchEligible: boolean | null;
      bookingEligible: boolean | null;
      status: string | null;
    };
    availability: {
      totalBeds: number | null;
      availableBeds: number | null;
      icuBedsAvailable: number | null;
      bedAvailability: Record<string, unknown> | null;
      waitMinutes: number | null;
      lastAvailabilityUpdate: string | null;
      stale: boolean;
    };
    media: {
      primaryUrl: string | null;
      source: 'hospital_media' | 'legacy_image' | 'external' | 'missing';
      provenanceState: 'ready' | 'unproved_storage' | 'missing_owner';
    };
    providerCatalog: {
      providerType: string | null;
      providerSource: string | null;
      confidence: number | null;
      managedByConsole: boolean;
    };
  };
  states: {
    loading: boolean;
    refreshing: boolean;
    unauthorized: boolean;
    degraded: boolean;
    missingCapabilities: string[];
  };
};
```

All route, panel, map and search consumers should either consume this projection or deliberately consume a smaller projection from the same owner:

- `/hospitals` desktop/mobile/list/table.
- `HospitalsPanel` and any `PageDataContext` hospital summary.
- `HospitalModal` view/detail/edit bootstrap.
- Map marker/detail hospital fields.
- Analytics/dashboard facility aggregates.
- QuickSearch hospital results.
- Pricing read owner where facility identity is needed.

## Pricing Projection Boundary Target

Pricing implementation must be facility-scoped first. A safe target contract:

```ts
type PricingProjection = {
  actor: { role: string; organizationId: string | null };
  scope: {
    mode: 'platform_default' | 'facility' | 'organization_summary';
    hospitalId: string | null;
    organizationId: string | null;
    editable: boolean;
    reason?: string;
  };
  rows: Array<{
    id: string;
    family: 'service' | 'room';
    hospitalId: string | null;
    organizationId: string | null;
    sourceLabel: 'platform fallback' | 'facility price' | 'organization summary';
    name: string;
    type: string;
    amount: number;
    currency: 'USD';
    active: boolean | null;
    updatedAt: string | null;
  }>;
  totalCount: number | null;
  summary: {
    globalFallbackCount: number;
    facilityPriceCount: number;
    averageAmount: number | null;
    basis: 'server_projection' | 'current_filter' | 'unavailable';
  };
};
```

Implementation must not retain the current first-hospital write behavior under organization-wide language. The first executable slice is either:

- add explicit hospital selection for pricing create/edit and save only facility-scoped rows, or
- disable org-admin pricing save with clear unavailable copy until a deliberate organization propagation receiver exists.

## Pass 3E Implementation Sequence And Blocker Matrix

This section converts the facility, capacity, discovery, media and pricing evidence into an implementation order. The ordering is conservative because facility truth is consumed by emergency matching, bed search, map detail, patient quotes, verification, onboarding, provider operations and dashboard analytics.

### Work Order

| Order | Slice | Can start now? | Target | Must not do |
|---|---|---:|---|---|
| 1 | Facility projection contract | Yes | Introduce a read-only facility projection boundary for row, detail, aggregate, eligibility, capacity, media provenance and degraded states. | Do not add Storage writes, import persistence, availability mutation or pricing mutation. |
| 2 | False capability downgrade | Yes | Disable or relabel unsupported facility/pricing controls: pricing reports without mounted receiver, bulk sync without handler, raw map/facility action promises, and broken reservation cancel. | Do not leave a button enabled because the JSX exists. |
| 3 | `/hospitals` read migration | After slice 1 | Route desktop, table/list/grid, mobile and panel facility displays through one projection with real page/filter/sort/count semantics. | Do not compute network totals, capacity totals or `LIVE` mobile metrics from page rows or unbounded bootstrap lists. |
| 4 | Facility detail and capacity read split | After slice 1 | Split metadata/detail read from operational availability/capacity read; expose stale/degraded capacity states. | Do not treat scalar `hospitals` fields, request reservations and room/capacity buckets as interchangeable truth. |
| 5 | Pricing read projection | After slice 1 | Build a facility-scoped pricing projection with explicit `hospital_id`, platform fallback rows, count basis, and amount/currency meaning. | Do not keep organization-wide pricing copy while saving to the earliest hospital. |
| 6 | Pricing edit disposition | After slice 5 | Either add explicit facility selection for create/edit or disable org-admin save until a propagation receiver exists. | Do not silently write one facility row under organization override language. |
| 7 | Operational availability writer | Blocked until receiver proof | Route capacity/status/wait changes through `update_hospital_availability` or a named app-visible receiver. | Do not use direct `hospitals.available_beds` or `hospitals.status` updates for app-visible operational truth. |
| 8 | Discovery/import provenance | Blocked until receiver proof | Use one service-owned discovery/import boundary with source labels, fallback labels, import logs and failure state. | Do not persist canonical provider/facility truth from raw modal `fetch` results. |
| 9 | Provider catalog and media | Blocked until policy/provenance proof | Add or preserve `providers`, `hospital_media`, Storage policy, role/source/status/primary and import provenance ownership. | Do not reduce app-visible provider/media truth to base `hospitals.image` or type fields. |

### Blocker Matrix

| Status | Work item | Reason |
|---|---|---|
| Ready | Read-only facility projection scaffold | Pass 3 has exact source, UI, payload and app-consequence fields for the minimum projection. |
| Ready | Unsupported control downgrade | Broken or unmounted controls can be disabled without backend mutation: reservation cancel, pricing report, bulk sync and misleading pricing scope copy. |
| Ready | Mobile metric truth labels | Mobile hospital/pricing metrics can stop using `LIVE` or total language when the source is only the loaded page/current collection. |
| Ready after projection | `/hospitals` row/panel/mobile migration | Needs the shared facility projection to prevent a new one-off route fix. |
| Ready after projection | `/pricing` read migration | Needs facility identity and pricing source labels before list, summary and mobile projections can be truthful. |
| Cross-pass | Reservation arrive/discharge/cancel | Request-owned bed lifecycle belongs with Pass 1 emergency legality and Pass 6 visit/history consequences. |
| Cross-pass | Facility verification and onboarding | Pass 4 owns organization/hospital identity and verification authority; Pass 3 consumes facility eligibility fields. |
| Cross-pass | Scheduling and fleet context | Pass 5 owns stored schedules, fleet availability and provider operations tied to a facility. |
| Cross-pass | Analytics/search/map summaries | Pass 8 consumes facility projections for dashboard, QuickSearch, reports and global realtime cleanup. |
| Blocked | Storage/media writes | Active source does not yet prove deployed Storage policies or `hospital_media` provenance ownership. |
| Blocked | Import persistence | Raw discovery/modal responses and fallback nearby results are not enough to create canonical provider/facility truth. |
| Blocked | Organization-wide pricing | Current receiver is hospital-scoped; no propagation receiver exists for every facility under an organization. |
| Blocked | Operational capacity mutation | Direct scalar updates do not prove app-visible availability, wait, bed JSON and request reservation side effects. |

### First Implementation Ticket Contract

The first code pass should be a read/disable pass, not a write pass:

- Add a facility projection service, for example `frontend/src/services/facilityProjectionService.js`, or extend `hospitalsService` behind a clearly named projection export.
- Return a stable `FacilityProjection` shape using the fields listed above.
- Preserve separate identities:
  - hospital/facility id,
  - hospital display id,
  - organization id,
  - organization display id when available.
- Return explicit source/degraded states for:
  - aggregate basis,
  - capacity freshness,
  - media provenance,
  - provider taxonomy ownership,
  - import provenance,
  - pricing scope.
- Expose command readiness as data, not local JSX guesses:
  - `canEditMetadata`
  - `canEditAvailability`
  - `canDeleteFacility`
  - `canImportDiscoveryCandidate`
  - `canUploadFacilityMedia`
  - `canEditFacilityPricing`
  - `canRunPricingBulkSync`
  - `canOpenPricingReport`
- Default unsafe commands to `false` with a specific `disabledReason`.
- Keep pricing projection separate enough that `/pricing` can migrate without making facility detail modal responsible for pricing state.

The first implementation ticket should not touch:

- Storage upload behavior,
- discovery/import persistence,
- direct availability mutations,
- pricing upsert/delete receivers,
- organization-wide price propagation,
- reservation lifecycle commands,
- onboarding or verification writes,
- map or analytics aggregates beyond consuming/degrading projected facility truth.

### Acceptance Gates For Implementation

Before the first implementation commit:

- `/hospitals` and `/pricing` have a named source for every rendered total, KPI, badge, amount and action.
- Loaded-page/current-filter metrics are labelled as such or replaced by server aggregate proof.
- No enabled visible control calls an absent method, unmounted event receiver or cross-pass command.
- Pricing create/edit either collects an explicit facility id or remains unavailable for organization-wide edits.
- `hospitals.id` and `organizations.id` cannot be collapsed into a single `organizationId` or `facilityId` variable without a projection field that names the conversion.
- Media/image changes are unavailable unless Storage policy and `hospital_media` provenance proof exists.
- Import/discovery persistence remains unavailable unless the receiver returns auditable source/result/failure state.
- Availability/capacity mutation remains unavailable unless the app-visible receiver and patient consequence are named.

## Pass 3A Surface-By-Surface Confirmation Ledger

This ledger is the next executable audit checklist for facilities, capacity and pricing. It does not authorize code, Storage, Edge, import, pricing, availability or database mutation. Runtime implementation begins only after each surface is confirmed and marked retained, disabled, moved to the facility/pricing owner, or blocked by receiver/RLS/provenance proof.

| Mounted surface or command | Current source truth | Fields or controls to retain | Fields or controls to move to owner | Fields or controls to disable/remove first | First implementation gate |
| --- | --- | --- | --- | --- | --- |
| `/hospitals` route rows | `HospitalsPage.jsx:64-99` reads one URL-selected facility or a paged `getHospitals()` window. | Route workspace, pagination intent and row viewing can remain. | Filters, KPI selection, sort, row projection, count and degraded state move to facility projection. | Do not treat page rows as network totals or capacity aggregates. | Projection returns page rows, total/count basis, filter/sort basis and degraded reasons. |
| `/hospitals` route realtime | `HospitalsPage.jsx:103-117` subscribes to all `hospitals`. | Route invalidation can remain conceptually. | Channel scope and refresh target move to facility owner. | Do not let broad all-table realtime become canonical facility truth. | Realtime plan names scope, cleanup and whether it refreshes list or detail. |
| Hospital KPI cards and context stats | `HospitalsPage.jsx:453-599` renders `hospitalsData.stats`; Pass 3 evidence ties this to global/unbounded reads. | Summary cards can remain with scoped aggregate labels. | Total, available, bed and ambulance counts move to facility/server aggregate projection. | Remove `LIVE`/network-ready claims from row/bootstrap-derived totals. | Each KPI has source, scope, count basis and unavailable state. |
| Hospital grid/list/table/mobile rows | Grid/cards use raw fields; list/table/mobile variants repeat facility fields and actions. | Layout variants can remain. | Identity, address, image/media, verification, status, capacity, rating, fleet and action state move to row projection. | Disable row actions whose command authority is not proven. | All variants consume the same facility row projection. |
| Hospital detail modal | `HospitalModal` loads facility detail, reservations and utilization independently. | Detail view can remain. | Metadata, capacity, reservations, utilization, media and import provenance move to detail projection. | Do not show clinical/reservation context beyond authorized role scope. | Detail projection distinguishes metadata, capacity, reservation and patient/request exposure states. |
| Hospital create/edit modal | `HospitalModal` captures metadata, image, beds, wait, coordinates and discovery-selected values. | Metadata edit can remain where receiver persists it. | Operational availability, media provenance, provider taxonomy and discovery import state move to named owners. | Disable unsupported app-visible fields, image upload and discovery persistence until receiver/provenance proof exists. | Edit form separates metadata save from availability/media/import/provider commands. |
| Reservation controls in modal | `HospitalModal.jsx:721-745` renders Cancel/Arrived/Discharge; Cancel calls a nonexistent method. | Read-only reservation display can remain if exposure is authorized. | Arrived/discharge/cancel actions move to request-owned lifecycle/capacity command model. | Disable Cancel/Arrived/Discharge until command wiring, role exposure and capacity reflection are proved. | No visible reservation command calls a missing method or bypasses Pass 1/6 lifecycle rules. |
| Facility delete and bulk delete | Route and responsive variants expose destructive controls with inconsistent roles. | Deletion can remain only after route-role doctrine and receiver/audit proof. | Delete readiness moves to projection/action state. | Disable bulk/destructive actions until role, receiver, cascade and auditability are closed. | `canDeleteFacility` includes actor role, facility scope, receiver and reflected read. |
| Facility scheduling entry | Hospital cards/modal can open scheduling modal. | Navigation/selection can remain as cross-pass dependency. | Scheduling readiness moves to Pass 5 provider/schedule projection. | Do not imply facility CRUD owns doctor or ambulance schedules. | Scheduling actions unavailable until Pass 5 stored schedule/fleet authority closes. |
| `/pricing` route read | `PricingManagementPage.jsx:68-83` loads all pricing through `getPricing()` and treats loaded length as total. | Pricing workspace and list view can remain. | Server/page scope, facility id, org id, source label, amount/currency and count basis move to pricing projection. | Do not present all loaded rows as complete pricing truth. | Pricing projection returns source-labelled facility rows and summary basis. |
| `/pricing` create/edit | `PricingManagementPage.jsx:106-132` submits org id but no selected hospital id; service resolves earliest hospital. | Create/edit can remain only with explicit facility scope. | Hospital selector, facility identity, pricing receiver and unavailable state move to pricing owner. | Disable org-wide override save unless propagation receiver exists. | Save payload contains explicit `hospital_id` or the command is unavailable. |
| Pricing table/list/mobile metrics | `PricingTableView` renders raw USD amounts; `MobilePricing` derives averages/trends from local `allPricing`. | Display of service/room rules can remain. | Scope labels, quote/display currency meaning, average basis and trend basis move to projection. | Remove `LIVE`/complete-scope claims from local collections. | Mobile and desktop identify `facility`, `platform fallback`, `current filter` or unavailable basis. |
| Pricing context panel | Reports dispatches without page listener; Bulk Sync has no handler; scope copy repeats org/global drift. | Add Item can remain if mounted receiver is valid. | Reports/export/bulk sync readiness moves to pricing/report owner. | Disable Reports and Execute Bulk Sync until receivers exist. | No panel button emits an unreceived event or unimplemented command. |
| Pricing route Top Up action | Shared shell can show wallet `Top Up` while on `/pricing`. | Finance handoff can remain only if deliberate. | Handoff readiness moves to Pass 2 finance command readiness. | Remove accidental pricing-primary top-up action while pricing CRUD is audited. | Pricing actions cannot silently become wallet mutation UI. |
| Discovery autocomplete/import | Modal raw fetch calls `discover-hospitals`; service also invokes app-owned Edge function and fallback nearby RPC. | Search/autocomplete can remain as read-only candidate lookup. | Discovery request/response, fallback labels, import logs and persistence commands move to discovery/import owner. | Disable canonical import/persist success from raw modal responses. | Candidate projection names source, match confidence, fallback/read-only/importable state and log result. |
| Provider taxonomy and eligibility | Console base hospital edit omits `providers` table and app eligibility fields. | Read-only display can remain if source-labelled. | Provider type/source/confidence, emergency/booking eligibility and dispatch eligibility move to provider catalog projection. | Do not mark provider/media/catalog lane implemented from base `hospitals.type` or `hospitals.image`. | `providers` and eligibility fields have owner, policy and app consequence. |
| Facility media/image | `HospitalModal` uploads to Storage and writes `hospitals.image`; no active Storage policy or `hospital_media` ownership is proved. | Existing image display can remain as legacy image if labelled. | Upload, media role/source/status/primary and stable delivery path move to media owner. | Disable upload/replace media until Storage policy and `hospital_media` provenance are proved. | Projection distinguishes `legacy_image`, `hospital_media`, external/missing and unavailable states. |
| Console map facility markers | Map context/supabase map service reads hospitals globally/nearby and marker detail renders available beds. | Map display can remain as consumer. | Marker feed, fallback labels and capacity fields move to map/facility projection. | Disable unreceived call/action controls and avoid unbounded capacity claims. | Map marker data states viewport, nearby, fallback or unavailable source. |
| Analytics/dashboard facility metrics | Analytics reduces row data for bed/ICU capacity; dashboard can fabricate fallback hospital/bed values. | Navigation summaries can remain if source-labelled. | Aggregates, capacity totals and report readiness move to facility aggregate and Pass 8 shell/analytics owner. | Remove fabricated/fallback capacity numbers and disable exports until source is proved. | Metrics identify exact count aggregate versus row-window reduction. |
| Onboarding/verification facility dependency | Pass 4 owns org/hospital identity and verification authority. | Facility eligibility display can remain as dependency. | Verification/claim status moves to Pass 4 identity/facility authority. | Do not repair onboarding/verification inside Pass 3 facility projection. | Facility projection consumes verified status but does not own identity approval commands. |

Pass 3A stop condition: if a facility/pricing surface cannot consume the shared projection yet, it must be marked unavailable or left untouched. Do not patch that surface with another unbounded query, earliest-hospital fallback, raw discovery fetch, public-URL upload, local capacity reducer or unreceived custom event.

Suggested verification once code changes begin:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
npm run build
```

Runtime smoke after code begins should include `/hospitals`, `/pricing`, the hospital detail modal, mobile hospital view and mobile pricing view. Database and Edge verification must stay read-only until a separate implementation pass explicitly authorizes receiver testing.

## Implementation Packages

### 1. Facility Read Owner

Create or refine a read boundary that returns:

- list rows
- stats/KPIs
- detail row
- availability/capacity fields
- verification/import/source labels
- org ownership/scope
- app-visible eligibility fields
- degraded flags for missing capacity or stale availability

Acceptance gate:

- `HospitalsPage`, context panels, and mobile views do not duplicate facility read/stat ownership.

### 2. Capacity And Bed Truth

Use `update_hospital_availability` as the operational capacity/status/wait writer. Keep administrative facility metadata separate. The operational receiver owns:

- total beds
- available beds
- ICU beds
- ER wait/wait time
- `bed_availability`
- reservations
- discharge/cancel/arrived bed actions
- `last_availability_update`

Acceptance gate:

- Patient-app bed search and console facility detail see the same availability meaning.
- UI labels fallback capacity as stale/degraded instead of confident.
- Reservation controls use named request-owned lifecycle receivers; a facility detail modal cannot ship a Cancel button that calls a missing method.

### 3. Discovery And Import

Consolidate discovery:

- one service owns `discover-hospitals`
- one fallback path owns `nearby_hospitals`
- results label source: existing, Google, pending import, verified, rejected
- import/approve/reject/assign actions have pending and failure state
- import attempts and outcomes render `hospital_import_logs` provenance instead of silently succeeding without durable history

Acceptance gate:

- Selecting a discovered hospital does not imply canonical provider creation until the authorized receiver persists it.

### 4. Provider Catalog, Storage, And Media

Operate the app-visible provider/media contract:

- add deliberate management or authorized projection for `providers.provider_type`, emergency/booking eligibility, source and confidence
- use `hospital_media` provenance/active selection when Console modifies public facility media, or leave discovery-selected media unchanged
- render import source/outcome from `hospital_import_logs`

Define storage rules:

- bucket name
- path format
- public/private URL strategy
- replacement/cleanup policy
- allowed roles
- file size/type rules

Acceptance gate:

- Facility images are delivered through stable app-owned paths and do not rely on fragile provider URLs when persisted.
- A facility changed in Console does not lose or misstate app-visible provider classification or media provenance.

### 5. Pricing Scope

Pricing is hospital/facility-scoped for active patient quotes, with two typed row families:

- `service_pricing` for facility service types.
- `room_pricing` for facility room/bed categories.
- Null-hospital rows, where retained, are explicit platform defaults/fallbacks and must not be presented as an organization override.
- Organization-level presentation is aggregation only unless a future propagation receiver deliberately writes each facility row.

Acceptance gate:

- Multi-hospital organizations cannot silently write pricing to the first hospital.
- Pricing UI clearly distinguishes global/org/hospital scope before saving.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on `/hospitals` and `/pricing`.
- Create/edit hospital with image upload in non-production.
- View hospital detail with bed reservations.
- Pricing smoke for global, org, and hospital scope.

Backend/RLS/RPC/Edge:

- RPC tests for `update_hospital_by_admin` and `delete_hospital_by_admin`.
- Edge Function test or staging proof for `discover-hospitals`.
- Read-only proof for pricing table scope and hospital/org mapping.
- App quote comparison for selected hospital pricing.

Stop conditions:

- Do not implement pricing writes without an explicit facility selection; never write an implicit earliest-hospital organization override.
- Do not import discovered providers without authority proof.
- Do not change availability fields until app-visible capacity semantics are confirmed.
