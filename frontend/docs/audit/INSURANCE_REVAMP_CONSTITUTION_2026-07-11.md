# Insurance Revamp Constitution - 2026-07-11

Status: implementation candidate; rendered proof pending

## Baseline and authority

- Baseline archaeology: `f31f29f` is the pre-revamp page baseline; `91a3dba` and `9bccf7e7` introduced the signal-panel and route-context tranche now in the dirty tree.
- Command authority: `INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md` is controlling. Policy create, edit, delete, and verify have no proved console receiver or admin RLS/RPC path and remain unavailable.
- Read owner: `insuranceService.getInsurancePage` owns the admin policy projection. It normalizes legacy field shapes and owns server search, filters, sort, pagination, and exact counts.
- Billing owner: `insuranceService.getInsuranceBillingOutcomes` owns the separate, read-only billing outcome projection. Billing rows must not imply policy CRUD or payment completion.
- Realtime owners: `subscribeToInsurancePolicies` and `subscribeToInsuranceBillingOutcomes`; both must retain route cleanup.

## Perks to preserve

- Policy status and verification are separate evidence axes.
- Provider, holder, policy number, plan type, coverage, expiration, and intake date remain visible.
- Billing outcomes remain available in analytics and route context without becoming policy commands.
- Server-side search, status/type/verification/date filters, KPI scopes, sort, exact count, pagination, and visible-page analytics remain explicit.
- Deep record focus opens the read-only policy modal and publishes the whole route context to the right pane.

## Desktop contract

- Compose `WorkspaceStage`, `SignalPanel`, `KpiStrip`, one `ActivitySheet`, `SheetToolbar`, `ListRowShell`, and `DetailRailShell`.
- Keep one sortable time header, backed by `created_at` server sort.
- Preserve row selection as an operator workspace mechanism; bulk mutation remains visibly unavailable until authority is proved.
- Filter state must be visible in the toolbar and reset pagination when changed.
- Loading, background refresh, failed-empty, degraded, filtered-empty, and terminal pagination states must remain distinct.
- Remove private card/rail look-alikes, entrance choreography, colored glow shadows, invalid opacity tokens, and view-mode branching.

## Mobile contract

- Canonical LIST only: heading, KPI strip, search/filter row, adaptive grouped panels, stable rows, detail sheet, load-more feedback, and honest terminal states.
- No billboard, metric rail, floating metric cards, destructive policy command, or fake route FAB.
- The route intentionally has no FAB until a create receiver is proved; filter remains in the SearchRow.

## Context contract

- Consume the whole route context and focused policy.
- Use canonical panel surfaces and radii; no private `Card` estate or entrance motion.
- Analytics and filter actions remain available. Add/export remain fail-closed with explanatory feedback.

## Admission proof

- Focused page contract and console design-system estate tests.
- Mobile grammar, strict radius, data-contract, and UI hardgate checks.
- Encoding review and production build.
- Authenticated desktop and mobile rendered proof remains required before this page is marked admitted.
