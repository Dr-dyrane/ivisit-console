# Live Map Operating Contract

> **Status:** Active Map-01 contract, 2026-07-13
> **Scope:** Console Live Map only
> **Authority:** Shared Supabase truth, role-scoped Console projections, then patient-app interaction lessons

## Product Job

Live Map is an operational view over records the signed-in Console actor is already allowed to read. It is
not a patient discovery surface and it must not broaden organization scope to make the canvas look populated.

- Admins monitor authorized active requests, units, facilities, and degraded sources.
- Organization administrators see their organization-scoped operations.
- Providers inspect assigned or otherwise authorized request and facility context.
- Drivers and paramedics focus their positively assigned mission and may share location through the proved RPC.
- Sponsor and viewer roles remain excluded by route policy.

The map owns one selected spatial record. List-style multiple selection does not belong here without a proved
spatial batch command.

## Source And Scope

- `MapContext` starts data only while `/map` is active.
- `supabaseMapService.fetchInitialMapData()` owns the role-scoped emergency, ambulance, and hospital reads.
- Realtime channels invalidate those scoped reads and must be removed on route exit.
- The patient-facing `nearby_hospitals` RPC is not a Console authorization boundary. Live Map must not use it
  to replace the scoped hospital projection.
- Nearby request, hospital, and unit values are local measurements over loaded, authorized rows and must say
  `shown`. They are not exact ecosystem totals.
- Missing coordinates remain missing. The Console does not simulate or offset markers.

## Camera And Location

- Ask for browser location with immediate locating feedback.
- When permission succeeds, frame an approximately 5 km radius around the real coordinate.
- When permission is unavailable or denied, do not label Lagos or another fallback as the user's location.
  Focus the best authorized operational point, then the neutral Lagos default only when no point exists.
- Recenter retries browser location when needed and otherwise honestly centers the operational area.
- Google, Leaflet, and the limited fallback renderer use the same focus and radius contract.
- Google bounds fitting is followed by a deterministic radius-derived zoom because the first bounds call
  can occur before the map div has its final dimensions. Mobile padding preserves the top summary and dock.

The 5 km value is a view lens, not a new data query or authorization rule. Markers outside the initial lens may
remain available through normal map navigation when they are in the actor's authorized projection.

## Routes

- Draw route context only for the selected active emergency, or the driver's positively assigned active mission.
- Ambulance-to-patient is a dashed pickup leg; patient-to-facility is a solid destination leg.
- Label the result as a route preview. Do not claim ETA, traffic confidence, dispatch, or telemetry freshness
  from a geometric connector.
- Google may refine a leg to a road route and fall back to a straight connector. Leaflet renders the connector.
  Both remain previews, not lifecycle proof.
- Interactive map markers expose a meaningful request, ambulance, or hospital name and support Enter/Space;
  they are not anonymous click-only map decoration.

## Loading And Failure

- First entry renders a structural map loading surface, not an empty canvas or a small floating sentence.
- Refresh preserves existing points and shows compact pending feedback.
- A failed source remains visible as degraded/error state; it must not become a successful empty state.
- Google provider failure switches to Leaflet with visible progress. Missing provider configuration uses the
  limited map without manufacturing records.

## Command Boundary

Map selection and camera changes are presentation state. Lifecycle commands retain their existing backend
receivers and role checks until the shared emergency command facade owns payload, legality, pending state,
refresh, and success copy. Modularization must not create a second receiver or a broad fallback write.

## Verification

For every Map-01 change, verify:

1. role-scoped reads and route-owned startup remain unchanged;
2. location granted, denied, unavailable, and retry states are honest;
3. the initial camera uses the same approximately 5 km lens in Google and Leaflet;
4. nearby values say `shown` and use only loaded authorized rows;
5. only one request's route preview is rendered at a time;
6. initial load, refresh, partial failure, empty scope, and provider fallback are visible;
7. desktop rail/panel and mobile sheet/dock remain usable without overlap; and
8. map contract tests, mobile grammar, UI hardgate, the full suite, and the production build pass.
