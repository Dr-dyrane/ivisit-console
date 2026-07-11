# Pricing Revamp Constitution - 2026-07-11

Status: source parity implemented; authenticated rendered proof and mutation authority pending

## Baseline archaeology

- `f31f29ff` is the pre-revamp baseline.
- `1e62c219`, `2607a8af`, `ab12fcfb`, and `c3b05cd7` introduced the signal panel, handled list sheet, focused rail, and shared focused-record behavior.
- `e4554f89`, `f914e9fe`, and `3c1a67f2` introduced the mobile rollout/detail/canon-kit tranche. The current pass completed the LIST migration and removed the billboard, secondary metric rail, and floating metric rows.

## Source and authority

- Active route read owner: `pricingService.getPricingPageData()`.
- Canonical tables: `service_pricing` and `room_pricing`, with hospital/facility linkage and global fallback rows.
- The current projection loads selected pricing families, joins hospitals, normalizes rows, then applies scope/search/sort/pagination and summary derivation in memory. Completeness must be described as the projection scope, not an unqualified global total.
- Compatibility writers use `upsert_service_pricing`, `upsert_room_pricing`, `delete_service_pricing`, and `delete_room_pricing` RPCs, but organization writes can resolve through the first hospital. That is not sufficient selected-facility authority.
- Active page create/edit/delete/select/bulk paths remain fail-closed and must not import those writers until actor, facility, payload, RPC authorization, and patient quote consequence are proved.

## Perks to preserve

- Separate service and room families.
- Global fallback versus facility override evidence.
- Hospital/facility label, price amount, service/room label, room type, effective/updated date, and source scope.
- Search, family tabs, scope filters, analytics reveal, pagination/load-more, pull-to-refresh, focused read-only details, and route-owned unavailable feedback.

## Desktop target

- Composed `PricingDesktopWorkspace` from the shared `WorkspaceStage`, `SignalPanel`, `KpiStrip`, `ActivitySheet`, and focused detail rail.
- The single updated-time header sorts the complete filtered projection before pagination; it is not a current-page-only sort.
- Preserve selection as a workspace mechanism while bulk mutation remains unavailable.
- Keep family and scope controls visible and server/projection-backed.
- The active desktop renderer no longer uses density modes or the private signal/KPI/rail composition. Legacy unreachable source remains scheduled for mechanical deletion before checkpoint commit.
- Distinguish loading, refetch, failed-empty, degraded, filtered-empty, genuine-empty, and terminal pagination states.

## Mobile target

- Full LIST grammar is active: heading, meaningful KPI strip, SearchRow, adaptive scope groups, stable list rows, detail sheet, and pagination feedback.
- `MobileFeaturedMetric`, `MobileSecondaryMetricRail`, `MobileMetricRow`, average-price billboard language, and floating metric-card composition are absent from active Pricing mobile source.
- Price values and global/override counts may be shown only with explicit projection scope.
- No create/edit/delete command; no generic pricing FAB while mutation authority is unproved.

## Context target

- Publish and consume whole route context including focused pricing row, summary, filters, family, scope, loading, and failure state.
- No private pricing reads or PageData arrays.
- Canonical panel surfaces and radii, no entrance motion.
- All pricing commands remain visibly unavailable.

## Admission proof

- Focused page contract passes 3/3. Shared estate registration remains pending until the dead desktop branch is removed and navbar-title/filter-control requirements are composed.
- Full mobile LIST grammar passes with zero Pricing warnings.
- Pricing page, desktop workspace, mobile surface, and context panel are admitted to the default UI hardgate; their focused strict-radius run passes.
- Data contract, encoding review, and production build pass.
- Authenticated desktop/mobile rendered proof before admission.
- Backend mutations remain separately blocked until selected-facility receiver and patient quote consequence are proved.
