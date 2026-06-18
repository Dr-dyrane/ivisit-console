# Doctor Page UI/UX Improvements

## Overview
This document outlines the improvements needed to bring the Doctors Page up to the same standard as the Users Page, following the "Gold Standard" patterns established in USER_MANAGEMENT_RBAC.md.

## Current State vs. Target State

### 1. Missing Features from Users Page

#### A. Confirmation Modal (Critical)
- **Current**: Uses native `window.confirm()` for deletions (line 130)
- **Target**: Implement `ConfirmationModal` with professional styling
- **Impact**: Unprofessional UX, no destructive action safeguards

#### B. Bulk Actions & Selection
- **Current**: No bulk selection or actions
- **Target**: 
  - Multi-row selection via checkboxes
  - Floating Action Bar (FAB) for bulk operations
  - Delete multiple doctors at once
  - Clear selection functionality

#### C. Sorting System
- **Current**: No sorting capabilities
- **Target**: 
  - 3-state sorting (Asc/Desc/Reset) on table columns
 - Click header: Asc → Desc → Reset
  - Client-side sorting for performance

#### D. Enhanced Filtering
- **Current**: Basic filters without context awareness
- **Target**:
  - Filter badge indicator when filters are active
  - Context-dependent filters (e.g., subspecialty only when specialty selected)
  - Date range filters with shortcuts (Today/7 Days/30 Days)

#### E. Dropdown Action Menu
- **Current**: Inline action buttons always visible
- **Target**: 
  - Use `MoreHorizontal` dropdown for cleaner UI
  - Actions: View Details, Edit, Delete
  - Consistent with Users Page pattern

### 2. Filter Enhancements

#### Current FilterSchema Issues:
```javascript
// Missing context-dependent filters
// No date range filters
// No inline search reset button
```

#### Target FilterSchema:
```javascript
[
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search doctors...',
    // Add inline X button to clear search
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [...] // Existing options are good
  },
  {
    key: 'specialization',
    type: 'multiselect',
    label: 'Specialization',
    options: [
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'pediatrics', label: 'Pediatrics' },
      { value: 'general', label: 'General Practitioner' },
      { value: 'orthopedics', label: 'Orthopedics' },
      { value: 'dermatology', label: 'Dermatology' },
    ]
  },
  {
    key: 'subspecialty',
    type: 'multiselect',
    label: 'Subspecialty',
    dependsOn: { key: 'specialization', value: ['cardiology', 'neurology'] },
    options: [] // Dynamic based on specialization
  },
  {
    key: 'hospital',
    type: 'select',
    label: 'Hospital',
    options: [] // Fetch from hospitals table
  },
  {
    key: 'experience_range',
    type: 'range',
    label: 'Experience (Years)',
    min: 0,
    max: 50
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Added Date',
    placeholder: 'Select dates',
    // Add shortcuts: Today, 7 Days, 30 Days
  }
]
```

### 3. Table View Improvements

#### A. Missing Columns
- **Current**: Shows basic info only
- **Target**: Add columns for:
  - `created_at` (Joined Date)
  - `experience` (Years)
  - `rating` (if available)
  - Checkbox column for selection

#### B. Sorting Headers
- **Current**: No sort indicators
- **Target**: 
  - Add sort arrows (↑↓) to sortable columns
  - Visual feedback on active sort
  - 3-state cycle

#### C. Action Menu
- **Current**: Inline buttons with visibility on hover
- **Target**: Dropdown menu for actions (cleaner)

### 4. State Management Improvements

#### A. Separate KPI and Sheet Filters
- **Current**: Mixed `kpiFilter` and `filters` states
- **Target**: 
  - Single unified `filters` state object
  - `filters.kpiFilter` for KPI card selections
  - Cleaner filter logic

#### B. Processed Data
- **Current**: Uses raw `doctors` array
- **Target**:
  - `filteredDoctors` - Apply all filters
  - `processedDoctors` - Apply sorting
  - Reset pagination when filters change

### 5. Empty & Error States

#### A. Empty State (Good!)
- **Current**: Has proper empty state with illustration
- **Keep**: Current implementation is solid

#### B. Error State
- **Current**: Only toast notifications
- **Target**: Add error card for persistent failures

### 6. Mobile Optimizations

#### A. FilterSheet Mobile Behavior
- **Current**: Basic drawer
- **Target**:
  - Auto-hide `DynamicBottomBar` when filter sheet opens
  - Improved touch targets
  - Date shortcuts as button grid

### 7. Data Fetching & RBAC

#### A. Current Issues:
- Uses `doctorsService` (good separation)
- RBAC logic present (good)
- No loading states for statistics

#### B. Improvements:
- Add retry logic with `withTimeout`
- Fetch statistics separately for accuracy
- Handle org-scoped queries consistently

## Implementation Checklist

### Phase 1: Foundation
- [x] Add `ConfirmationModal` integration
- [x] Add `selectedIds` state for bulk selection
- [x] Add `sortConfig` state for sorting

### Phase 2: Filtering
- [x] Enhance filter schema with context-aware filters
- [x] Add date range filters with shortcuts
- [x] Add filter badge indicator
- [x] Implement inline search reset

### Phase 3: Table Enhancements
- [x] Add sorting to table headers
- [x] Add selection checkboxes
- [x] Replace inline actions with dropdown menu
- [x] Add missing columns (experience, joined date)

### Phase 4: Bulk Actions
- [x] Implement Floating Action Bar (FAB)
- [x] Add bulk delete functionality
- [x] Add clear selection button
- [x] Ensure proper animations

### Phase 5: State Management
- [x] Unify filter state structure
- [x] Implement `filteredDoctors` and `processedDoctors`
- [x] Auto-reset pagination on filter change

### Phase 6: Polish
- [x] Add loading skeletons for statistics
- [x] Improve error handling and display
- [x] Mobile FilterSheet refinements
- [x] Accessibility improvements (ARIA labels)

## Code Patterns to Follow

### Confirmation Modal Pattern:
```javascript
const [confirmationModal, setConfirmationModal] = useState({
  isOpen: false,
  title: '',
  description: '',
  onConfirm: () => {},
  variant: 'default'
});

const confirmDelete = (doctor) => {
  setConfirmationModal({
    isOpen: true,
    title: 'Delete Doctor',
    description: `Are you sure you want to delete Dr. ${doctor.name}?`,
    variant: 'destructive',
    confirmLabel: 'Delete',
    onConfirm: () => handleDelete(doctor)
  });
};
```

### Bulk Action FAB Pattern:
```javascript
<LayoutGroup>
  {selectedIds.length > 0 && (
    <motion.div
      initial={{ x: 50, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 50, opacity: 0, scale: 0.9 }}
      className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15 backdrop-blur-sm border-0 shadow-none rounded-full"
    >
      {/* Action buttons */}
    </motion.div>
  )}
</LayoutGroup>
```

### Sorting Pattern:
```javascript
const handleSort = useCallback((key) => {
  setSortConfig(prev => {
    if (prev.key === key && prev.direction === 'desc') {
      return { key: '', direction: 'asc' }; // Reset
    }
    return {
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    };
  });
}, []);

const processedDoctors = useMemo(() => {
  let result = [...filteredDoctors];
  if (sortConfig.key) {
    result.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      // ... sorting logic
    });
  }
  return result;
}, [filteredDoctors, sortConfig]);
```

## Testing Checklist

### Functional Tests
- [ ] KPI filter cards update table correctly
- [ ] Multi-select filters work (status, specialization)
- [ ] Date range filter applies correctly
- [ ] Sort cycles through 3 states
- [ ] Bulk selection selects/deselects correctly
- [ ] Bulk delete removes multiple doctors
- [ ] Confirmation modal prevents accidental deletions
- [ ] Filter badge shows when filters are active
- [ ] Pagination resets when filters change

### Mobile Tests
- [ ] FilterSheet opens as bottom drawer
- [ ] Bottom navigation hides when filter sheet opens
- [ ] Touch targets are adequate (min 44x44px)
- [ ] Date shortcuts render as button grid
- [ ] FAB doesn't overlap with bottom nav

### RBAC Tests
- [ ] Platform Admin sees all doctors
- [ ] Org Admin sees only their org's doctors
- [ ] Provider cannot access page (if restricted)

## Success Criteria

The Doctors Page will be considered at "Gold Standard" when:

1. ✅ All UI patterns match Users Page consistency
2. ✅ Confirmation modals replace native alerts
3. ✅ Bulk actions work smoothly with FAB
4. ✅ Sorting provides clear visual feedback
5. ✅ Filters are context-aware and responsive
6. ✅ Mobile experience is polished (no nav conflicts)
7. ✅ No placeholder data or lorem ipsum text
8. ✅ All actions have proper ARIA labels
9. ✅ Loading and error states are handled gracefully
10. ✅ RBAC respects organizational boundaries

---

**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 4-6 hours
**Dependencies**: None (all components exist)
