# Management Page & Context Panel Standards
**Version 1.0**

This document defines the "Gold Standard" for all management pages (e.g., Insurance, Health News, Support Tickets) and their associated Context Panels in the ivisit-console application. Adhering to these standards ensures consistency, premium aesthetics, and predictable user behavior as per the *Alexander UI/UX Canon*.

---

## 1. Page Layout & Structure

Every management page must follow this high-level structure:

### 1.1 Header
*   **Title**: Clear, descriptive page title.
*   **Primary Action**: Located on the right or integrated into the header actions.
    *   *Style*: `squircle-full`, `bg-muted/20 hover:bg-muted/30`, `border-border/20`.
    *   *Text*: Bold, uppercase, tracking-widest (e.g., "ADD POLICY").
    *   *Icon*: Left-aligned icon (e.g., `<Plus />`).
*   **Controls**:
    *   **View Toggle**: Switch between Grid, List, and Table views (if applicable).
    *   **Filter Button**: Ghost button with an icon. Must show a generic "active" indicator (colored dot) if any filters are applied.

### 1.2 KPI Section (Bento Grid)
The top of the page dictates the data view.
*   **Layout**: `grid` with responsive columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
*   **Card Style**:
    *   Class: `bg-background/50 backdrop-blur-xs shadow-2xl border-0 relative overflow-hidden group`.
    *   Shape: `geo-sharp` or `squircle-lg` (maintain consistency within page).
*   **Interactivity**:
    *   **Click Action**: Clicking a KPI card **MUST** filter the main content (e.g., clicking "Pending" shows only pending items).
    *   **Active State**: When active, the card should have a `ring-2` styling (e.g., `ring-warning` for pending).
*   **Content**:
    *   Icon in a `geo-round` container (`bg-{color}/20 text-{color}`).
    *   Big Number/Text.
    *   Label and small descriptive sublabel.

### 1.3 Main Content Area
*   **Display Modes**: Support `Grid` (rich cards), `Table` (dense data), and `List` (scannable rows) where appropriate.
*   **Empty States**: Never leave a blank space. Use a centered `EmptyState` component with an icon, title, description, and "Clear Filters" or "Create" action.
*   **Loading**: Use `TableSkeleton` or `GridSkeleton` matching the current view mode.

### 1.4 Footer (Smart Footer)
*   **Usage**: Controlled via `usePageFooter`.
*   **Content**:
    *   Pagination controls (Previous/Next).
    *   Status Pill: `bg-white/5 border-white/10 rounded-full px-3 py-1`.
    *   Text: "Page X of Y • {Total} Items".

---

## 2. Context Panel Standards (Right Sidebar)

The Context Panel serves as a quick-access control center.

### 2.1 Quick Actions
*   **Layout**: 2x2 Grid.
*   **Components**: `motion.button` with `whileTap={{ scale: 0.98 }}`.
*   **Styling**:
    *   `bg-{color}/10 hover:bg-{color}/20`
    *   `text-{color}`
    *   `border border-{color}/20`
    *   `rounded-xl`
*   **Common Actions**: Add, Analytics, Email/Contact, Export.

### 2.2 Recent Items List
*   **Purpose**: Show the 3 most recently modified/created items.
*   **Layout**: Vertical stack.
*   **Card Style**: `bg-background/50 backdrop-blur-xs squircle-lg p-3 shadow-sm`.
*   **Content**:
    *   Status Indicator: Small `geo-round` dot (`w-2 h-2`).
    *   Title/Name: Truncated if necessary.
    *   Meta: Relative time (e.g., "2m ago") or status text.

### 2.3 Stats Overview (Optional)
*   If the main page has extensive KPIs, the panel can show a simplified summary (e.g., Total Count, critical alerts) using small row-based cards.

---

## 3. Logic & State Management

### 3.1 Filtering Logic
*   **kpiFilter**: Implement a specific state variable (e.g., `const [filters, setFilters] = useState({ kpiFilter: 'all', ... })`).
    *   This allows the KPI cards to act as "Quick Filters".
    *   The `kpiFilter` should override or work in conjunction with the main `FilterSheet`.
*   **FilterSheet**: Use for detailed, multi-select, or less common filters.
*   **Search**: Real-time or debounced search matching multiple fields (Name, ID, Provider, etc.).

### 3.2 Data Integration
*   Use custom hooks (e.g., `useInsurance`, `useSupportTickets`) to abstract Supabase logic.
*   **Pagination**: Use `usePagination` hook. Pass total counts from the data hook to the pagination hook.
*   **Real-time**: Ensure subscriptions (Supabase `on('postgres_changes')`) are active for instant updates on Create/Update/Delete.

---

## 4. Visual Style Guide (Tailwind + Custom)

*   **Surfaces**:
    *   Glass: `bg-background/50 backdrop-blur-xs`.
    *   Subtle: `bg-background/35`.
*   **Shapes**:
    *   `squircle-lg`, `squircle-xl`, `squircle-full`.
    *   `geo-sharp`, `geo-round` (for icons/avatars).
*   **Shadows**:
    *   `shadow-premium` (custom large shadow).
    *   `shadow-2xl` for floated elements.
*   **Colors (Semantic)**:
    *   **Active/Success**: `success` (Green).
    *   **Pending/Warning**: `warning` (Orange/Yellow).
    *   **Expired/Critical**: `destructive` (Red).
    *   **Info/New**: `info` (Blue) or `primary`.

## 5. Animation
*   **Library**: `framer-motion`.
*   **Standard Transitions**: `layout` prop for smooth reordering.
*   **Entrance**: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`.
*   **Hover**: `hover-lift` class or `whileHover={{ y: -2 }}`.

---

**Implementation Checklist**:
1. [ ] Check Page Header alignement.
2. [ ] Verify KPI Card interaction (`kpiFilter`).
3. [ ] Confirm Grid/Table view definitions.
4. [ ] Validate Smart Footer pagination data.
5. [ ] Ensure Context Panel matches 2x2 Action Grid + Recent List pattern.
