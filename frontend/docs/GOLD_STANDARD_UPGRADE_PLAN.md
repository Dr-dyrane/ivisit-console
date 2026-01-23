# Gold Standard Upgrade Plan - Emergency & Hospital Pages

**Reference**: Users Management Page
**Objective**: Bring Emergency and Hospital pages to the same quality level as Users Management

---

## 🎯 Current Status

### ✅ Gold Standard (Users Management)
- **KPI Filter Cards**: 5 beautiful cards with animations
- **Advanced Filters**: Date range with shortcuts (Today, Last 7 days, etc.)
- **Context Panel**: Clean stats + quick actions
- **Table View**: Professional with sorting, selection
- **Analytics Integration**: ReportsModal properly connected
- **RBAC**: Org-scoped data filtering

### ❌ Needs Upgrade (Emergency & Hospital Pages)
- **Emergency Page**: Basic filters, no date shortcuts, context panel minimal
- **Hospital Page**: Basic filters, no date shortcuts, context panel minimal
- Both lack the polish and features of Users Management

---

## 📋 Upgrade Checklist

### 1. Emergency Requests Page

#### A. Filter Enhancements
**Current**: Basic status filter
**Gold Standard Target**:
```javascript
const filterSchema = [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search emergencies...'
  },
  {
    key: 'priority',
    type: 'multiselect',
    label: 'Priority',
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ]
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ]
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Date Range',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 Days', value: '7days' },
      { label: 'Last 30 Days', value: '30days' },
      { label: 'This Month', value: 'month' }
    ]
  }
];
```

#### B. Context Panel (EmergencyPanel.jsx)
**Current**: Basic stats display
**Gold Standard Target**:
- Stats Overview section with glassmorphism cards
- Quick Actions grid (4 buttons):
  - Create Emergency
  - Analytics (opens ReportsModal)
  - Filter
  - Export (disabled/coming soon)
- Recent Emergencies list (last 5)
- Critical Alerts section if pending > 5

**Implementation**:
```javascript
<motion.button
  whileTap={{ scale: 0.98 }}
  onClick={() => window.dispatchEvent(new CustomEvent('openReportsModal'))}
  className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
  title="View Analytics"
>
  <BarChart3 className="h-4 w-4" />
  <span className="font-normal text-xs">Analytics</span>
</motion.button>
```

#### C. Table View Enhancement
**Current**: Basic table
**Gold Standard Target**:
- Sortable columns (click headers)
- Row selection checkboxes
- Bulk actions bar (appears when items selected)
- Status badges with proper colors
- Hover effects
- Priority indicators (visual dots/icons)

#### D. Analytics Integration
**Current**: Missing
**Target**: 
```javascript
// In EmergencyRequestsPage.jsx
useEffect(() => {
  const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
  window.addEventListener('openReportsModal', handleOpenAnalytics);
  return () => window.removeEventListener('openReportsModal', handleOpenAnalytics);
}, []);

// In return:
<ReportsModal
  open={analyticsModalOpen}
  onClose={() => setAnalyticsModalOpen(false)}
  analyticsData={emergencyData?.stats}
  initialType="emergency"
/>
```

---

### 2. Hospitals Page

#### A. Filter Enhancements
**Current**: Basic filters
**Gold Standard Target**:
```javascript
const filterSchema = [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search hospitals...'
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' },
      { value: 'full', label: 'Full' },
      { value: 'maintenance', label: 'Maintenance' }
    ]
  },
  {
    key: 'verified',
    type: 'select',
    label: 'Verification',
    options: [
      { value: 'all', label: 'All' },
      { value: 'verified', label: 'Verified Only' },
      { value: 'unverified', label: 'Unverified Only' }
    ]
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Registered On',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 Days', value: '7days' },
      { label: 'Last 30 Days', value: '30days' },
      { label: 'This Month', value: 'month' }
    ]
  }
];
```

#### B. Context Panel (HospitalsPanel.jsx)
**Current**: Minimal
**Gold Standard Target**:
- Hospital Network Overview (total, available, verified)
- Quick Actions grid:
  - Add Hospital
  - Analytics
  - Filter
  - Export/Map View (coming soon)
- Recently Added Hospitals
- Capacity Alerts (if any hospital is full)

#### C. Table View Enhancement
**Current**: Basic
**Gold Standard Target**:
- Sortable columns
- Selection checkboxes
- Verification status badges
- Capacity indicators (beds available/total)
- Location display with MapPin icon
- Rating stars display
- Hover lift effect

#### D. Analytics Integration
```javascript
// Add ReportsModal for hospital type
// Create HospitalOverview component in ReportsModal
// Wire up context panel analytics button
```

---

## 🔧 Implementation Steps (Prioritized)

### Phase 1: Fix Critical Issues (2-3 hours)
1. ✅ **Fix RBAC Navigation** - Org admins get Analytics, Map, Users
2. ✅ **Fix VisitsPanel Analytics** - Add openReportsModal listener
3. 🔄 **Add Date Filters** - Emergency & Hospital filter schemas
4. 🔄 **Update Context Panels** - Emergency & Hospital with analytics buttons

### Phase 2: Table Enhancements (3-4 hours)
5. 🔄 **Emergency Table** - Sorting, selection, bulk actions
6. 🔄 **Hospital Table** - Sorting, selection, status badges

### Phase 3: Analytics Integration (2 hours)
7. 🔄 **Emergency Analytics** - Create EmergencyOverview component
8. 🔄 **Hospital Analytics** - Create HospitalOverview component
9. 🔄 **Wire Context Panels** - Connect analytics buttons

### Phase 4: Polish & Testing (2 hours)
10. 🔄 **Visual Polish** - Hover effects, animations, transitions
11. 🔄 **RBAC Testing** - Test as provider, org_admin, admin
12. 🔄 **Data Validation** - Ensure org-scoped filtering works

---

## 📊 Data Requirements

### Emergency Analytics Structure
```javascript
{
  total: 156,
  critical: 23,
  high: 45,
  pending: 34,
  active: 12,
  completed: 89,
  byPriority: { critical: 23, high: 45, medium: 67, low: 21 },
  byStatus: { pending: 34, assigned: 12, in_progress: 8, completed: 89 },
  avgResponseTime: 8.5, // minutes
  successRate: 94 // percentage
}
```

### Hospital Analytics Structure
```javascript
{
  total: 48,
  available: 32,
  busy: 12,
  full: 3,
  verified: 45,
  totalBeds: 1850,
  availableBeds: 420,
  occupancyRate: 77, // percentage
  avgRating: 4.2,
  byRegion: { north: 12, south: 15, east: 11, west: 10 }
}
```

---

## 🎨 UI/UX Standards to Match

### From Users Management Gold Standard:

1. **KPI Cards**:
   - `bg-background/50 backdrop-blur-xs`
   - `shadow-2xl p-6 border-0 hover-lift`
   - Animated glow on active filter
   - Icon in top-right with glassmorphism
   - Badge showing filter state

2. **Filter Sheet**:
   - Date range with shortcuts
   - Multiselect for categories
   - Visual indicator when filters active
   - Smooth slide-in animation

3. **Context Panel**:
   - Stats with icons and background colors
   - Quick Actions in 2x2 grid
   - Recent items list with status indicators
   - Alert section for critical items

4. **Table**:
   - Sortable headers with arrows
   - Checkboxes for selection
   - Badges for status/role/type
   - Row hover effect
   - Smooth animations

5. **Analytics Modal**:
   - Glass effect: `bg-white/5 border-white/10`
   - Stat bubbles with icons
   - Charts/progress bars
   - Responsive grid layout

---

## 🚨 RBAC Data Filtering (Critical)

### Org Admin Scoping
**All pages must filter data by organization:**

```javascript
// In service functions
export async function getEmergencies(filter = {}) {
  const user = await getCurrentUser();
  let query = supabase.from('emergencies').select('*');
  
  query = applyAuthFilter(query, user, {
    userIdField: 'user_id',
    orgIdField: 'hospital_id'  // Filter by hospital
  });
  
  // ... rest of query
}
```

### Pages Requiring Org Scoping:
- ✅ Users (already done)
- ✅ Doctors (already done)
- ✅ Visits (already done)
- 🔄 **Emergency Requests** - Filter by hospital_id
- 🔄 **Hospitals** - Org admin sees only their hospital
- ✅ Ambulances (already done)
- ✅ Support Tickets (already done)

---

## 📝 Testing Scenarios

### Test as Org Admin
1. **Navigation**:
   - ✅ See: Dashboard, Map, Analytics, Visits, Emergencies, Hospitals, Ambulances, Doctors
   - ✅ See: Support, Health News, Verification, Users
   - ✅ NOT see: Insurance, Subscriptions

2. **Data Filtering**:
   - All emergencies show only those routed to their hospital
   - All visits show only those at their hospital
   - All doctors show only their staff
   - Users show only users in their organization

3. **Analytics**:
   - Dashboard shows org-scoped stats
   - Analytics page shows org-scoped charts
   - Context panel analytics show org data

### Test as Provider
1. **Navigation**:
   - ✅ See: Dashboard, Map, Visits, Emergencies (assigned to them)
   - ✅ See: Support, Health News
   - ✅ NOT see: Hospitals, Ambulances, Doctors, Analytics, Verification, Users, Insurance

2. **Data**:
   - Visits: Only their assigned visits
   - Emergencies: Only where they're assigned
   - Support: Only their tickets

---

## 🎯 Success Criteria

- ✅ Emergency page has date filtering with shortcuts
- ✅ Hospital page has date filtering with shortcuts  
- ✅ Both context panels have analytics buttons
- ✅ Both pages have sortable, selectable tables
- ✅ Analytics modal works for both types
- ✅ Org admin sees only their org data
- ✅ Provider sees only their assigned data
- ✅ Visual quality matches Users Management
- ✅ All animations smooth and purposeful
- ✅ No NaN errors in analytics
- ✅ Mobile responsive

---

**Next Action**: Start with Phase 1 - fix critical issues (RBAC, analytics integration, date filters).
