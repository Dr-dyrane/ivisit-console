---
status: living
owner: QA Engineer
last_updated: 2026-06-18
---

# QA Protocol

> How every change type is tested before it reaches production. The QA Engineer owns this document and the gate sign-off process.

---

## Testing Layers

Every sprint change goes through all applicable layers before gate sign-off. Layers are not optional.

| Layer | Tool | Who runs it | When |
|---|---|---|---|
| Build check | `npm run build` | FE Dev (before PR) + CI | On every PR |
| TypeScript check | `tsc --noEmit` | CI | On every PR |
| ESLint | `npm run lint` | CI | On every PR |
| Code audit | QA Agent | QA Engineer | Before gate sign-off |
| Manual walkthrough | Browser + role switching | QA Engineer | Before gate sign-off |
| Accessibility check | Manual + `axe` DevTools | QA Engineer | After any new component ships |
| Regression check | Manual spot-check | QA Engineer | Before gate sign-off |

---

## Manual Walkthrough Protocol

For every sprint, QA walks through the affected pages with each role that uses them.

### Role Testing Matrix

| Role | Login as | Test account type | Pages to test |
|---|---|---|---|
| Doctor / Provider | Provider test account | Live account with at least 1 visit | All provider-accessible pages |
| Org Admin | Org Admin test account | Org with at least 1 doctor, 1 pending verification | All org_admin pages |
| Admin | Admin test account | Platform admin | All pages |
| Viewer | Viewer test account | New account, no role yet | Dashboard, Health News, Settings |

### Walkthrough Checklist (per page changed)

For each page modified in the sprint:
- [ ] Page loads without JavaScript errors (check browser console)
- [ ] Page loads without blank/white sections
- [ ] All visible text is real data or an explicit empty state (not a placeholder like "John Doe")
- [ ] All buttons/links navigate or act correctly
- [ ] All modals open and close correctly (test open, test close by X, test close by backdrop)
- [ ] No `confirm()` / `alert()` / `prompt()` browser dialogs appear
- [ ] Keyboard navigation: Tab moves focus in logical order, Enter/Space activates buttons
- [ ] Screen reader label check: interactive elements have visible labels or aria-label
- [ ] Mobile (375px viewport): page is usable, no overflow, no hidden actions
- [ ] Dark mode: page renders correctly without contrast failures
- [ ] Empty state: if the page has no data, it shows a meaningful empty state (not blank)

---

## Sprint-Specific Test Protocols

### Sprint 1 — Trust & Correctness

**Additional checks:**
- Log in as a brand-new org with zero data. Visit BentoHome. Confirm no stat card shows a number that is not derived from real data.
- Visit Analytics on a new org. Confirm synthetic charts are not displayed without a disclosure banner.
- On EmergencyRequestsPage: attempt a bulk cancel action. Confirm a modal appears — not a browser confirm dialog.
- Impersonate org_admin, click Hospitals in nav. Confirm page loads (not a "denied" error).
- Impersonate org_admin, click Insurance in nav. Confirm page loads.
- Visit VerificationQueue as a user without `canVerify` permission. Confirm a readable error message appears.

### Sprint 2 — Home & Navigation

**Additional checks:**
- Doctor login → home screen → confirm a "Your visits" card exists and shows real data or an explicit "No visits today" empty state (not a hardcoded number)
- Org_admin login → home screen → "Pending Approvals" card present
- Mobile (375px): bottom bar slots match the deterministic spec per role
- All renamed nav labels correct: "Pending Approvals", "Account Settings", "Verification Queue", "Transaction History", "Patient Payments", "Quick Actions"
- Viewer login → orientation card visible on home

### Sprint 3 — Page Polish

**Additional checks:**
- EmergencyRequestsPage on a touch device (or 375px viewport): primary action buttons (Dispatch, Complete) visible without hovering
- SupportTicketsPage as a provider: only their own tickets visible, "Report a Problem" button at top
- HealthNews: confirm provider cannot access the page (or can only access a read-only feed if split was chosen)
- UsersPage: only one "Add User" button visible; no "Create User" / "Invite User" ambiguity

### Sprint 4 — Design Tokens

**Additional checks:**
- Open every entity modal (Doctor, Hospital, User, Ambulance, Emergency, HealthNews, Insurance): all modals have identical outer shell, button shape, and label style
- All modals: `role="dialog" aria-modal="true"` present (check DevTools Elements panel)
- Open DevTools console while using modals: confirm no `window.dispatchEvent` calls appear in console (add a temp listener in DevTools to verify)

### Sprint 5 — Data-Gated Pages

**Additional checks:**
- Analytics on a new org (zero data): explicit empty state shown, no charts, no synthetic data
- Analytics on an org with 30 days of data: charts render from real data
- WalletManagementPage Payments tab: open DevTools Network panel, switch to Payments tab, count Supabase requests — must be 1 or 2, not 50
- BentoHome on a new org: no numbers shown except 0 for counts (not 48, 24, 12, etc.)

---

## Device and Browser Matrix

| Device | Browser | Priority |
|---|---|---|
| Desktop (1280px+) | Chrome latest | P0 |
| Desktop | Safari latest | P0 |
| Mobile (375px) | Chrome (Android) | P0 |
| Mobile (375px) | Safari (iOS) | P0 |
| Tablet (768px) | Chrome | P1 |
| Desktop | Firefox | P2 |

---

## Regression Spot-Check

After each sprint, spot-check these high-risk pages for regressions (even if they were not changed):

- BentoHome — most complex page, consuming many contexts
- EmergencyRequestsPage — realtime subscription + most action types
- LoginPage — never break auth
- SettingsPage — profile data, sign out

For each: load the page, confirm it renders, perform one primary action, no console errors.

---

## QA Sign-Off Template

*(QA Engineer copies this to the sprint doc when signing off)*

```
Gate verified ✓

Sprint: [N]
Date: [YYYY-MM-DD]
QA Engineer: [name]

Automated checks: npm run build ✓ | tsc ✓ | eslint ✓
Code audit (QA Agent): All gate criteria PASS
Manual walkthrough: Completed on [device] + [device]
Roles tested: [Doctor / Org Admin / Admin / Viewer as applicable]
Regressions: None observed on spot-check pages

Any deferred items: [none / description]
```
