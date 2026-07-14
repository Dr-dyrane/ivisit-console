> **Active tablet correction, updated 2026-07-14.** Tablet page composition remains active from `768px` through `1279px`. Navigation adapts by available width: `768-1023px` uses the bounded role-aware dock and avatar sheet; `1024-1279px` uses the collapsed leading rail, toolbar, and overlay context panel without switching to desktop page layouts. Desktop page composition begins at `1280px`. The historical proposal below is context only; use `docs/design-system/MOBILE_DESIGN_SYSTEM.md` section 11 for the active contract.

# iVisit Navigation & UI Architecture Design

## 📋 Executive Summary

This document outlines the progressive enhancement strategy for iVisit's navigation system, maintaining mobile-first design while adding contextual power features for larger screens.

## 🎯 Design Philosophy

### Progressive Enhancement Principle
```
Mobile: Clean & Minimal → Tablet: Smart Additions → Desktop: Full Power
```

### Core Values
- **Mobile First**: Keep mobile experience clean and uncluttered
- **Context Aware**: UI adapts to current page and user actions
- **Progressive Disclosure**: Features appear as screen size allows
- **Bento Consistency**: All elements follow geometric design system

## 📱 Responsive Breakdown

### Mobile (< 768px) - "Essential Mode"
**Keep:**
- ✅ Left island navigation (current implementation)
- ✅ Clean content areas
- ✅ Minimal chrome

**Skip:**
- ❌ Right sidebar
- ❌ FAB
- ❌ Top navigation bar

**Focus:** Content-first, distraction-free experience

### Tablet (768px - 1024px) - "Smart Mode"
**Add:**
- 🆕 Collapsible right sidebar (overlay style)
- 🆕 Minimal top nav with breadcrumbs
- ✅ Left island navigation

**Behavior:**
- Right sidebar slides in from right when needed
- Top nav provides context and quick navigation
- Maintains clean content areas

### Desktop (> 1024px) - "Power Mode"
**Full Experience:**
- 🆕 Persistent right sidebar with contextual info
- 🆕 Full top navigation bar
- 🆕 Floating Action Button (FAB)
- ✅ Enhanced left island navigation
- 🆕 Smart footer with system status

## 🏗️ Component Architecture

### 1. Responsive Right Sidebar
```jsx
<ResponsiveSidebar>
  {/* Mobile: Hidden */}
  {/* Tablet: Overlay with slide-in animation */}
  {/* Desktop: Persistent with contextual content */}
</ResponsiveSidebar>
```

**Contextual Content:**
- **Emergency Page**: Live stats, priority alerts, quick filters
- **Map Page**: Layer controls, location search, route info
- **Users Page**: Role statistics, quick actions, user insights
- **Hospitals Page**: Capacity info, availability status

### 2. Floating Action Button (FAB)
```jsx
<ContextAwareFAB>
  {/* Actions change based on current page */}
  {/* Desktop only */}
</ContextAwareFAB>
```

**Actions by Page:**
- Emergency: "New Emergency Request"
- Users: "Add User"
- Hospitals: "Register Hospital"
- Map: "Center on Location"

### 3. Enhanced Top Navigation
```jsx
<SmartTopNav>
  {/* Tablet & Desktop */}
  <BentoBreadcrumbs />
  <QuickSearch />
  <NotificationCenter />
  <UserProfileQuickAccess />
</SmartTopNav>
```

### 4. Smart Footer
```jsx
<StatusFooter>
  {/* Minimal, futuristic */}
  <ConnectionIndicators />
  <SystemStats />
  <QuickStatus />
</StatusFooter>
```

## 🎨 Design System Integration

### Bento Grid Aesthetic
- All new components use geometric shapes (`squircle`, `geo-arrow`, etc.)
- Consistent glass morphism effects
- Smooth animations with framer-motion
- Premium shadows and blur effects

### Responsive Patterns
```css
/* Mobile-first approach */
.component {
  /* Mobile styles */
}

@media (min-width: 768px) {
  .component {
    /* Tablet enhancements */
  }
}

@media (min-width: 1024px) {
  .component {
    /* Desktop full features */
  }
}
```

## 🚀 Implementation Phases

### Phase 1: Responsive Right Sidebar
**Priority**: High
**Impact**: Immediate contextual information
**Components**:
- `ResponsiveSidebar.jsx`
- `ContextPanel.jsx` (page-specific content)
- `SidebarTrigger.jsx` (tablet toggle)

### Phase 2: Context-Aware FAB
**Priority**: High
**Impact**: Quick actions always available
**Components**:
- `ContextAwareFAB.jsx`
- `FABActions.jsx` (page-specific actions)

### Phase 3: Enhanced Top Navigation
**Priority**: Medium
**Impact**: Better navigation context
**Components**:
- `SmartTopNav.jsx`
- `BentoBreadcrumbs.jsx`
- `QuickSearch.jsx`

### Phase 4: Smart Footer
**Priority**: Low
**Impact**: System monitoring
**Components**:
- `StatusFooter.jsx`
- `ConnectionIndicators.jsx`
- `SystemStats.jsx`

## 📐 File Structure

```
src/
├── components/
│   ├── navigation/
│   │   ├── ResponsiveSidebar.jsx
│   │   ├── ContextPanel.jsx
│   │   ├── SidebarTrigger.jsx
│   │   ├── ContextAwareFAB.jsx
│   │   ├── SmartTopNav.jsx
│   │   ├── BentoBreadcrumbs.jsx
│   │   └── StatusFooter.jsx
│   └── ui/
│       ├── connection-indicators.jsx
│       └── system-stats.jsx
├── hooks/
│   ├── useResponsive.js
│   ├── usePageContext.js
│   └── useNavigationState.js
└── contexts/
    └── NavigationContext.jsx
```

## 🎯 Success Metrics

### User Experience
- **Mobile**: Clean, fast, distraction-free
- **Tablet**: Productive with smart overlays
- **Desktop**: Powerful with full context

### Performance
- **Progressive loading**: Features load as needed
- **Responsive images**: Optimized per screen size
- **Smooth animations**: 60fps transitions

### Accessibility
- **Touch-friendly**: Large targets on mobile
- **Keyboard navigation**: Full desktop support
- **Screen readers**: Proper ARIA labels

## 🔄 Version Control

### Git Strategy
- Feature branches for each phase
- Incremental commits
- Mobile testing at each step
- Cross-browser compatibility checks

---

**Document Created**: January 15, 2026
**Author**: Development Team
**Version**: 1.0
**Next Review**: After Phase 1 implementation
