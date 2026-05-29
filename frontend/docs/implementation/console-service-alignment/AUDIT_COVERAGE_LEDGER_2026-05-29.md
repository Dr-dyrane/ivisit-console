# Console Service Alignment Audit Coverage Ledger - 2026-05-29

## Status

This is the current audit-completeness ledger for the console/app alignment work.

The audit is not fully complete by the repository standard. The documentation tree, database source-truth matrices, service inventory, pass subplans, and first implementation checklists exist. Full runtime-truth closure remains open pass by pass.

Do not treat the existence of a checklist as proof that a pass is done. A checklist means a narrow first implementation slice can be selected only after the active pass is refreshed against current source.

## Current Truth

| Layer | Status | Meaning |
| --- | --- | --- |
| Database source-truth matrices | Complete as maintained inventory | Tables, RPCs, triggers, policies, Edge Functions, UUID/display ID rules, Postgres risks, and read-only evidence are documented. |
| Console service inventory | Complete as maintained inventory | `43/43` service files are assigned to audit lanes. This does not prove every mounted runtime consumer is closed. |
| Shared table capability ledger | Complete as maintained inventory | `45/45` shared tables are classified. This does not prove UI field correctness or receiver safety. |
| Pass subplans | Complete as planning artifacts | Passes 1-8 have subplans or evidence audits. They are implementation handoffs, not completion proof. |
| Implementation checklists | Complete for first slices | Passes 1-8 have first-slice checklists. They must be refreshed before source edits. |
| Runtime mount/acquisition closure | In progress | Globally mounted providers, shell hooks, map providers, context panels, modals, exports, and startup effects are not fully closed across all passes. |
| Surface field/control closure | In progress | Every rendered field and visible action has not yet been re-confirmed against current source across all passes. |
| Runtime implementation | Started only for Pass 1A | Two narrow emergency safety slices have landed. This does not close Pass 1. |

## Strict Completion Standard

A pass is not audit-complete until every in-scope field, action, list, modal, panel, export, realtime path, and global acquisition is traced through:

```text
source truth -> service/query/RPC/Edge/Storage -> hook/context/state -> route/modal/panel/UI render -> button/form payload -> receiver -> app consequence
```

For each rendered field, the pass must name:

- source table/RPC/Edge/Storage/external truth
- service or direct caller
- hook/context/state owner
- route/modal/panel/mobile/export consumer
- displayed label and fallback/degraded state
- actor/role exposure authority
- app consequence when Console changes or omits the field

For each visible action, the pass must name:

- operation class: read-only, authorized CRUD, workflow command, backend-derived evidence, unavailable, or excluded
- exact submitted payload fields
- receiver and authorization rule
- idempotency/audit requirement
- pending/error/success feedback
- reflected read after the action
- disabled/unavailable rule when the receiver is unproved

## Pass Coverage Ledger

| Pass | Inventory and planning | Runtime-truth closure | Implementation state | Current disposition |
| --- | --- | --- | --- | --- |
| Pass 1 Emergency lifecycle, communication, clinical handoff, cash/payment truth | Strongest coverage. Evidence audit, route ledger, contract chart, checklist, app consequence notes, and two runtime checkpoints exist. | Partial. Detail render safety and cash false-capability paths improved, but list owner, command facade, map parity, timeline, chat, clinician assignment, create/edit contract, and dispatch org identity remain open. | Started. Commits `a48ca9f` and `2bf6a87`. | Continue Pass 1 audit/implementation in narrow packages. Do not call Pass 1 closed. |
| Pass 2 Wallet, Stripe, ledger, payouts, cash finance | Subplan, contract evidence, Edge/RPC references, and checklist exist. | Partial planning only. Money surfaces need fresh exact-line confirmation before edits. | Not started in runtime. | Audit refresh required before code. No money mutation or repair without explicit receiver proof. |
| Pass 3 Facility, capacity, discovery, media, pricing | Subplan, service map, contract chart, database matrices, and checklist exist. | Partial planning only. Import/discovery, media provenance, capacity reducers, pricing scope, and global hospital/map acquisition need current-source refresh. | Not started in runtime. | Audit refresh required before code. Facility totals and capacity claims remain high risk. |
| Pass 4 Identity, organization, onboarding, verification | Subplan, service map, L5 ownership rows, and checklist exist. | Partial planning only. Auth, invite, verification, role/org/facility scope, report/export affordances, and mobile variants need source refresh. | Not started in runtime. | Audit refresh required before code. Do not widen auth or verification actions casually. |
| Pass 5 Provider operations, telemetry, scheduling | Subplan, provider contract chart, service coverage, and checklist exist. | Partial planning only. Telemetry, schedules, Storage, map layers, assignment/proximity, active trips, and provider self-edit authority remain open. | Not started in runtime. | Audit refresh required before code. Provider readiness cannot be inferred from display rows. |
| Pass 6 Visits, medical history, emergency-derived clinical records | Subplan, identity/visits contract chart, exact clinical exhibits, and checklist exist. | Partial planning only. Clinical payload logs, incident lookup, row-source classifier, medical profile consumers, and payment/tip evidence need current-source refresh. | Not started in runtime. | Audit refresh required before code. Request-derived records need stricter read-only handling. |
| Pass 7 Care/content/support | Subplan, care/content contract chart, service coverage, and checklist exist. | Partial planning only. Hidden shell acquisition, false exports, URL safety, Storage proof, insurance billing outcomes, support response fields, and content writes remain open. | Not started in runtime. | Audit refresh required before code. Read/disable cleanup only until receivers are proved. |
| Pass 7 Subscriptions | Separate subplan, evidence audit, subscriber/email exhibits, and checklist exist. | Partial planning only. Welcome lifecycle, custom/bulk email, unsubscribe topology, export scope, duplicate service ownership, and RLS write authority remain open. | Not started in runtime. | Audit refresh required before code. No email send or subscriber lifecycle write during audit. |
| Pass 8 Analytics, search, realtime, feedback, shell | Subplan, shell surface ledger, blocker matrix, and checklist exist. | Partial planning only. Dashboard/search/export truth depends on Passes 1-7 projections; shell/global acquisition and fake/stub truth remain open. | Not started in runtime. | Audit refresh required before code. Do not build analytics on unclosed domain truth. |

## Known Open Runtime Closure Areas

These areas are explicitly not closed:

- Emergency list/count/search/payment enrichment owner.
- Emergency route/mobile/map shared command facade.
- Emergency timeline, chat, and clinician assignment surfaces.
- Emergency create/edit payload contract.
- Dispatch candidate selection and canonical organization identity.
- Wallet ledger/export completeness and Stripe reflection.
- Manual cash settlement and fee deduction authority.
- Hospital/provider taxonomy, media provenance, discovery/import contract, capacity math, and pricing scope.
- Identity invite/auth/onboarding/verification receivers and role/org/facility boundaries.
- Provider telemetry, scheduling, map layers, active trip scope, and Storage media writes.
- Visit row-source classification, clinical payload logging, medical profile consumption, and tip/payment reflection.
- Insurance billing outcomes, support staff response, health-news authoring, content URLs, uploads, and care exports.
- Subscriber duplicate services, welcome/bulk/custom email lifecycle, unsubscribe, and export scope.
- Dashboard, search, realtime, notification, PWA/debug/feedback, report/export, and global shell acquisition truth.

## Current Implementation Checkpoints

Runtime implementation has begun only for two Pass 1A safety slices:

| Commit | Scope | Audit effect |
| --- | --- | --- |
| `a48ca9f` | Emergency detail render safety. | Closed specific parser/log/unmounted-receiver/mobile-display defects; did not close list owner, map parity, timeline/chat/assignment, or create/edit. |
| `2bf6a87` | Emergency cash settlement false capability downgrade. | Blocked normal-page manual cash settlement; did not repair Pass 2 finance authority or dispatch org identity. |

## Next Correct Move

Return to Pass 1 and finish its remaining runtime-truth closure before widening to Pass 2.

The next Pass 1 audit/implementation package should cover:

1. Emergency list projection owner:
   - route page count/window/filter/sort
   - current-page payment enrichment
   - selected-row refresh
   - mobile/list/table/map row projections
   - partial payment/read failure states
2. Shared action facade:
   - dispatch
   - complete
   - retry payment
   - clinical navigation
   - external map handoff
   - unavailable incident report/call actions
3. Alternate mounted paths:
   - `EmergencyRequestsPage`
   - `EmergencyRequestListView`
   - `EmergencyRequestTableView`
   - `MobileEmergency`
   - `MarkerDetailPanel`
   - `MobileMap`
   - `EmergencyPanel`
   - `PageDataContext`
   - `MapProvider`

If this package finds a receiver ambiguity, stop and document it before code.

## Verification Rule

For docs-only updates:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" <touched-files>
rg -n --pcre2 "[^\x00-\x7F]" <touched-files>
```

For runtime source updates:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
cd frontend
npm run build
```

Do not run database reset, seed, cleanup, migration, Edge invocation, email send, Storage upload, backfill, repair, or production data mutation during audit.
