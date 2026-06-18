---
status: living
owner: DevOps + QA Engineer
last_updated: 2026-06-18
---

# Release Checklist

> Every sprint deploy — staging and production — runs through this checklist. Nothing ships unless everything is green.

---

## Pre-Deploy (Staging)

### Code quality
- [ ] All sprint gate criteria verified by QA Engineer
- [ ] `npm run build` passes in CI
- [ ] `tsc --noEmit` passes (zero TypeScript errors)
- [ ] ESLint passes (zero errors, warnings reviewed)
- [ ] No `console.log` statements added in production code paths
- [ ] No `TODO:` comments introduced in sprint scope (must be tickets, not comments)

### Safety checks
- [ ] No hardcoded credentials or API keys in any changed file
- [ ] No `.env` file changes without explicit PO approval
- [ ] No Supabase schema changes (migrations) without Backend Dev sign-off and separate migration PR
- [ ] No `window.confirm`, `window.prompt`, or `window.alert` in any changed file
- [ ] No mock data object (`mockEmergencyData`, `mockAnalyticsData`, etc.) added or expanded

### Dependency checks
- [ ] No new npm packages added without Frontend Dev + PO review
- [ ] `package.json` version bump if applicable
- [ ] No major version upgrades to React, Supabase, or Tailwind without a dedicated upgrade sprint

---

## Staging Deploy

- [ ] Deploy triggered from the exact commit that passed all gates (not a local build)
- [ ] Staging URL confirmed accessible
- [ ] PO acceptance walkthrough completed on staging
- [ ] No JavaScript errors on page load (browser console clean)
- [ ] Auth flow works end-to-end on staging: login → dashboard → key page → sign out

---

## Pre-Deploy (Production)

- [ ] PO has signed off on staging
- [ ] QA has confirmed no regressions on staging spot-check pages
- [ ] Deploy time chosen: avoid peak clinical hours (08:00–18:00 local hospital time if known)
- [ ] Rollback plan confirmed: previous production deploy is accessible and can be re-deployed within 5 minutes
- [ ] Monitoring dashboards open and ready

---

## Production Deploy

- [ ] Deploy triggered from the exact staging commit (same hash)
- [ ] Deploy completes without errors
- [ ] Smoke test immediately post-deploy:
  - [ ] Homepage loads for each role (Doctor, Org Admin, Admin)
  - [ ] Auth flow works (login, dashboard, one page navigation, sign out)
  - [ ] No JavaScript errors in browser console
  - [ ] Critical path: EmergencyRequestsPage loads and shows real data

---

## Post-Deploy Monitoring (48 hours)

- [ ] Check application error rate (compared to baseline pre-deploy)
- [ ] Check page load times for BentoHome, Analytics, EmergencyRequestsPage
- [ ] Check Supabase query volume (Wallet Payments tab should show reduced query count after Sprint 1 N+1 fix)
- [ ] No user-reported issues in support tickets or Slack

---

## Rollback Criteria

Rollback immediately if any of the following occur post-deploy:

- Auth is broken (users cannot log in)
- EmergencyRequestsPage cannot load (emergency dispatch is a clinical workflow)
- Any page crashes for a user with a live org account
- A hardcoded number appears where the sprint explicitly removed one (regression)
- A `window.confirm` dialog appears in the production app (regression)

**Rollback is not a failure. Not rolling back when required is.**

---

## Post-Sprint Documentation

After production deploy is confirmed stable:

- [ ] Sprint doc status updated to "Closed — [date]"
- [ ] PRODUCT_ROADMAP.md updated: sprint marked ✅ Complete
- [ ] Any new components documented in the relevant INDEX.md
- [ ] RISK_REGISTER.md updated if any risk materialised or was mitigated
- [ ] Next sprint doc status changed from "Locked" to "Ready to start"
- [ ] Short retrospective note added to sprint doc
