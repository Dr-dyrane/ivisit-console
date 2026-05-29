# Console Service Alignment Implementation Audit Handoff - 2026-05-26

## Status

Audit and implementation-planning wrap-up checkpoint. No runtime code, database mutation, Edge Function invocation, email send, Storage upload, cleanup, seed, reset, migration, or production data repair was performed in this checkpoint.

The implementation checklist set is now complete for Passes 1-8. Detailed runtime implementation should begin only from the relevant checklist, not from broad memory or a page symptom.

Current audit-completeness status lives in [passes/README.md](./passes/README.md), under `Current Pass Coverage Ledger`. Important correction: the audit tree is not fully complete by the Stage 5 standard. Service inventory, table inventory, subplans, and checklists exist; full runtime-truth closure remains open pass by pass.

## Completed Checklist Set

| Pass | Checklist |
| ---: | --- |
| 1 | [Emergency First Implementation Checklist](./checklists/PASS_1_EMERGENCY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-25.md) |
| 2 | [Wallet First Implementation Checklist](./checklists/PASS_2_WALLET_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |
| 3 | [Facility First Implementation Checklist](./checklists/PASS_3_FACILITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |
| 4 | [Identity First Implementation Checklist](./checklists/PASS_4_IDENTITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |
| 5 | [Provider Operations First Implementation Checklist](./checklists/PASS_5_PROVIDER_OPERATIONS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |
| 6 | [Visits First Implementation Checklist](./checklists/PASS_6_VISITS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |
| 7 | [Care Content And Subscribers First Implementation Checklist](./checklists/PASS_7_CARE_CONTENT_SUBSCRIBERS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |
| 8 | [Shell Analytics Search And Realtime First Implementation Checklist](./checklists/PASS_8_SHELL_ANALYTICS_SEARCH_REALTIME_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md) |

## Recent Commit Checkpoints

| Commit | Purpose |
| --- | --- |
| `3ff4648` | Pass 1 emergency implementation checklist. |
| `f9adf9c` | Pass 2 wallet implementation checklist. |
| `d08f7e5` | Pass 3 facility implementation checklist. |
| `813b13b` | Pass 4 identity implementation checklist. |
| `8f54915` | Pass 5 provider operations implementation checklist. |
| `1c1c89e` | Pass 6 visits implementation checklist. |
| `c64d764` | Pass 7 care/content/subscriber implementation checklist. |
| `f5b8be4` | Pass 8 shell/analytics/search/realtime implementation checklist. |

## Next Work

Start implementation with Pass 1 unless the user explicitly selects another pass.

The first runtime implementation should be read-owner cleanup and false-capability removal only:

1. Read the pass checklist.
2. Re-run the source scans listed in that checklist.
3. Confirm the source still matches the doc evidence.
4. Implement only the first safe package named in the checklist.
5. Keep backend repair, writes, migrations, Edge calls, Storage uploads, email sends and production data repair excluded unless separately authorized.
6. Verify with the exact commands in the checklist.
7. Commit only after a coherent package is complete and resumable.

## Runtime Checkpoint - Pass 1A First Slice

Commit target: emergency render safety and false-action downgrade.

Runtime files touched:

- `frontend/src/utils/emergencyRequestMapper.js`
- `frontend/src/utils/locationUtils.js`
- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/components/mobile/MobileEmergency.jsx`

Completed in this slice:

- Moved mixed-shape emergency service token formatting into a utility boundary.
- Removed the dead emergency detail modal fallback scaffold after the projection path.
- Replaced the `/emergencies` clinical custom event with navigation to the mounted `/visits?view=<visitId>` receiver.
- Removed table clinical-record payload logs.
- Disabled unsupported detail actions for call patient and incident report instead of showing false capability.
- Guarded external Google Maps handoff behind validated coordinates.
- Repaired mobile emergency row display for patient, contact, location, responder, ETA, facility, action copy and mojibake separator risk.
- Expanded location display helpers to accept finite `lat/lng`, `latitude/longitude`, and GeoJSON coordinates without object-truthiness checks.

Still blocked after this slice:

- Shared emergency list projection owner.
- Shared command facade for route, mobile and map dispatch/complete/retry.
- Manual cash completion and wallet settlement ownership.
- Timeline, chat and clinician assignment surfaces.
- Create/edit payload contract.
- Map marker action parity.

## Runtime Checkpoint - Pass 1A Cash Capability Downgrade

Commit target: remove the normal-page manual cash settlement path from emergency completion.

Runtime files touched:

- `frontend/src/utils/emergencyActions.js`
- `frontend/src/components/pages/EmergencyRequestsPage.jsx`

Completed in this slice:

- `getEmergencyActionState()` now reports unsettled cash as blocked instead of actionable.
- Emergency completion no longer prompts the operator to run manual wallet cash settlement after terminal completion.
- Completion now shows a deferred finance follow-up for unsettled cash.
- Retry-payment method labels use ASCII separators to avoid recurring encoding drift.

Still blocked after this slice:

- Pass 2 finance authority for manual cash settlement, wallet ledger writes and organization fee deduction.
- Canonical organization identity for cash eligibility; hospital UUID fallback remains a known risk in dispatch preflight and must not be treated as resolved.
- Shared command facade for route, mobile and map dispatch/complete/retry.

## Runtime Checkpoint - Pass 1B Render Projection Start

Commit target: emergency UI-to-DB render projection boundary.

Runtime files touched:

- `frontend/src/utils/emergencyRequestMapper.js`
- `frontend/src/services/emergencyService.js`
- `frontend/src/components/modals/EmergencyDetailsModal.jsx`
- `frontend/src/components/views/EmergencyRequestListView.jsx`
- `frontend/src/components/views/EmergencyRequestTableView.jsx`
- `frontend/src/components/mobile/MobileEmergency.jsx`

Completed in this slice:

- Added `buildEmergencyRenderProjection()` as the first shared UI-facing emergency projection boundary.
- Normalized patient, service, ambulance type, status, location coordinates, facility, payment, responder and clinical capability labels before render.
- Moved the modal's external-map coordinate source to the projection instead of a modal-local parser.
- Replaced modal/list/table/mobile patient/facility/payment display branches with projection fields where the slice touched them.
- Removed normal clinical-record "not found" browser warnings from list and table actions; the user still receives a toast.
- Contracted `console_create_emergency_request` and `console_update_emergency_request` payload builders to fields consumed by their SQL receivers.
- Removed `updated_at` and UI-only/raw object pass-through from the update RPC payload; the receiver owns timestamp mutation.

Verification result:

- `git diff --check` passed with only CRLF warnings.
- Mojibake scan on touched source/docs returned no matches.
- `cd frontend && npm run build` passed.
- Initial `npm run hardening:emergency-requests-surface-field-guard` from `ivisit-app` failed and produced `ivisit-app/supabase/tests/validation/emergency_requests_surface_field_guard_report.json`; follow-up sync/fix made the guard pass.

Guard failure disposition and closure:

- The guard found Console emergency type/schema drift: extra `emergency_requests` fields and relationship entries in `frontend/src/types/database.ts`.
- Cross-check showed Console matched `ivisit-app/supabase/database.ts` and the current logistics pillar, while `ivisit-app/types/database.ts` was stale. The app type mirror was synced from `ivisit-app/supabase/database.ts` and rewritten as UTF-8 to avoid the recurrent binary-file build failure.
- The guard also found `bed_type` and `estimated_arrival` inside `frontend/src/services/emergencyService.js` writable-field authority where those aliases belong in mapper compatibility only. They were removed from the emergency service writable-field set while remaining readable through the render mapper.
- After the type sync and alias-boundary fix, `npm run hardening:emergency-requests-surface-field-guard` passed.
- Follow-up read-only trace checks passed:
  - `node supabase/tests/scripts/export_table_flow_trace.js --table emergency_requests`
  - `node supabase/tests/scripts/assert_table_field_runtime_coverage.js --table emergency_requests`
- The trace reported 43 `emergency_requests` columns, 2,688 source references, 2,208 runtime references scanned, and zero missing runtime columns.
- After payload contraction, `npm run hardening:emergency-requests-surface-field-guard` and `cd frontend && npm run build` still passed.

Still blocked after this slice:

- Emergency create/update payload authority for extra logistics fields; payload work still needs receiver-by-receiver proof.
- Shared list projection owner for server pagination, count, filters and payment enrichment.
- Shared command facade for route, mobile and map dispatch/complete/retry.
- Browser smoke on `/emergencies` detail with scalar `ambulance_type`.
- App/Console generated type sync discipline after Supabase changes, including encoding check.

## Required Proof Chain

Every field, action, list, modal, panel, export, realtime path and global acquisition must remain traced through:

```text
source truth -> service/query/RPC/Edge/Storage -> hook/context/state -> route/modal/panel/UI render -> button/form payload -> receiver -> app consequence
```

If any link is unknown, continue audit before implementing.

## Stop Conditions

Stop and return to audit/planning when:

- a UI action maps to more than one possible receiver
- a service writes direct table state while an RPC or Edge Function owns the side effects
- a rendered field cannot be refreshed or persisted by a proved receiver
- a planned cleanup changes lifecycle, money, dispatch eligibility, identity ownership, email, or Storage behavior
- a fix requires migration, backfill, cleanup, Edge deployment, Storage upload, email send, or live data mutation
- app/console shared behavior is affected but only one repo has been checked
- a browser log, export, generated file or toast would expose raw patient, identity, financial, clinical, support, subscriber, or operational payloads

## Verification For This Handoff

Docs-only verification expected before committing this handoff:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/README.md frontend/docs/implementation/console-service-alignment/IMPLEMENTATION_AUDIT_HANDOFF_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/README.md frontend/docs/implementation/console-service-alignment/IMPLEMENTATION_AUDIT_HANDOFF_2026-05-26.md
```
