# iVisit Console Documentation

## 🎯 **Navigation Guide**

This documentation is organized into logical categories for easy navigation. Each section contains comprehensive information about specific aspects of the iVisit Console.

---

## 📚 **Documentation Structure**

### 🏗️ **[System Overview](./system-overview/)**
Core system documentation and implementation status
- [📖 README](./system-overview/README.md) - Project overview and getting started
- [✅ Session Complete](./system-overview/SESSION_COMPLETE.md) - Complete implementation summary
- [🎯 Implementation Summary](./system-overview/COMPLETE_IMPLEMENTATION_SUMMARY.md) - Full feature implementation details

### 🎨 **[Design System](./design-system/)**
UI/UX design guidelines and Apple-style implementation
- [🍎 Apple Glass Design System](./design-system/APPLE_GLASS_DESIGN_SYSTEM.md) - Complete design system
- [👨‍💻 Dyrane UI Design System](./design-system/DYRANE_UI_DESIGN_SYSTEM.md) - Custom design implementation
- [🔍 UI/UX Audit](./design-system/UI_UX_AUDIT.md) - Comprehensive design audit
- [📊 UI Alignment & Analytics](./design-system/UI_ALIGNMENT_AND_ANALYTICS_COMPLETE.md) - Design analytics
- [🎨 Login Design Evolution](./design-system/LOGIN_DESIGN_EVOLUTION.md) - Complete login page redesign

### 🚑 **[Emergency System](./emergency-system/)**
Complete emergency request and response system
- [🔄 Emergency Request Cycle](./emergency-system/EMERGENCY_REQUEST_CYCLE_COMPLETE.md) - Complete emergency workflow
- [🚨 Emergency Response System](./emergency-system/EMERGENCY_RESPONSE_SYSTEM.md) - Response management
- [🗺️ Map Emergency Dispatch](./emergency-system/MAP_EMERGENCY_DISPATCH.md) - Real-time dispatch system

### 🗄️ **[Database](./database/)**
Database schema and type definitions
- [📊 Database Schema Reference](./database/DATABASE_SCHEMA_REFERENCE.md) - Complete table schemas
- [🔧 Database Types](./database/) - Generated TypeScript types

### 🏛️ **[Architecture](./architecture/)**
System architecture and security
- [🛡️ Protected Routes System](./architecture/PROTECTED_ROUTES_SYSTEM.md) - Route protection implementation
- [🔐 RBAC Implementation](./architecture/RBAC_IMPLEMENTATION_STATUS.md) - Role-based access control

### 🔧 **[Implementation](./implementation/)**
Technical implementation details and completed features
- [📋 2026 Changelog](./implementation/CHANGELOG_2026.md) - Complete changelog for 2026
- [🌐 SEO & Accessibility](./implementation/SEO_ACCESSIBILITY_IMPLEMENTATION.md) - SEO and a11y implementation
- [🎨 Modal System Refactor](./implementation/MODAL_SYSTEM_REFACTOR.md) - Complete modal system redesign

### 🎭 **[RBAC System](./rbac/)**
Role-Based Access Control documentation
- [🏗️ RBAC Architecture Core](./rbac/RBAC_ARCHITECTURE_CORE.md) - Complete RBAC model and implementation
- [📋 RBAC Implementation History](./rbac/RBAC_IMPLEMENTATION_HISTORY.md) - Historical implementation tracking

### 🔧 **[Fixes Completed](./fixes-completed/)**
All completed fixes and improvements
- [🎯 Tooltips Restored](./fixes-completed/TOOLTIPS_RESTORED.md) - UI tooltips restoration
- [🚑 Provider API Calls Fixed](./fixes-completed/PROVIDER_API_CALLS_FIXED.md) - Provider access fixes
- [🏥 Provider Visits & Emergencies](./fixes-completed/PROVIDER_VISITS_EMERGENCIES_FIXED.md) - Provider data access
- [🚗 Ambulance-Driver Linkage](./fixes-completed/AMBULANCE_DRIVER_LINKAGE_FIXED.md) - Driver integration
- [👨‍⚕️ Hospital-Based Doctor Scoping](./fixes-completed/HOSPITAL_BASED_DOCTOR_SCOPING.md) - Doctor access patterns
- [📱 Driver View Pattern](./fixes-completed/DRIVER_VIEW_PATTERN_FIXED.md) - Driver interface
- [✨ Flickering Skeletons Fixed](./fixes-completed/FLICKERING_SKELETONS_FIXED.md) - Loading animations
- [🔄 Infinite Loop Fixes](./fixes-completed/INFINITE_LOOP_FIXES_COMPLETE.md) - Performance fixes
- [🏥 Org Admin RBAC Fixed](./fixes-completed/ORG_ADMIN_RBAC_FIXED.md) - Organization admin access fixes
- [👨‍⚕️ Visits Doctor Field Fixed](./fixes-completed/VISITS_DOCTOR_ID_FIELD_FIXED.md) - Doctor field corrections
- [📊 Admin Dashboard & Route Fixes](./fixes-completed/ADMIN_DASHBOARD_AND_ROUTE_FIXES.md) - Dashboard and route issues
- [🔒 Invite-Only Platform Confirmed](./fixes-completed/INVITE_ONLY_PLATFORM_CONFIRMED.md) - Platform access model

### 📋 **[Guides](./guides/)**
Development guides and best practices
- [📚 Documentation Reorganization](./DOCS_REORGANIZATION_COMPLETE.md) - Latest docs reorganization (Jan 24, 2026)
- [🔄 Update Reference Guide](./guides/UPDATE_REFERENCE_GUIDE.md) - Keeping docs current
- [Subscriber Campaigns](./guides/SUBSCRIBER_CAMPAIGNS.md) - Subscriber email templates, sender scripts, and closed-test reminder records
- [🌟 Gold Standard Upgrade](./guides/GOLD_STANDARD_UPGRADE_PLAN.md) - Upgrade planning

### 🧭 **[Master Execution Document](./_MASTER.md)** ← START HERE (system map, current sprint state, all doc links)
The single governing doc. Maps the full chain from board intent to users' hands. Read this before anything else.

---

### 📋 **[Planning](./planning/)**
Board brief, product roadmap, and risk register
- [🎯 Board Brief](./planning/BOARD_BRIEF.md) — Executive summary, what we're building and why, success metrics, investment
- [🗺️ Product Roadmap](./planning/PRODUCT_ROADMAP.md) — 5 sprints, owners, gate criteria, architecture dependencies
- [⚠️ Risk Register](./planning/RISK_REGISTER.md) — Known risks, mitigations, owners
- [🔍 Gap Report](./planning/MISSING_FROM_PLAN.md) — **Read before Sprint 1 starts** — 4-agent audit findings vs plan coverage, recommended additions

### 👥 **[Team & Collaboration](./team/)**
Roles, agent execution guide, and the handoff protocol
- [🏷️ Roles & Ownership](./team/ROLES_AND_OWNERSHIP.md) — Human + agent ownership matrix for every file and decision
- [🤖 Agent Execution Guide](./team/AGENT_EXECUTION_GUIDE.md) — How to run Claude agents on this codebase: templates, rules, the step-by-step flow
- [🔄 Handoff Protocol](./team/HANDOFF_PROTOCOL.md) — How work moves from board intent to users' hands through 9 defined handoffs

### 📁 **[Sprint Execution](./execution/)**
Per-sprint task lists, acceptance criteria, and agent run logs
- [Sprint 1 — Trust & Correctness](./execution/SPRINT_1_TRUST_CORRECTNESS.md) ✅ Ready to start
- [Sprint 2 — Home & Navigation](./execution/SPRINT_2_HOME_NAVIGATION.md) 🔒 After Sprint 1
- [Sprint 3 — Page Polish](./execution/SPRINT_3_PAGE_POLISH.md) 🔒 After Sprint 2
- [Sprint 4 — Design Tokens](./execution/SPRINT_4_DESIGN_TOKENS.md) 🔒 After Sprint 3
- [Sprint 5 — Data-Gated Pages](./execution/SPRINT_5_DATA_GATED.md) 🔒 After Sprint 4 + Architecture

### 🧪 **[Testing & Release](./testing/)**
QA protocol and the release checklist
- [QA Protocol](./testing/QA_PROTOCOL.md) — Test strategy per change type, device matrix, role walkthroughs, sprint-specific checks
- [Release Checklist](./testing/RELEASE_CHECKLIST.md) — Every gate before staging and production deploy

### 🎯 **[UX Strategy](./ux/)**
User experience plans, audits, and role-based journey maps
- [🗺️ Console UX Revamp Plan](./ux/CONSOLE_UX_REVAMP_PLAN.md) **← START HERE for UX work** — Full audit synthesis: role journeys, page-by-page simplification, component unification, data-layer sequencing, and sprint plan
- [📱 Mobile Dashboard Reinvention](./ux/mobile_dashboard_reinvention.md) - BentoHome mobile redesign audit
- [🔣 Semantic Icon System](./ux/semantic_icon_system.md) - Icon usage standards

### 🗂️ **Specialized Categories**
- [👨‍⚕️ Doctor Management](./doctor-management/) - Doctor-specific features
- [🚑 Provider Management](./provider-management/) - Provider access patterns
- [👥 User Management](./user-management/) - User administration
- [🏥 Visit Management](./visit-management/) - Visit system
- [🔐 RBAC](./rbac/) - Role-based access control
- [🎨 UI/UX Components](./ui-ux/) - Context panel system, management page standards, navigation design
- [🔧 Modal Fixes](./modal-fixes/) - Modal component fixes
- [📊 Implementation](./implementation/) - Implementation details

---

## 🎯 **Quick Start**

### **🚀 For New Developers**
1. Start with [System Overview](./system-overview/README.md)
2. Review [Design System](./design-system/APPLE_GLASS_DESIGN_SYSTEM.md)
3. Understand [Database Schema](./database/DATABASE_SCHEMA_REFERENCE.md)
4. Learn [Architecture](./architecture/PROTECTED_ROUTES_SYSTEM.md)

### **🔧 For Feature Development**
1. Check [Emergency System](./emergency-system/EMERGENCY_REQUEST_CYCLE_COMPLETE.md)
2. Review [RBAC Implementation](./architecture/RBAC_IMPLEMENTATION_STATUS.md)
3. Use [Database Types](./database/) for type safety
4. Follow [Update Guide](./guides/UPDATE_REFERENCE_GUIDE.md)

### **🐛 For Bug Fixes**
1. Check [Fixes Completed](./fixes-completed/) for similar issues
2. Review [Implementation Status](./system-overview/COMPLETE_IMPLEMENTATION_SUMMARY.md)
3. Use [Database Schema](./database/DATABASE_SCHEMA_REFERENCE.md) for field reference
4. Update documentation per [Update Guide](./guides/UPDATE_REFERENCE_GUIDE.md)

---

## 🎯 **Implementation Status**

### **✅ Complete Systems**
```bash
✅ Emergency Request Cycle (100% complete)
✅ Protected Routes System (100% complete)
✅ RBAC Implementation (100% complete)
✅ Database Schema (100% complete)
✅ Design System (100% complete)
✅ Provider Access Patterns (100% complete)
```

### **🔄 Recently Completed**
```bash
✅ Driver privacy protection (HIPAA compliant)
✅ Hospital-based doctor scoping
✅ Ambulance-driver tight integration
✅ Tooltip restoration (no flickering)
✅ Infinite loop fixes
✅ API call error resolution
```

---

## 🎯 **Key References**

### **📊 Database "Bible"**
- [Database Schema Reference](./database/DATABASE_SCHEMA_REFERENCE.md) - Complete field definitions
- Generated types in `src/types/database.ts`

### **🛡️ Security & Access**
- [Protected Routes System](./architecture/PROTECTED_ROUTES_SYSTEM.md) - Route protection
- [RBAC Implementation](./architecture/RBAC_IMPLEMENTATION_STATUS.md) - Role-based access

### **🚑 Emergency System**
- [Emergency Request Cycle](./emergency-system/EMERGENCY_REQUEST_CYCLE_COMPLETE.md) - Complete workflow
- All emergency features are **COMPLETE** - no more fixes needed

---

## 🎯 **Documentation Guidelines**

### **📝 When Adding Documentation**
1. Choose appropriate category folder
2. Update this README with new content
3. Follow existing naming conventions
4. Include implementation status
5. Add to relevant sections

### **🔄 When Updating Documentation**
1. Check [Update Reference Guide](./guides/UPDATE_REFERENCE_GUIDE.md)
2. Update related documentation
3. Maintain single source of truth
4. Update implementation status
5. Review for consistency

---

## 🎯 **Contact & Support**

For questions about documentation:
- Check relevant category first
- Review implementation status
- Use update guide for changes
- Maintain consistency with existing docs

---

**Last Updated: January 24, 2026**  
**Status: Complete & Organized** ✨
