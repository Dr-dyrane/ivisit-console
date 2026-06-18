# UX Strategy

## 📋 Contents

Role journeys, experience audits, and the deterministic revamp plan for making the console usable by non-technical healthcare staff.

### **📖 [Back to Docs Root](../README.md)**

---

### **📚 Documents**

#### **🗺️ [CONSOLE_UX_REVAMP_PLAN.md](./CONSOLE_UX_REVAMP_PLAN.md)** ← START HERE
Deterministic revamp plan synthesised from 4 parallel deep-audit agents (2026-06-18). Covers:
- Role-by-role experience targets (Doctor, Org Admin, Admin, Sponsor, Viewer)
- Fabricated data removal checklist (12+ hardcoded metrics across BentoHome + Analytics)
- Page-by-page simplification decisions for all 17 routes
- Navigation architecture changes (role-fixed bottom bar, label renames, bug fixes)
- Component unification targets (ModalShell, usePageActions context, design tokens in Tailwind)
- UX-vs-data-layer sequencing: which pages can be revamped now vs which are data-layer-blocked
- 5-sprint build sequence

**Design system cross-reference:** [CONSOLE_DESIGN_SYSTEM_FROM_APP.md](../design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md)
**Architecture cross-reference:** [CONSOLE_GRAND_REFACTOR_PLAN.md](../architecture/CONSOLE_GRAND_REFACTOR_PLAN.md)

---

#### **📱 [mobile_dashboard_reinvention.md](./mobile_dashboard_reinvention.md)**
BentoHome mobile audit — 85% whitespace, 3200px scroll, KPI strip reinvention proposal. The source of record for mobile dashboard redesign intent.

---

#### **🔣 [semantic_icon_system.md](./semantic_icon_system.md)**
Icon usage standards ensuring consistent semantic meaning across nav, actions, and status indicators.

---

## 🔗 Related Docs

| Topic | Location |
|---|---|
| Design tokens (CSS vars, spacing, motion) | [design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md](../design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md) |
| Context panel system | [ui-ux/CONTEXT_PANEL_SYSTEM.md](../ui-ux/CONTEXT_PANEL_SYSTEM.md) |
| Management page standards | [ui-ux/MANAGEMENT_PAGE_STANDARDS.md](../ui-ux/MANAGEMENT_PAGE_STANDARDS.md) |
| Navigation design | [ui-ux/NAVIGATION_DESIGN.md](../ui-ux/NAVIGATION_DESIGN.md) |
| RBAC / role hierarchy | [rbac/](../rbac/) |
| Architecture refactor plan | [architecture/CONSOLE_GRAND_REFACTOR_PLAN.md](../architecture/CONSOLE_GRAND_REFACTOR_PLAN.md) |
