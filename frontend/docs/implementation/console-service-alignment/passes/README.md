# Console Alignment Pass Subplans

## Purpose

Pass subplans are implementation handoffs. A pass is not a feature list; it is an execution batch that may contain several product features sharing source-of-truth risk.

## Documents

- [Pass 1 Emergency Detail Flow Subplan - 2026-05-24](./PASS_1_EMERGENCY_DETAIL_FLOW_SUBPLAN_2026-05-24.md) - Emergency details, cash approval, retry payment, scoped realtime, and request-derived visit lookup.
- [Pass 1 Emergency Detail Evidence Audit - 2026-05-24](./PASS_1_EMERGENCY_DETAIL_EVIDENCE_AUDIT_2026-05-24.md) - Evidence checkpoint proving current emergency detail, payment, visit, cash approval, and retry contracts before implementation.
- [Pass 2 Wallet, Stripe, and Ledger Flow Subplan - 2026-05-24](./PASS_2_WALLET_STRIPE_LEDGER_FLOW_SUBPLAN_2026-05-24.md) - Wallet reads, ledger authority, Stripe payment methods, top-ups, payouts, cash-fee boundaries, and maintenance isolation.
- [Pass 3 Hospital, Capacity, and Pricing Flow Subplan - 2026-05-24](./PASS_3_HOSPITAL_CAPACITY_PRICING_FLOW_SUBPLAN_2026-05-24.md) - Facility reads, capacity truth, discovery/import, media storage, and pricing scope.
- [Pass 4 Organization, Onboarding, and Verification Flow Subplan - 2026-05-24](./PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md) - Organization registry, onboarding, verification lanes, auth/admin boundaries, RBAC, and display IDs.
- [Pass 5 Provider Operations, Telemetry, and Scheduling Flow Subplan - 2026-05-24](./PASS_5_PROVIDER_TELEMETRY_SCHEDULING_FLOW_SUBPLAN_2026-05-24.md) - Ambulances, drivers, doctors, telemetry, maps, media, and staff scheduling.
- [Pass 6 Visits and Medical History Flow Subplan - 2026-05-24](./PASS_6_VISITS_MEDICAL_HISTORY_FLOW_SUBPLAN_2026-05-24.md) - Visits, request-derived clinical records, medical profile consumption, and visit lifecycle actions.
- [Pass 7 Care, Content, and Support Flow Subplan - 2026-05-24](./PASS_7_CARE_CONTENT_SUPPORT_FLOW_SUBPLAN_2026-05-24.md) - Insurance, support tickets, support FAQs, health news, notifications, and media/storage contracts.
- [Pass 7 Subscription Management Flow Subplan - 2026-05-24](./PASS_7_SUBSCRIPTION_MANAGEMENT_FLOW_SUBPLAN_2026-05-24.md) - Subscriber intake/read, unsupported management writes, duplicate services, welcome/custom/bulk email commands, realtime, and scope decisions.
- [Pass 7 Subscription Management Evidence Audit - 2026-05-24](./PASS_7_SUBSCRIPTION_MANAGEMENT_EVIDENCE_AUDIT_2026-05-24.md) - Evidence checkpoint proving duplicate subscriber, welcome email, custom email, bulk email, realtime, and RLS scope contracts before implementation.
- [Pass 8 Analytics, Search, Realtime, and Feedback Flow Subplan - 2026-05-24](./PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md) - Dashboard truth, search telemetry, preferences/demo mode, trends, realtime ownership, and route/action feedback.

## Rule

Each pass must name the feature/service rows it covers from `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`, inventory each surface's rendered fields and visible controls by permitted role, classify every user action as scoped read projection, authorized CRUD, workflow command, backend-derived read-only evidence, or excluded boundary, and state the exact high-risk field/receiver gate for its first implementation slice. Every list, queue, search, aggregate, or export in scope must also be classified as server-paged, deliberately bounded, detail-only, or unavailable, with count/filter/sort, enrichment, realtime, stale-response, and failure-display behavior named. Before a pass is executable, it must complete the Stage 5 bidirectional runtime-truth trace: source entity to every runtime consumer and affected route/action to every local or globally mounted acquisition/receiver, including providers, context panels, map loaders, global modals, startup effects and exports. If a service is in scope without a checklist row, a rendered field lacks read/exposure authority, an action lacks a receiver class or field gate, a data surface has no reliability classification, or a mounted acquisition path is not traced, implementation pauses.

Current audit-planning shape:

- Pass 1 uses a deeper projection/action contract format instead of a `Pass 1E` heading. Treat its service-by-service audit, emergency detail projection target, modal raw-field matrix and command/action target contract as the first-slice implementation gate.
- Passes 2-8 use `Pass E` implementation sequence and blocker matrices to separate safe read/disabled-state cleanup from backend, RPC, Edge, realtime, export, email and Storage work.
- Detailed implementation planning starts only after the active pass has been confirmed route by route and every visible field/control is marked retained, disabled, moved to an owner or blocked.

## Current Pass Coverage Ledger

This is the canonical audit-completeness ledger. It does not authorize implementation by itself.

Important correction: service inventory, table inventory, subplans and checklists are complete as maintained planning artifacts. Full runtime-truth closure is not complete across the Console. A pass is not audit-complete until its source truth, service/query boundary, state owner, UI render, action payload, receiver and app consequence are all closed for every in-scope field/control/export/realtime path.

| Pass | Planning coverage | Runtime-truth closure | Implementation state | Current disposition |
| --- | --- | --- | --- | --- |
| Pass 1 Emergency lifecycle, communication, clinical handoff and cash/payment truth | Strongest coverage: evidence audit, route ledger, projection target, modal raw-field matrix, action contract, checklist and app-consequence chain. | Partial. Detail render safety and cash false-capability paths improved; render projection boundary started; list owner, command facade, map parity, timeline, chat, clinician assignment, create/edit contract and dispatch org identity remain open. | Started. Commits `a48ca9f` and `2bf6a87`; current uncommitted slice starts Pass 1B render projection. | Continue Pass 1 in narrow packages. Next edge is schema guard reconciliation before create/update payload work. Do not call Pass 1 closed. |
| Pass 2 Wallet, Stripe and ledger | Subplan, contract evidence, Edge/RPC references and checklist exist. | Partial planning only. Money surfaces need fresh exact-line confirmation before edits. | Not started in runtime. | Audit refresh required before code. No money mutation or repair without explicit receiver proof. |
| Pass 3 Facility, capacity and pricing | Subplan, service map, contract chart, database matrices and checklist exist. | Partial planning only. Import/discovery, media provenance, capacity reducers, pricing scope and global hospital/map acquisition need current-source refresh. | Not started in runtime. | Audit refresh required before code. Facility totals and capacity claims remain high risk. |
| Pass 4 Identity, onboarding and verification | Subplan, service map, L5 ownership rows and checklist exist. | Partial planning only. Auth, invite, verification, role/org/facility scope, report/export affordances and mobile variants need source refresh. | Not started in runtime. | Audit refresh required before code. Do not widen auth or verification actions casually. |
| Pass 5 Provider operations and scheduling | Subplan, provider contract chart, service coverage and checklist exist. | Partial planning only. Telemetry, schedules, Storage, map layers, assignment/proximity, active trips and provider self-edit authority remain open. | Not started in runtime. | Audit refresh required before code. Provider readiness cannot be inferred from display rows. |
| Pass 6 Visits and medical history | Subplan, identity/visits contract chart, exact clinical exhibits and checklist exist. | Partial planning only. Clinical payload logs, incident lookup, row-source classifier, medical profile consumers and payment/tip evidence need current-source refresh. | Not started in runtime. | Audit refresh required before code. Request-derived records need stricter read-only handling. |
| Pass 7 Care/content/support | Subplan, care/content contract chart, service coverage and checklist exist. | Partial planning only. Hidden shell acquisition, false exports, URL safety, Storage proof, insurance billing outcomes, support response fields and content writes remain open. | Not started in runtime. | Audit refresh required before code. Read/disable cleanup only until receivers are proved. |
| Pass 7 Subscriptions | Separate subplan, evidence audit, subscriber/email exhibits and checklist exist. | Partial planning only. Welcome lifecycle, custom/bulk email, unsubscribe topology, export scope, duplicate service ownership and RLS write authority remain open. | Not started in runtime. | Audit refresh required before code. No email send or subscriber lifecycle write during audit. |
| Pass 8 Analytics/search/realtime/feedback | Subplan, shell surface ledger, blocker matrix and checklist exist. | Partial planning only. Dashboard/search/export truth depends on Passes 1-7 projections; shell/global acquisition and fake/stub truth remain open. | Not started in runtime. | Audit refresh required before code. Do not build analytics on unclosed domain truth. |

## How To Continue A Pass

For the active pass, work in this order:

1. Confirm the pass's service rows in the taxonomy.
2. List every importing file, direct Supabase/Auth/Edge/Storage caller, hook, context, route, modal, panel, map, export, and shell acquisition involved in that pass.
3. For each rendered field, document the source field, normalizer/parser, UI label, fallback/degraded state, and app consequence.
4. For each visible control, document the operation class, payload fields, receiver, authorization requirement, idempotency/audit need, reflected read, pending/error feedback, and disabled/unavailable rule.
5. Mark service paths as complete only when both directions are closed: source to all consumers, and UI action back to receiver and app consequence.
6. After documentation closure, implement only the first safe slice named in the pass subplan.

This keeps the original Stage 6 sequence intact while making each pass deep enough for another engineer to continue without relying on memory or chat context.

## Audit-Safe Verification Harness

Use `ivisit-app/supabase` as the shared Supabase verification harness while auditing Console alignment. The Console repo has build, lint, Jest, and browser-smoke capacity, but the stronger schema, RPC, table-flow, field-runtime, and cross-repo contract tooling lives in `ivisit-app/supabase/tests`.

Audit-safe default:

1. Prefer static/source guards and existing validation artifacts before any live runtime matrix.
2. Treat scripts named `matrix`, `e2e`, `cleanup`, `repair`, `seed`, `bootstrap`, `edge`, or `apply` as unsafe for audit until the script has been read and explicitly classified.
3. Do not run database reset, migration push, cleanup apply, repair, seed, Edge Function smoke, email send, Storage upload, or live mutation during audit.
4. When a pass touches database contracts, compare Console source against the latest generated artifacts under `ivisit-app/supabase/tests/validation`.

Recommended single-command checks from `ivisit-app`:

| Purpose | Command | Audit posture |
| --- | --- | --- |
| Emergency table field guard | `npm run hardening:emergency-requests-surface-field-guard` | Source/type/report write only; good first check for Pass 1. |
| Emergency transitions field guard | `npm run hardening:emergency-status-transitions-surface-field-guard` | Source/type/report write only; good first check for Pass 1 lifecycle work. |
| Table flow trace | `node supabase/tests/scripts/export_table_flow_trace.js --table <table_name>` | Source/schema-artifact scanner that writes validation reports; use per table. |
| Runtime field coverage | `node supabase/tests/scripts/assert_table_field_runtime_coverage.js --table <table_name>` | Reads trace artifacts and writes coverage reports; run after table flow trace. |
| Console CRUD contract matrix | `npm run hardening:console-ui-crud-matrix` | Static/source contract report; useful before route-level implementation. |
| Modal domain guard | `npm run hardening:modal-domain-guard` | Static/source guard layered on the CRUD matrix. |
| Contract drift guard | `npm run hardening:contract-drift-guard` | Cross-repo/source contract guard; verify before large shared-service edits. |
| Cleanup dry-run guard | `npm run hardening:cleanup-dry-run-guard` | Dry-run only, but it queries planned cleanup state; run before push after approved runtime matrices. |

High-risk checks requiring explicit classification before use:

| Command | Why it is not audit-default |
| --- | --- |
| `npm run hardening:console-matrix` | Creates, updates, RPC-calls, and cleans up live test rows. |
| `node supabase/tests/scripts/run_e2e_flow_matrix.js` | Creates full live emergency/payment/visit flows and cleanup records. |
| `npm run hardening:emergency-runtime-confidence` | Runs Console matrix plus E2E flow before assertions. |
| `npm run hardening:cash-matrix` | Exercises finance role isolation and likely live mutation paths. |
| `npm run hardening:mutation-matrix` | Purpose is mutation isolation; not audit-default. |
| `npm run hardening:edge-smoke` | Invokes Edge Functions; not audit-default. |
| `npm run hardening:cleanup-apply` | Applies cleanup mutations. |
| `npm run hardening:runtime-data-repair` | Repairs runtime data; never run during audit. |
| `npm run hardening:bootstrap-demo-matrix:apply` | Applies demo bootstrap changes. |
| `npm run hardening:full` | Includes live matrices, E2E, cleanup apply, and broad checks. |

Console-local checks remain useful after a code slice:

```powershell
cd C:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend
npm run build
npm run lint
npm test -- --watchAll=false
```

For a narrow UI fix, pair the relevant `ivisit-app/supabase` source guard with one Console build or focused browser smoke. Do not expand into full matrices until the pass documentation names the receiver, payload, reflected read, cleanup posture, and app consequence.
