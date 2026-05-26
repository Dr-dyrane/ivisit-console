# Pass 1 Emergency First Implementation Checklist - 2026-05-25

## Status

Executable implementation checklist, planning only. No product runtime code, database mutation, RPC/Edge invocation, Storage upload, email send, cleanup, seed, reset, migration, or historical repair is authorized by this document.

This checklist is the first safe slice after the emergency audit. It focuses on read projection, parser safety, receiver availability, and false-command downgrade. It does not implement lifecycle, payment, chat, clinician assignment, visit mutation, map visual redesign, or finance repair.

## Required Reading Before Code

- `../passes/PASS_1_EMERGENCY_DETAIL_FLOW_SUBPLAN_2026-05-24.md`
- `../passes/PASS_1_EMERGENCY_DETAIL_EVIDENCE_AUDIT_2026-05-24.md`
- `../contracts/EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md`
- `../stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `../services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`

## Scope

Runtime files likely in scope for the first slice:

- `frontend/src/services/emergencyService.js`
- `frontend/src/utils/emergencyRequestMapper.js`
- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/components/mobile/MobileEmergency.jsx`
- `frontend/src/components/ui/LocationCell.jsx`

Runtime files to inspect but not freely edit in the first slice:

- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/visitsService.js`
- `frontend/src/services/walletService.js`
- `frontend/src/components/map/MarkerDetailPanel.jsx`
- `frontend/src/components/mobile/MobileMap.jsx`
- `frontend/src/components/context/EmergencyPanel.jsx`
- `frontend/src/components/modals/EmergencyRequestModal.jsx`

Excluded from the first slice:

- Database migrations, RLS edits, RPC edits and Edge Function edits.
- Payment settlement, ledger repair, wallet mutation, cash backfill and cleanup.
- Chat send/read implementation.
- Clinician assignment mutation.
- Visit create/update/delete/lifecycle mutation.
- Map visual redesign.
- Historical repair or backfill.

## First Slice Objective

Make the emergency detail/list surfaces safer to render without changing backend lifecycle semantics.

The slice should:

1. Extend or add one emergency projection boundary that produces safe render fields.
2. Remove scalar/object parser crash paths, especially `ambulance_type`.
3. Remove or redact browser logs that disclose clinical/payment records.
4. Replace unmounted or unsupported actions with explicit unavailable/disabled state.
5. Preserve existing repaired cash approve/decline refresh behavior.
6. Keep all backend mutations on existing receiver paths, with no new receiver call added.

## Projection Contract To Implement First

The first implementation should produce these render-safe values before JSX consumes them:

| Projection key | Required fields | First-slice rule |
| --- | --- | --- |
| `identity` | request id, display id, created label, sort timestamp | Use existing ids; do not synthesize display id from unrelated UUIDs. |
| `patientDisplay` | name, phone, source, availability | Missing, hidden and failed lookup must render differently where known. |
| `serviceDisplay` | service token, service label, ambulance type label, specialty/category label | `ambulance_type` accepts object, JSON string, scalar string, null and malformed text safely. |
| `statusDisplay` | canonical status, label, tone, terminal flag | Legacy aliases are translated once; JSX does not branch on raw `active`. |
| `locationDisplay` | address label, coordinate object, coordinate source, geocode state, external map availability | `LocationCell` becomes render-oriented; geocode failure is not backend location absence. |
| `facilityDisplay` | hospital id, organization id, name, assignment state | Do not use hospital id as organization id. |
| `paymentDisplay` | payment id, method, status, amount label, visibility state, approval capability | Approval/decline copy waits for refreshed projected truth. |
| `responderDisplay` | ambulance id, responder label, ETA/route seed state, telemetry state | Do not imply tracking-ready from a raw ambulance id. |
| `clinicalOutcome` | visibility state, visit id, receiver type, disabled reason | No `openVisitModal` custom event from `/emergencies`. |
| `actionState` | dispatch, complete, retry, approve cash, decline cash, external map, report | Each action has enabled, pending key, disabled reason, receiver owner and refresh target. |

## Action Disposition

| Action | First-slice disposition |
| --- | --- |
| Open detail | Retain, but render projection fields only. |
| Approve cash | Retain existing receiver and refresh pattern; remove data-bearing logs. |
| Decline cash | Retain existing receiver and refresh pattern; remove data-bearing logs. |
| Retry payment | Retain only if action state can explain patient-completable pending state; otherwise render unavailable. |
| Dispatch | Do not widen. Page/map/mobile dispatch must move behind shared action state before behavior changes. |
| Complete | Do not widen. Manual cash prompt remains blocked/deferred to Pass 2 finance authority. |
| View clinical record | Replace unmounted custom event with disabled state or route navigation plan; do not implement visit mutation. |
| External map navigation | Retain only with validated coordinates and explicit external handoff label. |
| Generate incident report | Disable/unavailable until report receiver and export scope are proved. |
| Call patient | Disable/unavailable unless a mounted receiver or external dial action is deliberately approved. |

## Parser And Fallback Checks

Before editing JSX, search and classify:

```powershell
rg -n "JSON\\.parse|ambulance_type|patient_name|contact_phone|assignedAmbulance|hospital_id|organization_id|openVisitModal|console\\.log|processCashPayment|completeEmergency|dispatchEmergency|LocationCell" frontend/src/components frontend/src/services frontend/src/utils
```

Required parser outcomes:

- Plain scalar strings like `ambulance` render as labels and never go to `JSON.parse`.
- Objects with known label/name/type fields render predictably.
- Empty, malformed and unknown values render unavailable or unknown, not crash.
- Object truthiness is not used where field validity matters.
- Coordinates are validated by field presence and numeric range, not object truthiness.

## App Consequence Notes

Every emergency action can affect `ivisit-app` emergency tracking, payment release, clinical history, route/ETA state, and follow-up care. The first slice must not make Console appear more certain than the patient app can be.

Required consequence rules:

- Dispatch success does not imply tracking-ready until backend truth has responder identity and request lifecycle readiness.
- Cash approval does not imply wallet/ledger settlement unless payment truth confirms it.
- Clinical record availability comes from `visits.request_id` projection, not a custom event.
- External Google Maps navigation is an operator handoff, not Console route/ETA proof.
- Missing visit/payment/location/responder values are explicit degraded states, not zero or complete states.

## Verification

Planning/doc-only edits:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/PASS_1_EMERGENCY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-25.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/PASS_1_EMERGENCY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-25.md
```

Runtime implementation checks after code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
cd frontend
npm run build
```

Browser smoke after code begins:

- `/emergencies` list loads without blank state.
- Detail opens for request with scalar `ambulance_type`.
- Detail opens for request without linked visit.
- Detail opens for request with linked visit.
- Cash approval/decline displays pending state and final copy only after refresh.
- Clinical record action is unavailable or navigates deliberately; it does not fire an unreceived event.
- Browser console does not receive payment, visit, clinical, patient or full emergency payloads from normal detail use.

DB/RPC hardening commands are not authorized during audit. If later authorized for implementation, run only the smallest relevant check and then the cleanup dry-run guard required by the Stage 6 plan.

## Commit Boundary

Commit only when one of these coherent checkpoints is reached:

- Checklist/doc planning pack is complete and verified.
- First runtime read/projection cleanup is implemented, verified and does not mutate backend truth.
- A later backend/RPC/finance repair is separately authorized, verified and cleanup-guarded.

Do not commit a single local parser tweak without the projection, receiver and verification notes that make it resumable.
