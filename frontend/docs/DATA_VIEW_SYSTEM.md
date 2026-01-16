# Data Rendering System: View Modes & Filtering

## Overview

A comprehensive system for ops pages to support multiple view modes (Grid/List/Table), filtering, and persistent user preferences—while maintaining a clean, borderless design.

## Architecture

```
SmartHeader (Navbar)
├── ViewToggle (Desktop only)
├── Filter Button (Always visible)
└── Page Actions

FilterSheet (Modal)
├── Header (with ViewToggle on mobile)
├── Filter Controls
└── Apply/Reset Buttons

Page Level
├── useViewMode Hook (persistence)
├── View Renderers (Grid/List/Table)
└── Data Fetching (filter-aware)
```

## Core Components

### 1. **ViewToggle** — `src/components/common/ViewToggle.jsx`
Toggles between Grid, List, and Table views.

**Props:**
- `value` — Current view mode ('grid' | 'list' | 'table')
- `onChange` — Callback when view changes
- `size` — Icon size ('default' | 'sm' | 'lg')

**Usage:**
```jsx
<ViewToggle value={viewMode} onChange={setViewMode} />
```

---

### 2. **FilterSheet** — `src/components/common/FilterSheet.jsx`
Top-sheet filter panel with Apple-inspired design (borderless, spacing-based hierarchy).

**Props:**
- `isOpen` — Sheet visibility
- `onOpenChange` — Open/close handler
- `filterSchema` — Filter definitions
- `onApply` — Callback when filters applied
- `initialValues` — Current filter state
- `viewToggle` — Optional ViewToggle component (renders on mobile)
- `isMobile` — Device indicator

**Filter Schema Format:**
```javascript
[
  {
    key: 'status',
    type: 'multiselect', // 'multiselect' | 'range' | 'select'
    label: 'Status',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' }
    ]
  },
  {
    key: 'rating',
    type: 'range',
    label: 'Rating',
    min: 0,
    max: 5,
    step: 0.5
  }
]
```

---

### 3. **useViewMode** — `src/hooks/useViewMode.js`
Manages view mode state with localStorage persistence.

**Props:**
- `pageKey` — Unique identifier (e.g., 'ambulances-page')
- `defaultView` — Initial view ('grid' | 'list' | 'table')

**Returns:**
```javascript
{ viewMode, setViewMode }
```

**Usage:**
```jsx
const { viewMode, setViewMode } = useViewMode('ambulances-page', 'grid');
// User preference auto-saved to localStorage
```

---

### 4. **LayoutContext** — Extended
Updated to pass view controls through header.

**usePageHeader** signature:
```javascript
usePageHeader(title, actions, viewToggle, filterButton)
```

---

## View Renderers

### Grid View
Default view—original bento card layout. Rendered inline in page.

### List View — `src/components/views/AmbulanceListView.jsx`
Compact, scrollable list. Mobile-friendly.

**Props:**
```jsx
{
  ambulances,        // Array of items
  onView,            // Handler
  onEdit,            // Handler
  onDelete,          // Handler
  getStatusBadge,    // Status styling function
  isMobile           // Show actions by default on mobile
}
```

### Table View — `src/components/views/AmbulanceTableView.jsx`
Dense tabular layout for comparison & sorting.

**Props:** Same as List View

---

## Implementation Steps for New Pages

### Step 1: Import Core Hooks & Components
```jsx
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { DoctorListView } from '../views/DoctorListView';
import { DoctorTableView } from '../views/DoctorTableView';
```

### Step 2: Add State
```jsx
const { isMobile } = useNavigation();
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
const [filters, setFilters] = useState({});
const { viewMode, setViewMode } = useViewMode('doctors-page', 'grid');
```

### Step 3: Define Filter Schema
```jsx
const filterSchema = React.useMemo(() => [
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' },
      { value: 'off_duty', label: 'Off Duty' }
    ]
  },
  {
    key: 'specialization',
    type: 'multiselect',
    label: 'Specialization',
    options: [
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'neurology', label: 'Neurology' }
    ]
  }
], []);
```

### Step 4: Update Data Fetching
```jsx
const fetchDoctors = useCallback(async () => {
  try {
    setLoading(true);
    
    // Apply filters
    let query = supabase.from('doctors').select('*', { count: 'exact', head: true });
    
    if (filters.status?.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.specialization?.length > 0) {
      query = query.in('specialization', filters.specialization);
    }
    
    const { count } = await query;
    pagination.setTotalCount(count || 0);
    
    // Fetch paginated + filtered data
    let dataQuery = supabase
      .from('doctors')
      .select('*')
      .range(pagination.paginationRange.start, pagination.paginationRange.end)
      .order('created_at', { ascending: false });
    
    if (filters.status?.length > 0) {
      dataQuery = dataQuery.in('status', filters.status);
    }
    if (filters.specialization?.length > 0) {
      dataQuery = dataQuery.in('specialization', filters.specialization);
    }
    
    const { data, error } = await dataQuery;
    if (error) throw error;
    setDoctors(data || []);
  } catch (error) {
    toast.error(error.message || 'Failed to load doctors');
  } finally {
    setLoading(false);
  }
}, [pagination, filters]);
```

### Step 5: Create View Components
```jsx
// Memoize for clean rendering
const viewToggleComponent = React.useMemo(() => (
  <ViewToggle value={viewMode} onChange={setViewMode} />
), [viewMode, setViewMode]);

const filterButtonComponent = React.useMemo(() => (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setFilterSheetOpen(true)}
    className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary"
  >
    <Filter className="h-4 w-4" />
  </Button>
), []);
```

### Step 6: Register with Header
```jsx
usePageHeader(
  "Medical Staff",
  headerActions,
  !isMobile ? viewToggleComponent : null,
  filterButtonComponent
);
```

### Step 7: Render Views
```jsx
{loading ? (
  <TableSkeleton rows={8} />
) : (
  <>
    {viewMode === 'grid' && renderGridView()}
    {viewMode === 'list' && (
      <DoctorListView 
        doctors={doctors} 
        onView={handleView} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        getStatusBadge={getStatusBadge}
        isMobile={isMobile}
      />
    )}
    {viewMode === 'table' && (
      <DoctorTableView 
        doctors={doctors} 
        onView={handleView} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        getStatusBadge={getStatusBadge}
        isMobile={isMobile}
      />
    )}
  </>
)}
```

### Step 8: Render FilterSheet
```jsx
<FilterSheet
  isOpen={filterSheetOpen}
  onOpenChange={setFilterSheetOpen}
  filterSchema={filterSchema}
  onApply={setFilters}
  initialValues={filters}
  viewToggle={isMobile ? viewToggleComponent : null}
  isMobile={isMobile}
/>
```

### Step 9: Create List & Table View Components
Copy `AmbulanceListView.jsx` and `AmbulanceTableView.jsx`, adapt for your data structure (field names, styling).

---

## Mobile Behavior

### Desktop
- ViewToggle + Filter Button in navbar
- Actions visible on hover
- Grid/List/Table selectable

### Mobile
- Filter Button in navbar only
- ViewToggle inside filter sheet header
- Actions always visible (no hover)
- Compact, finger-friendly spacing

### Smart Action Button Hiding
Action buttons automatically hidden on mobile **only if page uses view/filter system**:

```javascript
// SmartHeader automatically handles this:
headerConfig.actions && !(isMobile && (headerConfig.viewToggle || headerConfig.filterSheet))
```

Pages without view/filter system keep their action buttons on mobile.

---

## Design Principles

### Borderless Aesthetic
- No `border-*` classes
- Separation through spacing (`gap-6`, `mb-8`, `space-y-6`)
- Depth via shadow (`shadow-premium` on glass panels)
- Subtle backgrounds (`bg-white/5` on hover)

### Visual Hierarchy
1. **Spacing** — Larger gaps for major sections
2. **Padding** — Rounded padding on interactive elements (`px-3 py-2.5`)
3. **Color** — Muted labels, bright values
4. **Hover states** — Subtle `bg-white/5` on options
5. **Typography** — Uppercase labels, medium body text

### Apple-Inspired Patterns
- Click-outside to close (FilterSheet)
- Spring animations for entrance/exit
- Minimal chrome, maximum content
- Spacing > borders
- Subtle hover feedback

---

## Pages to Integrate

### Status Legend
- ✅ **DONE** — Full Grid/List/Table + Filters + Smart Footer
- ⚠️ **READY FOR DATA VIEW** — Pagination + Smart Footer (awaiting view toggles)
- [ ] **TODO** — Needs implementation

### Integration Roadmap

| Page | Status | Notes |
|------|--------|-------|
| **Ambulances** | ✅ DONE | Full implementation with Grid/List/Table, status filter, persistent view mode |
| **Doctors** | [ ] TODO | Ready to copy Ambulances pattern. Filter by specialization/status |
| **Hospitals** | [ ] TODO | Ready to copy Ambulances pattern. Filter by location/status |
| **Users** | [ ] TODO | Ready to copy Ambulances pattern. Filter by role/verification status |
| **Visits** | [ ] TODO | Ready to copy Ambulances pattern. Filter by status/date |
| **Emergency Requests** | [ ] TODO | Ready to copy Ambulances pattern. Filter by priority/status |
| **Verification Queue** | ⚠️ READY FOR DATA VIEW | Pagination + smart footer added. Needs ViewToggle & List/Table renderers |

---

## Performance Notes

1. **useViewMode** — Zero-cost hook, localStorage saves once on change
2. **Memoization** — ViewToggle/FilterButton memoized to prevent re-renders
3. **Filter Dependencies** — fetchDoctors only re-runs when filters or pagination changes
4. **View Switching** — Instant client-side, no refetch required

---

## Code Examples

### Example: Doctors Page Integration
See `src/components/pages/AmbulancesPage.jsx` for full working example.

Key difference: Adapt `filterSchema` and field selectors for your data model.

### Example: Custom Filter Type
To add new filter type, extend `FilterSheet` renderFilterControl:

```jsx
case 'date_range':
  return (
    <div key={key} className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-3">{label}</p>
      {/* Your date picker component */}
    </div>
  );
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| View preference not persisting | Check `pageKey` is unique per page |
| Mobile actions not visible | Ensure `isMobile={isMobile}` passed to view components |

---

## ⚠️ Common Pitfalls & React Reconciliation

### 1. **useViewMode Hook — Must Use useCallback**

**Problem:** Without `useCallback`, the returned `setViewMode` function is recreated on every render. This causes:
- `viewToggleComponent` (which depends on `setViewMode`) to regenerate
- `usePageHeader` dependencies to change
- Infinite re-render loop: **"Maximum update depth exceeded"**

**Correct Implementation:**
```jsx
import { useState, useEffect, useCallback } from 'react';

export const useViewMode = (pageKey, defaultView = 'grid') => {
  const [viewMode, setViewMode] = useState(defaultView);
  const storageKey = `view-mode-${pageKey}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setViewMode(saved);
    }
  }, [storageKey]);

  // ✅ MUST use useCallback with storageKey dependency
  const handleViewModeChange = useCallback((newMode) => {
    setViewMode(newMode);
    localStorage.setItem(storageKey, newMode);
  }, [storageKey]);

  return {
    viewMode,
    setViewMode: handleViewModeChange,
  };
};
```

**Why:** `useCallback` ensures the function reference stays stable unless `storageKey` changes. This prevents dependency chain breakage.

---

### 2. **FilterSheet Component — Must Import React Hooks**

**Problem:** FilterSheet uses `useState` and `useEffect` but missing imports causes **"ReferenceError: useState is not defined"**.

**Correct Implementation:**
```jsx
// ✅ MUST include React hooks imports at top
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
// ... other imports

export const FilterSheet = ({ isOpen, onOpenChange, filterSchema, onApply, initialValues = {}, viewToggle = null, isMobile = false }) => {
  const [filters, setFilters] = useState(initialValues);
  
  useEffect(() => {
    setFilters(initialValues);
  }, [initialValues]);
  
  // ... rest of component
}
```

---

### 3. **Memoizing Page-Level Components**

**Problem:** In the page component, if view toggle/button aren't memoized, they regenerate on every render, causing `usePageHeader` to retrigger:

```jsx
// ❌ WRONG — Regenerates every render
const viewToggleComponent = (
  <ViewToggle value={viewMode} onChange={setViewMode} />
);

// ✅ CORRECT — Stable reference with correct dependencies
const viewToggleComponent = React.useMemo(() => (
  <ViewToggle value={viewMode} onChange={setViewMode} />
), [viewMode, setViewMode]);
```

**Dependencies:** Must include `viewMode` AND `setViewMode` (the memoized version from `useViewMode`).

---

### 4. **usePageHeader Dependencies Chain**

**Problem:** The effect chain is:
1. `useViewMode` returns `setViewMode`
2. `viewToggleComponent` depends on `setViewMode`
3. `usePageHeader` depends on `viewToggleComponent`

If any step breaks memoization, the chain breaks.

**Solution Checklist:**
- [ ] `useViewMode` returns memoized `setViewMode` with `useCallback`
- [ ] `viewToggleComponent` is wrapped in `React.useMemo` with `[viewMode, setViewMode]`
- [ ] `filterButtonComponent` is wrapped in `React.useMemo`
- [ ] All dependencies passed to `usePageHeader` are stable references
- [ ] `usePageHeader` dependencies array includes all four arguments: `[title, actions, viewToggle, filterButton]`

---

### 5. **FilterSheet onApply Handler**

**Problem:** If `setFilters` callback changes on every render without proper dependency, it can cause issues.

**Solution:**
```jsx
// Define the filter schema with useMemo to keep it stable
const filterSchema = React.useMemo(() => [
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'available', label: 'Available' },
    ]
  }
], []);

// Pass setFilters directly (it's always stable from useState)
<FilterSheet
  isOpen={filterSheetOpen}
  onOpenChange={setFilterSheetOpen}
  filterSchema={filterSchema}
  onApply={setFilters}  // ✅ Direct setState is always stable
  initialValues={filters}
/>
```

---

### 6. **Dependency Array in fetchData**

**Problem:** If `fetchDoctors` dependency array doesn't include `[pagination, filters]`, it won't refetch when filters change.

**Correct Implementation:**
```jsx
const fetchDoctors = useCallback(async () => {
  // ... fetch logic that uses pagination and filters
}, [pagination, filters]); // ✅ Include both

useEffect(() => {
  fetchDoctors();
}, [fetchDoctors, pagination.currentPage]); // ✅ Proper chain
```

---

### Error Diagnosis

If you see **"Maximum update depth exceeded"**:
1. Check `useViewMode` uses `useCallback` ✅
2. Check `FilterSheet` imports `useState`, `useEffect` ✅
3. Check page component memoizes view/filter components ✅
4. Check `usePageHeader` has all 4 args with stable references ✅

If you see **"ReferenceError: X is not defined"**:
1. Check all component imports at the top of file
2. Check FilterSheet has React hook imports
3. Run `npm run build` to catch missing imports

---

## Summary

### Current Implementation Status
- ✅ **Core system complete** — All components, hooks, and contexts finalized
- ✅ **Ambulances page** — Full production reference (Grid/List/Table + Status filter)
- ✅ **Doctors page** — Complete (Grid/List/Table + Status & Specialization filters)
- ✅ **Hospitals page** — Complete (Grid/List/Table + Status filter)
- ✅ **Users page** — Complete (Grid/List/Table + Role filter)
- ✅ **Visits page** — Complete (Grid/List/Table + Status filter)
- ✅ **Emergency Requests page** — Complete (Grid/List/Table + Priority & Status filters)
- ✅ **Verification Queue page** — Complete (Grid/List/Table with stat card filtering)

### What This System Provides
- ✅ Multiple view modes per page (Grid/List/Table)
- ✅ Persistent user preferences (localStorage per page)
- ✅ Flexible filtering (multiselect, range, single-select)
- ✅ Smart pagination with footer integration
- ✅ Mobile-optimized UX (ViewToggle in FilterSheet)
- ✅ Borderless, spacing-based design (Apple aesthetic)
- ✅ Reusable components & hooks (zero duplication)
- ✅ Zero performance overhead (memoization at every level)

### All Pages Implemented
All 6 operational pages now have full Data View System integration with Grid/List/Table toggle functionality and persistent user preferences. The implementation follows a consistent pattern across all pages while respecting each page's specific data model and filtering requirements.
