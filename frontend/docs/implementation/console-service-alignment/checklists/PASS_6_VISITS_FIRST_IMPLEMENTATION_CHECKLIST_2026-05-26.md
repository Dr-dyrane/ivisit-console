# Pass 6 Visits First Implementation Checklist - 2026-05-26

## Status

Implementation-control checklist only. This document does not authorize visit create/update/delete, complete/cancel/no-show transitions, medical-profile writes, emergency request mutation, insurance or payment edits, database migration, cleanup, seed, reset, backfill, or production data repair.

Pass 6 starts by classifying visit rows and making clinical-history surfaces read-safe before enabling any command.

## Source Chain Read Before Editing

Read these docs first:

- `frontend/docs/implementation/console-service-alignment/passes/PASS_6_VISITS_MEDICAL_HISTORY_FLOW_SUBPLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/IDENTITY_VISITS_SUBSCRIBERS_CONTRACT_CHART_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`

Then re-run mounted-source scans:

```powershell
rg -n "VisitsPage|VisitModal|MobileVisits|VisitListView|VisitTableView|VisitsPanel|useVisits|visitContextUtils|visitsService|medicalProfilesService|EmergencyDetailsModal|EmergencyRequestListView|EmergencyRequestTableView" frontend/src
rg -n "console\.log|console\.error|request_id|patient_id|doctor_id|hospital_id|medical|clinical|insurance|cost|payment|tip|deleteVisit|bulk|completeVisit|cancelVisit|noShow|openEmergencyDetails|openVisitModal|getVisitByRequestId|getEmergencyRequests" frontend/src/components frontend/src/contexts frontend/src/hooks frontend/src/services frontend/src/utils
```

## Runtime Files In Scope

Primary files:

- `frontend/src/components/pages/VisitsPage.jsx`
- `frontend/src/components/modals/VisitModal.jsx`
- `frontend/src/components/mobile/MobileVisits.jsx`
- `frontend/src/components/views/VisitListView.jsx`
- `frontend/src/components/views/VisitTableView.jsx`
- `frontend/src/components/context/VisitsPanel.jsx`
- `frontend/src/hooks/useVisits.js`
- `frontend/src/services/visitsService.js`
- `frontend/src/services/medicalProfilesService.js`
- `frontend/src/utils/visitContextUtils.js`

Cross-pass consumers to inspect, not freely edit:

- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/services/emergencyService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/components/ui/LocationCell.jsx`
- `frontend/src/contexts/PageDataContext.jsx`

## Explicitly Excluded

Do not include these in the first implementation slice:

- Visit create/update/delete, bulk delete, complete, cancel, no-show or status mutation.
- Medical profile create/update/delete or item-level writes.
- Emergency request mutation.
- Insurance, billing, payment, wallet, tip or cash settlement mutation.
- Historical repair/backfill for missing or duplicate request-derived visits.
- Schema/RLS/RPC/trigger migration or cleanup.
- New clinical access policy.
- Cross-repo app edits.

## First Safe Slice

The first implementation package is read/disable/projection only.

Allowed:

- Add or identify a visit projection boundary.
- Classify rows as `administrative`, `emergency_derived`, `legacy_ambiguous`, or `unknown`.
- Preserve the direction of `getVisitByRequestId(requestId)` and make its fallback provenance explicit.
- Move page/mobile/panel displayed rows toward one source of paging, counts, search, hydration and command readiness.
- Disable edit/delete/lifecycle/bulk controls for request-derived, ambiguous and unknown rows.
- Disable medical-profile CRUD and render restricted medical context as unavailable/unauthorized/empty until access proof exists.
- Replace broad emergency collection lookup for a single visit incident with a scoped request-id projection where touched.
- Remove or redact clinical/patient/financial payload browser logs.
- Repair visible mojibake in touched visit files.

Blocked:

- Any runtime write receiver implementation listed in the excluded section.

## Projection Contract

Create a stable visit projection with these slices:

| Slice | Required fields |
| --- | --- |
| `visitList` | `rows`, `page`, `pageSize`, `totalCount`, `searchState`, `filterState`, `countBasis`, `isComplete`, `degradedReason`. |
| `visitRow` | `visitId`, `displayId`, `rowSource`, `requestId`, `patientProfileId`, `patientLabel`, `doctorId`, `doctorLabel`, `facilityId`, `facilityLabel`, `status`, `statusSource`, `scheduledAt`, `completedAt`. |
| `incidentContext` | `requestId`, `requestDisplayId`, `requestStatus`, `serviceType`, `canOpenLinkedEmergency`, `fallbackProvenance`, `disabledReason`. |
| `clinicalSummary` | `reason`, `notesAvailability`, `prescriptionsAvailability`, `medicalProfileState`, `restrictedReason`. |
| `financialSummary` | `costState`, `paymentState`, `tipState`, `insuranceState`, `sourcePass`, `disabledReason`. |
| `commandCapabilities` | Named booleans plus `disabledReason`, `rowSource`, and receiver owner. |

Required command capability names:

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
- `canOpenLinkedVisitFromEmergency`

Every unsafe command defaults to `false`.

## Surface Disposition Matrix

| Surface | Retain first | Disable or relabel first | Receiver proof before enabling |
| --- | --- | --- | --- |
| `/visits` grid | Read-only rows, filters and detail open. | Edit/delete/lifecycle controls for `request_id` rows; counts/KPIs from mismatched global context; local-only search claims. | Visit read owner, row-source classifier, admin command receiver and reflected read. |
| Visit list/table variants | Presentation variants. | Edit/delete callbacks unless row capability allows them. | Same capability state as grid/mobile. |
| `MobileVisits` | Mobile list layout and detail open. | Local loaded-page KPIs/search as complete truth; edit/delete for request-derived rows. | Same server-owned count/search/capability projection as desktop. |
| `VisitModal` | View detail and linked incident entry. | Generic save over clinical/status/cost/insurance fields for request-derived rows; broad incident lookup; payload logs. | Row-source-aware field allowlist, lifecycle command receiver, scoped incident projection. |
| `VisitsPanel` | Read-only recent/summary if source-labelled. | Create/analytics events and stale aliases unless receiver/projection is mounted. | Same visit projection and event receiver registry as route. |
| `visitsService` and `useVisits` | Read adapters and request-id lookup. | Treating broad table mutation functions as visible authority. | Separate admin visit command, emergency-derived lifecycle command and destructive command receivers. |
| `medicalProfilesService` | Restricted read availability flag. | Broad admin medical CRUD. | Clinical access/RLS proof and UI surface decision. |
| Emergency clinical-record entry | Keep `getVisitByRequestId` direction. | Unmounted `openVisitModal` event from `/emergencies`; direct `getVisit(request.id)` fallback. | Mounted canonical visit detail receiver or deliberate route handoff carrying request identity. |

## Field And Parser Gates

Run before implementation:

```powershell
rg -n "JSON\.parse|Number\(|new Date\(|\|\||request_id|patient_id|doctor_id|hospital_id|visit_id|display_id|status|cost|insurance|payment|tip|clinical|medical|notes|prescriptions|getEmergencyRequests|getVisitByRequestId|deleteVisit|bulk" frontend/src/components/pages/VisitsPage.jsx frontend/src/components/modals/VisitModal.jsx frontend/src/components/mobile/MobileVisits.jsx frontend/src/components/views/VisitListView.jsx frontend/src/components/views/VisitTableView.jsx frontend/src/components/context/VisitsPanel.jsx frontend/src/hooks/useVisits.js frontend/src/services/visitsService.js frontend/src/services/medicalProfilesService.js frontend/src/utils/visitContextUtils.js
```

Rules:

- Never edit or delete a row with `request_id` as ordinary visit CRUD.
- Never infer complete search results from the currently loaded page.
- Never use `visit.request_id || visit.id` without recording fallback provenance.
- Never load all emergency requests to render one visit incident.
- Never surface clinical notes, medical profile, insurance or patient payloads through browser logs.
- Never present cost/payment/tip/insurance fields as editable unless Pass 2/7 authority exists.
- Never treat medical-profile service existence as clinical access proof.

## App Consequences

Pass 6 must preserve patient app history and emergency recall truth.

- Emergency-derived visits are patient-facing history evidence, not ordinary admin rows.
- `request_id` is the continuity key between live emergency tracking and post-event visit/history recall.
- Payment, tip and cash settlement may update or depend on visits; generic visit edits cannot override those outcomes.
- Insurance/billing status belongs to Pass 7 unless a specific visit projection exposes read-only evidence.
- Medical profile access is restricted patient-care data and needs role/RLS proof before display.
- Emergency-to-visit and visit-to-emergency handoffs must preserve canonical request and visit identity.

## Implementation Packages

### Package 6.1 - Row-Source Projection And Unsafe Command Removal

Allowed:

- Add visit projection scaffolding.
- Classify visit rows by source.
- Disable edit/delete/lifecycle/bulk controls for unsafe row sources in every desktop/mobile variant.
- Remove clinical/patient/financial data-bearing console logs.
- Label loaded-window/current-page search and KPI states.

Acceptance:

- Every rendered row has `rowSource`.
- Request-derived, ambiguous and unknown rows receive no generic edit/delete/lifecycle callbacks.
- Browser console does not emit selected visit objects, submitted clinical payloads, linked emergency records, insurance values or patient payloads.

### Package 6.2 - Read Projection Repair

Allowed after Package 6.1:

- Move route, mobile and panel rows/counts/search/hydration behind one read owner.
- Replace broad incident lookup with scoped request-id projection.
- Add restricted medical-profile availability states without CRUD.

Blocked:

- Visit, medical, emergency, payment and insurance writes.

Acceptance:

- Desktop, mobile and panel surfaces agree on count/search basis.
- Linked emergency detail opens from scoped request identity.
- No page-local join failure silently becomes a believable complete row.

### Package 6.3 - Receiver Planning Only

Produce follow-up specs for:

- Administrative visit create/update.
- Emergency-derived clinical/lifecycle commands.
- Visit complete/cancel/no-show.
- Visit delete and bulk delete.
- Restricted medical-profile read and write surfaces.
- Payment/tip/insurance display and command boundaries.
- Emergency-to-visit receiver on `/emergencies`.

Each spec must name payload fields, receiver, actor scope, row-source legality, audit event, reflected read, patient-app consequence, failure copy and non-production test path.

## Verification

Docs-only checklist verification:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_6_VISITS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_6_VISITS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation verification, once code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
rg -n "console\.log|console\.warn|console\.error" frontend/src/components/pages/VisitsPage.jsx frontend/src/components/modals/VisitModal.jsx frontend/src/components/mobile/MobileVisits.jsx frontend/src/components/views/VisitListView.jsx frontend/src/components/views/VisitTableView.jsx frontend/src/components/context/VisitsPanel.jsx frontend/src/services/visitsService.js frontend/src/services/medicalProfilesService.js frontend/src/utils/visitContextUtils.js
npm run build
```

Browser smoke, no mutation:

- `/visits` desktop grid/list/table read-only rows.
- `MobileVisits` read-only rows and loaded-window labels.
- `VisitModal` open/close for administrative, emergency-derived, ambiguous and no-linked-incident rows where fixtures exist.
- Linked emergency handoff from visit detail.
- Emergency clinical-record entry remains request-id based and does not rely on an unmounted receiver.
- Browser console scan confirms no patient, clinical, insurance, payment, tip or linked emergency payloads appear.

## Commit Boundary

Commit Package 6.1 as one coherent clinical-history safety checkpoint after code verification. Package 6.2 and Package 6.3 should remain separate checkpoints unless a projection refactor is inseparable.

This checklist itself belongs to the implementation-plan pack and may be committed with the checklists index after docs-only verification.
