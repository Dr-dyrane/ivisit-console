---
status: implementation-candidate; rendered proof pending
owner: product + frontend + backend
created: 2026-07-11
baseline: f31f29f
route: /organizations
role: admin
---

# Organizations Revamp Constitution - 2026-07-11

## Governing rule

Organizations is closed one page at a time, with baseline behavior read from `f31f29f` and
backend authority decided before a visible command is retained. The page may become visually
canonical while organization writes remain fail-closed. Visual admission does not grant create,
edit, delete, wallet, Stripe, or billing authority.

## Baseline changelog and perk inventory

The preservation baseline contained:

- an admin-only `/organizations` route and `Organization Registry` header;
- grid/list/table variants through `useViewMode`, local pagination, search, and sort;
- desktop row selection, bulk delete, analytics, and a private organization dialog;
- direct `saveOrganization()` and `deleteOrganization()` command paths;
- mobile pull-to-refresh, infinite load, KPI chips, inline row expansion, selection, and details;
- mobile `LIVE`, Network Dynamics, wallet float, paid mix, active ratio, average fee, and fixed
  chart-shape claims derived from the loaded window;
- a right panel with onboarding, growth, pulse, and recent-organization affordances.

Preservation decisions:

| Baseline behavior | Decision | Active treatment |
|---|---|---|
| Search, pagination, time sort | Preserve | Server-scoped search, exact count, bounded payout resolver, one `created_at` sort header. |
| Multi-select | Preserve | Desktop and mobile selection remain; delete action is visibly locked. |
| Row details | Preserve | Desktop detail rail plus read-only modal; mobile detail bottom sheet. |
| Pull refresh and load more | Preserve | Real `isFetching` feedback and placeholder-aware page accumulator. |
| Analytics | Preserve as read-only evidence | Exact search-scoped Registry/Funded/Payout gap counts feed the generic analytics surface. |
| Create/edit/delete/bulk | Fail closed | Every reachable intent surfaces the organization-authority notice; service writers are not imported. |
| Grid/list/table variants | Convert | One canonical desktop ActivitySheet render. |
| Mobile billboard/metric rail | Remove | LIST grammar: heading, KPI rail, search, grouped rows, detail sheet. |
| Loaded-window financial/trend claims | Remove | No fixed chart shapes, `LIVE`, paid mix, revenue share, or loaded-window global totals. |
| Right-panel quick actions | Convert | Whole route context, canonical radii/icon wells, read-only route and focused-record actions. |

## Authority register

| Action or field | Classification | Decision |
|---|---|---|
| Organization registry read | Scoped read projection | Admin route only; bounded cross-table payout resolution with exact search/KPI counts. |
| Organization details | Read-only evidence | Allowed in rail, modal, mobile sheet, and context panel. |
| Wallet balance / payout gap | Backend-derived read-only evidence | May be displayed; no wallet command is exposed. |
| Stripe connection state | Backend-derived read-only evidence | Display connection state only; no Stripe command is exposed. |
| Create / edit / delete / bulk delete | Excluded command boundary | Receiver, admin authority, payload allow-list, and app consequence remain unproved. |
| Facility verification | Separately owned workflow | Remains in Approvals; organizations has no invented verification state. |

## Findings closed in this pass

- **ORG-1 - unbounded route read:** the route used `getOrganizations()` and sliced locally.
  The active route now uses `useOrganizationsQuery()` over `getOrganizationsPage()`.
- **ORG-2 - false KPI interaction:** the inherited WIP changed only the hero while Funded and
  Payout gap left the row list untouched. The active KPI now scopes rows, count, empty state,
  route context, desktop, and mobile together.
- **ORG-3 - failed counts became zero:** the inherited count helper caught errors and returned
  `0`. Count or payout-resolution failures now reject the query and render the degraded state.
- **ORG-4 - mixed count scopes:** search-scoped Registry was shown next to global Funded/Payout
  gap. All KPI counts now share the current search scope.
- **ORG-5 - fabricated mobile metrics:** fixed chart data, `LIVE`, paid mix, revenue language,
  active-ratio trends, and loaded-window global claims were removed.
- **ORG-6 - unsafe mobile commands:** live-looking edit/delete controls were removed. Mobile is
  details-only; selection delete remains disabled with an authority reason.
- **ORG-7 - FAB omission:** `/organizations` suppressed the generic FAB while claiming an
  exemption. The dock now mirrors desktop `Add organization` and reaches the same fail-closed
  page handler.
- **ORG-8 - placeholder poisoning / page replacement:** the mobile accumulator ignores React
  Query placeholder rows, replaces settled page 1, and appends later pages by id.
- **ORG-9 - disabled-input view modal:** the reachable view mode now renders read-only fields;
  unreachable create/edit form modes retain pending feedback but cannot write.
- **ORG-10 - context drift:** the right panel consumes the whole page-published context and is
  covered by the canonical radius, icon-well, neutral-shadow, and pass-through estate gates.

## Backend limit and blocker

Payout readiness spans `organizations` and `organization_wallets`. This repo has no named backend
view/RPC for the joined page projection. The source-only implementation resolves at most 5,000
organization and wallet rows, compares exact counts to returned rows, and fails visibly above the
ceiling. A backend-owned organization payout projection is required before this registry exceeds
that limit. This is a scalability blocker, not permission to return partial truth.

## Harness requirements

Before admission:

1. Organizations page contract and Console design-system estate laws pass.
2. Mobile grammar passes with `MobileOrganizations` classified as `list`.
3. Strict-radius hardgate includes page, mobile, context panel, and modal.
4. Data-contract, mojibake, non-ASCII review, and production build pass.
5. Rendered admin proof covers desktop list/rail/context and mobile list/detail/dock at representative
   desktop and phone viewports, including no horizontal overflow or framework errors.
6. Queue, Page 15 gate, and feature-parity records are updated only after rendered proof.

## Current close state

Source implementation is green through focused static gates. Rendered desktop/mobile proof and the
final drop audit remain pending, so Page 15 is not yet declared fully admitted by this document.
