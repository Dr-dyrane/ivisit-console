# Console Alignment Audit Program - 2026-05-24

## Purpose

This is the working audit program for bringing `ivisit-console` up to the current `ivisit-app` contract. The goal is not to start patching UI until the data truth is known. The goal is to make every future implementation pass obvious, narrow, and reviewable.

## Rule Of Work

No product code changes during the audit stages unless a broken doc or generated reference blocks the audit itself. Every claim must point to one of these:

- migration SQL
- schema reference
- RPC/function body
- Edge Function
- app service
- console service
- hook/query/state owner
- page/component render
- table-flow trace
- local or staging trace log

Testing is useful later, but the audit does not rely on tests as a substitute for reading the system. The audit follows the contract first, then the data flow, then the UI.

## Documentation Tree Discipline

Audit docs must follow the existing doc tree. Do not create one bloated master file that mixes database truth, app mutations, console gaps, state ownership, and service-specific findings.

Use folder and file placement by intent:

- `frontend/docs/implementation/` for active alignment programs, stage plans, pass plans, and implementation handoff docs.
- `frontend/docs/database/` for stable schema references, canonical table maps, and database-specific reference material.
- `frontend/docs/architecture/` for architecture doctrine, state ownership, provider/query boundaries, and system-level design.
- `frontend/docs/emergency/` and `frontend/docs/emergency-system/` for emergency-flow specifics.
- `frontend/docs/provider-management/` for hospital, doctor, ambulance, organization, and provider operations.
- `frontend/docs/ui-ux/` or `frontend/docs/design-system/` for visual/interaction doctrine and operational UI standards.
- `frontend/supabase/docs/` for Supabase-facing schema/API references that belong beside migrations.

Keep docs modular:

- One stage doc may summarize a stage, but detailed matrices should split into subtree docs when they grow large.
- A domain audit should live near its domain folder and be linked from the active implementation index.
- A service audit should name the service and date in the filename.
- Each doc must state status, scope, canonical sources, findings, risks, and next action.
- Index files must be updated when a doc becomes part of the active audit path.
- Archive stale or superseded docs only when the replacement is clear; do not delete history casually.

Avoid doc bloat:

- Do not duplicate the same table/RPC list across multiple docs unless the downstream doc narrows it.
- Link to canonical docs instead of copying long sections.
- Use summary tables in parent docs and detailed matrices in child docs.
- Prefer exact references and short conclusions over narrative repetition.
- If a doc exceeds its purpose, split it by domain, service, or stage.

## Stage Plan

| Stage | Name | Output | Commit Boundary |
| --- | --- | --- | --- |
| 0 | Audit rules and map | This program plus the current alignment overview | Commit after the audit spine and indexes are in place |
| 1 | Database truth | Canonical schema/RPC/trigger/cron/Edge Function map | Commit after DB truth doc is internally consistent |
| 2 | App mutation truth | How `ivisit-app` mutates each table/RPC/Edge Function | Commit after app mutation map is complete |
| 3 | Console capability gap | Console services, page-level Supabase calls, missing services, stale paths | Commit after gap matrix is complete |
| 4 | L5 state/data audit | State ownership map and violations by surface | Commit after state/data doc is complete |
| 5 | Narrow service audits | One doc per service or domain lane | Commit each finished service audit as its own milestone |
| 6 | Implementation pass plans | Ordered, narrow implementation plans with no hidden research | Commit after pass plan set is complete |

Do not bundle implementation changes with audit commits. Implementation should start only after a stage doc names the exact target and acceptance checks.

## Stage 0 Output

- `frontend/docs/implementation/CONSOLE_APP_ALIGNMENT_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/CONSOLE_ALIGNMENT_AUDIT_PROGRAM_2026-05-24.md`
- `frontend/docs/implementation/STAGE_1_DATABASE_TRUTH_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/README.md`

## Audit Sequence

### Stage 1 - Database Truth

Build one database source of truth from current migrations and references:

- tables, columns, types, defaults, constraints, indexes
- RLS policies and helper functions
- triggers and trigger-owned side effects
- RPC signatures and mutation ownership
- Edge Functions and webhook side effects
- cron/scheduled work
- UUID versus display ID rules
- Postgres-specific risk: `jsonb`, geometry/point fields, nullable fields, generated IDs, `SECURITY DEFINER`, RLS recursion, append-only logs, enum/check constraints

Output: `STAGE_1_DATABASE_TRUTH_AUDIT_2026-05-24.md`.

### Stage 2 - App Mutation Truth

Map how the patient app changes the database:

- service method
- payload shape
- RPC/table/Edge Function target
- required and optional fields
- fallback paths
- local cache/offline behavior
- expected side effects
- errors the app expects

This is the truth the console must serve.

### Stage 3 - Console Capability Gap

Map console against the app mutation truth:

- existing services
- missing services
- stale services
- page-level direct Supabase calls
- context-owned server data
- missing read/write fields
- direct table writes where an RPC should own business effects
- mock fallback paths that can hide real drift

### Stage 4 - L5 State/Data Audit

Classify each surface:

- L1 local UI state
- L2 server/query state
- L3 client store state
- L4 atoms
- L5 workflow/state machine

Flag:

- server data in broad context
- async reads inside provider orchestration
- machine-like statuses in `useState`
- derived data stored instead of selected
- realtime subscriptions owning durable UI state

### Stage 5 - Narrow Service Audits

Use this exact service audit shape:

```text
service -> data source -> API/RPC/table -> returned shape -> hook/query -> page -> rendered UI fields -> mutation logic -> expected side effects -> failure modes -> pass plan
```

Each service audit must include:

- fields read
- fields written
- UI fields rendered
- missing table fields
- display ID versus UUID risks
- nullability/default risks
- payload mismatch risks
- RLS/permission risks
- stale mock or fallback risks
- exact implementation pass plan

### Stage 6 - Implementation Pass Plans

Only after audit docs are complete, produce implementation passes:

- emergency requests
- payments and wallets
- hospitals, rooms, pricing, and availability
- ambulances and dispatch
- doctors and scheduling
- visits
- users, profiles, verification, and organizations
- notifications, support, and activity
- discovery, subscribers, and analytics
- realtime/query invalidation
- operational UI feedback

## Git Discipline

Recommended commit boundaries:

1. `Document console alignment audit program`
2. `Document console database truth audit`
3. `Document app mutation truth for console alignment`
4. `Document console service and UI capability gaps`
5. `Document console state ownership audit`
6. `Document emergency service alignment plan`
7. `Document payment and wallet alignment plan`

Commit only when the stage is coherent enough to resume from. Do not commit half-written matrices unless the commit message says it is a checkpoint.

## Current Next Step

Continue Stage 1. Complete the database truth doc before starting app mutation mapping.
