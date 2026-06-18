# App Entry + Layout Layer Audit

> **Status**: AUDIT COMPLETE — Implementation Pending  
> **Date**: 2026-05-04  
> **Scope**: `App.js`, `LayoutContext.jsx`, `NavigationContext.jsx`, `AppShell` (inline), layout-adjacent components  
> **Goal**: Identify all violations before touching any code. No implementation in this pass.

---

## 1. Files in Scope

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `src/App.js` | 202 | ≤ 60 | VIOLATION |
| `src/contexts/LayoutContext.jsx` | 239 | ≤ 250 | BORDERLINE |
| `src/contexts/NavigationContext.jsx` | 56 | ≤ 100 | OK but REDUNDANT |
| `AppShell` (inline in App.js) | ~65 | own file ≤ 150 | VIOLATION |
| `AppLayout` (inline in App.js) | ~14 | own file or absorbed | VIOLATION |
| `PWADebugTracker` (inline in App.js) | ~12 | `src/components/dev/` | VIOLATION |

---

## 2. Violations Found

### 2.1 `App.js` — 4 responsibilities in one file

#### CRITICAL: No `QueryClientProvider`
TanStack Query cannot be used anywhere in the tree. No `@tanstack/react-query` in `package.json`, no provider in root.  
**Location**: `App.js:181-199`

#### CRITICAL: 19 eager page imports
All routes are imported at the top of `App.js` as static imports. Every page's bundle is loaded on first paint regardless of the route the user visits. No code splitting.  
**Location**: `App.js:19-41`  
**Fix**: `React.lazy()` + `<Suspense>` per route.

#### HIGH: `window.innerWidth` read synchronously at render time
```js
// App.js:67
const isMobile = window.innerWidth < 768;
```
Called on every render with no event listener. Stale after resize. SSR-unsafe.

#### HIGH: `window.innerWidth` read inside Framer Motion `animate` prop
```js
// App.js:92, 94
paddingLeft: hideNav ? 0 : (window.innerWidth >= 768 ? sidebarWidth + 48 : 0),
paddingRight: isMobile ? 0 : 48,
```
Framer Motion reads this at animation time, not on resize. Padding is permanently wrong after a viewport change until full remount.

#### HIGH: `AppShell` defined inline in `App.js`
Layout logic (scroll observer, sidebar width math, spring animation, nav visibility) lives directly inside the app entry file. Any change to shell layout requires touching `App.js`.

#### HIGH: `AppLayout`, `AppRoutes`, `AppShell`, `PWADebugTracker` all in one file
Four distinct responsibilities — provider composition, route wiring, shell layout, debug UI — in 202 lines.

#### LOW: `'use client'` directive on line 1
This is a CRA/craco project, not Next.js. The directive is a no-op. Signals copy-paste from Next.js context and creates confusion.

---

### 2.2 `LayoutContext.jsx` — window event bus + redundant state

#### HIGH: `window.addEventListener` for modal coordination
```js
// LayoutContext:95-104
window.addEventListener('modal-opened', handleModalOpen);
window.addEventListener('openUserModal', handleModalOpen);
```
Context panel closure is triggered via DOM events dispatched by unrelated components. Untyped, non-deterministic, no central registry.  
**Fix**: `contextPanelOpenAtom` (Jotai) — any component reads/writes the atom directly.

#### MEDIUM: `Math.random()` for footer `instanceId`
```js
// LayoutContext:218
const instanceId = React.useMemo(() => Math.random().toString(36).substr(2, 9), []);
```
Non-deterministic. Breaks React 18 Strict Mode double-invoke. Each remount generates a new ID that doesn't match the previous one.  
**Fix**: `useId()` (React 18 built-in, stable across renders).

#### LOW: `isFocusMode` is a redundant alias
```js
// LayoutContext:86
const isFocusMode = useMemo(() => isContextPanelOpen, [isContextPanelOpen]);
```
This is just `isContextPanelOpen` with a different name wrapped in `useMemo`. Adds complexity for zero benefit.  
**Fix**: Remove. Consumers use `isContextPanelOpen` directly.

#### LOW: `getInitialMode()` called inline in `useState`
```js
// LayoutContext:33-39
const getInitialMode = () => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sidebarMode');
        return saved && [...].includes(saved) ? saved : 'smart';
    }
    return 'smart';
};
const [sidebarMode, setSidebarModeState] = useState(getInitialMode);
```
Pattern is correct (lazy initialiser). But function is defined inline and recreated conceptually on every render (even though `useState` only calls it once). Should be a module-level constant for clarity.

---

### 2.3 `NavigationContext.jsx` — DRY violation (duplicate of LayoutContext)

#### HIGH: Duplicate breakpoint resize listener
`LayoutContext` has its own `handleResize` tracking `LG_BREAKPOINT=1024` and `XL_BREAKPOINT=1280`.  
`NavigationContext` has its own independent `handleResize` tracking `768` and `1024`.  
Two separate `window.addEventListener('resize', ...)` calls computing overlapping viewport state.

```js
// NavigationContext:20-38
useEffect(() => {
    const handleResize = () => {
        const width = window.innerWidth;
        setIsMobile(width < 768);
        setIsTablet(width >= 768 && width < 1024);
        setIsDesktop(width >= 1024);
        ...
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, []);
```

#### HIGH: Duplicate sidebar state
`NavigationContext` owns `sidebarOpen` (boolean).  
`LayoutContext` owns `sidebarMode` ('smart' | 'collapsed' | 'expanded') + `sidebarWidth`.  
Two independent sources of truth for sidebar open/closed state. They can drift.

#### LOW: `NavigationContext` value object is not memoised
```js
// NavigationContext:40-48
const value = {
    isMobile, isTablet, isDesktop, sidebarOpen, setSidebarOpen, ...
};
```
Plain object literal — new reference every render. All consumers re-render on any state change in the provider.

---

## 3. Sub-Pass Plan

### RULE: One sub-pass at a time. Audit → Plan → Implement → Verify → Next.

---

### Sub-pass A1 — `QueryClientProvider` + install TanStack Query
**Target**: `package.json`, `App.js`  
**What**: Install `@tanstack/react-query` + `@tanstack/react-query-devtools`. Wrap `<Router>` in `<QueryClientProvider>`. Add `<ReactQueryDevtools />` in dev only.  
**Risk**: Zero — purely additive. Nothing existing changes.  
**Files**: `package.json`, `App.js`, `src/lib/queryClient.js` (new)

---

### Sub-pass A2 — Lazy route imports
**Target**: `App.js:19-41`  
**What**: Replace all 19 static page imports with `React.lazy()`. Wrap `<Routes>` in `<Suspense fallback={<PageSkeleton />}>`.  
**Risk**: Low — standard CRA pattern. Verify each route loads on navigation.  
**Files**: `App.js`

---

### Sub-pass A3 — `useBreakpoint` hook
**Target**: New `src/hooks/useBreakpoint.js`  
**What**: Single resize listener returning `{ isMobile, isTablet, isDesktop, isXL }`. Canonical breakpoints as module-level constants.  
**Replaces**: `window.innerWidth` in `App.js:67`, `App.js:92,94`, and the duplicate listeners in `LayoutContext` + `NavigationContext`.  
**Risk**: Low — new file, no existing code touched until consumers are migrated.  
**Files**: `src/hooks/useBreakpoint.js` (new)

---

### Sub-pass A4 — Merge `NavigationContext` into `LayoutContext`
**Target**: `NavigationContext.jsx`, `LayoutContext.jsx`  
**What**:  
- Move `isMobile`, `isTablet`, `isDesktop` into `LayoutContext` (sourced from `useBreakpoint`)  
- Remove duplicate sidebar open state from `NavigationContext`  
- Keep `useNavigation()` as a re-export alias pointing to `useLayout()` — zero consumer blast radius  
- Delete `NavigationContext.jsx` and remove provider from `App.js`  
**Risk**: Medium — all `useNavigation()` consumers must be verified. Re-export alias eliminates import changes.  
**Files**: `LayoutContext.jsx`, `NavigationContext.jsx`, `App.js`

---

### Sub-pass A5 — Extract `AppShell` → `src/layouts/AppShell.jsx`
**Target**: `App.js:63-143`  
**What**: Move `AppShell` + `AppLayout` into dedicated layout files. `App.js` becomes pure: providers → router → routes only.  
**Target line count**: `App.js` ≤ 60 lines after this pass.  
**Files**: `src/layouts/AppShell.jsx` (new), `src/layouts/AppLayout.jsx` (new), `App.js`

---

### Sub-pass A6 — Replace `window.addEventListener` modal events with Jotai atoms
**Target**: `LayoutContext.jsx:95-104`, `SmartHeader.jsx`, all `window.dispatchEvent` callers  
**What**:  
- Create `src/atoms/layoutAtoms.js` with `contextPanelOpenAtom`, `mobileMenuOpenAtom`  
- Remove all `window.addEventListener('modal-opened', ...)` and `window.addEventListener('closeMobileMenu', ...)` listeners  
- Wrap app with Jotai `<Provider>`  
**Risk**: Medium — requires grepping all `window.dispatchEvent` callers across the codebase first  
**Grep target**: `window\.dispatchEvent|window\.addEventListener` in `src/`

---

### Sub-pass A7 — Minor LayoutContext cleanups
**Target**: `LayoutContext.jsx`  
**What**:  
- Replace `Math.random()` instanceId with `useId()`  
- Remove `isFocusMode` alias, expose `isContextPanelOpen` directly  
- Move `getInitialMode` to module-level constant  
- Add `useMemo` to `NavigationContext` value object (interim, before merge)  
**Risk**: Low — isolated to context internals  
**Files**: `LayoutContext.jsx`

---

### Sub-pass A8 — Extract `PWADebugTracker` + remove `'use client'`
**Target**: `App.js:1`, `App.js:51-61`  
**What**:  
- Move `PWADebugTracker` to `src/components/dev/PWADebugTracker.jsx`  
- Remove `'use client'` directive  
- Update version string to read from `package.json` (DRY)  
**Risk**: Zero  
**Files**: `App.js`, `src/components/dev/PWADebugTracker.jsx` (new)

---

## 4. Breakpoint Constant Target (canonical)

```js
// src/hooks/useBreakpoint.js
export const BREAKPOINTS = {
  SM: 640,   // small mobile
  MD: 768,   // mobile/tablet boundary
  LG: 1024,  // tablet/desktop boundary
  XL: 1280,  // desktop/wide boundary
};
```

All `window.innerWidth` comparisons across the codebase must reference these. No magic numbers.

---

## 5. Target State for `App.js`

```jsx
// App.js — target ≤ 60 lines
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PWAProvider>
            <FeedbackProvider>
              <Router>
                <AppRoutes />
                <Toaster position="top-right" richColors />
                <PWADebugTracker />
              </Router>
            </FeedbackProvider>
          </PWAProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

`AppRoutes.jsx` owns: `AuthProvider` + `AppLayout` + all `<Route>` definitions (lazy).  
`AppLayout.jsx` owns: provider composition (`MapProvider`, `PageDataProvider`, `LayoutProvider`).  
`AppShell.jsx` owns: shell layout chrome (header, nav, main, footer, FAB).

---

## 6. Window Event Bus — Full Grep Target

Before Sub-pass A6, these must be catalogued:

| Event name | Dispatcher | Listener | Replacement |
|------------|------------|----------|-------------|
| `modal-opened` | Unknown — grep needed | `LayoutContext` | `contextPanelOpenAtom` |
| `openUserModal` | Unknown — grep needed | `LayoutContext` | `contextPanelOpenAtom` |
| `closeMobileMenu` | Unknown — grep needed | `SmartHeader` | `mobileMenuOpenAtom` |
| `openEmergencyModal` | Unknown — grep needed | `EmergencyRequestsPage` | domain modal atom |
| `openFilters` | Unknown — grep needed | `EmergencyRequestsPage` | `filterSheetOpenAtom` |
| `openAnalyticsModal` | Unknown — grep needed | `EmergencyRequestsPage` | `analyticsModalOpenAtom` |

Full grep: `window\.dispatchEvent\|window\.addEventListener` across `src/` before implementing A6.
