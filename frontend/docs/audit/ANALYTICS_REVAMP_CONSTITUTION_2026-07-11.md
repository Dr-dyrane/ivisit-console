# Analytics Revamp Constitution - 2026-07-11

Status: active guarded implementation; route-context parity in progress

## History and identity

- Baseline `f31f29ff` preserved the pre-revamp analytics inventory.
- `71bd07ab` introduced the dashboard canon chrome; `6d4c6a68` aligned page, mobile, and panel surfaces; `adb74960` advanced mobile interaction parity; `035d1e52` repaired provider and organization scope behavior.
- Analytics is a dashboard/report surface, not an operational entity list. Desktop multi-select, bulk row actions, sortable table columns, and mobile list grouping are excluded by page identity.

## Source and authority

- Active route read owner: `analyticsService.getAnalyticsIntakePage()`.
- Sources: emergency requests, profiles, hospitals, ambulances, admin-only subscriber summary, and admin/sponsor finance summary.
- Provider reads are scoped to assigned hospitals/responder identity or an explicit empty UUID scope; organization reads use organization filters.
- Report/export receivers are unproved. Desktop, mobile, header, and right-panel affordances must remain unavailable with immediate feedback.
- Analytics is read-only evidence. It has no app mutation consequence.

## Preserved perks

- Role-aware KPI vocabulary, time range, request response series, status/type distribution, demand heatmap, hospital capacity, subscriber scope, finance scope, pull-to-refresh, sparse-data warning, and secondary analytics reveal.
- Cold-load failure, partial/denied sources, stale refresh, and last-visible-snapshot behavior remain distinct.

## Composition decisions

- Desktop remains a dense dashboard with stable chart dimensions; no list workspace is imposed.
- Mobile remains dashboard grammar with KPI strip, featured metrics, expandable measured sections, pull-to-refresh, and explicit source labels.
- The right panel consumes the whole route-published snapshot. It performs no private reads and shows measured values only when the route owns them.
- Generic route FAB/report generation stays suppressed or unavailable until a report receiver and scope are proved.

## Remaining proof

- Focused route/context contract and hardgate admission.
- Mobile grammar classification must be corrected from `exempt` to `dashboard` if the current surface satisfies the dashboard harness.
- Production build, strict radius, encoding checks, and authenticated admin/org-admin/provider/sponsor desktop/mobile rendering.
