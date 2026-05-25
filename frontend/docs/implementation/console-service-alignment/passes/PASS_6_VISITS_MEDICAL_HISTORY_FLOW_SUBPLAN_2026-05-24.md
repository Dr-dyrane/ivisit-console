# Pass 6 Visits And Medical History Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, cleanup, seed, migration, medical-profile write, or runtime mutation is authorized by this document.

This subplan covers visits, request-derived history, emergency-to-visit lookup, medical profile consumption, clinical record detail, and patient/provider/hospital context hydration.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/VisitsPage.jsx`
- `frontend/src/hooks/useVisits.js`
- `frontend/src/utils/visitContextUtils.js`
- `frontend/src/services/visitsService.js`
- `frontend/src/services/medicalProfilesService.js`
- `frontend/src/services/emergencyService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`

Observed source signals:

- `VisitsPage` does direct paginated Supabase reads, count reads, profile joins, emergency request joins, doctor joins, and hospital joins.
- `VisitsPage` uses `visit.request_id || visit.id` as an emergency lookup key.
- Emergency views and modal call `getVisit(request.id)` directly.
- `visitContextUtils.fetchEmergencyContext` calls `getEmergencyRequests()` and then searches in memory.
- `medicalProfilesService` exists but is not yet tied into the visit detail read model.
- `visitsService` has rich row normalization but page code still performs substantial hydration.

## User Flow

Operator/provider path:

1. Open visits/clinical records.
2. Search/filter visits.
3. View a visit with patient, doctor, hospital, emergency context, and summary.
4. Create/update/cancel/complete/no-show a visit when allowed.
5. Open clinical record from an emergency request.
6. See patient medical profile context only when authorized and truthfully available.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Visit list/count | Page direct queries plus service/hook. | Visit read owner. |
| Visit hydration | Page manually joins profiles, hospitals, doctors, emergencies. | Visit projection owner. |
| Emergency-to-visit lookup | `getVisit(request.id)` and `visit.request_id || visit.id` fallbacks. | Explicit request-derived visit lookup. |
| Medical profile | Service exists but not integrated into visit detail. | Authorized patient-care projection. |
| Visit actions | Hook/service/page can mutate visit state. | Visit command boundary with legality checks. |
| Realtime | Page and service subscriptions may duplicate ownership. | Visit owner invalidation and detail-scoped subscriptions. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View/search/hydrate visit | Scoped read projection | `visits` with patient, provider, hospital, request projections | Use explicit `request_id` linkage and one read model. |
| View emergency-derived clinical outcome | Backend-derived read-only evidence | Emergency-to-visit trigger/RPC output | Do not edit/delete a request-owned row as ordinary visit CRUD. |
| Create/edit administrative visit | Missing/conditional authorized CRUD | Separate administrative visit ownership not yet proven for Console actor | Enable only after authority and status vocabulary are explicit. |
| Cancel/complete/no-show visit | Workflow command | Visit lifecycle receiver to be proven | Do not direct-update lifecycle state while emergency sync may own it. |
| View medical context | Restricted read projection | Authorized patient-care/medical projection | No broad administrative medical-profile CRUD. |

## Implementation Packages

### 1. Visit Read Model

Create or refine one owner returning:

- paginated visits
- counts/KPIs
- filters/search results
- patient projection
- doctor/provider projection
- hospital/facility projection
- emergency/request context
- medical profile availability flag
- degraded/unauthorized flags

Acceptance gate:

- `VisitsPage` no longer performs manual multi-table hydration.

### 2. Request-Derived Visit Lookup

Define one method:

- `getVisitByRequestId(requestId)` if visits link by `request_id`
- or explicit `getVisitByEmergencyRequestId`
- or terminal emergency detail projection that includes visit summary

Acceptance gate:

- Emergency modal/list/table use the same lookup and do not pass request id into `getVisit` unless that is proven correct.

### 3. Medical Profile Consumption

Decide where medical profile appears:

- visit detail only
- emergency detail only
- provider-only clinical context
- hidden unless patient consent/backend policy allows it

Acceptance gate:

- UI does not imply medical profile sharing unless backend authorization enforces it.

### 4. Visit Command Boundary

Centralize:

- create visit
- update visit
- complete visit
- cancel visit
- no-show
- delete

Acceptance gate:

- Visit status copy reflects backend-confirmed state, not optimistic local list mutation alone.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on visits list, detail modal, create/edit, and emergency clinical-record entry.
- Empty, unauthorized, no-linked-visit, and loading states.

Backend/RLS/RPC:

- Read-only proof for visits request linkage.
- RLS tests for admin, org admin, provider, and patient/ordinary users.
- Tests or fixture checks for visit lifecycle actions.
- Medical profile access tests before exposing profile context.

Stop conditions:

- Do not repair emergency details from visits page code alone.
- Do not expose medical profiles without authorization proof.
- Do not backfill request-derived visits without separate maintenance approval.
