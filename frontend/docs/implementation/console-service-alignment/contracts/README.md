# Console Contract Exhibits

## Status

Active exact-contract layer of the Stage 2 console service audit.

This subtree is source-audit evidence only. It does not claim runtime proof and it does not authorize product or database mutations.

## Purpose

The service maps identify likely drift. These exhibits narrow each suspected path to:

```text
UI field/action -> console handler -> service payload -> RPC/table/function receiver -> app-visible effect
```

That order is required before implementation so fixes are made at the ownership boundary rather than applied as downstream patches.

The exhibit must operate at field granularity. A row such as "emergency detail renders ambulance details" is not enough; the exhibit must say whether `ambulance_type` is rendered as a scalar label, parsed JSON string, object with `title`, nullable fallback, or constrained enum. Any unsafe render assumption is a contract drift finding even when the mutation path itself is reachable.

## Documents

- [Emergency, Payment, and Capacity Contract Chart - 2026-05-24](./EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md) - emergency creation and completion, manual cash processing, Stripe/wallet behavior, hospital-scoped pricing, and availability fields.
- [Identity, Visits, and Subscribers Contract Chart - 2026-05-24](./IDENTITY_VISITS_SUBSCRIBERS_CONTRACT_CHART_2026-05-24.md) - user editing, display ID resolution, visit ownership, and subscriber email lifecycle.
- [Ownership Trigger and Edge Function Proof - 2026-05-24](./OWNERSHIP_TRIGGER_EDGE_FUNCTION_PROOF_2026-05-24.md) - trigger/function receivers that correct or confirm charted drift.
- [Provider Operations Contract Chart - 2026-05-24](./PROVIDER_OPERATIONS_CONTRACT_CHART_2026-05-24.md) - ambulance and responder telemetry, verification/onboarding, doctor invitation/projection, and scheduling field contracts.
- [Read-Only Live Confirmation Matrix - 2026-05-24](./READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md) - aggregate deployed-table confirmation of current exposure without mutation or row-level disclosure.
- [Care, Content, and Analytics Contract Chart - 2026-05-24](./CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md) - insurance authorization, patient-to-console support receipt, health-news authoring, notification policy, and search/trend display truth.

## Evidence Standard

Every asserted drift item must contain:

- a console UI line where the value is captured, rendered, or actioned
- the UI's expected field shape and formatter assumption
- a service line where the payload is shaped or mutated
- the service's returned/submitted field shape
- a SQL RPC, direct-table, trigger, or Edge Function receiver line
- the receiver's accepted field shape, nullable/default behavior, and enum/check constraint when applicable
- an `ivisit-app` reference line when the concern is cross-surface behavior
- the user-visible failure mode, including crash, silent discard, wrong label, false success, or unauthorized action
- a status of `aligned`, `confirmed drift`, `drift suspected`, or `needs read-only runtime proof`

## Read-Only Guardrail

This audit may inspect source, migrations, generated types, existing validation artifacts, and read-only database introspection when explicitly used. Aggregate read-only confirmation has now been recorded in the live confirmation matrix. It must not run resets, migrations, seeders, backfills, cleanup tasks, mutating Edge Functions, or UI/test flows that write database state.
