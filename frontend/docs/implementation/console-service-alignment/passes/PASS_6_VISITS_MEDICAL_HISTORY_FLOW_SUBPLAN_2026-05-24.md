# Pass 6 Visits And Medical History Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, cleanup, seed, migration, medical-profile write, or runtime mutation is authorized by this document.

This subplan covers visits, request-derived history, emergency-to-visit lookup, medical profile consumption, clinical record detail, and patient/provider/hospital context hydration.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/VisitsPage.jsx`
- `frontend/src/components/modals/VisitModal.jsx`
- `frontend/src/components/mobile/MobileVisits.jsx`
- `frontend/src/components/views/VisitListView.jsx`
- `frontend/src/components/views/VisitTableView.jsx`
- `frontend/src/components/context/VisitsPanel.jsx`
- `frontend/src/contexts/PageDataContext.jsx`
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

Canonical app/shared-backend evidence inspected:

- `../ivisit-app/docs/flows/emergency/history/MAP_VISITS_SYSTEM_AUDIT_V1.md`
- `../ivisit-app/docs/flows/emergency/history/VISITS_REQUEST_HISTORY_PLAN.md`
- `../ivisit-app/services/visitsService.js`
- `../ivisit-app/supabase/docs/REFERENCE.md`
- `../ivisit-app/supabase/docs/MODULE_SCHEMA_BIBLE.md`
- `../ivisit-app/supabase/migrations/20260219000300_logistics.sql`
- `../ivisit-app/supabase/migrations/20260219000400_finance.sql`
- `../ivisit-app/supabase/migrations/20260219000800_emergency_logic.sql`
- `../ivisit-app/supabase/migrations/20260219000900_automations.sql`

Observed source signals:

- `VisitsPage` does direct paginated Supabase reads, count reads, profile joins, emergency request joins, doctor joins, and hospital joins.
- `VisitsPage` builds `emergencyLookupIds` from `visit.request_id || visit.id`, then joins request rows by `emergency_requests.id`; the fallback preserves legacy ambiguity rather than proving row origin.
- `getVisitByRequestId(requestId)` now exists in `visitsService` and reads `visits.request_id` before its legacy id/display-id fallback. The emergency modal/list/table use this repaired lookup; preserve it rather than restoring direct `getVisit(request.id)` calls.
- `visitContextUtils.fetchEmergencyContext` still calls `getEmergencyRequests()` and searches in memory, making a detail modal depend on a broad collection read rather than an incident-scoped projection.
- `medicalProfilesService` exists but is not yet tied into the visit detail read model.
- `visitsService` has rich row normalization but page code still performs substantial hydration.
- `VisitModal` dispatches `openEmergencyDetails`, and `VisitsPage` mounts the receiving emergency-detail modal; preserve this working handoff while supplying canonical visit projection for the missing reverse direction on `/emergencies`.
- `VisitsPage` performs its own count and `.range(...)` paging, then performs page-local multi-table enrichment; its source explicitly leaves paginated search unimplemented. `MobileVisits` instead applies search only to its already loaded `visits` prop, so a search can falsely appear complete while excluding unloaded matches.
- `VisitsPage` exposes `createVisit`, `updateVisit`, single `deleteVisit`, and bulk `deleteVisit`; list/table views expose edit/delete without their own role guard, and the page passes those callbacks into those views. The grid/mobile variants restrict visible edit/delete to admin or org admin, while bulk delete is also presented to providers.
- `VisitModal` allows edit of status, clinical notes, cost, insurance coverage, room, and preparation on the same visit object that can have `request_id`; no row-source gate prevents editing a request-derived lifecycle projection.
- `visitsService` exposes direct create/update/delete/complete/cancel/no-show table writes. Shared backend automations and emergency/payment functions also insert or update `visits` by `request_id`, so Console lifecycle mutation authority cannot be assumed.
- `VisitsPanel` renders `visitsData.stats` and `visitsData.recent` from page-global context, using aliases such as `patient_name` and `scheduled_at`, and emits create/analytics events rather than reading from the route projection.
- Existing runtime files contain corrupted punctuation/debug glyphs in visit UI source. This audit records the defect; documentation must not reproduce it.

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
| Cross-surface detail handoff | Visit-to-emergency is mounted on `VisitsPage`, but emergency-to-visit lacks a receiver on `/emergencies`. | Preserve the working incident detail and provide the canonical visit projection consumed by Pass 1's clinical-record action. |
| Medical profile | Service exists but not integrated into visit detail. | Authorized patient-care projection. |
| Visit actions | Hook/service/page can mutate visit state. | Visit command boundary with legality checks. |
| Realtime | Page and service subscriptions may duplicate ownership. | Visit owner invalidation and detail-scoped subscriptions. |
| Paged search/enrichment | Page owns paged rows and relationship hydration while search remains TODO. | Visit read model owns page/count/search and exposes bounded partial/degraded relationship states. |
| Clinical edit/delete exposure | Request-derived rows can be edited or deleted by generic CRUD controls, with inconsistent role hiding between grid/mobile and list/table/bulk surfaces. | Row-source-aware command boundary that suppresses unproved commands and enforces backend lifecycle authority. |
| Patient history continuity | Patient app treats request history as a map-owned recall lens over emergency lifecycle truth. | Console outcome display must remain consistent with `request_id`, lifecycle, payment/rating and facility truth consumed downstream. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| View/search/hydrate visit | Scoped read projection | `visits` with patient, provider, hospital, request projections | Use explicit `request_id` linkage and one read model. |
| View emergency-derived clinical outcome | Backend-derived read-only evidence | Emergency-to-visit trigger/RPC output | Do not edit/delete a request-owned row as ordinary visit CRUD. |
| Open originating incident from a visit | Cross-surface read navigation | Canonical `request_id` emergency detail projection | Preserve the mounted detail receiver and normalize the request projection it consumes. |
| Create/edit administrative visit | Missing/conditional authorized CRUD | Separate administrative visit ownership not yet proven for Console actor | Enable only after authority and status vocabulary are explicit. |
| Cancel/complete/no-show visit | Workflow command | Visit lifecycle receiver to be proven | Do not direct-update lifecycle state while emergency sync may own it. |
| View medical context | Restricted read projection | Authorized patient-care/medical projection | No broad administrative medical-profile CRUD. |
| Edit notes, status, cost or insurance on emergency-derived visit | Clinical/lifecycle mutation with downstream effects | Not proven for Console; emergency/payment automations own linked outcome transitions | Block or replace with a proved command; do not expose generic form save for a row with `request_id`. |
| Delete or bulk-delete emergency-derived visit | Destructive deletion of patient history evidence | Not an ordinary administrative command | Do not implement until deletion authority, audit record and patient-history behavior are explicitly approved. |
| Search paginated history | Scoped read/query operation | Visit projection/search owner | Do not present page-local matching as a complete search result. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Visit identity and source | `id`, `display_id`, `request_id`, `hospital_id`, patient identity and administrative-versus-emergency-derived marker | Render display IDs where present and use `request_id` as the emergency linkage; no hospital/org UUID confusion. |
| Lifecycle and clinical outcome | type/status/date/time, summary, prescriptions, notes and completion/cancellation source | Emergency-derived outcome is read-only evidence unless an explicit lifecycle command owns the action. |
| Restricted medical context | patient/care authorization and medical-profile availability state | Do not revive dormant broad admin medical CRUD; surface unavailable/unauthorized state where access is not proved. |
| History continuity | `request_id`, `display_id`, lifecycle timestamps/state, rating/tip/payment summary where app history requires it | Do not produce a Console state that patient map history cannot reconcile to the same backend event. |

## Surface Read, Exposure, And Operation Closure

| Console surface | Current reads and rendered exposure | Current operation exposure | Deterministic finding and implementation requirement |
| --- | --- | --- | --- |
| `/visits` grid list in `VisitsPage` | Direct exact count and paged `visits` rows; page-local profile, emergency, doctor and hospital enrichment; card renders status, type, cost, date, room, linked patient/provider/facility and truncated row id. KPI cards render `visitsData.stats`, a separate context source. | View for all loaded rows; create for admin/org admin/provider; edit/delete for admin/org admin. | List and KPI truth are split between direct page query and global context. Route read model must own bounded rows, totals and relationship hydration, and edit/delete must be suppressed for request-derived evidence until a legal receiver is proved. |
| `/visits` list and table variants | Receive the same enriched page rows and render patient/provider/facility, status, type, cost, room/location and date. | Render edit and delete menu items for every row passed in; unlike the grid, the view components have no visible role check. | Page composition leaks commands regardless of the grid guard. Authority and row-source legality must be enforced before callbacks reach every presentation variant. |
| `MobileVisits` | Receives one loaded page, derives KPIs and completion rate locally when global stats are absent, searches only that loaded array, and exposes provider/facility/status/room detail. | View; edit/delete for admin or org admin; analytics; page-advance sentinel. | Local search and derived metrics are not an authoritative cross-page result. Mobile needs the same server-owned search/count contract and request-derived read-only gating as desktop. |
| `VisitModal` view/detail | Displays patient, facility, doctor, schedule, status, reason, cost, insurance, clinical notes and emergency incident context. Incident context is loaded through broad `getEmergencyRequests()` plus in-memory find. | In edit/create mode submits an allowlisted visit payload containing lifecycle and clinical fields; from an emergency visit it opens the incident detail event. | Preserve the working visit-to-emergency handoff. Replace broad incident lookup with scoped projection; classify row source before allowing changes to status, clinical/financial fields or deletion. |
| `VisitsPanel` global context panel | Reads `visitsData.stats` and `visitsData.recent`; recent aliases do not match the route read model (`patient_name`, `scheduled_at`). | Emits `openVisitModal` and analytics events. | Context panel is an independent display/input surface and must be audited as such. Its stats/recent projection and event receiver must be bound to the same canonical visit owner, not stale aliases. |
| `visitsService` and `useVisits` mutation boundary | Service normalizes rich visit fields including `request_id`, lifecycle, rating and financial fields; hook retains local array mutation semantics. | Direct insert/update/delete, complete, cancel and no-show table writes. | Service capability is broader than proved Console authority. Split administrative scheduling commands from backend-derived emergency outcome reads and invalidate/refetch confirmed truth after any accepted command. |
| `medicalProfilesService` | Table-backed service exists for blood type, insurance, contact, notes, allergies, conditions and medications; no visit detail consumer is currently mounted. | Direct create/update and array-item writes are exposed at service level. | This is an available-table capability without a proved Console surface. Do not infer missing clinical access from service existence; specify restricted read need and RLS proof before exposing or mutating it. |
| Emergency clinical-record entry | Emergency detail/list/table use repaired `getVisitByRequestId`; `/emergencies` still does not mount the visit-modal receiver emitted by the detail action. | Read/navigation only intended. | Keep the request-id repair and close Pass 1's receiver gap through a canonical read flow; it must not become a visit CRUD backdoor. |

## Patient-Facing Dependency Closure

The patient app documentation is decisive for this pass: `visits` is not merely an admin appointment table. It is the patient-facing lifecycle and recall projection, while emergency tracking and history are two views of the same care event. Shared migrations show emergency creation/payment/cash transitions and synchronization automations inserting or updating `visits` by `request_id`.

| Patient/shared truth | Console exposure or risk | Required Pass 6 constraint |
| --- | --- | --- |
| One emergency-derived event maps to one history row through `request_id`. | Console can display a row with `request_id`, then edit or delete it as ordinary scheduling data. | Treat rows with `request_id` as backend-derived evidence unless a dedicated auditable lifecycle command is proved. |
| Active emergency tracking remains the live owner; history is recall/navigation truth. | Console maps emergency statuses into visit statuses in page hydration and can save a status from the form. | Projection may display mapped status, but Console must not manufacture patient lifecycle transitions through generic edit. |
| Patient map history requires status, facility, actor, timestamps, payment/rating/tip continuity where applicable. | Console exposes status/cost/insurance/notes but does not distinguish provisional, backend-confirmed or patient-visible fields. | Visit projection must label source and confirmation state; cross-pass financial and provider fields remain joined truth, not free-form edits. |
| Payment and cash emergency functions update visit status by request link. | Direct Console visit update can disagree with payment-release state. | Pass 2 financial authority and Pass 1 emergency authority gate any clinical outcome mutation. |
| Completion can create insurance billing; medical profiles are restricted patient-care data. | Console has dormant table service and editable insurance checkbox without proved clinical/billing semantics. | Pass 7 insurance and access decisions must precede exposing clinical profile or insurance outcome controls. |

## Pass 6 Deterministic Surface Register

| Register item | Read/render traced | Mutation/receiver traced | Ownership decision | Status |
| --- | --- | --- | --- | --- |
| Paginated visit directory and exact count | Yes: direct page count/range plus relationship enrichment. | Yes: view/create/edit/delete/bulk delete callbacks. | Move to one visit read owner; row-source gate commands. | Audited, implementation blocked by authority design. |
| Desktop grid/list/table command parity | Yes: all variants render shared enriched rows. | Yes: grid guards differ from list/table and bulk surfaces. | Enforce capabilities before presentation composition. | Audited defect. |
| Mobile directory and search/paging | Yes: page prop, local filter and local KPI fallback. | Yes: edit/delete guard and load-more callback. | Provide server search/count contract and same row-source command policy. | Audited defect. |
| Visit detail and incident handoff | Yes: incident context and clinical/logistics fields. | Yes: `openEmergencyDetails` receiver mounted on `/visits`. | Preserve working direction; replace broad fetch with scoped projection. | Audited partial implementation. |
| Emergency-to-visit detail handoff | Yes: repaired lookup exists in emergency sources. | Yes: emitted action has no `/emergencies` receiver. | Owned jointly with Pass 1 canonical detail projection. | Audited blocking gap. |
| Request-derived lifecycle ownership | Yes: shared trigger/RPC/migration evidence and app history doctrine. | Yes: generic visit mutations currently exposed. | Request-linked rows are read-only evidence absent approved command. | Audited authority blocker. |
| Global context panel | Yes: stats/recent aliases. | Yes: schedule/analytics event emissions. | Reconcile with canonical read owner and mounted receiver. | Audited drift. |
| Medical profile table capability | Yes: service-level fields and authorization code. | Yes: service-level create/update/item mutations; no mounted visit UI. | Missing restricted Console surface, not permission to add generic CRUD. | Audited missing surface. |

## Cross-Pass Clinical Outcome Register

| Dependency pass | Shared object or decision | Why Pass 6 cannot close independently | Required handoff |
| --- | --- | --- | --- |
| Pass 1 emergency detail | `emergency_requests`, `request_id`, detail projection and clinical-record navigation | Emergency creates and owns live lifecycle truth; reverse detail entry is presently broken. | One request-to-visit read receiver and no status mutation that bypasses emergency authority. |
| Pass 2 wallet/payment | Payment release, cash approval, tips and charge outcome linked to visits | Shared functions update visit status and patient history may display payment summary. | Financial confirmation state must join the visit projection; cost/insurance editing is not assumed. |
| Pass 3 hospital/capacity | `hospital_id`, facility snapshot and bed/visit fulfillment context | Visit detail and patient history render the facility where care occurred. | UUID-correct facility projection and stable snapshot semantics. |
| Pass 4 identity/access | Patient identity and operator clinical access | Visit and medical fields include sensitive patient data. | Role/RLS/organization scope proof before detail or medical-profile expansion. |
| Pass 5 provider operations | Assigned doctor/provider snapshot and emergency assignment | Console displays provider names while emergency assignment remains separately governed. | Join confirmed provider context without free-form assignment mutation. |
| Pass 7 insurance/support | Insurance-billing creation and restricted clinical exception handling | Editable insurance flag and dormant medical-profile service cannot define billing outcome. | Proved insurance read/action semantics and medical access lane. |
| Pass 8 global/dashboard | Context-panel stats, search, analytics and route receivers | Global tiles/panels can render or launch visit operations outside the route projection. | Consume the same visit read model and capability register. |

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

Preserve and complete the already introduced method:

- `getVisitByRequestId(requestId)` currently reads `visits.request_id` first and falls back to legacy direct id/display-id lookup.
- The emergency detail/list/table consumers already use this method.
- The remaining gap is receiver composition and scoped incident/visit projection, not creation of an unimplemented lookup.

Acceptance gate:

- Emergency modal/list/table keep the same request-linked lookup and do not regress to direct `getVisit(request.id)`.
- `/emergencies` can open the linked clinical record through a mounted canonical read receiver.
- Legacy fallback is either justified by data evidence or retired under a migration/cleanup plan.

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

- Administrative scheduled visits and request-derived lifecycle rows are distinguishable before any command is exposed.
- Visit status copy reflects backend-confirmed state, not optimistic local list mutation alone.
- Delete and bulk delete cannot remove patient-history evidence without an explicitly approved audited command.

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
