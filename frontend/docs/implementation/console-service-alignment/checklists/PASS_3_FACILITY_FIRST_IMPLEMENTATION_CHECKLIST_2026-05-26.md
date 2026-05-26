# Pass 3 Facility First Implementation Checklist - 2026-05-26

## Status

Executable implementation checklist, planning only. No product runtime code, database mutation, Edge invocation, import persistence, Storage upload, availability write, pricing write, cleanup, seed, reset, migration, or historical repair is authorized by this document.

This checklist is the first safe facility slice after the Pass 3 audit. It focuses on bounded reads, projection truth, false-control downgrade, and pricing/facility scope. It does not implement facility CRUD repair, discovery import, media upload, capacity mutation, pricing mutation, map redesign, onboarding repair, or bed lifecycle commands.

## Required Reading Before Code

- `../passes/PASS_3_HOSPITAL_CAPACITY_PRICING_FLOW_SUBPLAN_2026-05-24.md`
- `../contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md`
- `../stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `../services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/pricingService.js`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md`

## Scope

Runtime files likely in scope for the first slice:

- `frontend/src/services/hospitalsService.js`
- `frontend/src/components/pages/HospitalsPage.jsx`
- `frontend/src/components/mobile/MobileHospitals.jsx`
- `frontend/src/components/context/HospitalsPanel.jsx`
- `frontend/src/services/pricingService.js`
- `frontend/src/components/pages/PricingManagementPage.jsx`
- `frontend/src/components/mobile/MobilePricing.jsx`
- `frontend/src/components/context/PricingContextPanel.jsx`

Runtime files to inspect but not freely edit in the first slice:

- `frontend/src/components/modals/HospitalModal.jsx`
- `frontend/src/services/hospitalImportService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/contexts/MapContext.jsx`
- `frontend/src/services/supabaseMapService.js`
- `frontend/src/components/map/MarkerDetailPanel.jsx`
- `frontend/src/components/onboarding/OrganizationDetailsStep.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`

Excluded from the first slice:

- Storage policy or media upload changes.
- Discovery/import persistence or Edge invocation.
- Availability/capacity mutation.
- Pricing create/edit/delete mutation.
- Organization onboarding or verification writes.
- Reservation cancel/arrive/discharge lifecycle commands.
- Dispatch candidate selection repair.
- Analytics/export/report generation.

## First Slice Objective

Make facility and pricing surfaces stop lying about completeness and scope.

The slice should:

1. Add or define one read-only facility projection boundary.
2. Repair or disable the proved unbounded `/hospitals` first-page query path.
3. Label facility, capacity and pricing metrics by source and window.
4. Disable unsupported controls: broken reservation cancel, pricing report, bulk sync, media upload, import persistence and org-wide pricing save where needed.
5. Keep pricing and facility identities separate: hospital id is not organization id, and organization copy is not facility-scoped receiver truth.
6. Keep all backend writes on existing paths only where already present; do not add a new mutation.

## Projection Contract To Implement First

The first implementation should produce these render-safe values before route/panel/mobile JSX consumes them:

| Projection key | Required fields | First-slice rule |
| --- | --- | --- |
| `actorScope` | actor id, role, organization id, facility ids, scope state | Role and organization scope must be explicit; no implicit facility management. |
| `facilityPage` | rows, page size, current page, total count, filter basis, sort basis, degraded state | The first page must be bounded. Missing page-size fields are blockers. |
| `facilityRow` | hospital id, display id, organization id, name, address, status, verification, eligibility, image/media state | Hospital id and organization id stay separate. |
| `facilityAggregate` | total, available, full, bed count, ambulance count, basis | Aggregates are server/scoped, current page, or unavailable; never unbounded bootstrap truth. |
| `capacityDisplay` | total beds, available beds, ICU, wait, last update, stale/degraded state | Metadata fields and operational availability are separate. |
| `reservationDisplay` | request ids, bed labels, patient/request exposure state, command readiness | Read-only until request-owned command wiring is proved. |
| `mediaDisplay` | legacy image, hospital media state, source/provenance, upload readiness | Upload defaults unavailable until Storage and `hospital_media` proof exists. |
| `discoveryDisplay` | candidate source, confidence, fallback/read-only/importable state, import log state | Raw discovery result is not canonical persistence. |
| `pricingPage` | rows, hospital id, organization id, fallback/global state, page/window basis | Pricing is facility-scoped unless a propagation receiver exists. |
| `pricingMetrics` | average, global count, override count, trend basis | Local loaded collection is not complete pricing analytics. |
| `commandState` | edit, delete, schedule, upload, import, availability, pricing save, pricing delete, report, bulk sync | Unsafe commands default disabled with reason and owner pass. |

## Action Disposition

| Action | First-slice disposition |
| --- | --- |
| View facility list | Retain through bounded projection only. |
| Refresh/load more facility rows | Retain only if same bounded query owner supplies rows/count/state. |
| Edit facility metadata | Leave unchanged or disable unless field persistence is proved; do not expand. |
| Edit availability/capacity | Disable/unavailable until `update_hospital_availability` contract is implemented. |
| Upload/replace facility image | Disable/unavailable until Storage and `hospital_media` authority are proved. |
| Discover/import facility | Candidate lookup can be read-only; persistence/import success remains unavailable. |
| Cancel/arrive/discharge reservation | Disable until correct request-owned command and capacity reflection are proved. |
| Delete facility/bulk delete | Disable until role, receiver, cascade and audit consequences are documented. |
| Create/edit pricing | Require explicit facility id or disable org-wide save. |
| Delete/bulk delete pricing | Disable until receiver scope, selected ids, partial failure and refreshed count are proved. |
| Pricing report/Bulk Sync | Disable unless a mounted receiver exists. |
| Pricing route Top Up | Remove or mark as Pass 2 finance handoff, not pricing CRUD. |

## Parser, Pagination, And Scope Checks

Before editing JSX, search and classify:

```powershell
rg -n "pageSize|itemsPerPage|getHospitals\\(|fetchHospitalsData|fetchInitialMapData|getPricing\\(|saveServicePricing|saveRoomPricing|deleteServicePricing|deleteRoomPricing|openTopUpModal|Bulk Sync|openAnalyticsModal|uploadImage|discover-hospitals|hospital_media|providers|bed_availability|emergency_wait_time_minutes|cancelReservation|cancelBedReservation|LIVE" frontend/src/components frontend/src/services frontend/src/contexts frontend/src/hooks
```

Required outcomes:

- `usePagination()` callers use the actual returned field (`itemsPerPage`) or a named projection page size.
- Zero offset and missing limit cannot produce unbounded first-page rows.
- Search/filter/sort controls either reach the projection query or are labelled local/current-window.
- Pricing save payload contains an explicit `hospital_id`, or save is unavailable.
- Current-page/current-filter metrics are not labelled network truth or live totals.
- Map/PageData bootstrap reads are not accepted as facility route truth.
- Browser logs/toasts do not expose raw facility, Storage, Edge, discovery or policy errors.

## App Consequence Notes

Facility changes affect `ivisit-app` emergency matching, bed search, hospital cards, map details, visit handoff, pricing quotes and provider trust.

Required consequence rules:

- A facility can be visible without being dispatch, emergency, booking or pricing ready.
- Capacity must distinguish scalar bed fields, bed snapshot state, request reservations and stale/unavailable state.
- Patient price/quote proof comes from hospital-scoped price rows plus app quote receiver/provenance, not raw Console CRUD.
- Discovery/provider/media data needs provenance; public provider URLs are not durable app-owned media.
- Map marker capacity and dispatch candidate selection cannot use unbounded first-row collection truth.
- Organization onboarding/verification can change facility eligibility but is owned by Pass 4.

## Verification

Planning/doc-only edits:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/PASS_3_FACILITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/PASS_3_FACILITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation checks after code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
cd frontend
npm run build
```

Browser smoke after code begins:

- `/hospitals` first page is bounded and shows total/count basis.
- Hospital filters, sort and search are either authoritative or labelled local/current-window.
- Mobile hospital refresh/load-more uses the same bounded projection.
- `/pricing` displays facility-scoped rows and does not call an org-wide save without facility id.
- Pricing report, bulk sync, media upload, import persistence and reservation commands are disabled or receiver-backed.
- Browser console does not emit raw facility, discovery, Storage, pricing, reservation or map payloads during normal viewing.

DB/RPC/Edge/Storage hardening is not authorized during audit. If later authorized for implementation, run only the smallest relevant non-production check and follow the cleanup dry-run guard required by Stage 6.

## Commit Boundary

Commit only when one of these coherent checkpoints is reached:

- Checklist/doc planning pack is complete and verified.
- First runtime facility/pricing read-disable cleanup is implemented and verified with no backend mutation.
- A later Storage/Edge/RPC/pricing/capacity repair is separately authorized, verified and cleanup-guarded.

Do not commit a single pagination typo fix without the projection, receiver and verification notes that make it resumable.
