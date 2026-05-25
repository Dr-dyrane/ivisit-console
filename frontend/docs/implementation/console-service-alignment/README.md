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

## Working Rule

Each service audit must answer:

- what data the service reads
- what data the service writes
- which RPC or Edge Function owns the mutation
- which UI fields render the result
- which app behavior proves the intended flow
- which missing console behavior blocks app support

Implementation must not start from this subtree until the relevant service map, service taxonomy row, contract exhibit, L5 ownership row, and implementation pass checklist all agree on the owner, receiver, acceptance gate, and verification commands.
