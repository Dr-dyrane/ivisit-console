# Analytics Revamp Constitution - 2026-07-11

Status: guarded Summary composition complete; authenticated multi-role rendering pending

## History and identity

- Baseline `f31f29ff` preserved the pre-revamp analytics inventory.
- `71bd07ab` introduced the dashboard canon chrome; `6d4c6a68` aligned page, mobile, and panel surfaces; `adb74960` advanced mobile interaction parity; `035d1e52` repaired provider and organization scope behavior.
- Analytics is a dashboard/report surface, not an operational entity list. Desktop multi-select, bulk row actions, sortable table columns, and mobile list grouping are excluded by page identity.

## Source and authority

- Active route read owner: `analyticsService.getAnalyticsIntakePage()`.
- Sources: emergency requests, profiles, hospitals, ambulances, admin-only subscriber summary, and admin-only finance summary.
- Provider reads are scoped to assigned hospitals/responder identity or an explicit empty UUID scope; organization reads use organization filters.
- Sponsor finance is excluded. The previous path passed sponsors into `getFinanceAnalytics(..., true, ...)`, which selected the platform main wallet; a sponsor-specific finance projection must be proved before that slice can return.
- Report/export receivers are unproved. Desktop, mobile, header, and right-panel affordances must remain unavailable with immediate feedback.
- Analytics is read-only evidence. It has no app mutation consequence.

## Preserved perks

- Role-aware KPI vocabulary, time range, request response series, status/type distribution, hospital capacity, subscriber scope, finance scope, pull-to-refresh, and secondary analytics reveal.
- Cold-load failure, partial/denied sources, stale refresh, and last-visible-snapshot behavior remain distinct.

## Composition decisions

- Desktop uses a vertical Summary hierarchy: Pinned, Highlights, Trends, Breakdowns, current Network, and role-gated subscriber/payment snapshots. It keeps one stable chart and does not impose list-workspace machinery.
- Mobile uses dashboard grammar with the canonical signal-first hero, shared Today-height `MobileGlanceTile` statistics, evidence-only Highlights, an honest half-window Trend, pull-to-refresh, and explicit source labels. Pinned, Network, Subscribers, and Payments reuse the same slender label/value/orb anatomy; filter-style KPI chips and private tall stat cards are excluded. Section helper copy stays absent unless it changes source interpretation or explains an unavailable state.
- Mobile loading uses the same anatomy: Summary hero, segmented time range, four `72px` Pinned tiles, then Highlights, Trends, and Breakdowns surfaces. It receives the canonical 400ms mount warm-up, while background refresh preserves the loaded snapshot and uses the Updating signal.
- The right panel consumes the whole route-published snapshot. It performs no private reads and shows measured values only when the route owns them.
- The generic mobile FAB opens read-only analytics detail when the request source is ready. Report generation and export stay unavailable until a report receiver and scope are proved.

## Remaining proof

- Authenticated admin/org-admin/provider/sponsor desktop/mobile rendering.
- Report/export projection ownership and sponsor-specific finance scope remain separate blockers.
