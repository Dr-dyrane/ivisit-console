# iVisit Console — Grand Refactor Plan

> **Status**: ACTIVE - staged, contract-first modularization
> **Current baseline**: `98418462` (`main`, 2026-07-13)
> **Active implementation branch**: `codex/rbac-fab-map-usability`
> **Original audit date**: 2026-05-04
> **Standard**: iVisit-app Gold Standard (5-Layer State Architecture)  
> **Goal**: Make ivisit-console/frontend deterministic, production-grade, and architecturally consistent with ivisit-app.

---

## 0. Active Modularization Contract (2026-07-13)

This section is the current execution authority. The 2026-05-04 audit below remains useful historical
evidence, but its package, provider, line-count, and implementation-status claims are stale unless they
are restated here or reverified against the current tree.

### Scope and behavior boundary

- The program covers all production code under `frontend/src`, one independently verifiable slice at a time.
- Modularization must preserve rendered UI, responsive behavior, route behavior, RBAC, data acquisition,
  pagination, realtime cleanup, loading/error/empty semantics, command payloads, and backend receivers.
- The only behavior changes approved for the first slice are:
  1. complete role-aware mobile FAB coverage on every protected route a role can reach; and
  2. improve Live Map loading, location-first framing, nearby context, and already-proved route polylines.
- Desktop action ownership does not change in the first slice. Route-owned desktop actions remain in the
  navbar/page header or context panel; the generic desktop FAB stays suppressed where the page gate requires it.
- Refactoring is not authority to enable parked writes, broaden a Supabase query, change a payload, add a
  fallback identity, manufacture data, or reinterpret a partial projection as complete.

### Baseline proof

At `98418462`, the repository checkpoint passed 91 Jest suites / 629 tests, the production build, data
contract and database-type checks, mobile grammar, and the UI hardgates. Every work pack must preserve
that baseline in addition to its focused characterization tests.

### Current-tree inventory

The 2026-07-13 active worktree contains 400 hand-maintained implementation files under `frontend/src`,
95,288 lines, and 54 files at or above 500 lines when `*.test.*`, `*.contract.test.*`, and generated
`src/types/database.ts` are excluded. The generated database type file is an input to contracts, not a
manual modularization target.

The highest-risk page owners are Requests (1,984 lines), Support (1,614), Bento/Today dashboard (1,502),
Payments (1,448), Hospitals (1,426), Approvals (1,334), Visits (1,274), Today home (1,176), Users (1,148),
Ambulances (1,018), Organizations (1,010), Doctors (1,010), and Health News (1,002). The next tier is
Analytics (701), Insurance (694), Live Map after the first extraction (636), and Subscriptions (609).

The highest-risk service owners are `emergencyService.js` (1,235), `profilesService.js` (925),
`visitsService.js` (880), `ambulancesService.js` (835), `hospitalsService.js` (731),
`insuranceService.js` (722), `supportTicketsService.js` (701), `subscriptionService.js` (696), and
`walletService.js` (673). Shared owners that require their own packs are `AuthContext.jsx` (926),
`PageDataContext.jsx` (607), and `ContextPanel.jsx` (566).

Priority is based on behavioral density and import blast radius, not line count alone. Generated types,
small stable primitives, and files whose only split would add indirection remain in scope for audit but
are changed only when a pack proves a real ownership boundary.

### Per-pack extraction protocol

1. Read the relevant page gate, service-alignment contract, current source, and Git history.
2. Record public exports, props, route events, context values, query keys, Supabase/RPC/Edge receivers,
   realtime cleanup, and visible loading/error/empty/action states before moving code.
3. Add or strengthen characterization tests before extraction when behavior is not already locked.
4. Extract one ownership boundary. Do not mix cleanup, redesign, schema work, and unrelated naming changes.
5. Keep compatibility exports during migration so other packs can land independently.
6. Run focused tests and touched-file UI/data/encoding gates, then the full suite and production build.
7. Record changed paths, proof, and the next unclaimed pack here before handoff.

### Parallel contribution rules

- A contributor claims exactly one unclaimed work pack and lists its write paths before editing.
- No two active packs may edit the same page, context, service, shared navigation owner, or contract test.
- Shared primitives are separate packs. A page pack consumes them only after their pack is merged.
- If an extraction exposes a behavior defect, stop and classify it. Preserve it for a pure modularization
  pack, or move the fix into a separately approved behavior pack with its own proof.
- Do not mark a pack complete from line-count reduction. It is complete only when behavior and data-owner
  contracts pass at the new boundary.

### Active work-pack ledger

| Pack | Scope | Reserved write paths | Status / owner | Required proof |
|---|---|---|---|---|
| `MOD-00` | Rebaseline this plan and rank current monoliths/duplication | This document only | Complete - current session | Current-tree inventory, Git-backed priorities, disjoint follow-on packs |
| `NAV-01` | Extract the mobile route-action matrix and close RBAC FAB gaps | `src/components/navigation/DynamicBottomBar.jsx`, `src/config/routeActionOwnership.js`, new route-action module, directly related navigation contracts | Complete - current session | All role/route pairs reachable through `routes.jsx` resolve one honest mobile action; desktop ownership unchanged |
| `MAP-01` | Extract map projection/location/presentation boundaries and improve the approved map UX | `src/components/pages/GodModeMap.jsx`, `src/components/mobile/MobileMap.jsx`, `src/components/map/**`, `src/contexts/MapContext.jsx`, `src/services/supabaseMapService.js`, map contracts | Complete - current session | Scoped reads stay authoritative; honest location fallback; approximately 5 km view lens; shown-only nearby context; selected/assigned route preview; structural loading; renderer parity; existing receivers and realtime cleanup preserved |
| `TEST-00` | Add a reusable role/route render-characterization harness | New `src/test/route-contract/**`, test utilities, and harness contracts only | Unclaimed; may run beside page audits | Route mount, provider wrapper, role fixture, loading/error/empty capture, action receiver spy, no production behavior |
| `APP-01` | Extract `AppRoutes`, `AppLayout`, and `AppShell` without provider/order changes | `src/App.js` plus new `src/app/**` modules and app-shell contracts | Unclaimed; do not overlap `NAV-01` | Provider order, lazy routes, protected-route metadata, shell chrome, startup overlay, and global modal mounts unchanged |
| `CTX-01` | Split `PageDataContext` compatibility facade by domain without changing its public value contract | `src/contexts/PageDataContext.jsx`, new domain context/query adapters, PageData contracts | Unclaimed | Consumer key inventory, route startup domains, query cancellation, exact loading/error semantics, no duplicate reads |
| `CTX-02` | Decompose route context-panel dispatch/render ownership | `src/components/navigation/ContextPanel.jsx`, new context-panel registry/modules, panel contracts | Unclaimed; start after `NAV-01` | Same route-to-panel mapping, lazy reads, modal closure, focused-record context, and panel actions |
| `PAGE-01` | Decompose `EmergencyRequestsPage` after `NAV-01` | Requests page/mobile/workspace/controller files and Requests contracts only | Unclaimed; blocked by `NAV-01` | Today/Requests canon, role commands, selection, pagination, realtime, modal/filter/stats behavior, payloads |
| `PAGE-02` | Decompose `SupportTicketsPage` without service or visual changes | Support page/mobile/workspace/controller files and Support contracts only | Unclaimed | Role scope, list/search/filter/pagination, selection, ticket modal commands, loading/error/realtime behavior |
| `PAGE-03` | Decompose Hospitals page orchestration | Hospitals page/mobile/view/workspace files and Hospitals contracts; excludes services/modals | Unclaimed | Scoped projection, selection, pagination, context, loading/error/empty, existing update/unavailable commands |
| `PAGE-04` | Decompose Payments page orchestration | Wallet page/mobile/workspace/view files and Payments contracts; excludes services/modals | Unclaimed | Finance source states, tabs/deep links, selection, context, balance privacy, read-only/unavailable actions |
| `PAGE-05` | Decompose Visits page orchestration | Visits page/mobile/view/workspace files and Visits contracts; excludes services/modals | Unclaimed | Derived visit evidence, pagination, selection, context, modal/read-only boundaries, role scope |
| `PAGE-06` | Decompose Approvals page orchestration | Verification page/mobile/workspace files and Approvals contracts; excludes services/modals | Unclaimed | Queue axes, review receiver, selection, pagination, focused evidence, pending/refetch behavior |
| `PAGE-07` | Separate Bento composition from Today route orchestration | `BentoHome.jsx`, `TodayHome.jsx`, Today-only children and contracts | Unclaimed; after `NAV-01` and `CTX-01` | Role cards, next action, refresh, route context, loading/degraded states, no command relocation |
| `PAGE-08` | Decompose Users page orchestration | Users page/mobile/view/workspace files and Users contracts; excludes Auth/services/modals | Unclaimed | Identity scope, selection, filters, focused record, unavailable invite/delete authority, no broad reads |
| `PAGE-09` | Decompose Ambulances page orchestration | Ambulances page/mobile/view/workspace files and Ambulances contracts; excludes services/modals | Unclaimed | Fleet scope, selection, create/update receiver parity, filters, pagination, context, realtime behavior |
| `PAGE-10` | Decompose Doctors page orchestration | Doctors page/mobile/view/workspace files and Staff contracts; excludes services/modals | Unclaimed | Staff role scope, selection, create/edit receiver parity, filters, context, loading/error behavior |
| `PAGE-11` | Decompose Organizations page orchestration | Organizations page/mobile/view/workspace files and Organizations contracts; excludes services/modals | Unclaimed | Server projection, selection, wallet evidence scope, focused detail, blocked writes, route context |
| `PAGE-12` | Decompose Health News page orchestration | Health News page/mobile/view/workspace files and News contracts; excludes services/modals | Unclaimed | Read-only authority, no mobile multiselect, filters, pagination, analytics, focused evidence |
| `PAGE-13` | Decompose Analytics composition | Analytics page plus `components/pages/analytics/**` and Analytics contracts | Unclaimed | Window/source readiness, role-gated slices, no synthetic metrics, context detail, loading/degraded states |
| `PAGE-14` | Decompose Insurance composition | Insurance page plus `components/pages/insurance/**`, mobile/view files, and Insurance contracts | Unclaimed | Read-only policy/billing split, selection, source readiness, filters, context, no writer enablement |
| `PAGE-15` | Decompose Subscriptions composition | Subscription page/mobile/view/workspace files and Subscriptions contracts | Unclaimed | Subscriber projection, selection, lifecycle/type separation, stats action, blocked email/write commands |
| `PAGE-16` | Decompose Pricing composition | Pricing page/mobile/view/workspace files and Pricing contracts | Unclaimed | Facility/global scope, selection, tabs, stats action, blocked writes, loading/error/empty states |
| `PAGE-17` | Decompose Settings composition | Settings page/mobile/section files and Settings contracts | Unclaimed | Own-user vs system scope, modal z-index, security/support/session receivers, unavailable billing |
| `AUTH-01` | Split Auth context state, profile projection, capability helpers, and effects behind the current facade | `src/contexts/AuthContext.jsx`, new auth modules, Auth contracts | Unclaimed; after `APP-01` characterization | Identical context value, session sequencing, profile/provider subtype, capability checks, redirects/errors |
| `SRV-01` | Split emergency service read projection, normalization, and command adapters | `src/services/emergencyService.js`, new emergency service modules, service tests | Unclaimed; after `PAGE-01` characterization | Identical exports/payloads/errors/query scope; no change to workflow RPC ownership |
| `SRV-02` | Split profile/identity reads and normalization | `src/services/profilesService.js`, new profile service modules, service tests | Unclaimed; coordinate with `AUTH-01` | Identical role/org/profile identity, search/count scope, errors, and compatibility exports |
| `SRV-03` | Split visits service by read, normalization, and proved commands | `src/services/visitsService.js`, new visit service modules/tests | Unclaimed; after `PAGE-05` characterization | Request-derived evidence and receiver ownership unchanged |
| `SRV-04` | Split ambulance service by fleet reads and proved commands | `src/services/ambulancesService.js`, new ambulance service modules/tests | Unclaimed; after `PAGE-09` characterization | Organization scope, payload allow-list, errors, realtime/invalidation unchanged |
| `SRV-05` | Split hospital service by projections, normalization, and proved update command | `src/services/hospitalsService.js`, new hospital service modules/tests | Unclaimed; after `PAGE-03` characterization | Facility identity, counts/capacity scope, RPC authority, compatibility exports unchanged |
| `SRV-06` | Split insurance service while preserving fail-closed writers | `src/services/insuranceService.js`, new insurance service modules/tests | Unclaimed; after `PAGE-14` characterization | Policy/billing reads, parser shapes, RLS errors, disabled command behavior unchanged |
| `SRV-07` | Split support service read/realtime/command ownership | `src/services/supportTicketsService.js`, new support service modules/tests | Unclaimed; after `PAGE-02` characterization | Ticket scope, pagination/counts, payloads, subscriptions, errors unchanged |
| `SRV-08` | Split subscription service read/email/write boundaries | `src/services/subscriptionService.js`, new subscription service modules/tests | Unclaimed; after `PAGE-15` characterization | Read projection unchanged; unproved email/write paths remain fail-closed |
| `SRV-09` | Split wallet service read/finance-command boundaries | `src/services/walletService.js`, new wallet service modules/tests | Unclaimed; after `PAGE-04` characterization | Ledger/balance scope, money normalization, payment receivers, errors unchanged |
| `SRV-10` | Split pricing service projections from blocked command inventory | `src/services/pricingService.js`, new pricing service modules/tests | Unclaimed; after `PAGE-16` characterization | Rule scope, fallbacks, parsers, errors, and fail-closed writes unchanged |
| `SHELL-01` | Decompose remaining shared navigation/shell components | Shell/navigation files not reserved by `APP-01`, `NAV-01`, or `CTX-02`; shell contracts | Unclaimed; after those packs | Shared chrome, safe areas, action ownership, panel/modal relationships, responsive behavior unchanged |
| `UI-01` | Inventory and consolidate duplicate UI primitives | `src/components/ui/**` only | Unclaimed; after page characterization | Public props/classes/ARIA and rendered tokens preserved; no page redesign |
| `RUNTIME-01` | Audit and split remaining large hooks/providers by existing ownership | Unclaimed hooks/contexts plus focused contracts, excluding Auth/PageData/Map | Unclaimed | No startup fanout, duplicate reads, subscription leaks, or public context changes |
| `STYLE-01` | Consolidate token/style duplication after component extraction | `src/styles/**`, Tailwind config, style contracts | Unclaimed; late program | Computed colors/radii/elevation/responsive layout unchanged |
| `DEAD-01` | Remove proved-unreachable compatibility code and stale exports | Paths named by completed-pack import proof only | Unclaimed; final program pass | `rg` importer proof, build/test parity, no generated type edits, no speculative deletion |

The ranked full-repository pack inventory is completed by `MOD-00`; later packs must be appended here,
not tracked in a conflicting refactor document.

### First-slice close proof

- Full Jest: 93 suites / 650 tests passed.
- Production build: database-type encoding, mojibake, data contract, 133-root/306-reachable UI hardgate,
  34-file mobile grammar with zero warnings, and optimized CRA compilation passed.
- Rendered mobile proof at 390 x 844: Google camera settled at zoom 12 around the operational focus,
  5 km area summary rendered 9 shown requests / 4 shown hospitals, the request sheet cleared the bottom
  island, the fourth main tab was Statistics, and Organizations/Subscriptions/Pricing/Analytics/Settings/
  Map each rendered exactly one route-owned FAB.
- Rendered desktop proof at 1280 x 720: the same focus/radius contract rendered, the summary and controls
  remained clear, document width equalled viewport width, and no fresh warning/error logs appeared after
  a clean reload.
- No schema, migration, Edge Function, command payload, workflow receiver, desktop action owner, or
  generated database type was changed by this slice.

---

## 1. Executive Audit Summary

The console is a React 18 + TailwindCSS + CRA (Create React App via craco) web app that serves as the admin/ops dashboard for the iVisit platform. It is functional but **non-deterministic** — meaning CRUD operations, data loads, and UI state do not reliably reflect server truth. The root causes are architectural.

**Important: what IS working correctly:**
- `AuthContext.jsx` (444 lines) — auth subscription, session check, profile fetch, and `loading=false` sequencing are correctly implemented. The `initializing` flag and `DynamicAuthSkeleton` guard are solid. No race condition found.
- Realtime subscriptions in `PageDataContext` and pages have proper cleanup (`return () => supabase.removeChannel(channel)`).
- `useMemo` is used correctly for derived stats (`emergencyStats`, `verificationStats`, `insuranceStats`).
- Service layer is cleanly separated — pure async functions, no React state leakage.

### Critical Violations Found

| # | Violation | Ground Truth | Severity |
|---|-----------|--------------|----------|
| 1 | **`useEffect` used for ALL data fetching** — primary source of race conditions and stale UI. `fetchRequests` in `EmergencyRequestsPage` is a `useCallback` wrapping full Supabase query logic, called from `useEffect`. Filter/sort/pagination changes retrigger the entire fetch with no dedup, no cache, no retry | Confirmed — `EmergencyRequestsPage.jsx:219` | CRITICAL |
| 2 | **Dual data path creates non-determinism** — `PageDataContext` fetches all domain data on mount AND individual pages re-fetch their own data independently. Two sources of truth for the same table, no coordination. A realtime event fires `fetchRequests` (page) AND `fetchEmergencyData` (context) simultaneously | Confirmed — `PageDataContext:628` + `EmergencyRequestsPage:219` | CRITICAL |
| 3 | **`PageDataContext` is a 1,039-line god context** — fires 14 independent fetches on mount, manages 14 independent `useState` slices, holds mock data objects as module-level constants, exposes `refreshAllData` as escape hatch | Confirmed — `PageDataContext:627-653` | CRITICAL |
| 4 | **No TanStack Query installed** — `package.json` has no `@tanstack/react-query` dependency. `hooks/queries/` dir exists but is empty. The planned server cache layer was never started | Confirmed — `package.json` | CRITICAL |
| 5 | **Page monoliths** — `Analytics.jsx` = 108KB, `BentoHome.jsx` = 76KB, `UsersPage.jsx` = 57KB, `EmergencyRequestsPage.jsx` = 59KB (1,253 lines). Each page owns: fetch logic, filter state, modal state, sort state, pagination state, row selection state, layout, and UI components | Confirmed — file sizes | CRITICAL |
| 6 | **God hooks are fetch-wrappers, not query hooks** — `useHospitals.js`, `useEmergency.js`, `useVisits.js` are manual `useState`+`useCallback` wrappers over service calls. No caching, no stale-while-revalidate, no dedup. Each mount fetches fresh | Confirmed — `useHospitals.js:20-219`, `useEmergency.js:24-307` | HIGH |
| 7 | **`window.addEventListener` used for cross-component communication** — `EmergencyRequestsPage` listens for `openEmergencyModal`, `openFilters`, `openAnalyticsModal` via DOM events. This is the ivisit-console equivalent of prop drilling — non-deterministic, untyped, no cleanup guarantee | Confirmed — `EmergencyRequestsPage.jsx:238-250` | HIGH |
| 8 | **Mock data as module-level constants in PageDataContext** — `mockEmergencyData`, `mockAnalyticsData`, `mockDoctorsData` etc. defined at the top of the file. The `useMockData` toggle exposes them to the context value via `mockData:{ emergency, analytics... }`. They are silently the initial state for every widget before real data loads | Confirmed — `PageDataContext.jsx:19-133` | HIGH |
| 9 | **No Zustand** — no persistent client state layer. Role decisions, org context, and UI mode all computed on every render from `AuthContext` `useState` | Confirmed — `package.json` | HIGH |
| 10 | **No Jotai** — all ephemeral UI state (modals, selected rows, filter sheets, sort config, KPI filters, confirmation modals) is `useState` scattered across page files. Cannot share across components without prop drilling | Confirmed — `EmergencyRequestsPage.jsx:89-107` | MEDIUM |
| 11 | **`App.js` has no `QueryClientProvider`** — even if TanStack Query were installed, there is no provider wrapping the tree | Confirmed — `App.js:181-199` | MEDIUM |
| 12 | No barrel exports, services imported directly in pages alongside supabase client calls | Confirmed | LOW |

---

## 2. Gold Standard Target Architecture (adapted from ivisit-app)

```
Server Truth   →  Server Cache     →  Global Client    →  Lifecycle     →  Ephemeral UI
Supabase          TanStack Query       Zustand              (where needed)    Jotai atoms
Realtime          (hooks/queries/)     (stores/)            XState            (atoms/)
subscriptions     stale-while-         role, mode,          modal flows       modal open,
                  revalidate           auth session,        CRUD states       row selection,
                  retry/invalidate     org context                            filter state
```

### Layer Ownership

| Layer | Technology | Console Owns |
|-------|-----------|--------------|
| L1 Server truth | Supabase Realtime | Live emergency requests, ambulance location |
| L2 Server cache | TanStack Query | All CRUD (hospitals, users, visits, etc.) |
| L3 Global client state | Zustand + persist | Auth session, role, org context, UI preferences |
| L4 Lifecycle | Jotai atoms (simplified — no XState needed for console) | CRUD form state, step flows |
| L5 Ephemeral UI | Jotai atoms | Modal open, selected row, filter state, sheet phase |

> Note: XState is not required for the console — there are no complex trip lifecycle state machines. Jotai atoms cover L4 and L5 together for CRUD flows.

---

## 3. File Architecture Targets

### Current vs Target Line Counts

| File | Current | Target | Action |
|------|---------|--------|--------|
| `PageDataContext.jsx` | 1,039 lines | < 150 (thin shell) | MANDATORY DECOMPOSE |
| `Analytics.jsx` | ~2,700 lines | < 500 | MANDATORY DECOMPOSE |
| `BentoHome.jsx` | ~1,900 lines | < 500 | MANDATORY DECOMPOSE |
| `UsersPage.jsx` | ~1,400 lines | < 500 | MANDATORY DECOMPOSE |
| `EmergencyRequestsPage.jsx` | ~1,500 lines | < 500 | MANDATORY DECOMPOSE |
| `AmbulancesPage.jsx` | ~1,000 lines | < 500 | FLAG |
| `VisitsPage.jsx` | ~1,250 lines | < 500 | MANDATORY DECOMPOSE |
| `AuthContext.jsx` | 444 lines | < 200 | REFACTOR |
| `hooks/*.js` (god hooks) | 6–12KB each | < 300 lines each | DECOMPOSE |
| `services/*.js` | 5–22KB each | ≤ 500 lines | AUDIT |

---

## 4. Pass Plan (Ordered by Impact and Safety)

### RULE: Never combine passes. Complete + verify one before starting next.

---

### Pass 1 — Install TanStack Query + QueryClientProvider (FOUNDATION, BLOCKS ALL OTHER PASSES)

**Target**: `package.json`, `src/index.js` or `App.js`  
**Problem**: TanStack Query is not installed at all. `hooks/queries/` is empty. Without this, every subsequent pass is blocked — query hooks have nowhere to land.  
**Steps**:
1. `npm install @tanstack/react-query @tanstack/react-query-devtools`
2. Create `src/lib/queryClient.js` with `QueryClient` instance (staleTime defaults)
3. Wrap `<Router>` in `App.js` with `<QueryClientProvider client={queryClient}>`
4. Add `<ReactQueryDevtools />` in dev only
5. Seed first query hook: `hooks/queries/useEmergencyRequestsQuery.js` as proof of concept

**Files**: `package.json`, `App.js`, `src/lib/queryClient.js`, `hooks/queries/useEmergencyRequestsQuery.js`  
**Risk**: Zero — purely additive. Nothing existing is touched.

---

### Pass 1b — AuthContext Assessment (NO ACTION NEEDED)

**Finding**: `AuthContext.jsx` is correctly implemented. The `initializing` flag gates rendering via `DynamicAuthSkeleton`. Profile fetch uses `activeFetchRef` to prevent concurrent fetches. `loading=false` only fires in `finally` after profile is set. Subscription cleanup is correct.  
**Decision**: Do not touch. The auth layer is sound.

---

### Pass 2 — Eliminate the Dual Data Path in EmergencyRequestsPage

**Target**: `EmergencyRequestsPage.jsx`, `hooks/queries/useEmergencyRequestsQuery.js`  
**Problem**: Both `PageDataContext` AND `EmergencyRequestsPage` fetch from `emergency_requests` independently. A realtime event fires both `fetchEmergencyData` and `fetchRequests` simultaneously — two racing Supabase queries updating two independent state slices.  
**Steps**:
1. Create `hooks/queries/useEmergencyRequestsQuery.js` — paginated, filtered, keyed on `[filters, kpiFilter, pagination, sort]`
2. Replace the `fetchRequests` useCallback + useEffect block in `EmergencyRequestsPage` with `useQuery`
3. Remove `emergencyData` consumption from `PageDataContext` in this page — page owns its own query
4. Realtime event → `queryClient.invalidateQueries(['emergencyRequests'])` instead of calling `fetchRequests` directly
5. `PageDataContext` emergency fetch still runs for BentoHome dashboard stats — that's correct. The page query is separate and keyed independently.

**Pattern**:
```js
export const useEmergencyRequestsQuery = ({ filters, kpiFilter, page, sort }) =>
  useQuery({
    queryKey: ['emergencyRequests', filters, kpiFilter, page, sort],
    queryFn: () => fetchEmergencyRequestsWithPayments({ filters, kpiFilter, page, sort }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
```

**Files**: `EmergencyRequestsPage.jsx`, `hooks/queries/useEmergencyRequestsQuery.js`  
**Risk**: Medium — replaces core fetch logic in the most critical page

---

### Pass 3 — Decompose PageDataContext (God Context Surgery)

**Target**: `src/contexts/PageDataContext.jsx` (1,039 lines → < 150)  
**Problem**: 14 independent `useState`+`useCallback` fetch pairs in one context. Every state update re-renders ALL consumers. Mock data constants live at module level and seed initial state silently.

**Phase 0 — Contract audit**: The context value exposes two memoized objects (`dataValue` + `methodsValue`) merged. List all keys consumed across the codebase before touching anything.

**Phase 1 — Extract mock data**: Move `mock*Data` constants to `src/constants/mockData.js`. Remove `mockData` from context value — consumers should not receive mock data as a value.

**Phase 2 — Convert each domain to a query hook** (one per domain, using TanStack Query from Pass 1):

| Hook | Supabase table(s) | Context slice replaced |
|------|----------|------------------------|
| `hooks/queries/useEmergencyDashboardQuery.js` | `emergency_requests` | `emergencyData`, `emergencyStats` |
| `hooks/queries/useHospitalsQuery.js` | `hospitals` | `hospitalsData` |
| `hooks/queries/useVisitsQuery.js` | `visits` | `visitsData`, `visitsStats` |
| `hooks/queries/useUsersQuery.js` | `profiles` | `userData` |
| `hooks/queries/useAmbulancesQuery.js` | `ambulances` | `ambulancesData` |
| `hooks/queries/useAnalyticsQuery.js` | multiple | `analyticsData` |
| `hooks/queries/useVerificationQuery.js` | `profiles` | `verificationData` |
| `hooks/queries/useSupportTicketsQuery.js` | `support_tickets` | `supportTicketsData` |
| `hooks/queries/useActivityQuery.js` | `user_activity` | `activityData` |
| `hooks/queries/useOrganizationsQuery.js` | `organizations` | `organizationsData` |
| `hooks/queries/useWalletQuery.js` | `ivisit_main_wallet`, `wallet_ledger` | `walletData` |
| `hooks/queries/usePricingQuery.js` | `service_pricing`, `room_pricing` | `servicePricing`, `roomPricing` |
| `hooks/queries/useInsuranceQuery.js` | `insurance_policies` | `insurance`, `insuranceStats` |
| `hooks/queries/useDoctorsQuery.js` | `doctors` | `doctorsData`, `doctorsStats` |

**Phase 3 — Realtime → invalidateQueries**: Replace all `useEffect` realtime channels that call `fetchXxxData` with `queryClient.invalidateQueries([queryKey])` in a single consolidated realtime hook.

**Phase 4 — Thin shell**: `PageDataContext` becomes < 150 lines — only composes query hooks and exposes the same contract keys.

**Files**: `PageDataContext.jsx`, `src/constants/mockData.js`, 14 new query hook files  
**Risk**: Medium-High — all page consumers, must verify contract keys before and after

---

### Pass 4 — Install Zustand + UIPreferencesStore

**Target**: New `src/stores/`  
**Problem**: No persistent client state. View mode, sidebar state, and table preferences reset on every page navigation.  
**Steps**:
1. Install Zustand
2. Create `stores/uiStore.js` — `viewMode`, `sidebarCollapsed`, `tablePageSize`
3. Migrate `useViewMode` hook to read/write from store instead of `localStorage` directly
4. Auth state stays in `AuthContext` — it is correctly implemented and does not need a store migration yet

**Note**: Unlike ivisit-app, `AuthContext` here is NOT a migration target — it is sound. Zustand is needed for UI preferences first.

---

### Pass 5 — Replace `window.addEventListener` Cross-Component Communication with Jotai Atoms

**Target**: All pages using `window.addEventListener('openXxxModal', ...)` pattern  
**Problem**: `EmergencyRequestsPage` (and likely other pages) uses DOM events (`openEmergencyModal`, `openFilters`, `openAnalyticsModal`) for cross-component communication. This is untyped, hard to trace, and non-deterministic.  
**Steps**:
1. Install Jotai, wrap app with `<Provider>`
2. Create `atoms/modalAtoms.js` — `activeModalAtom`, `modalPayloadAtom` per domain
3. Create `atoms/filterAtoms.js` — `filterSheetOpenAtom` per page
4. Replace each `window.dispatchEvent` + `window.addEventListener` pair with atom read/write
5. Remove all `window.addEventListener` modal event listeners from page files

**Grep target**: `window.addEventListener\|window.dispatchEvent` across `src/`

---

### Pass 6 — Decompose Page Monoliths (One at a Time, EmergencyRequestsPage First)

Each page follows the same pattern:

**Anatomy target for each page**:
```
PageName.jsx          (≤ 400 lines — composition only)
  ├── hooks/usePageNameController.js   (data + action orchestration)
  ├── components/pages/pageName/       (UI sub-components)
  │   ├── PageNameTable.jsx
  │   ├── PageNameFilters.jsx
  │   ├── PageNameModal.jsx
  │   └── PageNameStats.jsx
```

**Order** (highest impact first):
1. `EmergencyRequestsPage.jsx` (1,253 lines) — live data, most critical, already partially cleaned by Pass 2
2. `BentoHome.jsx` — dashboard overview, seen most
3. `UsersPage.jsx` — most complex CRUD
4. `VisitsPage.jsx`
5. `Analytics.jsx`
6. Remaining pages

**Anatomy target** for each page:
```
PageName.jsx                 (≤ 400 lines — composition only)
  hooks/usePageNameData.js   (query hook composition + mutations)
  components/pageName/
    PageNameTable.jsx
    PageNameFilters.jsx
    PageNameModal.jsx
    PageNameStatsBar.jsx
```

---

### Pass 7 — Realtime Subscriptions Audit

**Target**: All Supabase realtime channel setup across hooks and pages  
**Problem**: Channels may be opened in multiple places, never cleaned up, or duplicated on re-renders  
**Steps**:
1. Grep all `supabase.channel(` calls
2. Verify cleanup in `useEffect` return
3. Extract into dedicated `hooks/useRealtimeChannel.js` wrapper
4. Wire emergency requests realtime → `queryClient.invalidateQueries(['emergencyRequests'])`

---

### Pass 8 — Codify `process-subscribers` Cron in Migrations

**Target**: `supabase/migrations/`  
**Problem**: Cron schedule configured manually in Supabase dashboard only — not in source control, not reproducible  
**Fix**: Add a `pg_cron` migration so the schedule is version-controlled and deterministic across environments  
**Scope**: This is infrastructure hygiene only — `process-subscribers` and `sendWelcome` edge functions are separate concerns and are already deployed correctly

---

### Pass 9 — Remove Mock Data Fallbacks

**Target**: All `useMockData` toggle patterns  
**Problem**: Mock data silently shadows real DB failures. Non-deterministic behavior masked as working UI.  
**Rule**: Replace mock fallbacks with proper error states and skeleton loaders.  
**Steps**:
1. Remove all inline `mock*Data` constants
2. Replace `useMockData` toggle with proper error handling in query hooks
3. Add skeleton UI for all loading states (layout-bearing → skeletons, inline → spinner)

---

### Pass 10 — Documentation + Guardrails

Create console-specific equivalents of ivisit-app guardrails:
- `docs/CONSOLE_REFACTORING_GUARDRAILS.md`
- `docs/architecture/STATE_ARCHITECTURE.md`

---

## 5. Non-Negotiable Principles (Console Edition)

1. **`useEffect` is for subscriptions, timers, and cleanup ONLY** — this is the single root cause of every race condition in the console.

### ⚡ Quick Reference — The `useEffect` Decision Tree

> Before reaching for `useEffect`, walk this tree top to bottom.
> `useEffect` only wins the **last** branch. In practice: no subscription, no timer → it's wrong.

```
"When X changes, I need Y"
         │
         ▼
Is Y a value derived from X?
  → YES → useMemo / inline const — no hook needed
           Example: filters + data → filteredRows (any table page)

Is Y a ref that mirrors X?
  → YES → assign ref.current = X inline during render, no useEffect
           Example: selectedRowRef = selectedRow

Is Y a machine state with named terminal values (IDLE, LOADING, FAILED…)?
  → YES → Jotai atom (L5)
           Example: modalState, formSubmissionState

Is Y server data triggered by X?
  → YES → TanStack Query with X in queryKey or enabled: Boolean(X)
           Example: useHospitalsQuery enabled on orgId, useVisitsQuery keyed on filters

Is Y a real side-effect — subscription, cleanup, timer, navigation?
  → YES → useEffect is correct here
           Example: Supabase realtime channel setup/teardown
```

**Rule of thumb**: if you are not managing a subscription, timer, or cleanup, `useEffect` is wrong. The violation only surfaces as a bug *later* — stale closure, missed dep, extra render, race condition — never at the point of writing.

2. **Never combine passes** — the console has too many consumers
3. **Backend truth overrides mock data** — remove all inline mock fallbacks
4. **No logic in page files** — pages are composition only
5. **No `useState` for server data** — use query hooks
6. **No `useState` for cross-component values** — use Jotai atoms
7. **Mock data belongs in `constants/mockData.js`** only as dev scaffolding, never production fallback
8. **Auth race conditions must be closed** — `loading=false` means authoritative state, not "async started"
9. **Every Supabase channel must have cleanup** — no orphaned realtime subscriptions
10. **Cron schedules belong in migrations** — not configured manually in dashboard only
11. **Never commit without explicit user permission**

---

## 6. Quick-Win Sequence (Do First)

These can be done without the full pass structure and unblock the most visible issues:

| Quick Win | File | Time |
|-----------|------|------|
| Install TanStack Query + QueryClientProvider | `package.json`, `App.js` | 10 min |
| Move mock data constants out of PageDataContext | `PageDataContext.jsx` → `constants/mockData.js` | 20 min |
| Replace `window.addEventListener` modal events in EmergencyRequestsPage | `EmergencyRequestsPage.jsx` | 30 min |
| Add pg_cron migration for process-subscribers | New migration | 20 min |

---

## 7. File Responsibility Map (Target State)

```
src/
├── App.jsx                    (≤ 100 lines — route wiring only)
├── atoms/                     (NEW — Jotai ephemeral UI atoms)
│   ├── tableAtoms.js
│   ├── modalAtoms.js
│   └── filterAtoms.js
├── stores/                    (NEW — Zustand persistent client state)
│   ├── authStore.js
│   └── uiPreferencesStore.js
├── contexts/                  (THIN shells only)
│   ├── AuthContext.jsx        (≤ 200 lines — composes authStore)
│   └── PageDataContext.jsx    (≤ 150 lines — composes query hooks)
├── hooks/
│   ├── queries/               (TanStack Query — one file per domain)
│   │   ├── useEmergencyRequestsQuery.js
│   │   ├── useHospitalsQuery.js
│   │   └── ... (12 total)
│   └── use*.js                (Behavioral hooks — single responsibility)
├── services/                  (Pure API functions — no state)
├── components/
│   ├── pages/                 (Page composition — ≤ 400 lines each)
│   │   ├── EmergencyRequestsPage.jsx
│   │   └── emergencyRequests/  (Page sub-components)
│   └── ui/                    (Shared primitives)
└── constants/
    └── mockData.js            (Dev scaffolding only — not production fallback)
```

---

**Authored**: 2026-05-04  
**Based on**: iVisit-app Gold Standard (5-Layer State Architecture), REFACTORING_GUARDRAILS.md  
**Next action**: Pass 1 — Fix AuthContext race condition
