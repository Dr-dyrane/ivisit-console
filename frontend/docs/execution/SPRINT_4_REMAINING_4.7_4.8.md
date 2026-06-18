---
status: Ready to implement (deferred from Sprint 4 — needs a running build to verify)
owner: Frontend Developer
parent: execution/SPRINT_4_DESIGN_TOKENS.md
last_updated: 2026-06-18
---

# Sprint 4 — Remaining Work: 4.7 & 4.8

Sprint 4 is **8/10 complete** (4.1–4.6, 4.9, 4.10 verified on disk). The two tasks
below were deferred because both are larger than their one-line roadmap entries and
neither can be verified without running the dev server. This doc scopes them so they
can be picked up directly.

> Note on the gate: the Sprint 4 gate's `grep window.dispatchEvent src/components/pages/`
> check already passes (pages listen, they don't dispatch). 4.8 is not a gate item.
> These are correctness/architecture improvements, not gate blockers.

---

## 4.7 — Migrate the window-event bus to `usePageActions`

### Why it's bigger than it looks
The `window.dispatchEvent(new CustomEvent(...))` bus is the console's primary
cross-component channel, not a page-local pattern. `PageActionsContext` exists and is
mounted in `App.js`, but **no component uses it yet**, and it only models a *single*
primary action per page — it cannot represent the `openFilters` / `openAnalyticsModal`
secondary actions without a redesign.

### Blast radius (dispatchers → listeners)

**Dispatchers**
- `hooks/useContextAction.js` — `openHospitalModal`, `openAnalyticsModal`, `openSecurityModal`, `openTopUpModal`, `openOrganizationModal`, `centerMap`
- `components/context/*Panel.jsx` (10 panels) — per-entity `open<Entity>Modal`, plus `openFilters`, `openAnalyticsModal`:
  Ambulances, Doctors, Hospitals, HealthNews, Emergency, SupportTickets, Insurance, Verification, Visits, Wallet (`openTopUpModal`/`openWithdrawModal`/`exportLedger`)
- `components/navigation/ContextPanel.jsx` — `openUserModal`, `openInviteUserModal`, `openUserAnalytics`
- `components/navigation/DynamicBottomBar.jsx` — `openMobileMenu`
- `components/views/DoctorProfileCard.jsx` — `openSupportModal`, `openDoctorModal`
- `components/pages/WalletManagementPage.jsx` — `openTopUpModal`, `openWithdrawModal`, `openBillingModal`
- Map: `recenter-map` (`contexts/MapContext.jsx`, `mobile/MobileMap.jsx`, `pages/GodModeMap.jsx`), `recenter-map-target` (`context/MapPanel.jsx`)

**Listeners**
- `contexts/LayoutContext.jsx` — `modal-opened`, `openUserModal`
- `components/navigation/SmartHeader.jsx` — `openMobileMenu`
- `components/modals/GlobalFinancialModals.jsx` — `openTopUpModal`, `openWithdrawModal`, `openBillingModal`
- Pages (`open<Entity>Modal` + `openFilters` + `openAnalyticsModal`): Ambulances, Analytics, Doctors, EmergencyRequests, HealthNews, Hospitals, Insurance, Pricing, Organizations, Settings, Subscriptions, Users, SupportTickets, Verification, Visits
- Map refiners: `recenter-map` (`LeafletMapRefiner`, `GoogleMapsRefiner`)

### Recommended approach
1. **Redesign `PageActionsContext`** from a single `pageAction` to a small registry keyed by intent: `primary` (create), `filters`, `analytics` (extend as needed). Keep the generation-guard cleanup logic already there.
2. **Pages register** their handlers in a `useEffect` via `registerPageAction({...})` and drop their `window.addEventListener('open*' )` blocks.
3. **Consumers call the registry**: `ContextAwareFAB`, `DynamicBottomBar`, and every `context/*Panel.jsx` read from `usePageActions()` and invoke `actions.primary()` / `actions.filters()` / `actions.analytics()` instead of dispatching events.
4. **Retire** the create/filters/analytics dispatches in `useContextAction.js`. Keep genuinely cross-cutting signals (`recenter-map`, `notifications:changed`, `openMobileMenu`) on the event bus or move them to their own context — they are not "page actions".
5. Migrate page-by-page so each page is independently verifiable.

### Test checklist (run the dev server)
- [ ] On every management page, the FAB + the context-panel "Add" button open the correct create modal
- [ ] The context-panel "Filter" and "Data/Analytics" buttons still work on each page
- [ ] Mobile bottom bar primary action works per role
- [ ] No `usePageActions must be used inside PageActionsProvider` errors
- [ ] `grep -rn "window.dispatchEvent" src/components/pages src/components/context` shows only intentionally-retained signals
- [ ] `npm run build` clean

---

## 4.8 — Remove modal `mode="view"`; route detail to the context panel

### Why it's blocked on infrastructure
`mode="view"` is a live read-only detail feature, not dead code:
- `pages/SettingsPage.jsx` — a provider viewing their own `DoctorModal` profile (line ~149) and a second view modal (~437)
- `pages/VerificationQueue.jsx` — provider details via `VerificationModal mode="view"` (lines ~373, ~827); `VerificationModal` branches its whole UI on `mode === 'view'`
- `pages/UsersPage.jsx` — `modalMode === 'view'` drives `UserModal` (lines ~380, ~694, ~1254)

The context panels (`context/*Panel.jsx`) are **stats + quick-action + recent-list**
panels — e.g. `DoctorsPanel` takes `doctorsData.stats/recent`, not a selected entity,
and renders no per-entity detail. There is currently **no detail target** to route to,
so deleting `mode="view"` would remove entity viewing.

### Two viable paths
- **Path A (true to the task):** add a "detail" capability to the context panels — a selected-entity prop + a detail layout per domain — then route row clicks to it and remove `mode="view"`. Larger; a real feature per domain.
- **Path B (cheaper, consistent):** keep a read-only view but render it through the unified `ModalShell` (`hideClose={false}`, no footer/save) instead of the bespoke per-modal `isView` branches. Drops the `mode="view"` *prop sprawl* while preserving the capability. Good interim step if panel-detail isn't wanted yet.

### Affected modals carrying internal `isView` logic
Ambulance, Doctor, EmergencyRequest, HealthNews, Hospital, Insurance, Subscription, SupportTicket, User, Visit, Verification.

### Test checklist (run the dev server)
- [ ] Provider can still view their own profile from Settings (read-only)
- [ ] Admin can still view full provider details from the Verification queue
- [ ] Users page: clicking a user still shows their details (panel or read-only modal)
- [ ] No edit controls appear in any read-only path
- [ ] `npm run build` clean

---

## This session (2026-06-18)
- Fixed the build blocker: duplicate `useEffect` import in `HospitalModal.jsx`.
- Verified 4.1–4.6, 4.9, 4.10 complete; updated `SPRINT_4_DESIGN_TOKENS.md` status.
- Authored this ticket for 4.7 / 4.8.
