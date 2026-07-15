> **Active tablet correction, updated 2026-07-14.** Tablet pages remain tablet-composed from `768px` through `1279px` in dedicated tablet modules. At `768-1023px`, route context stays in bounded sheets and the avatar menu. At `1024-1279px`, the shared overlay context panel and collapsed navigation rail become available while page content remains tablet-composed. A persistent list/detail pane requires a proved route detail projection and independent scroll ownership; it is never injected through a mobile page. Use `docs/design-system/MOBILE_DESIGN_SYSTEM.md` section 11 for the active contract; the older proposal below is historical context.

# Context Panel System Documentation

## 🎯 Overview

The Context Panel is an **enterprise-grade adaptive control system** that provides page-specific context, real-time data, and quick actions across all screen sizes. It follows a **three-layer architecture**: Navigation → Action → Context.

## 📱 Responsive Behavior

### 🖥️ **Desktop (≥ 1024px)**
- **Pinned Bento Column** (320px width)
- Always visible right sidebar
- Full-height from header to bottom
- Independent scrolling
- Professional control system feel

### 📱 **Tablet (768px - 1024px)**
- **Collapsed Icon Rail** (64px width)
- Status badges with real-time counts
- Pulse animations for critical items
- Expandable overlay panel on click
- Auto-close on outside click

### 📲 **Mobile (< 768px)**
- **Bottom Sheet** (85vh max height)
- Two FABs:
  - 📋 **Context Sheet** (bottom-6) - Full context access
  - ⚡ **Quick Action** (bottom-24) - Smart page actions
- Hidden scrollbars for clean UX
- Touch-friendly interactions

## 🎨 Design System

### **Visual Hierarchy**
```
┌─ Context Panel Header ─┐
│ Page Title              │ ← Bold, tracking-tight
│ Subtitle               │ ← Uppercase, muted, tracking-wider
│ Live Indicator ●        │ ← Pulse animation
└────────────────────────┘
```

### **Glass Morphism**
- `background/0.95` backdrop blur
- `border-border/20` subtle borders
- `shadow-premium` depth effects
- Consistent across all breakpoints

### **Animation Standards**
- **Spring transitions**: `damping: 25, stiffness: 300`
- **Hover scale**: `1.05` with smooth transitions
- **Tap scale**: `0.95` for feedback
- **Pulse duration**: `2s` repeat infinity

## 📊 Page-Specific Context

### **Emergency Context** → Response Operations
- Critical/Pending counts
- Response time metrics
- Quick emergency actions
- Real-time status indicators

### **Doctor Operations** → Medical Staff
- Active doctors count
- On-call status
- Department breakdown
- Availability metrics

### **Hospital Ops** → Facility Management
- Active facilities
- Capacity metrics
- Location data
- Resource status

### **Fleet Control** → Ambulance Operations
- Available units
- Active deployments
- Response times
- Maintenance status

### **Map Intelligence** → Location Services
- Active incidents
- Coverage areas
- Resource allocation
- Geographic insights

### **Analytics** → Performance Metrics
- System health
- Response statistics
- User engagement
- Performance trends

## ⚡ Quick Actions System

### **Mobile Smart Actions**
- **Emergency page** → Open emergency modal
- **Doctor page** → Add new doctor
- **Hospital page** → Add new hospital
- **Default** → Navigate to emergencies

### **Desktop/Tablet Actions**
- Context panel integrated
- Modal triggers within panel
- Page-specific action buttons
- Keyboard shortcuts support

## 🔄 Real-Time Data Integration

### **Data Sources**
```javascript
// PageDataContext provides:
const {
  emergencyData,      // Live emergency stats
  verificationData,   // Pending verifications
  analyticsData,      // Response times, metrics
  doctorsData,        // Doctor availability
  visitsData,         // Today's appointments
  getEmergencyStats   // Computed emergency metrics
} = usePageData();
```

### **Live Indicators**
- **Critical emergencies** → Red pulse
- **Pending verifications** → Orange badge
- **On-call doctors** → Green pulse
- **Available ambulances** → Yellow badge

### **Status Badges**
- **Numbers > 99** → Display "99+"
- **Zero values** → Hide badge
- **Color coding** → Destructive/Warning/Success/Info
- **Smart positioning** → Top-right corner

## 🎯 Component Architecture

### **ResponsiveSidebar.jsx**
- **Breakpoint detection** via NavigationContext
- **Conditional rendering** per screen size
- **State management** for panels/sheets
- **Animation orchestration**

### **ContextPanel.jsx**
- **Route-based rendering** with page headers
- **Real-time data binding** from PageDataContext
- **Unified layout wrapper** with consistent styling
- **Smart content organization**

### **ContextAwareFAB.jsx**
- **Page-aware actions** based on current route
- **Responsive positioning** per breakpoint
- **Modal integration** for quick actions
- **Smooth animations** with Framer Motion

## 🛠️ Implementation Details

### **Time Formatting**
```javascript
// Consistent rounding across all components
const roundedTime = Math.round((rawTime || 0) * 10) / 10;
// Output: 4.2m instead of 4.234567m
```

### **Scrollbar Hiding**
```css
.scrollbar-hide {
  -ms-overflow-style: none;        /* IE/Edge */
  scrollbar-width: none;           /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;                 /* Chrome/Safari */
}
```

### **Glass Morphism**
```javascript
style={{
  background: 'hsl(var(--background) / 0.95)',
  backdropFilter: 'blur(24px) saturate(180%)',
  borderLeft: '1px solid hsl(var(--border) / 0.2)',
}}
```

## 🚀 Performance Optimizations

### **Conditional Rendering**
- Mobile-only components hidden on desktop
- Desktop-only components hidden on mobile
- Lazy loading of heavy components
- Smart state management

### **Animation Performance**
- `will-change` for smooth animations
- GPU-accelerated transforms
- Optimized spring physics
- Reduced layout thrashing

### **Data Efficiency**
- Real-time subscriptions only when visible
- Debounced API calls
- Cached computed values
- Optimistic updates

## 🎨 Customization

### **Theme Integration**
- Uses CSS custom properties
- Respects dark/light mode
- Consistent color tokens
- Accessible contrast ratios

### **Responsive Breakpoints**
```css
/* Mobile */
@media (max-width: 767px) { /* Bottom sheet */ }

/* Tablet */
@media (768px <= width <= 1023px) { /* Icon rail */ }

/* Desktop */
@media (min-width: 1024px) { /* Pinned column */ }
```

### **Animation Overrides**
```javascript
// Customize spring physics
transition={{
  type: 'spring',
  damping: 25,    // Bounce control
  stiffness: 300, // Speed control
  mass: 0.8,      // Weight control
}}
```

## 🔧 Troubleshooting

### **Common Issues**

**Time showing too many decimals**
- Check `Math.round((value * 10) / 10)` formatting
- Ensure consistent rounding across all components

**Mobile FAB not appearing**
- Verify `isMobile` breakpoint detection
- Check z-index conflicts
- Ensure proper positioning values

**Duplicate close buttons**
- Remove manual close from sheet headers
- Use built-in Sheet close functionality

**Scrollbars visible on mobile**
- Apply `scrollbar-hide` utility class
- Check CSS specificity conflicts

**Animations not smooth**
- Verify GPU acceleration
- Check for layout thrashing
- Ensure proper spring physics

### **Debug Tools**
```javascript
// Check responsive state
console.log({ isMobile, isTablet, isDesktop });

// Verify data flow
console.log('Analytics data:', analyticsData);

// Animation performance
console.time('animation');
// ... animation code
console.timeEnd('animation');
```

## 📈 Future Enhancements

### **Planned Features**
- **Keyboard shortcuts** for power users
- **Voice commands** for hands-free operation
- **Gesture controls** for tablet/mobile
- **Advanced filtering** in context panels
- **Export capabilities** for context data

### **Performance Improvements**
- **Virtual scrolling** for long lists
- **Web Workers** for data processing
- **Service Workers** for offline support
- **Progressive loading** for large datasets

---

## 🎯 Summary

The Context Panel System provides:
- ✅ **Enterprise-grade UX** across all devices
- ✅ **Real-time data** with live indicators
- ✅ **Adaptive behavior** per screen size
- ✅ **Professional animations** and interactions
- ✅ **Consistent design** language
- ✅ **Performance optimized** rendering

This creates a **mission control experience** worthy of modern emergency medical operations! 🚑🏥⚕️
