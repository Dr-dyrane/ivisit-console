# Console Service Alignment

## Status

Active contract-truth and implementation-planning subtree for console/app service alignment.

## Scope

This folder maps console services, surfaces, L5 ownership, and implementation pass inputs against database truth and `ivisit-app` reference behavior. The root is intentionally only an index; detailed docs live in purpose-built subfolders.

## Tree

| Folder | Purpose |
| --- | --- |
| [stages](./stages/README.md) | Stage-level audit outputs and the global implementation pass plan. |
| [service-maps](./service-maps/README.md) | Domain service maps that compare console services against app and database truth. |
| [services](./services/README.md) | Complete service inventory, feature taxonomy, and service-review coverage gates. |
| [passes](./passes/README.md) | Detailed implementation subplans by user flow and operational lane. |
| [contracts](./contracts/README.md) | Exact UI-field to service-payload to SQL/RPC/function charts for drift-suspected paths. |
| [checklists](./checklists/README.md) | Narrow executable implementation checklists derived from the pass audits. |
| [Implementation Audit Handoff - 2026-05-26](./IMPLEMENTATION_AUDIT_HANDOFF_2026-05-26.md) | Current wrap-up state, commit checkpoints, next implementation entry point, and stop conditions. |

## Current Reading Order

1. [Stage 5 Full Service Coverage Audit](./services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md)
2. [Console Feature Service Taxonomy](./services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md)
3. [Stage 6 Implementation Pass Plan](./stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md)
4. The relevant [pass subplan](./passes/README.md)
5. The relevant [contract exhibit](./contracts/README.md)
6. The relevant [implementation checklist](./checklists/README.md)
7. [Implementation Audit Handoff - 2026-05-26](./IMPLEMENTATION_AUDIT_HANDOFF_2026-05-26.md)

## Operating Doctrine For Multi-Agent Continuation

Use the Stage 6 pass order as the map, and use end-to-end proof as the standard of work inside each pass.

Do not switch to a repo-wide service-by-service rewrite. Services cross user-flow boundaries, and isolated service review can miss the UI promise or app consequence. Also do not implement from a broad pass summary.

The working model is now a controlled audit/implementation loop, not an endless pre-implementation audit. A pass does not need perfect repo-wide certainty before the first safe slice starts, but each slice must be small enough that its UI-to-DB contract, verification, and rollback path are deterministic.

The required proof chain for every in-scope field, action, list, modal, panel, export, realtime path, and global acquisition is:

`source truth -> service/query/RPC/Edge/Storage -> hook/context/state -> route/modal/panel/UI render -> button/form payload -> receiver -> app consequence`

This means a pass is ready for implementation only when a new contributor can answer all of the following without guessing:

- Which table, RPC, Edge Function, trigger, or Storage policy is the source of truth?
- Which Console service owns the read projection?
- Which service/RPC/Edge/Storage receiver owns the write or workflow command?
- Which hooks, contexts, global providers, panels, modals, maps, exports, and startup effects acquire the same data?
- Which exact fields are rendered, normalized, parsed, sorted, counted, exported, or submitted?
- Which visible controls are enabled, disabled, unavailable, read-only, or role-gated?
- Which payload fields are accepted by the receiver and which UI fields would be discarded or misnamed?
- What happens in `ivisit-app` if Console changes this field or lifecycle state?
- What parser, ID, pagination, realtime, RLS, or fallback failure can make the UI lie?

If any link is uncertain, continue the audit instead of implementing. If a service is in scope but not traced through its importers, UI consumers, payloads, receiver, and app consequence, it is not complete.

## Implementation Loop

Use this loop for every pass:

1. Pick one user-visible Console surface and one coherent contract slice.
2. Trace the exact UI fields and controls to their source table, service projection, payload builder, receiver and reflected read.
3. Classify the slice as render-only, read/query, payload construction, transaction-rollback mutation, tagged staging mutation or excluded boundary.
4. Implement only the smallest upstream fix that makes the UI payload and rendered fields match database/RPC truth.
5. Verify with the smallest relevant source guard, build and browser smoke. Use `ivisit-app/supabase/tests` for shared schema/RPC/table-flow guards.
6. Update the pass doc or checklist with what the implementation proved or disproved.
7. Commit only when the slice is coherent, verified and resumable.

Implementation may begin when the current slice has a known receiver or an explicit unavailable/disabled disposition. Implementation must pause when the receiver, reflected read, authorization rule, ID semantics or app consequence is unknown.

## UI-To-DB Contract Standard

The central question is whether Console UI matches the database and backend workflow contract. For each field/control, document and test:

- UI label, component state and visible fallback.
- Normalizer, mapper or projection that turns raw DB/service shape into render shape.
- ID semantics at the point of use: UUID, display ID, organization ID, hospital ID, request ID, visit ID or payment ID.
- Service function and Supabase query, RPC, Edge Function or Storage receiver.
- Payload fields accepted by the receiver and fields that would be ignored, renamed, derived or rejected.
- Reflected read that proves the mutation or command result.
- Patient-app consequence when the field or lifecycle changes.

Parser and payload assumptions are first-class audit findings. A UI crash from `JSON.parse("ambulance")`, a hidden UUID/display-ID mismatch, a hospital ID passed as organization ID, or a button with no mounted receiver is a contract failure even when the page visually looks close.

## Database Test Lanes

Read-only audit is not enough to prove mutation compatibility. Use these lanes in order:

| Lane | Use | Rule |
| --- | --- | --- |
| No mutation | Static guards, table-flow trace, field-runtime coverage, build, mocked or read-only browser smoke. | Default for audit and render-only slices. |
| Payload construction | Unit or harness checks that build the exact service/RPC payload from UI fixtures. | Use for UUID/display-ID and nullable/required-field proof before live mutation. |
| Transaction-rollback mutation | Direct SQL/RPC probe inside `BEGIN` / `ROLLBACK`. | Allowed only after the receiver is identified and the operation does not call external services. |
| Tagged staging mutation | Create/update/delete only uniquely tagged staging rows, then assert and clean up. | Required for true end-to-end command proof; run cleanup dry-run before and after cleanup. |
| Production read-only | Inspect live shape without writes. | Production mutation is outside this audit unless explicitly authorized. |

Do not run reset, seed, cleanup apply, repair, migration push, Edge smoke, email send or Storage upload as part of ordinary audit work. Scripts named `matrix`, `e2e`, `cleanup`, `repair`, `seed`, `bootstrap`, `edge` or `apply` must be read and classified before use.

## Rollback Standard

Every runtime slice needs a deterministic rollback path before edits:

- One coherent slice per commit.
- Stage only intended files.
- Use `PULLBACK NOTE` comments for risky parser, projection, service, payload, lifecycle or UI-action changes.
- Name the revert path in the relevant pass doc after commit.
- If the slice mutates staging data, record the tag, cleanup command and cleanup dry-run result.

The default rollback for code-only slices is `git revert <commit_sha>`. If a change cannot be safely reverted by one commit revert or a named cleanup plan, the slice is too broad.

## Working Rule

Each service audit must answer:

- what data the service reads
- what data the service writes
- which RPC or Edge Function owns the mutation
- which UI fields render the result
- which app behavior proves the intended flow
- which missing console behavior blocks app support

Implementation must not start from this subtree until the relevant service map, service taxonomy row, contract exhibit, L5 ownership row, and implementation pass checklist all agree on the owner, receiver, acceptance gate, and verification commands.
