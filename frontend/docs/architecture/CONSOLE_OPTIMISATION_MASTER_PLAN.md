# Console Optimisation Master Plan

> **Status**: PLANNING COMPLETE — No implementation started  
> **Date**: 2026-05-04  
> **Baseline commit**: `e695117` (HEAD → main)  
> **Rollback**: `git checkout e695117 -- <file>` for any file  
> **Ecosystem**: ivisit-console ↔ ivisit-app (end-to-end data contracts must be preserved)

---

## 0. Governing Principles

### Execution Rules
- One sub-pass at a time. Audit → Plan → Implement → Verify → Next.
- Every implementation pass is surgical: minimum diff, maximum isolation.
- No implementation without a rollback commit hash documented.
- No `useEffect` for data fetching — ever. All server data lives in TanStack Query.
- Favour deterministic over eventually-consistent. Race conditions are architectural failures.
- All breakpoints via `useBreakpoint` hook. Zero raw `window.innerWidth` reads.
- All window event bus patterns replaced before new features are added.
- ivisit-app data contracts (service types, status enums, field names) must not change.

### Implementation Order (non-negotiable)
```
app entry → providers → layout → contexts → hooks → UI
```
Reason: each layer depends on the layer above. Foundation must be correct before building on it.

### 5-Layer State Architecture (target)

| Layer | Technology | Owner | What goes here |
|-------|-----------|-------|----------------|
| L1 | Supabase Realtime | `supabase` client | Live inserts/updates/deletes from DB |
| L2 | TanStack Query | `src/hooks/queries/` | All server data, loading, error, caching |
| L3 | Zustand | `src/stores/` | Persistent client state (view prefs, sidebar mode) |
| L4 | XState | `src/machines/` | Multi-step lifecycle (onboarding, verification flow) |
| L5 | Jotai | `src/atoms/` | Ephemeral UI state (modal open, filter open, menu open) |

**Rule**: If it comes from the server → L2. If it persists across sessions → L3. If it drives a flow with steps → L4. If it's transient UI → L5. Never mix layers.

---

## 1. Baseline Snapshot

### Commit Reference
```
e695117  HEAD → main  "Sync supabase scripts from ivisit-app with README index"
87ae38d  "add emergency contacts"
e8d815f  "fix: normalize mojibake and text encodings"
```

**Before any pass begins**: Record the current commit hash in the pass log. That hash is the rollback target.

---

## 2. Current Architecture Map (ground truth)

### Provider Tree (as-is in App.js)
```
<ErrorBoundary>
  <ThemeProvider>                    ← L3 candidate (theme = persistent pref)
    <PWAProvider>                    ← OK, composition only
      <FeedbackProvider>             ← L5 candidate (haptic/sound = ephemeral)
        <Router>
          <AuthProvider>             ← CORRECT: auth is global, owns session
            <MapProvider>            ← VIOLATION: fetches data in context
              <PageDataProvider>     ← VIOLATION: god context, 14 domain fetches
                <NavigationProvider> ← VIOLATION: duplicate of LayoutContext
                  <LayoutProvider>   ← OK: layout state, needs breakpoint fix
                    <AppShell>       ← VIOLATION: inline in App.js
```

### Data Flow (as-is)
```
Supabase DB
  ↓ direct supabase client calls (no service abstraction in some hooks)
Services (src/services/) ← CLEAN: pure async functions, no React state
  ↓
God hooks (useHospitals, useEmergency, useVisits...) ← useState + useCallback, no cache
  ↓
PageDataContext ← god context pulling all 14 domains, exposes refreshAllData
  ↓
Pages ← ALSO directly fetch their own data (dual data path = non-determinism)
  ↓
UI Components
```

### State Owners (as-is)

| State | Current Owner | Correct Layer | Action |
|-------|--------------|---------------|--------|
| Auth session / profile | `AuthContext` | L2 (session) + L3 (profile) | Keep, minor cleanup |
| Theme (dark/light) | `ThemeContext` useState + useEffect | L3 Zustand | Migrate |
| Sidebar mode | `LayoutContext` useState + localStorage | L3 Zustand | Migrate |
| View mode (grid/list) | `useViewMode` useState + localStorage | L3 Zustand | Migrate |
| Sidebar open | `NavigationContext` useState | Merge into L3 | Merge + delete |
| isMobile/isTablet/isDesktop | `NavigationContext` + `LayoutContext` | `useBreakpoint` hook | Deduplicate |
| Map data (emergencies, ambulances, hospitals) | `MapContext` useState + useEffect | L2 TanStack Query | Migrate |
| All domain data | `PageDataContext` useState + useEffect | L2 TanStack Query | Decompose |
| Modal open state | `window.dispatchEvent` / local useState | L5 Jotai | Replace |
| Filter open state | `window.dispatchEvent` / local useState | L5 Jotai | Replace |
| PWA install/update | `PWAContext` via `usePWA` | OK, keep | Minor review |
| Haptic/sound feedback | `FeedbackContext` | HYBRID — keep as context | `FeedbackContext` renders animated JSX overlay (halo/sheen canvas) directly inside the provider. Cannot be a pure Jotai atom. Trigger function (`triggerFeedback`) can be exposed as a stable ref via atom but the provider itself stays. Do not migrate. |

---

## 3. Window Event Bus — Full Catalogue

Must be fully catalogued and replaced BEFORE touching any context. Events dispatched via `window.dispatchEvent`:

| Event | Dispatcher (TBD — grep) | Listener | Replacement atom |
|-------|------------------------|----------|-----------------|
| `modal-opened` | grep needed | `LayoutContext` | `contextPanelOpenAtom` |
| `openUserModal` | grep needed | `LayoutContext` | `contextPanelOpenAtom` |
| `closeMobileMenu` | grep needed | `SmartHeader` | `mobileMenuOpenAtom` |
| `recenter-map` | `MapContext.recenterMap()` | `GodModeMap` (assumed) | `recenterMapAtom` |
| `openEmergencyModal` | grep needed | `EmergencyRequestsPage` | `emergencyModalAtom` |
| `openFilters` | grep needed | `EmergencyRequestsPage` | `filterSheetOpenAtom` |
| `openAnalyticsModal` | grep needed | `EmergencyRequestsPage` | `analyticsModalOpenAtom` |

**Grep command for implementation**:
```bash
grep -r "window\.dispatchEvent\|window\.addEventListener" src/ --include="*.jsx" --include="*.js" -l
```

---

## 4. Pass Plan

### LAYER 0 — Foundation (app entry + tooling)

---

#### Pass A1 — Install TanStack Query + QueryClientProvider
**Rollback**: `e695117`  
**Risk**: Zero — purely additive  
**Files**: `package.json`, `src/lib/queryClient.js` (new), `App.js`  
**What**:
- `npm install @tanstack/react-query @tanstack/react-query-devtools`
- Create `src/lib/queryClient.js` with `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })`
- Wrap root in `<QueryClientProvider client={queryClient}>`
- Add `<ReactQueryDevtools />` in dev only
- Verify: open app, no errors, devtools panel visible

---

#### Pass A2 — Install Zustand + Jotai
**Rollback**: post-A1 commit  
**Risk**: Zero — purely additive  
**Files**: `package.json`, `src/stores/` (new dir), `src/atoms/` (new dir)  
**What**:
- `npm install zustand jotai`
- Create `src/stores/.gitkeep`, `src/atoms/.gitkeep` (placeholder dirs)
- No migration yet — foundation only
- Verify: app builds clean

---

#### Pass A3 — Lazy route imports + Suspense
**Rollback**: post-A2 commit  
**Risk**: Low — standard CRA pattern  
**Files**: `App.js`  
**What**:
- Convert all 19 static page imports to `React.lazy()`
- Wrap `<Routes>` in `<Suspense fallback={<PageSkeleton />}>`
- Verify: each route loads on navigation, no blank screens

---

#### Pass A4 — Extract AppShell + AppRoutes + AppLayout
**Rollback**: post-A3 commit  
**Risk**: Low — pure file move, no logic change  
**Files**: `App.js`, `src/layouts/AppShell.jsx` (new), `src/layouts/AppLayout.jsx` (new), `src/routes/AppRoutes.jsx` (new)  
**What**:
- Move `AppShell` component → `src/layouts/AppShell.jsx`
- Move `AppLayout` component → `src/layouts/AppLayout.jsx`
- Move `AppRoutes` + all `<Route>` definitions → `src/routes/AppRoutes.jsx`
- Move `PWADebugTracker` → `src/components/dev/PWADebugTracker.jsx`
- Remove `'use client'` from `App.js`
- `App.js` becomes ≤ 50 lines: providers + `<Router>` + `<AppRoutes>`
- Verify: all routes work, shell layout unchanged

---

### LAYER 1 — Breakpoints + Responsive

---

#### Pass B1 — Canonicalise `useBreakpoint` hook
**Rollback**: post-A4 commit  
**Risk**: Low — hook already exists at `src/hooks/useBreakpoint.js` (42 lines), upgrade only  
**Files**: `src/hooks/useBreakpoint.js`  
**What**:
- Hook exists and is correct (`useState` + `useEffect` with resize listener — correct pattern for layout-reactive reads)
- Add named export `BREAKPOINTS = { SM: 640, MD: 768, LG: 1024, XL: 1280 }` as module-level constant
- Add `isXL: width >= 1280` to return value
- This is the ONLY source of breakpoint truth — `NavigationContext` and `LayoutContext` both duplicate it (see B3)
- Verify: existing consumers unchanged (backwards compatible add-only change)

---

#### Pass B2 — Fix `window.innerWidth` in `AppShell`
**Rollback**: post-B1 commit  
**Risk**: Low  
**Files**: `src/layouts/AppShell.jsx`  
**What**:
- Replace `const isMobile = window.innerWidth < 768` with `const { isMobile } = useBreakpoint()`
- Replace `window.innerWidth >= 768` in Framer Motion `animate` prop with reactive `isMobile` value
- Padding is now driven by reactive state, not a stale read
- Verify: resize viewport, padding updates correctly

---

#### Pass B3 — Merge `NavigationContext` into `LayoutContext`
**Rollback**: post-B2 commit  
**Risk**: Medium — consumer grep required first  
**Pre-requisite**: Grep all `useNavigation()` call sites  
**Files**: `src/contexts/LayoutContext.jsx`, `src/contexts/NavigationContext.jsx`, `App.js`  
**What**:
- Source `isMobile`, `isTablet`, `isDesktop` from `useBreakpoint()` inside `LayoutContext`
- Expose on `LayoutContext` value
- Keep `useNavigation` as re-export: `export const useNavigation = useLayout` — zero consumer changes
- Remove `NavigationProvider` from `App.js`
- Delete `NavigationContext.jsx`
- Verify: all `useNavigation()` call sites still work

---

### LAYER 2 — Persistent State (Zustand)

---

#### Pass C1 — Theme store
**Rollback**: post-B3 commit  
**Risk**: Low  
**Files**: `src/stores/themeStore.js` (new), `src/contexts/ThemeContext.jsx`  
**What**:
- Create Zustand store: `useThemeStore` with `theme`, `setTheme`, `toggle`
- Persist via `zustand/middleware` `persist` with `localStorage` key `'theme'`
- `ThemeContext` becomes a thin wrapper that reads from `useThemeStore` (backwards compatible — all `useTheme()` call sites unchanged)
- The `useEffect(() => { document.documentElement.classList... }, [theme])` DOM side-effect MUST stay — it is a legitimate DOM mutation effect, not a data fetch. Move it into a `ThemeSync` component rendered once inside `App.js`, or keep it inside `ThemeProvider`. Either is correct.
- Do NOT attempt to put the DOM mutation inside Zustand subscribe — that makes the side-effect invisible and hard to debug
- Verify: theme toggles, class applied to `<html>`, persists on reload

---

#### Pass C2 — Sidebar + layout preferences store
**Rollback**: post-C1 commit  
**Risk**: Low  
**Files**: `src/stores/layoutStore.js` (new), `src/contexts/LayoutContext.jsx`  
**What**:
- Create Zustand store: `useLayoutStore` with `sidebarMode`, `setSidebarMode`
- Persist with `localStorage` key `'sidebarMode'`
- Remove `localStorage.getItem/setItem` from `LayoutContext` — reads from store instead
- Verify: sidebar mode persists, responsive override still works

---

#### Pass C3 — View mode store
**Rollback**: post-C2 commit  
**Risk**: Low  
**Files**: `src/stores/viewModeStore.js` (new), `src/hooks/useViewMode.js`  
**What**:
- Current `useViewMode` uses `useState + useEffect + localStorage` — L3 violation
- Create Zustand store with `record<pageKey, viewMode>` shape
- `useViewMode(pageKey)` becomes a selector into the store
- Remove `useEffect` from `useViewMode`
- Verify: view mode persists per page key

---

### LAYER 3 — Ephemeral UI State (Jotai)

---

#### Pass D0 — Add Jotai `<Provider>` to root
**Rollback**: post-C3 commit  
**Risk**: Zero — purely additive  
**Files**: `App.js`  
**What**:
- Import `{ Provider }` from `jotai`
- Wrap root inside `<Provider>`. Jotai works without Provider (uses a default store) but explicit Provider is required for SSR safety and testability
- No atoms created yet — this is just the mount point
- Verify: app builds, no errors

---

#### Pass D1 — Layout atoms (replace window event bus — layout)
**Rollback**: post-D0 commit  
**Risk**: Medium — requires full window event bus grep  
**Pre-requisite**: D0 complete (Jotai Provider mounted). Run window event bus grep, document all callers.  
**Files**: `src/atoms/layoutAtoms.js` (new), `src/contexts/LayoutContext.jsx`, `src/components/navigation/SmartHeader.jsx`, all dispatchers  
**What**:
- Create `contextPanelOpenAtom`, `mobileMenuOpenAtom` in `layoutAtoms.js`
- Replace `window.addEventListener('modal-opened', ...)` in `LayoutContext` → read `contextPanelOpenAtom`
- Replace `window.addEventListener('closeMobileMenu', ...)` in `SmartHeader` → read `mobileMenuOpenAtom`
- Replace all `window.dispatchEvent(new CustomEvent('modal-opened'))` → `set(contextPanelOpenAtom, false)`
- Verify: context panel closes on modal open, mobile menu closes on nav action

---

#### Pass D2 — Domain modal atoms (replace window event bus — pages)
**Rollback**: post-D1 commit  
**Risk**: Medium  
**Files**: `src/atoms/emergencyAtoms.js` (new), `src/components/pages/EmergencyRequestsPage.jsx`, all dispatchers  
**What**:
- Create `emergencyModalOpenAtom`, `filterSheetOpenAtom`, `analyticsModalOpenAtom`
- Replace all `window.addEventListener`/`window.dispatchEvent` patterns in `EmergencyRequestsPage`
- Replace `window.dispatchEvent(new CustomEvent('recenter-map'))` in `MapContext` with `recenterMapAtom`
- Verify: modals open/close deterministically

---

### LAYER 4 — Server Cache (TanStack Query)

---

#### Pass E1 — First query hook: emergency requests
**Rollback**: post-D2 commit  
**Risk**: Low — additive, page can fall back  
**Files**: `src/hooks/queries/useEmergencyRequestsQuery.js` (new)  
**What**:
- Wrap `getEmergencyRequests` from `emergencyService` in `useQuery`
- Query key: `['emergency-requests', { role, hospitalId, filters }]`
- Used by `EmergencyRequestsPage` — removes its inline `useState + useEffect` fetch
- `PageDataContext` continues to serve other consumers until decomposed
- Verify: emergency page loads data, stale-while-revalidate works

---

#### Pass E2 — Decompose `PageDataContext` — one domain at a time
**Rollback**: post-E1 commit  
**Risk**: High — requires careful consumer audit per domain  
**Order** (safest to riskiest based on consumer count):
1. `useOrganizationsQuery` → `getOrganizations`
2. `usePricingQuery` → `getPricing`
3. `useInsuranceQuery` → `getInsurancePolicies`
4. `useVerificationQuery` → `getVerificationStats`
5. `useActivityQuery` → `getRecentActivity`
6. `useAnalyticsQuery` → `getAnalyticsData`
7. `useAmbulancesQuery` → `getAmbulances`
8. `useHospitalsQuery` → `getHospitals`
9. `useDoctorsQuery` → `getDoctors`
10. `useVisitsQuery` → `getVisits`
11. `useProfilesQuery` → `getProfiles`
12. `useSupportTicketsQuery` → `getSupportTickets`
13. `useEmergencyQuery` (full) → merge with E1
14. **Delete `PageDataContext`** — final step when all consumers migrated

Each domain: create hook → migrate consumers → remove from PageDataContext → verify.

---

#### Pass E3 — Migrate `MapContext` to TanStack Query
**Rollback**: post-E2 commit  
**Risk**: Medium  
**Files**: `src/hooks/queries/useMapDataQuery.js` (new), `src/contexts/MapContext.jsx`  
**What**:
- `useQuery` for initial map data fetch (replaces `initializeMapData` useEffect)
- Supabase Realtime subscriptions (L1) stay in `MapContext` — correct owner for live updates
- `MapContext` becomes composition only: query result + realtime updates merged
- `recenterMap` uses `recenterMapAtom` (set in D2) instead of `window.dispatchEvent`
- Verify: map loads, realtime updates arrive, recenter works

---

#### Pass E4 — Migrate god hooks to query hooks
**Rollback**: post-E3 commit  
**Risk**: Medium per hook  
**Target hooks** (all use useState + useCallback, no cache):
- `useHospitals.js` → `useHospitalsQuery.js`
- `useEmergency.js` → merged into `useEmergencyRequestsQuery.js`
- `useVisits.js` → `useVisitsQuery.js`
- `useAmbulances.js` → `useAmbulancesQuery.js`
- `useProfiles.js` → `useProfilesQuery.js`
- `useAnalytics.js` → `useAnalyticsQuery.js`
- `useAdmin.js` → `useAdminQuery.js`
- `useActivity.js` → `useActivityQuery.js`
- `useInsurance.js` → `useInsuranceQuery.js`
- `useSupportTickets.js` → `useSupportTicketsQuery.js`
- `useHealthNews.js` → `useHealthNewsQuery.js`
- `useSubscription.js` → `useSubscriptionQuery.js`

Pattern per hook:
```js
// src/hooks/queries/useHospitalsQuery.js
export const useHospitalsQuery = (filters) => useQuery({
  queryKey: ['hospitals', filters],
  queryFn: () => getHospitals(filters),
  staleTime: 30_000,
});

export const useCreateHospital = () => useMutation({
  mutationFn: createHospital,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hospitals'] }),
});
```

---

### LAYER 5 — XState (future pass)

---

#### Pass F1 — Identify state machine candidates
**Status**: Audit only for now  
**Candidates**:
- Onboarding flow (`OnboardingContext.jsx` — 17kb, multi-step)
- Verification queue flow (multi-status transitions)
- Emergency request lifecycle (pending → dispatched → completed → cancelled)

**Rule**: XState only when a flow has named terminal states AND must survive remount. Not every form needs a machine.

---

### LAYER 6 — Page Decomposition

---

#### Pass G1 — `EmergencyRequestsPage` decomposition
**Rollback**: post-E4 commit  
**Risk**: High — 1,253 lines, most complex page  
**Pre-requisite**: All E passes complete (query hook ready, atoms ready)  
**Target structure**:
```
EmergencyRequestsPage.jsx          ← ≤ 100 lines, composition only
  useEmergencyPageController.js    ← orchestration hook (filters, pagination, sort, selection)
  EmergencyRequestsTable.jsx       ← table UI only
  EmergencyRequestsHeader.jsx      ← header + actions
  EmergencyFiltersSheet.jsx        ← filter panel
  EmergencyRequestModal.jsx        ← detail modal (already exists, verify)
```

---

#### Pass G2 — Remaining page monoliths
Apply same decomposition pattern to other large pages. Priority by size:
1. `OnboardingPage` (uses `OnboardingContext` 17kb)
2. `HospitalsPage`
3. `VisitsPage`
4. `UsersPage`
5. `AnalyticsPage`

---

### LAYER 7 — Inline mock data removal

---

#### Pass H1 — Remove all inline mock data from `PageDataContext`
**Rollback**: post-G passes  
**What**: `PageDataContext` has `mockEmergencyData`, `mockStats`, etc. as fallbacks.  
These must be deleted, not replaced with other fallbacks. Real data or empty state. Never mock data in production code.  
**Verify**: All pages handle empty state gracefully (loading → empty → error).

---

## 5. ivisit-app Ecosystem Alignment

The following contracts must be preserved across all passes:

| Contract | Console side | App side | Risk if broken |
|----------|-------------|----------|----------------|
| `service_type` enum | `emergency_requests.service_type` | `serviceType` in booking flow | App bookings won't appear in console |
| `status` enum | Filter logic in `EmergencyRequestsPage` | Trip lifecycle in XState machine | Console shows wrong status |
| `patient_snapshot` shape | Display in emergency table | Written by app on booking | Console can't show patient info |
| Supabase Realtime channel names | `supabaseMapService` subscriptions | App subscriptions | Realtime events cross-pollinate |
| `profiles` table fields | `useProfiles`, `UsersPage` | Auth profile in `AuthContext` | Profile display breaks |

**Rule**: Any service file change must be cross-checked against `ivisit-app/src/services/` equivalent.

---

## 6. Audit Documents Index

| Document | Status |
|----------|--------|
| `APP_ENTRY_LAYOUT_AUDIT.md` | COMPLETE |
| `PROVIDERS_AUDIT.md` | COMPLETE |
| `CONTEXTS_AUDIT.md` | PENDING |
| `HOOKS_AUDIT.md` | PENDING |
| `PAGES_AUDIT.md` | PENDING |

> **NOTE on pass labels**: This master plan uses letter groups (A, B, C…) for pass categories. `APP_ENTRY_LAYOUT_AUDIT.md` uses A1–A8 sub-labels for the same entry/layout layer. The audit doc labels are more granular. During implementation, use **this master plan** as the authority on pass identity and order. The audit doc is reference only.

---

## 7. Sub-pass Execution Log

| Pass | Status | Rollback commit | Notes |
|------|--------|----------------|-------|
| A1 — TanStack Query install | PENDING | `e695117` | — |
| A2 — Zustand + Jotai install | PENDING | TBD | — |
| A3 — Lazy route imports | PENDING | TBD | — |
| A4 — Extract AppShell/AppRoutes | PENDING | TBD | — |
| B1 — Canonicalise useBreakpoint | PENDING | TBD | Hook already exists |
| B2 — Fix window.innerWidth in AppShell | PENDING | TBD | — |
| B3 — Merge NavigationContext | PENDING | TBD | Consumer grep required first |
| C1 — Theme store (Zustand) | PENDING | TBD | — |
| C2 — Sidebar prefs store | PENDING | TBD | — |
| C3 — View mode store | PENDING | TBD | — |
| D1 — Layout atoms (Jotai) | PENDING | TBD | Window bus grep required |
| D2 — Domain modal atoms | PENDING | TBD | — |
| E1 — First query hook (emergency) | PENDING | TBD | — |
| E2 — Decompose PageDataContext | PENDING | TBD | 14 domains, one at a time |
| E3 — Migrate MapContext | PENDING | TBD | — |
| E4 — Migrate god hooks | PENDING | TBD | 12 hooks |
| F1 — XState audit | PENDING | TBD | Audit only |
| G1 — EmergencyRequestsPage decompose | PENDING | TBD | Requires E passes complete |
| G2 — Remaining pages | PENDING | TBD | — |
| H1 — Remove mock data | PENDING | TBD | — |
