---
status: living
owner: product
last_updated: 2026-06-18
---

# Risk Register — Console Revamp

| ID | Risk | Likelihood | Impact | Sprint | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R1 | Sprint 5 blocked by architecture passes not completing on schedule | High | High | 5 | Sprints 1–4 deliver independent value. Sprint 5 is explicitly decoupled. Monitor architecture track weekly. | Product Owner |
| R2 | Analytics synthetic data removal is noticed by existing users as "charts disappeared" | Low | Medium | 1 | Add explicit "Estimated baseline — appears before 7 days of real data" copy rather than blank removal. Communicate change to active orgs. | Product Owner |
| R3 | Route mismatch fix (Hospitals, Insurance) expands org_admin access unintentionally | Medium | High | 1 | Before fixing: audit what data org_admins should see vs what admin-only data is on these pages. If the pages should remain admin-only, hide them from org_admin nav instead. Confirm access policy with PO before merging. | Backend Dev |
| R4 | `window` event bus removal breaks a modal or panel that was not caught in audit | Medium | Medium | 4 | QA agent runs a full modal interaction walkthrough after each migration batch. Gate: all modals on migrated pages are manually tested before merging the next batch. | QA Engineer |
| R5 | Mobile diverges further from desktop during Sprint 2–3 work | Medium | Medium | 2–3 | Enforce use of shared component primitives (`ModalShell`, `GlassSection`). No mobile-specific one-off components without a PR review. | Frontend Dev |
| R6 | Wallet N+1 query fix introduces a join that changes data shape, breaking the existing UI | Low | High | 1 | Backend Dev writes the join and validates the data shape matches the current `payments` array structure before deploying. FE Dev does not touch the Wallet UI until shape is confirmed. | Backend Dev |
| R7 | Doctor home state scoping (facility-level emergency count) requires a new Supabase RPC | Medium | Medium | 2 | If RPC doesn't exist: show a "fetching…" count that falls back to a clear "N/A" rather than zero. Do not show zero as if it means no emergencies. | Backend Dev |
| R8 | Removing `mode="view"` from modals (Sprint 4) breaks links in other parts of the app that open modals in view mode | Medium | Medium | 4 | Audit all `onView` callers before removing. Confirm context panel handles all entity types before modal view mode is removed. Run agent investigation before the Sprint 4 PR is opened. | Frontend Dev |
| R9 | BentoHome migration to useQuery hooks (Sprint 5) causes a flash-of-empty-content while queries resolve | Low | Low | 5 | Use TanStack Query's `placeholderData: keepPreviousData` pattern and skeleton loaders already in the codebase. | Frontend Dev |
| R10 | PricingManagementPage Services + Rooms merge changes the data structure for existing pricing records | Low | High | 3 | Merge is a UI-only change: combine the two lists into one display, add a `type` column. The underlying two-table structure stays. Confirm no service layer change needed. | Frontend Dev |
