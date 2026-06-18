# Providers Layer Audit

> **Status**: AUDIT COMPLETE — Implementation Pending  
> **Date**: 2026-05-04  
> **Baseline commit**: `e695117`  
> **Scope**: All 7 React context providers mounted in `App.js`  
> **Method**: Full source read of each provider. No implementation in this pass.

---

## 1. Provider Tree (as-is)

```
<ErrorBoundary>                        ← not a context, boundary only
  <ThemeProvider>                      ← 32 lines
    <PWAProvider>                      ← 52 lines
      <FeedbackProvider>               ← 281 lines
        <Router>
          <AuthProvider>               ← 444 lines
            <MapProvider>              ← 134 lines
              <PageDataProvider>       ← 1,039 lines  ← CRITICAL
                <NavigationProvider>   ← 56 lines     ← VIOLATION (duplicate)
                  <LayoutProvider>     ← 239 lines
                    <AppShell />
```

**Nesting depth**: 8 levels before any route renders. Target: ≤ 5.  
**Total context provider code**: ~2,277 lines across 7 files.

---

## 2. Provider-by-Provider Findings

---

### P1 — `ThemeProvider` (`ThemeContext.jsx` — 32 lines)

**Verdict**: NEAR-CORRECT. Minor violation.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | `useState` + `useEffect` for `localStorage` → Zustand `persist` middleware | LOW |
| 2 | `useEffect` applies `classList` to `document.documentElement` — this is a **legitimate DOM side-effect**, not a fetch | CORRECT (keep) |
| 3 | Context value object `{ theme, setTheme, toggle, toggleTheme: toggle }` is not memoised — new ref every render | LOW |
| 4 | `toggleTheme` is an alias of `toggle` on the same object — DRY violation | LOW |

**Target state**: Zustand `useThemeStore` with `persist`. `ThemeContext` becomes a thin shim for backwards compat. `useEffect` for DOM mutation stays (moves to `ThemeSync` component or stays in provider). Context value wrapped in `useMemo`.

---

### P2 — `PWAProvider` (`PWAContext.jsx` — 52 lines)

**Verdict**: CLEAN architecture. Minor issues only.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | `'use client'` directive on line 1 — CRA project, no-op | LOW |
| 2 | Provider renders UI directly (`<OfflineIndicator>`, `<InstallPrompt>`, `<UpdateNotification>`) — these are shell-level concerns, not context values | MEDIUM |
| 3 | `<InstallPrompt onDismiss={() => { }}` — inline empty handler is a new function reference every render | LOW |

**Root hook `usePWA.js` (173 lines)**:
- 3 separate `useEffect` blocks for: install prompt, online/offline, service worker updates
- These are all **legitimate browser event listeners** — correct use of effects
- `useState(navigator.onLine)` — unsafe initialisation. `navigator` is undefined in SSR/test envs. Should be `useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)`
- No violations of the 5-layer architecture — PWA state is purely browser-environment state, not server data

**Target state**: Provider stays. Move `<OfflineIndicator>`, `<InstallPrompt>`, `<UpdateNotification>` into `AppShell` — they're UI, not context. Provider only wraps children and provides context value. Fix `navigator.onLine` initialisation.

---

### P3 — `FeedbackProvider` (`FeedbackContext.jsx` — 281 lines)

**Verdict**: HYBRID — correct classification, no migration needed.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | `window.__ivisitLastHapticAt` used as a global mutable variable for haptic debounce — should be a `useRef` inside the provider | MEDIUM |
| 2 | Burst `id` uses `Math.random()` — non-deterministic, fails Strict Mode double-invoke | LOW |
| 3 | `setTimeout` inside `triggerFeedback` without cleanup — if provider unmounts before timeout, dangling timer. Should use `useRef` + cancel on unmount | MEDIUM |
| 4 | `triggerFeedback` reads `window.innerWidth/Height` synchronously — stale if viewport changes mid-burst | LOW |
| 5 | Provider renders animated JSX overlay (22-particle burst system) directly in provider body — correctly identified as HYBRID | CORRECT (keep) |

**Target state**: Provider stays. Fix:
- Replace `window.__ivisitLastHapticAt` with `useRef`
- Replace `Math.random()` id with `useId()` + counter ref
- Collect `setTimeout` handles in a `useRef<Set>` and clear on unmount

---

### P4 — `AuthProvider` (`AuthContext.jsx` — 444 lines)

**Verdict**: ARCHITECTURALLY CORRECT but has specific violations.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | **Hardcoded email `halodyrane@gmail.com`** with auto-elevation to `admin` role — production code should never contain hardcoded privileged emails | CRITICAL |
| 2 | `fetchProfile` is a plain `async function` (not `useCallback`) — referenced inside a `useEffect`. Technically safe because it's defined in the same component scope, but it should be a `useCallback` for clarity and to survive potential future dep changes | LOW |
| 3 | `signIn`, `signUp` are plain functions not wrapped in `useCallback` — they appear in the `useMemo` dependency array but are recreated every render anyway (they close over stable refs only, so the memoisation is still useful but fragile) | LOW |
| 4 | Role check functions (`isAdmin`, `isOrgAdmin`...) are `useCallback` wrapping `useCallback` — `isAdmin = useCallback(() => hasRole('admin'), [hasRole])` — double wrapping adds no value. `hasRole` is already stable. Direct `useMemo` bool would be cleaner | LOW |
| 5 | `localStorage.removeItem('supabase.auth.token')` in `signOut` — Supabase v2 does not use this key. Dead code, misleading | LOW |
| 6 | `initializing` and `loading` are two separate booleans for overlapping states — creates potential inconsistency. `initializing` gates the skeleton render; `loading` gates downstream consumers. They are set independently in multiple branches | MEDIUM |
| 7 | `fetchProfile` called from both `checkInitialSession` AND `onAuthStateChange` — guarded by `activeFetchRef` but the guard is based on `userId` equality, not a boolean in-flight flag. If the same user triggers two auth events rapidly (e.g. token refresh), the second call is silently dropped without logging | LOW |
| 8 | `DynamicAuthSkeleton` rendered directly inside `AuthProvider` — provider renders UI, not just data | MEDIUM |

**ivisit-app alignment note**: The `ROLE_HIERARCHY` order (`admin > org_admin > sponsor > provider > viewer`) must match the app's RBAC checks. The `can()` function logic and role strings must be kept in sync with the app's backend RLS policies.

**Target state**: 
- Move hardcoded email to `REACT_APP_SUPER_ADMIN_EMAIL` env var
- Extract `DynamicAuthSkeleton` render out of provider, into a `<AuthGate>` wrapper component
- Merge `initializing` + `loading` into a single `authState: 'initializing' | 'loading' | 'ready'`
- Profile query (`fetchProfile`) → `useQuery` with `enabled: !!userId` after TanStack Query is installed (Pass E)

---

### P5 — `MapProvider` (`MapContext.jsx` — 134 lines)

**Verdict**: LAYER VIOLATION — fetches server data inside a context.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | `useState` + `useEffect` fetching 3 domain datasets (emergencies, ambulances, hospitals) — classic L2 violation | CRITICAL |
| 2 | `initializeMapData` is a `useCallback` that calls an async service and sets state — this is a query in disguise | CRITICAL |
| 3 | 3 separate Supabase Realtime subscriptions inside the same `useEffect` — subscriptions are L1 (correct), but they trigger full re-fetches (`setMapData`) instead of incremental updates | HIGH |
| 4 | `window.dispatchEvent(new CustomEvent('recenter-map'))` in `recenterMap()` — window event bus (confirmed entry in the bus catalogue) | HIGH |
| 5 | `value` object (`toggleLayer`, `setFilter`, `setSelectedMarker`, `refresh`, `recenterMap`) created as plain object literal every render — no `useMemo` | MEDIUM |
| 6 | `setMapData` exposed directly on context value — consumers can set arbitrary map state without going through typed actions | LOW |
| 7 | `loading: true` as initial state inside `mapData` object — loading is mixed with data. TanStack Query separates these automatically | MEDIUM |
| 8 | Realtime handlers do full list replacement for UPDATE/DELETE — non-atomic, race condition if two events arrive simultaneously | MEDIUM |

**Target state**: 
- Initial fetch → `useMapDataQuery` (TanStack Query, Pass E3)
- Realtime subscriptions stay in `MapContext` (L1 is correct owner for live updates)
- `MapContext` becomes: receive query result + apply realtime deltas, expose typed actions
- `recenterMap` → write `recenterMapAtom` (Jotai, Pass D2)
- `setMapData` removed from context value
- Context value wrapped in `useMemo`

---

### P6 — `PageDataProvider` (`PageDataContext.jsx` — 1,039 lines)

**Verdict**: CRITICAL VIOLATION — this is the primary architectural problem in the entire codebase.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | **14 domain data slices in one context** — all fetched on auth, held in `useState`, exposed globally | CRITICAL |
| 2 | **14 separate `useCallback` fetch functions** — every one is `useState + useCallback(async)` = 14 queries in disguise | CRITICAL |
| 3 | **8 Supabase Realtime `useEffect` subscriptions** — each one calls the corresponding `fetchX` function on any DB change → full re-fetch of the entire domain on any row change | CRITICAL |
| 4 | **Inline mock data** (`mockEmergencyData`, `mockAnalyticsData`, etc.) — 6 mock objects defined at module level as production fallbacks. Mock data must not ship in production | HIGH |
| 5 | **`useMockData` toggle** — a boolean that switches between real and mock data at runtime. This pattern is a source of non-determinism and makes testing unreliable | HIGH |
| 6 | **`setPageLoading(true)` inside every individual fetch** — a single `loading` boolean controls 14 concurrent fetches. Result: any one fetch sets loading=true, any one finishing sets loading=false. State is incoherent mid-fetch | HIGH |
| 7 | **`fetchWalletData` calls `supabase` client directly** — bypasses the service layer entirely (`supabaseMapService`, `walletService`) | MEDIUM |
| 8 | **`refreshAllData` calls 11 of 14 fetch functions in parallel** — not all 14, which means some domains silently go stale on manual refresh (pricing and organizations omitted) | MEDIUM |
| 9 | **`verificationStats` `useMemo`** — applies array filter on `verificationData` which is sometimes an object `{ pending, approved, ... }` not an array. Has defensive `Array.isArray` check but the shape mismatch indicates the data contract is unstable | MEDIUM |
| 10 | **Double `useMemo`** — `dataValue`, `methodsValue`, then a third `value = useMemo(() => ({ ...dataValue, ...methodsValue }))` — 3 memo levels for one context value, all still cause full consumer re-renders when any single domain updates | MEDIUM |
| 11 | **Dual data path** — pages also fetch their own data independently (confirmed in `EmergencyRequestsPage` audit). `PageDataContext` and page-level fetches are not coordinated, they race each other | CRITICAL |
| 12 | **`fetchOrganizationsData` and `fetchPricingData` omitted from `refreshAllData`** | LOW |

**ivisit-app alignment note**: The `service_type` enum values (`ambulance`, `bed`, `critical_care`, `emergency_room`) used in `fetchEmergencyData` MUST match the app's booking service types exactly. Any change to this mapping breaks the console dashboard counts.

**Target state**: **Delete entirely** after all 14 domains are migrated to `src/hooks/queries/`. Migration order defined in master plan Pass E2 (safest → riskiest). No replacement context — consumers call their own query hooks directly.

---

### P7 — `NavigationProvider` (`NavigationContext.jsx` — 56 lines)

**Verdict**: VIOLATION — duplicate of `LayoutContext`, should be deleted.

| # | Violation | Severity |
|---|-----------|----------|
| 1 | Duplicate `handleResize` listener — `LayoutContext` already has one | HIGH |
| 2 | `sidebarOpen` boolean duplicates `LayoutContext.sidebarMode` | HIGH |
| 3 | Context value is a plain object literal — new reference every render, all consumers re-render on any state change | MEDIUM |
| 4 | `isMobile/isTablet/isDesktop` already computed in `useBreakpoint` hook | HIGH |

**Target state**: Merge into `LayoutContext`. `useNavigation()` becomes a re-export alias of `useLayout()`. Delete file. (Master plan Pass B3)

---

## 3. Priority Violation Summary

| Provider | Size | Severity | Action |
|----------|------|----------|--------|
| `PageDataProvider` | 1,039 lines | CRITICAL | Decompose → 14 query hooks |
| `MapProvider` | 134 lines | CRITICAL | Migrate fetch → TanStack Query |
| `AuthProvider` | 444 lines | HIGH | Fix hardcoded email, merge loading states, extract skeleton |
| `NavigationProvider` | 56 lines | HIGH | Delete → merge into LayoutContext |
| `FeedbackProvider` | 281 lines | MEDIUM | Fix global mutable ref, timeout cleanup |
| `ThemeProvider` | 32 lines | LOW | Migrate to Zustand persist |
| `PWAProvider` | 52 lines | LOW | Move UI out of provider |

---

## 4. Provider Ordering Issues

Current nesting order has two problems:

**Problem 1**: `MapProvider` is inside `AuthProvider` — correct, map data requires auth.  
**Problem 2**: `PageDataProvider` is inside `MapProvider` — wrong. Page data and map data are siblings, not parent-child. `PageDataProvider` has no dependency on `MapProvider`. This creates unnecessary coupling.

**Problem 3**: `NavigationProvider` is inside `PageDataProvider` — completely wrong. Layout/navigation has no dependency on page data.

**Target provider tree** (post-migration):
```
<ErrorBoundary>
  <QueryClientProvider>          ← NEW: L2 foundation
    <Provider>                   ← NEW: Jotai root
      <ThemeProvider>            ← L3 thin shim (reads Zustand)
        <PWAProvider>            ← browser env state, no data
          <FeedbackProvider>     ← HYBRID: UI overlay + trigger
            <Router>
              <AuthProvider>     ← session + profile
                <LayoutProvider> ← layout prefs + breakpoints (absorbs Navigation)
                  <AppShell />   ← shell chrome
```

No `MapProvider` at root. Map data via `useMapDataQuery` inside `GodModeMap` only.  
No `PageDataProvider`. All page data via per-domain query hooks.  
No `NavigationProvider`. Merged into `LayoutProvider`.

Nesting depth: **7 → 5** (excluding Router and ErrorBoundary which are structural not data).

---

## 5. ivisit-app Ecosystem Contracts (must not break)

| Contract | Console location | App location | Risk |
|----------|-----------------|--------------|------|
| `service_type` enum | `PageDataContext:184-188` | App booking flow | CRITICAL — dashboard counts |
| `status` enum values | `PageDataContext:189-194`, `MapContext:62-70` | Trip lifecycle | CRITICAL — realtime updates |
| `profiles.role` strings | `AuthContext:20-26` (ROLE_HIERARCHY) | App auth | HIGH — RBAC |
| `patient_snapshot` shape | `PageDataContext:emergencyData.recent` | App booking write | MEDIUM |
| Supabase channel names | `PageDataContext:661` `'emergency_changes'` etc. | App realtime | LOW — independent channels |

---

## 6. Implementation Sequence (from master plan)

These provider fixes map to master plan passes as follows:

| Provider | Master Plan Pass | Pre-requisite |
|----------|-----------------|---------------|
| `NavigationProvider` | B3 — Merge into LayoutContext | B1 (useBreakpoint) |
| `ThemeProvider` | C1 — Theme store | A2 (Zustand installed) |
| `PWAProvider` | Minor cleanup | A4 (AppShell extracted) |
| `FeedbackProvider` | Minor cleanup | No deps |
| `AuthProvider` | Partial cleanup | No deps (hardcoded email fix is urgent) |
| `MapProvider` | E3 — Migrate to TanStack Query | A1 (QueryClient) |
| `PageDataProvider` | E2 — Decompose (14 domains) | E1 (first query hook working) |

---

## 7. Urgent Fix Outside Pass Sequence

**`AuthProvider` line 82–91**: Hardcoded `halodyrane@gmail.com` auto-elevation to `admin` is a **security violation** in production code. This must be fixed before any deployment, regardless of pass order.

```js
// CURRENT — VIOLATION
if (email === 'halodyrane@gmail.com' && data.role !== 'admin') {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
}

// TARGET — read from env var
const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL;
if (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL && data.role !== 'admin') {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
}
```

**This is a one-line fix that should be done immediately**, independent of any optimisation pass.
