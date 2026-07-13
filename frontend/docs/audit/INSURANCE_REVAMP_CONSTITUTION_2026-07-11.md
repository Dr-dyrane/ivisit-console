# Insurance Revamp Constitution - 2026-07-11

Status: source-level closure complete 2026-07-12; rendered proof pending

## Baseline and authority

- Baseline archaeology: `f31f29f` is the pre-revamp page baseline; `91a3dba` and `9bccf7e7` introduced the signal-panel and route-context tranche now in the dirty tree.
- Command authority: `INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md` is controlling. Policy create, edit, delete, and verify have no proved console receiver or admin RLS/RPC path and remain unavailable.
- Read owner: `insuranceService.getInsurancePage` owns the admin policy projection. It normalizes legacy field shapes and owns server search, filters, sort, pagination, and exact counts.
- Billing owner: `insuranceService.getInsuranceBillingOutcomes` owns the separate, read-only billing outcome projection. Billing rows must not imply policy CRUD or payment completion.
- Realtime owners: `subscribeToInsurancePolicies` and `subscribeToInsuranceBillingOutcomes`; both must retain route cleanup.

## Perks to preserve

- Policy status and verification are separate evidence axes.
- Provider, holder, policy number, plan type, coverage, expiration, and intake date remain visible.
- Billing outcomes remain available in route context and the policy-linked detail modal without becoming policy commands.
- Server-side search, status/type/verification/date filters, KPI scopes, sort, exact count, pagination, and visible-page analytics remain explicit.
- Deep record focus opens the read-only policy modal and publishes the whole route context to the right pane.

## Desktop contract

- Compose `WorkspaceStage`, `SignalPanel`, `KpiStrip`, one `ActivitySheet`, `SheetToolbar`, `ListRowShell`, and `DetailRailShell`.
- Keep one sortable time header, backed by `created_at` server sort.
- Exclude row selection while policy mutation and bulk command authority are absent; focused-row inspection remains available.
- Filter state must be visible in the toolbar and reset pagination when changed.
- Loading, background refresh, failed-empty, degraded, filtered-empty, and terminal pagination states must remain distinct.
- Remove private card/rail look-alikes, entrance choreography, colored glow shadows, invalid opacity tokens, and view-mode branching.

## Mobile contract

- Canonical LIST only: heading, KPI strip, search/filter row, adaptive grouped panels, stable rows, detail sheet, load-more feedback, and honest terminal states.
- No billboard, metric rail, floating metric cards, destructive policy command, or fabricated create FAB.
- The route owns one `Policy stats` FAB. It dispatches `openInsuranceAnalytics` to the page-owned,
  read-only analytics surface; filter remains in the SearchRow and policy mutations remain absent.
- Missing mutation authority forbids create/edit/delete/verify actions. It does not justify a lone
  bottom pill when a proved route-level read action exists.

## Context contract

- Consume the whole route context and focused policy.
- Use canonical panel surfaces and radii; no private `Card` estate or entrance motion.
- Analytics and filter actions remain available through namespaced route events. Add/export remain visibly disabled with explanatory copy.

## Step-back closure - 2026-07-12

- Removed the clickable read-only navbar command and duplicate navbar filter. The desktop toolbar,
  mobile SearchRow, and context panel retain the one shared FilterSheet; the route records the
  navbar filter exclusion explicitly for the list-estate gate.
- Replaced the invented Health/Life/Vehicle/Property menu with a canonical free-form `plan_type`
  filter. It is case-insensitive, wildcard-sanitized, and includes the missing Inactive lifecycle
  option in the separate status filter.
- Policy status now normalizes at the service boundary and missing status renders Unknown/neutral
  instead of being invented as Pending. Mobile, desktop, panel, and modal policy status labels and
  tones resolve through `vitalTracks`; expired is amber, pending is cyan, and red remains reserved
  for real failures or rejected billing outcomes.
- Context policy and billing reads now render independently. Billing loading no longer appears as
  a truthful empty result, billing failure preserves and labels loaded outcomes, and unavailable
  policy/billing totals no longer collapse to zero. Loaded page rows are no longer called recent
  when the user has changed sort direction.
- Mobile empty recovery is axis-specific: Clear Search clears only search, Reset Filters clears only
  sheet facets, and Show all policies clears only the KPI scope.
- Shared `ModalShell` and `FilterSheet` now emit the shell's existing `modal-opened` signal when they
  become visible, so opening Insurance Analytics, Filter, or Details closes the right context pane
  through `LayoutContext` instead of leaving overlapping shell surfaces.

## Admission proof

- Focused page contract and console design-system estate tests.
- Mobile grammar, strict radius, data-contract, and UI hardgate checks.
- Encoding review and production build.
- Authenticated desktop and mobile rendered proof remains required before this page is marked admitted.
