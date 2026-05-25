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

## Current Reading Order

1. [Stage 5 Full Service Coverage Audit](./services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md)
2. [Console Feature Service Taxonomy](./services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md)
3. [Stage 6 Implementation Pass Plan](./stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md)
4. The relevant [pass subplan](./passes/README.md)
5. The relevant [contract exhibit](./contracts/README.md)

## Operating Doctrine For Multi-Agent Continuation

Use the Stage 6 pass order as the map, and use end-to-end proof as the standard of work inside each pass.

Do not switch to a repo-wide service-by-service rewrite. Services cross user-flow boundaries, and isolated service review can miss the UI promise or app consequence. Also do not implement from a broad pass summary. Each pass must close the involved services end to end before code changes begin.

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

## Working Rule

Each service audit must answer:

- what data the service reads
- what data the service writes
- which RPC or Edge Function owns the mutation
- which UI fields render the result
- which app behavior proves the intended flow
- which missing console behavior blocks app support

Implementation must not start from this subtree until the relevant service map, service taxonomy row, contract exhibit, L5 ownership row, and implementation pass checklist all agree on the owner, receiver, acceptance gate, and verification commands.
