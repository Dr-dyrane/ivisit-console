---
status: Locked — starts after Sprint 4 gate AND architecture passes E2 + H1 + 2A + 3A
owner: Frontend Developer + Backend Developer
sprint_goal: Analytics shows real data. BentoHome has no hardcoded numbers. Wallet loads without an N+1 query.
gate_owner: QA Engineer
blocked_by: Sprint 4 gate + architecture track
last_updated: 2026-06-18
---

# Sprint 5 — Data-Gated Pages

See `planning/PRODUCT_ROADMAP.md` Sprint 5 for full task list.

**This sprint cannot start until:**
- Architecture Pass E2 complete (PageDataContext decomposed)
- Architecture Pass H1 complete (mock data eliminated from PageDataContext)
- Architecture Pass 2A complete (wallet read facade)
- Architecture Pass 3A complete (hospitals pagination defect fixed)

Track architecture pass status in: `architecture/CONSOLE_GRAND_REFACTOR_PLAN.md`

Key deliverables:
- Analytics: explicit empty states replace synthetic fallback charts
- Analytics: 4 duplicate chart blocks → single `<ResponseTimeChart>` component
- BentoHome: all stat cards sourced from useQuery hooks, PageDataContext removed
- Wallet: N+1 query fixed, loads with 1 Supabase call
- HospitalsPage, UsersPage, VisitsPage: revamped after their data layer passes complete

**Gate sign-off:** *(QA Engineer)*

## Agent Runs Log

| Date | Agent type | Task | Output summary | Human review by |
|---|---|---|---|---|
| — | — | — | — | — |
