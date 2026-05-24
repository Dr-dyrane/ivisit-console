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

## Documents

- [Emergency, Payment, and Capacity Contract Chart - 2026-05-24](./EMERGENCY_PAYMENT_CAPACITY_CONTRACT_CHART_2026-05-24.md) - emergency creation and completion, manual cash processing, ledger repair, and hospital availability fields.
- [Identity, Visits, and Subscribers Contract Chart - 2026-05-24](./IDENTITY_VISITS_SUBSCRIBERS_CONTRACT_CHART_2026-05-24.md) - user editing, display ID resolution, visit ownership, and subscriber email lifecycle.

## Evidence Standard

Every asserted drift item must contain:

- a console UI line where the value is captured, rendered, or actioned
- a service line where the payload is shaped or mutated
- a SQL RPC, direct-table, trigger, or Edge Function receiver line
- an `ivisit-app` reference line when the concern is cross-surface behavior
- a status of `aligned`, `confirmed drift`, `drift suspected`, or `needs read-only runtime proof`

## Read-Only Guardrail

This audit may inspect source, migrations, generated types, existing validation artifacts, and read-only database introspection when explicitly used. It must not run resets, migrations, seeders, backfills, cleanup tasks, mutating Edge Functions, or UI/test flows that write database state.
