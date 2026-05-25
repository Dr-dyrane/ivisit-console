# Pass 8 Analytics, Search, Realtime, And Feedback Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, RPC, Edge Function, automation run, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers dashboard analytics, search, search telemetry, preferences/demo mode, trending topics, analytics automation, `PageDataContext`, realtime ownership, route loading, and action feedback.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/components/pages/BentoHome.jsx`
- `frontend/src/components/pages/Overview.jsx`
- `frontend/src/components/navigation/QuickSearch.jsx`
- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/services/analyticsService.js`
- `frontend/src/services/searchService.js`
- `frontend/src/services/searchEventsService.js`
- `frontend/src/services/searchHistoryService.js`
- `frontend/src/services/searchSelectionsService.js`
- `frontend/src/services/preferencesService.js`
- `frontend/src/services/supabaseHelpers.js`
- `frontend/src/services/trendingTopicsService.js`
- `frontend/src/services/analyticsAutomationService.js`

Observed source signals:

- `PageDataContext` initializes with mock emergency, analytics, doctors, visits, verification, and support data.
- `PageDataContext` falls back to mock data on some fetch failures and owns many global realtime channels.
- `Analytics.jsx` contains deterministic fallback/predictive values and role-specific analytics rendering.
- `QuickSearch` uses `searchService.searchAll`, recent searches, trending searches, and record selection.
- `searchEventsService`, `searchHistoryService`, and `searchSelectionsService` exist but are not directly imported by UI.
- `searchSelectionsService` includes privacy comments removing broad access, while search analytics may aggregate behavior.
- `preferencesService` exposes demo mode but is not actively wired.
- `analyticsAutomationService` calls trend update RPCs and reads trending views/history.

## User Flow

Operator path:

1. Land on dashboard/Bento/overview and see truthful summaries.
2. Navigate between routes and receive immediate loading/skeleton feedback.
3. Open analytics and understand live, derived, degraded, or unavailable values.
4. Use QuickSearch and optionally record history/selection/analytics under correct privacy rules.
5. See trends only when they are live or clearly labeled.
6. Realtime updates refresh the correct domain without duplicate fetch storms.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Dashboard server truth | `PageDataContext` owns many domain reads and mock fallbacks. | Domain selectors plus shell summary facade. |
| Mock/demo mode | Failed fetch can fall back to mock-looking data. | Explicit demo mode or degraded empty state. |
| Analytics derivation | Page and service both derive metrics/fallbacks. | Analytics owner with source labels. |
| Search telemetry | QuickSearch records through `searchService`; telemetry services are orphaned. | Search owner with privacy-aware history/event/selection policy. |
| Trending topics | Manual/stub/live signals can blur. | Trend owner with live/manual/stub/unavailable label. |
| Realtime | `PageDataContext` subscribes to many tables globally. | One owner per domain/table family, with map/modal scoped exceptions. |
| Route/action feedback | Some route and action paths can blank or overclaim success. | Shell loading/pending/degraded feedback standard. |

## Implementation Packages

### 1. PageDataContext Reduction

Reduce `PageDataContext` to:

- shell-level summary selectors
- route/navigation support
- optional composition of domain hook outputs
- explicit demo mode only if product-approved

Acceptance gate:

- `PageDataContext` no longer owns durable domain server truth for emergency, visits, doctors, pricing, support, organizations, or analytics.

### 2. Analytics Truth Labels

Analytics outputs must say whether data is:

- live
- derived
- cached
- partial
- degraded
- unavailable
- demo/manual

Acceptance gate:

- Analytics UI does not show deterministic fallback values as production truth.

### 3. Search Telemetry And Privacy

Define policy for:

- search events
- search history
- search selections
- recent searches
- trending searches
- admin aggregate analytics
- user-sensitive detail visibility

Acceptance gate:

- Keep `searchService.js` as QuickSearch's active read/event owner, repair its ambulance projection, and leave separate telemetry CRUD/realtime adapters dormant unless a guarded analytics use case is introduced.
- Admin analytics never expose user-sensitive search history without policy proof.

### 4. Trending And Automation

Classify trend generation:

- RPC-generated
- view-derived
- manual curated
- stub/unavailable
- disabled

Acceptance gate:

- Regeneration actions have pending/failure state and cannot return success for a no-op stub.

### 5. Realtime Ownership

For each table family, define one owner:

- emergency requests/payments
- hospitals/pricing
- visits
- doctors/ambulances/telemetry
- support/subscribers
- organizations/verification
- activity/audit
- search/trending

Acceptance gate:

- Global channels in `PageDataContext` are removed or justified after domain owners exist.

### 6. Loading, Pending, And Route Feedback

Apply console-wide feedback doctrine:

- route skeletons for important routes
- compact table/list skeletons
- row/action pending keys
- disabled duplicate action controls
- backend-confirmed success copy
- degraded/unauthorized empty states

Acceptance gate:

- Navigation and primary commands acknowledge intent immediately without false completion claims.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on dashboard, overview, analytics, quick search, and route transitions.
- Mobile and desktop viewport checks for route skeleton and compact loading states.
- Console error scan after route changes.

Backend/RLS/RPC:

- Analytics query fixture tests where available.
- Search privacy/RLS tests for events, history, selections.
- Trending RPC/view proof before enabling regeneration.
- Realtime subscription count/cleanup smoke.

Stop conditions:

- Do not replace mock fallbacks with new fake values.
- Do not expose user search history broadly.
- Do not refactor all route loading while domain owner passes are still unstable unless route shell is isolated.
