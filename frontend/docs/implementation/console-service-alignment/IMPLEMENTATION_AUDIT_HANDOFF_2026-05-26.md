# Console Service Alignment Implementation Audit Handoff - 2026-05-26

## Status

Audit and implementation-planning wrap-up checkpoint. No runtime code, database mutation, Edge Function invocation, email send, Storage upload, cleanup, seed, reset, migration, or production data repair was performed in this checkpoint.

The implementation checklist set is now complete for Passes 1-8. Detailed runtime implementation should begin only from the relevant checklist, not from broad memory or a page symptom.

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
