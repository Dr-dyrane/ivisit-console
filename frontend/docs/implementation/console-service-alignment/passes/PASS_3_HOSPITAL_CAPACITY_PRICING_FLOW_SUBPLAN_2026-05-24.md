# Pass 3 Hospital, Capacity, And Pricing Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Edge Function, import, storage, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers hospital/facility management, provider catalog classification, hospital media provenance, Google discovery/import provenance, bed/capacity truth, storage/media uploads, pricing scope, and dispatch/app visibility.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/modals/HospitalModal.jsx`
- `frontend/src/components/pages/PricingManagementPage.jsx`
- `frontend/src/components/context/PricingContextPanel.jsx`
- `frontend/src/components/views/PricingTableView.jsx`
- `frontend/src/components/mobile/MobilePricing.jsx`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/hospitalImportService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/pricingService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/contexts/PageDataContext.jsx`
- Shared receivers `providers`, `hospital_media`, and `hospital_import_logs` from the app-owned organization schema/policy source.

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
| `/hospitals` grid/list/table/mobile; route permits `org_admin` and above while the context panel advertises admin/org-admin management. | Facility identity, address/image, verification/status, beds/ICU, fleet, ER wait and rating; table/page count. | Rows are page-windowed, but page filters/KPI selection/table sort do not govern retrieval/rendered rows; read scope and role contract still need one facility projection. | View, edit, delete and scheduling controls are rendered across variants. | Read remains open for role/source closure; edit/delete/schedule require field-by-field command/RLS proof before retained. |
| Hospital KPI cards and `HospitalsPanel`; available wherever the hospital route context is mounted. | Network total, available/full facilities, total beds, total ambulances and recent hospitals. Panel labels total as `Active` and available as `Nearby`. | `PageDataContext` derives claims from unbounded `getHospitals()`; 1000 returned rows can masquerade as full network truth. `Nearby` is a label mismatch unless proximity is supplied. | Panel Add opens create modal; Analytics opens stats modal; Filter dispatches page event; Contact is disabled. | Replace summary source with scoped aggregates and correct labels; keep create/analytics/filter only after role and receiver closure. |
| `HospitalModal` view mode reached from facility row. | Full facility metadata plus active reservations and bed-utilization context, including request/patient-linked bed evidence. | Detail independently loads bed data/realtime; exposure of reservation/clinical context needs explicit operational role authorization and consistent capacity semantics. Existing contract evidence shows occupied/reserved math drift. | View-only surface still supplies entry context for schedule and subsequent edit flows. | Detail read projection must declare permitted actors and minimum clinical exposure before use as authoritative facility detail. |
| `HospitalModal` create/edit mode and page save handlers; header create currently admin/org-admin. | Form captures metadata, image, status/verification, beds, ICU, fleet count, ER wait, coordinates/place identity and discovery-selected values. | Existing contract evidence proves ER wait can be silently ignored by `update_hospital_by_admin`, taxonomy/eligibility/media provenance fields required by the app are omitted, and raw discovery contract is drifted. | Create/edit facility, upload image, search/select discovered hospital/provider. | Split metadata from operational availability; prove create/update/Storage/discovery authority; disable or remove unsupported fields until receiver persists their meaning. |
| Row and bulk destructive controls across responsive variants. | Selection implies a manageable facility record set. | Role checks are not uniform: grid gates row edit/delete to admin/org-admin, `HospitalTableView` includes provider in `canManage`, and bulk-delete buttons check admin/provider rather than org-admin. | Delete one or multiple facilities. | No destructive action is ready until route/component role doctrine and audited delete receiver/auditability are aligned. |
| Facility scheduling entry point. | Facility is selectable as context for staff scheduling. | Pass 5 evidence is required because existing scheduling service does not yet establish persisted ambulance-shift authority and doctor schedule ownership is separate. | Open/manage schedule from hospital card or mobile action. | Retain as cross-pass dependency only after Pass 5 defines authorized stored schedule commands; do not imply facility CRUD owns schedules. |

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

Generated trace confirmation (May 25): `providers` and `hospital_media` now have cross-repo baseline traces and both report zero matched Console CRUD surfaces. Console currently lacks the app-visible provider/media management lane required by this pass even though provider-related labels exist elsewhere in the UI.

Storage evidence confirmation (May 25): current App/Console migration and maintained docs sources contain no active `storage.objects`/bucket policy authority; only archived legacy SQL mentions an `images` policy. The current `storageService` public-URL assumption cannot authorize facility media changes, so this pass remains blocked on read-only deployed Storage proof and `hospital_media` provenance ownership.

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
