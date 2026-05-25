# Pass 3 Hospital, Capacity, And Pricing Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Edge Function, import, storage, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers hospital/facility management, Google discovery/import, bed/capacity truth, storage/media uploads, pricing scope, and dispatch/app visibility.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/modals/HospitalModal.jsx`
- `frontend/src/components/pages/PricingManagementPage.jsx`
- `frontend/src/components/views/PricingTableView.jsx`
- `frontend/src/components/mobile/MobilePricing.jsx`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/hospitalImportService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/pricingService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/contexts/PageDataContext.jsx`

Audit docs:

- Stage 2 service data flow audit.
- Stage 3 capability gap audit.
- Stage 4 L5 ownership audit.
- Stage 5 service coverage audit.
- Stage 6 implementation pass plan.
- Emergency/payment/capacity contract chart.

Observed source signals:

- `HospitalsPage` consumes `PageDataContext` stats while also fetching hospitals directly.
- `HospitalsPage` owns a global `hospitals` realtime channel.
- `HospitalModal` uploads images through `storageService`, calls `discover-hospitals` through raw `fetch`, and uses `bedManagementService` for reservations/utilization.
- `hospitalsService.updateHospital` uses `update_hospital_by_admin`, while some status/bed count updates still write direct table fields.
- `hospitalImportService` invokes `discover-hospitals`, falls back to `nearby_hospitals`, and includes approval/rejection/assignment paths.
- `pricingService` maps hospital-scoped pricing back to organization scope and chooses the first hospital for organization writes.

## User Flow

Operator path:

1. Open hospitals/facilities page.
2. Search, filter, view, create, edit, or delete facilities.
3. Open facility detail and see availability, capacity, bed reservations, and schedule entry points.
4. Search/discover hospitals from Google/Edge source and choose whether to import or fill details.
5. Upload/update facility image.
6. Update capacity/availability in a way the patient app can consume.
7. Manage service and room pricing with clear global, organization, and hospital scope.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Hospital list/stats | Page direct read plus `PageDataContext` stats. | Facility read owner. |
| Hospital detail | Page URL path and modal state fetch independently. | Facility detail projection. |
| Capacity/bed truth | Direct scalar updates plus bed reservation service. | Capacity owner that reconciles scalar fields, `bed_availability`, reservations, and app-visible availability. |
| Discovery/import | Modal raw `fetch` plus `hospitalImportService` Edge flow. | Discovery/import owner with live/fallback/source labels. |
| Image upload | Modal direct upload path. | Storage/media owner with bucket/path/auth semantics. |
| Pricing | Organization filter plus hospital first-choice write semantics. | Facility-scoped `service_pricing` / `room_pricing` owner with explicitly labelled platform fallback rows only. |
| Realtime | Page and modal own separate channels. | Domain owner invalidation with modal-scoped detail exceptions. |

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

Decide the canonical writer for:

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

Acceptance gate:

- Selecting a discovered hospital does not imply canonical provider creation until the authorized receiver persists it.

### 4. Storage And Media

Define storage rules:

- bucket name
- path format
- public/private URL strategy
- replacement/cleanup policy
- allowed roles
- file size/type rules

Acceptance gate:

- Facility images are delivered through stable app-owned paths and do not rely on fragile provider URLs when persisted.

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
