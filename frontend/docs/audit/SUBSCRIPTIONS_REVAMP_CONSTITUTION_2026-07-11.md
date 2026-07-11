# Subscriptions Revamp Constitution - 2026-07-11

Status: implementation candidate; read projection and rendered proof pending

## Baseline archaeology

- `f31f29ff` is the pre-revamp baseline.
- `52fe22d5`, `b24d34a1`, `903fbc49`, and `9bb1ec24` introduced the signal panel, handled sheet, focused rail, and shared focused-record behavior.
- `1f373dcc`, `ab72642e`, and `5257c479` introduced the visual-only mobile rollout, detail sheet, and canon-kit migration.
- The active dirty tree contains a later full mobile LIST candidate. It is preservation evidence, not proof of data authority.

## Current source truth

- Active read path: `useSubscription()` -> `subscriptionService.getSubscribers()` -> `subscribers` table.
- Current read is admin-gated in JavaScript, returns a broad array, orders by `created_at`, and can accept limit/offset, but the active page does not use a server page/count projection.
- Query and authorization failures currently collapse to `[]`, so failed, denied, and genuine-empty states are indistinguishable.
- Search, status/type/welcome/date/KPI filtering, exact counts, pagination, and analytics are currently computed over the loaded array. They must not be labeled global or complete without a bounded/exact projection contract.
- `subscriptionService.js` still contains direct create/update/delete/status/type and welcome/custom/bulk email exports. Their presence is compatibility inventory, not page authority.
- The duplicate `subscribersService.js` owner was removed after import proof. It must not return.

## Command authority

- Subscriber create, edit, delete, status/type changes, welcome email, custom email, bulk email, campaign sends, recipient export, and unsubscribe commands remain fail-closed.
- A command may return only after a named receiver, role/RLS expectation, payload allow-list, consent/delivery lifecycle, audit behavior, and `ivisit`/`ivisit-app` consequence are proved.
- The page must never infer email delivery from invocation success or mutate `welcome_email_sent` optimistically.
- The mobile route-owned Add subscriber FAB may remain visible only as an explicitly unavailable mirror of the desktop primary command. It must provide immediate feedback and never open writable chrome.

## Perks to preserve

- Subscriber email identity, lifecycle status, free/paid type, new-user marker, subscription date, and welcome-email evidence.
- Search; status, type, welcome-email, and date filters; KPI scoping; analytics reveal; pull-to-refresh; pagination/load-more; realtime refresh; read-only detail modal; focused record; and route-owned context summary.
- Status and plan type remain separate axes. Welcome-email state is an evidence overlay, not a lifecycle status.

## Desktop target

- Compose `WorkspaceStage`, `SignalPanel`, `KpiStrip`, one `ActivitySheet`, `SheetToolbar`, `ListRowShell`, and `DetailRailShell`.
- Exactly one sortable time column, backed by the canonical subscription/intake date field.
- Preserve selection and select-all/shift-range behavior; bulk mutation remains unavailable.
- Remove grid/list/table density switching, private signal/KPI/rail look-alikes, colored glow shadows, and entrance staging.
- Distinguish initial loading, background refetch, denied, failed-empty, degraded stale rows, filtered empty, genuine empty, and terminal pagination.

## Mobile target

- Full LIST grammar: heading, lifecycle KPI strip, SearchRow, adaptive status/recency groups, stable rows, selection only where honestly useful, detail sheet, and load-more feedback.
- No dashboard billboard, metric rail, fake trends, revenue language, or email command.
- Page-owned prefix pagination must append visibly and must not replace prior rows during refetch.

## Context target

- Consume the whole route context and focused subscriber; do not start private reads or channels.
- Canonical radii and unframed panel surfaces, no entrance motion.
- Analytics remains active. Join/Add and Email remain visibly unavailable until authority is proved.

## Admission proof

- Establish an explicit read projection with denial/failure envelopes, exact or honestly bounded counts, server search/filter/sort/page ownership, and realtime cleanup.
- Focused page contract plus shared list-workspace estate registration.
- Mobile grammar, strict radius, data contract, UI hardgate, encoding review, and production build.
- Authenticated desktop and mobile rendered proof before admission.
