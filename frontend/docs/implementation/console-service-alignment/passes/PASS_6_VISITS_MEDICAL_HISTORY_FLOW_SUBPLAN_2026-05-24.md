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
- `VisitModal` logs the selected visit object and submitted clinical payload to the browser console, and `EmergencyRequestTableView` logs its linked visit fetch result; this is clinical-record disclosure outside the authorized UI projection.
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

## Field-To-UI And Payload-To-Receiver Closure For First Slice

| Console surface/control | Exact field projection required | Payload/receiver gate | App consequence to prove |
| --- | --- | --- | --- |
| Visit list row | Visit id, display id, request id, patient id/name, doctor id/name, hospital id/name, visit type, status, scheduled/completed timestamps | List projection must classify administrative versus emergency-derived rows before commands reach the view. | Patient history and console visit rows point to the same backend event. |
| Visit detail modal | Reason/summary, clinical notes, prescriptions, cost, insurance, linked emergency incident, lifecycle timestamps | Emergency-derived fields are read-only unless a lifecycle command receiver is proved. | Console cannot alter patient medical or financial history through generic visit save. |
| Create administrative visit | Patient id, doctor id, hospital id, scheduled time, visit type, reason, source marker | Create remains separate from emergency outcome rows and must use an authorized admin receiver. | App visit list can distinguish scheduled/admin visits from emergency completions. |
| Edit/cancel/complete/no-show | Visit id, source marker, current lifecycle state, target state, actor, reason | Direct table writes stay blocked for emergency-derived visits; receiver must own transition legality. | App history does not show impossible or conflicting lifecycle state. |
| Delete/bulk delete | Visit id, source marker, linked request id, audit reason | Destructive action unavailable until deletion authority, audit record, and patient-history behavior are approved. | Patient medical/history evidence is not removed from app visibility accidentally. |
| Medical context read | Patient id, authorization scope, blood type/allergies/conditions/medications/insurance/contact availability | Read projection must distinguish unauthorized, unavailable, and empty. | Console shows only allowed clinical context and does not revive broad profile CRUD. |
| Emergency incident link | Visit request id, emergency request id, incident status, patient id, hospital id | Replace broad emergency list lookup with scoped request-id projection. | Emergency detail handoff opens the correct incident without exposing the entire emergency table. |
| Browser diagnostic output | No patient, clinical-note, insurance, visit payload or linked emergency result content | `VisitModal` and emergency table clinical navigation must not emit loaded/submitted records to browser logs. | Authorized UI exposure does not become an unbounded local disclosure channel. |
| Search and KPI surfaces | Server count, page cursor, search term, status/type filters, metric source and timestamp | Page-local filtering cannot be labeled complete search or analytics. | Operators do not miss visits outside the loaded page or trust stale global stats. |

Implementation rule: the first slice may create a visit read projection, row-source classifier, scoped incident lookup, and capability map. It must not broaden medical-profile CRUD, direct-write lifecycle fields, or expose deletion for request-derived evidence.

## Surface Read, Exposure, And Operation Closure

| Console surface | Current reads and rendered exposure | Current operation exposure | Deterministic finding and implementation requirement |
| --- | --- | --- | --- |
| `/visits` grid list in `VisitsPage` | Direct exact count and paged `visits` rows; page-local profile, emergency, doctor and hospital enrichment; card renders status, type, cost, date, room, linked patient/provider/facility and truncated row id. KPI cards render `visitsData.stats`, a separate context source. | View for all loaded rows; create for admin/org admin/provider; edit/delete for admin/org admin. | List and KPI truth are split between direct page query and global context. Route read model must own bounded rows, totals and relationship hydration, and edit/delete must be suppressed for request-derived evidence until a legal receiver is proved. |
| `/visits` list and table variants | Receive the same enriched page rows and render patient/provider/facility, status, type, cost, room/location and date. | Render edit and delete menu items for every row passed in; unlike the grid, the view components have no visible role check. | Page composition leaks commands regardless of the grid guard. Authority and row-source legality must be enforced before callbacks reach every presentation variant. |
| `MobileVisits` | Receives one loaded page, derives KPIs and completion rate locally when global stats are absent, searches only that loaded array, and exposes provider/facility/status/room detail. | View; edit/delete for admin or org admin; analytics; page-advance sentinel. | Local search and derived metrics are not an authoritative cross-page result. Mobile needs the same server-owned search/count contract and request-derived read-only gating as desktop. |
| `VisitModal` view/detail | Displays patient, facility, doctor, schedule, status, reason, cost, insurance, clinical notes and emergency incident context. Incident context is loaded through broad `getEmergencyRequests()` plus in-memory find; selected visit and submitted payload are logged to the browser console. | In edit/create mode submits an allowlisted visit payload containing lifecycle and clinical fields; from an emergency visit it opens the incident detail event. | Preserve the working visit-to-emergency handoff. Replace broad incident lookup with scoped projection; classify row source before allowing changes; remove clinical-data console disclosure. |
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

## Exact Visit And Clinical Flow Exhibits

These line exhibits are the implementation handoff. Each row maps the code source to the end-to-end chain that must be repaired before this service is treated as aligned.

| Exhibit | Code anchor | Current contract break | Implementation target |
| --- | --- | --- | --- |
| Direct route owner and manual server paging | `frontend/src/components/pages/VisitsPage.jsx:111-147` | The route builds its own `visits` count and range query, then later hydrates related tables locally. This makes the page, not a service/query owner, responsible for source truth. | Move paging, count, filters and relationship projection into one visit read model consumed by desktop, mobile and panels. |
| Request/emergency enrichment | `frontend/src/components/pages/VisitsPage.jsx:187-277` | The route constructs request/emergency relationships and writes `request_id` aliases into display rows, but does not classify whether the row is backend-derived evidence. | Return `rowSource`, `requestContext`, `patientProjection`, `facilityProjection` and `commandCapabilities` from the read owner. |
| Bulk visit deletion | `frontend/src/components/pages/VisitsPage.jsx:412` | Selected ids are deleted directly through `deleteVisit()` with no request-derived row gate, audit reason, patient-history consequence or per-row failure result. | Treat delete and bulk delete as unavailable until an authorized destructive receiver and refresh contract exist. |
| Single visit deletion | `frontend/src/components/pages/VisitsPage.jsx:433` | A loaded row can be hard-deleted from the same route that displays emergency-derived history rows. | Suppress delete for all `request_id` rows; any future delete command must prove lifecycle authority and auditability. |
| Create/update submit receiver | `frontend/src/components/pages/VisitsPage.jsx:455-461` | The route submits generic visit payloads through `createVisit()` or `updateVisit()` without source-aware field gates. | Split administrative scheduling commands from request-derived clinical outcome reads. |
| Clinical payload browser disclosure | `frontend/src/components/modals/VisitModal.jsx:21-22,120-121` | Selected visit objects and submitted data, including clinical/financial fields, are logged to the browser console. | Remove data-bearing diagnostics; approved monitoring may use redacted ids and status only. |
| Broad incident lookup | `frontend/src/components/modals/VisitModal.jsx:82-87,516` | The modal loads emergency context broadly, then emits `openEmergencyDetails` for the receiver mounted by `/visits`. | Replace broad lookup with scoped request-id projection and preserve the working visit-to-emergency handoff. |
| Service field breadth | `frontend/src/services/visitsService.js:20-47,289-343` | The service normalizes and mutates request, lifecycle, clinical, insurance and financial fields as one generic table contract. | Keep a narrow write allowlist per command class and a separate read-only request-derived projection. |
| Request-derived helper | `frontend/src/services/visitsService.js:245-281` | `getVisitByRequestId()` is the right direction, but still falls back to legacy id/display-id matching and returns a raw service row. | Promote to a typed incident-linked visit projection with explicit fallback provenance. |
| Mobile loaded-window truth | `frontend/src/components/mobile/MobileVisits.jsx:268,363` | KPIs and result counts can be computed from the loaded page rather than the authoritative result set. | Mobile consumes the same server count/search projection as desktop and labels loaded-window-only values if retained. |

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

## Pass 6E Implementation Sequence And Blocker Matrix

This pass is clinical-history sensitive. A `visits` row may be an administrative appointment, but it may also be backend-derived patient history created from an emergency request. The first implementation must classify row source and suppress unsafe commands before any CRUD repair starts.

### Work Order

| Order | Slice | Can start now? | Target | Must not do |
|---|---|---:|---|---|
| 1 | Visit projection contract | Yes | Add a read-only visit projection with paging, search, relationship hydration, row-source classification, incident context, medical-profile availability and command readiness. | Do not mutate visits, medical profiles, emergency rows or insurance/billing fields. |
| 2 | Clinical diagnostic cleanup | Yes | Remove or redact browser logs that emit selected visit objects, submitted clinical payloads or linked emergency lookup results. | Do not leave clinical/financial/patient payloads in ordinary console output. |
| 3 | Unsafe command downgrade | Yes | Disable delete/bulk-delete/edit/lifecycle controls for request-derived rows and unavailable medical-profile CRUD. | Do not rely on grid-only role hiding while list/table/bulk/mobile still receive callbacks. |
| 4 | `/visits` read migration | After slice 1 | Move desktop grid/list/table, mobile, panel stats and recent rows to the projection owner. | Do not let page-local hydration, global context stats and mobile local search disagree. |
| 5 | Scoped incident lookup | After slice 1 | Replace broad `getEmergencyRequests()` lookup with a request-id scoped incident projection. | Do not load broad emergency collections just to render one visit's incident context. |
| 6 | Emergency-to-visit receiver closure | With Pass 1 | Provide a mounted canonical visit detail receiver for `/emergencies` clinical-record action or route deliberately with carried identity. | Do not close an emergency modal into an unmounted `openVisitModal` event. |
| 7 | Administrative visit command lane | Blocked until authority proof | Enable create/update only for rows classified as administrative scheduled visits with explicit receiver and field allowlist. | Do not save clinical/status/cost/insurance fields on request-derived rows through generic table update. |
| 8 | Lifecycle command lane | Blocked until receiver proof | Define complete/cancel/no-show command semantics, refreshed truth and app-history consequence. | Do not direct-update lifecycle status while emergency/payment automations own linked outcomes. |
| 9 | Medical profile context | Blocked until access proof | Add restricted medical-profile read only where patient-care authorization, unavailable state and RLS are proved. | Do not add broad admin medical-profile CRUD from service existence alone. |
| 10 | Destructive delete lane | Blocked until legal/audit proof | Keep visit delete/bulk delete unavailable for request-derived history and any clinical evidence without an approved audited receiver. | Do not remove patient-history evidence with ordinary table delete. |

### Blocker Matrix

| Status | Work item | Reason |
|---|---|---|
| Ready | Read-only visit projection | Existing exhibits already identify page query, hydration, request linkage and UI consumers. |
| Ready | Clinical log removal | Browser diagnostics are exposure hazards and do not require backend changes. |
| Ready | Request-derived command downgrade | Rows with `request_id` can be classified and rendered read-only before backend command repair. |
| Ready | Mobile/search truth labels | Mobile can stop implying complete search/KPI truth from a loaded page. |
| Ready after projection | `/visits` route and panel migration | Needs the shared projection so desktop/mobile/panel and context events consume one source. |
| Cross-pass | Emergency clinical-record handoff | Pass 1 owns the emergency detail surface and request lifecycle. |
| Cross-pass | Payment/insurance fields | Pass 2 and Pass 7 own payment, cash, insurance billing and exception semantics. |
| Cross-pass | Facility/provider hydration | Pass 3 and Pass 5 own canonical facility and provider projections. |
| Cross-pass | Identity and clinical access | Pass 4 owns role/org scope before clinical context expands. |
| Blocked | Lifecycle status mutation | Direct visit status writes can conflict with emergency/payment automations. |
| Blocked | Medical-profile mutation | Service methods exist, but no authorized Console surface or access proof is established. |
| Blocked | Delete/bulk delete | Destructive patient-history behavior and auditability are not approved. |
| Blocked | Emergency-derived clinical edit | Request-owned rows need dedicated command proof before any edit. |

### First Implementation Ticket Contract

The first code pass should be read/disable only:

- Add or identify a visit projection service, for example `frontend/src/services/visitProjectionService.js`.
- Return stable projection slices for:
  - paged rows,
  - count and search state,
  - row source: `administrative`, `emergency_derived`, `legacy_ambiguous`, or `unknown`,
  - request context,
  - patient projection,
  - provider projection,
  - facility projection,
  - payment/insurance summary availability,
  - medical-profile availability,
  - command readiness.
- Preserve separate identities:
  - visit id,
  - visit display id,
  - emergency request id,
  - patient profile id,
  - doctor id,
  - hospital/facility id.
- Expose command readiness as data:
  - `canCreateAdministrativeVisit`
  - `canEditAdministrativeVisit`
  - `canEditEmergencyDerivedVisit`
  - `canCompleteVisit`
  - `canCancelVisit`
  - `canMarkNoShow`
  - `canDeleteVisit`
  - `canBulkDeleteVisits`
  - `canViewMedicalProfile`
  - `canEditMedicalProfile`
  - `canOpenLinkedEmergency`
- Default unsafe commands to `false` with `disabledReason`, source owner and required pass dependency.
- Preserve `getVisitByRequestId()` direction while replacing raw row/fallback ambiguity with explicit fallback provenance.

The first implementation ticket should not touch:

- visit create/update/delete table writes,
- lifecycle complete/cancel/no-show writes,
- medical-profile create/update/item writes,
- emergency request mutation,
- insurance or payment fields,
- historical backfill/cleanup,
- database migrations.

### Acceptance Gates For Implementation

Before the first implementation commit:

- Every rendered visit row declares whether it is administrative, emergency-derived, legacy ambiguous or unknown.
- No request-derived row receives edit/delete/lifecycle callbacks in any grid/list/table/mobile/bulk surface.
- Visit detail incident context loads by scoped request id, not by broad emergency collection search.
- Search/count/KPI labels distinguish full server result from loaded-page/current-window values.
- Medical-profile fields render only as unavailable/authorized/empty with explicit access state.
- Browser console output does not include selected visit payloads, clinical notes, insurance data, patient payloads or linked emergency records.
- Emergency-to-visit and visit-to-emergency handoffs preserve canonical identity and mounted receivers.
- Cost, insurance and payment-derived values are display-only unless Pass 2/7 command authority is proved.

Suggested verification once code changes begin:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
npm run build
```

Runtime smoke after code begins should include `/visits`, desktop grid/list/table variants, `MobileVisits`, `VisitModal`, `VisitsPanel`, linked emergency handoff and emergency clinical-record entry. Visit mutation, medical-profile mutation, backfill and database cleanup remain excluded until a separate implementation pass explicitly authorizes non-production receiver testing.

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
- Browser console smoke confirms opening/editing a visit and following clinical handoffs emit no patient or clinical payload data.
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
