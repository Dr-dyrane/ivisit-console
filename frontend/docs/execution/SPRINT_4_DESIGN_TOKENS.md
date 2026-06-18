---
status: In progress — 8/10 tasks complete (4.1–4.6, 4.9, 4.10); 4.7 + 4.8 deferred to a build-tested follow-up
owner: Frontend Developer + Lead Designer
sprint_goal: Every modal looks like every other modal. Every interaction pattern is implemented once and reused everywhere.
gate_owner: QA Engineer
blocked_by: Sprint 3 gate
last_updated: 2026-06-18
---

# Sprint 4 — Design Token Enforcement & Component Unification

See `planning/PRODUCT_ROADMAP.md` Sprint 4 for full task list.

Key deliverables:
- `src/components/ui/ModalShell.jsx` — shared modal wrapper
- `src/components/ui/GlassSection.jsx` — shared content section
- `src/contexts/PageActionsContext.jsx` — replaces `window.dispatchEvent` event bus
- `tailwind.config.js` extended with `rounded-card`, `rounded-inner`, `rounded-icon`, `bg-brand` aliases
- `src/utils/metricsUtils.js` — shared delta/percent formatting utilities

Design system reference: `design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md`

## Task status (2026-06-18)

- [x] 4.1 `ModalShell.jsx` created
- [x] 4.2 `GlassSection.jsx` created
- [x] 4.3 DoctorModal, HospitalModal, UserModal migrated to `ModalShell`
- [x] 4.4 ARIA `role="dialog" aria-modal="true"` on all modals (via ModalShell, manual, or Radix `Dialog`)
- [x] 4.5 Tailwind token aliases (`rounded-card/inner/icon/modal`, `bg-brand`)
- [x] 4.6 `PageActionsContext.jsx` created and provided in `App.js`
- [ ] 4.7 **Deferred (needs build + click testing).** `PageActionsContext` is wired but unused; the `window` event bus is still live across 15+ pages, each listening for multiple events (`open…Modal`, `openFilters`, `openAnalyticsModal`). Completing this requires extending the context beyond a single primary action and migrating every page + the `useContextAction`/nav-shell dispatchers.
- [ ] 4.8 **Deferred (needs build + click testing).** `mode="view"` still used in SettingsPage, VerificationQueue, UsersPage; rerouting entity detail to the context panel is a per-call-site behavioral change.
- [x] 4.9 `metricsUtils.js` extracted (`calcDeltaPercent`, `formatSignedPercent`, `toDeltaBadge`)
- [x] 4.10 Mobile components import from `metricsUtils` (no duplicate definitions)

> Build blocker fixed this session: duplicate `useEffect` import in `HospitalModal.jsx`.
> 4.7 and 4.8 are scoped for a build-tested follow-up in [SPRINT_4_REMAINING_4.7_4.8.md](./SPRINT_4_REMAINING_4.7_4.8.md).

**Gate sign-off:** *(QA Engineer)* — pending (blocked on 4.7, 4.8, and a green `npm run build`)

## Agent Runs Log

| Date | Agent type | Task | Output summary | Human review by |
|---|---|---|---|---|
| 2026-06-18 | Cowork (Claude) | Fix build + audit Sprint 4 | Fixed HospitalModal duplicate `useEffect` import; verified 4.1–4.6/4.9/4.10 complete; scoped 4.7/4.8 as deferred, build-tested follow-ups | *(pending)* |
