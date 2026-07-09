# Persona Matrix — 2026-07-09

## 🎯 Overview

Canonical persona reference from the 2026-07-09 three-agent persona audit. This document records
who actually uses the console (live population), the per-persona surface verdicts, the arbitrations
of record, and the role/provider-type vocabulary bugs found (fixed and remaining). Treat this as the
starting point for any persona-scoped work; the page-level authority remains
`docs/planning/PAGE_REVAMP_GATE.md`.

Scope note: `role` lives on `profiles.role`; sub-personas derive from `profiles.provider_type`
(no schema change — see Arbitrations). The legal `profiles.provider_type` CHECK vocabulary is:
`hospital`, `ambulance_service`, `ambulance`, `doctor`, `driver`, `paramedic`, `pharmacy`, `clinic`.

---

## 1. Live Population (measured 2026-07-09)

| Persona | Signal | Live users |
|---|---|---:|
| Provider — doctor | `role='provider'` + `provider_type='doctor'` | 368 |
| Provider — driver | `role='provider'` + `provider_type='driver'` | 367 |
| Org Admin | `role='org_admin'` | 55 |
| Patient | `role='patient'` | 17 |
| Admin | `role='admin'` | 2 |
| Viewer | `role='viewer'` | 1 |
| Sponsor | `role='sponsor'` | 0 |
| Dispatcher | not a legal role or provider_type | 0 |
| **Total** | | **812** |

The population is effectively two masses (doctors and drivers, 735 of 812) plus an operator layer
(org_admin + admin, 57). Persona investment should follow that shape.

---

## 2. Persona × Surface Verdicts

| Persona | Verdict | Evidence / follow-up |
|---|---|---|
| Admin | ✅ Served | Full-surface authority; no persona gap found. |
| Provider — doctor | ✅ Lens served; ⚠️ fragile count | Doctor-scoped visit counts resolve through a `doctor_name` text join, not a stable id join — fragile to renames/duplicates. Queued as a data-sync bug (see `docs/database/DATA_SYNC_REMEDIATION_AUDIT.md`). |
| Provider — driver | ✅ Lens + dock fixed 2026-07-09 | Dispatch-first Today lens (`isDriver()` derivation, rail slot, Requests "Mine" chip via `responder_id = me`). Commits `2522697e` and `190434e6`. Other responder provider types (`paramedic`, `ambulance_service`) fold into the driver lens per arbitration — no separate lenses. |
| Org Admin | ✅ Reframed; ⚠️ authority open | Approvals honesty reframe applied: the surface now says what org_admin can actually do instead of implying approval power it does not have. Whether org_admin SHOULD hold approval authority is queued as a command-authority decision (same decision class as `docs/implementation/console-service-alignment/contracts/INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md`), not a UI fix. |
| Viewer | ✅ Activation lens; ⚠️ product decision open | Activation/orientation lens is in place. Request-access follow-through (what happens after a viewer asks for a role) is an open product decision. Population: 1 live user — keep investment proportional. |
| Sponsor | ⏸️ Deferred until populated | 0 live users. Read-only grants exist in `AuthContext.can()`; no persona pass until real sponsors exist. |
| Dispatcher | ⏸️ Deferred (not a persona) | 0 users; `dispatcher` is not a legal `profiles.role` or `provider_type` value. Its dead permission grant was deleted from `AuthContext.can()` on 2026-07-09 (see Arbitrations). |
| Patient | ⏸️ Deferred to ivisit-app | 17 live users, but the patient product is `ivisit-app` (canonical). The console never becomes a patient surface ("no parallel truth"). |

---

## 3. Arbitrations of Record (2026-07-09)

1. **Reframe, not grant.** The org_admin approvals gap is an honesty problem first: the UI was
   reframed to describe real capability. Granting new approval authority is a command-authority
   decision that must be argued against backend truth, not patched in the console.
2. **Delete the dispatcher dead code.** The `AuthContext.can()` block granting extra control when
   `provider_type === 'dispatcher'` or `role === 'dispatcher'` was provably dead: `dispatcher` is
   not a legal `provider_type`, and inside the `isProvider()` branch the role is `provider` by
   definition. Deleted 2026-07-09 rather than "activated".
3. **Widen the responder set into the driver lens.** Responder-shaped provider types
   (`driver`, `paramedic`, `ambulance_service`) share one dispatch-first lens instead of gaining
   per-type lenses. One lens, derived from existing data, covering the whole responder population.

---

## 4. Vocabulary Bugs

### ✅ Fixed 2026-07-09

- **`UserModal` provider-type dropdown spoke the wrong vocabulary.** It offered
  `ambulance` / `doctor` / `nurse` / `paramedic`:
  - `nurse` is **illegal** — it is not in the `profiles.provider_type` CHECK set, so every save
    bounced off the database.
  - `driver` was missing entirely — the console's second-largest persona (367 live users) could
    not be assigned from the modal.
  - `ambulance_service` was missing — it is the value `staffSchedulingService` roster queries
    actually consume.
  - Fixed set: `doctor`, `driver`, `paramedic`, `ambulance_service` (labels: Doctor, Driver,
    Paramedic, Ambulance service). Bare `ambulance` was dropped even though it is legal in the
    CHECK: the roster consumers query `ambulance_service`, and offering both invites a silent
    mismatch where a user assigned `ambulance` never appears on any roster. Org-entity types
    (`hospital`, `pharmacy`, `clinic`) are intentionally not person-assignable here.

### ⚠️ Remaining (queued, do not fix blind)

- **`ambulance` vs `ambulance_service` mismatch.** Both remain legal in the DB CHECK; console
  consumers query `ambulance_service`. Any rows carrying `ambulance` (legacy or written by another
  surface) are invisible to those consumers. Needs a data audit + one-vocabulary decision before
  any migration.
- **Stale `ProviderType` TS type.** `src/types/index.ts:13` declares
  `'hospital' | 'ambulance_service' | 'doctor' | 'driver' | 'paramedic'` — it omits the legal
  `ambulance`, `pharmacy`, `clinic` values, so the type lies about the database.
- **Three parallel role ladders.** `src/contexts/AuthContext.jsx` `ROLE_HIERARCHY` (1–5, omits
  `patient`), `src/config/routes.jsx` `ROLE_LEVELS` (10–100, includes `patient`), and
  `src/config/navigation.js` `ROLE_LEVELS` (20–100, omits `patient`). None lists `dispatcher`
  (correct — it is not a role), but the `patient` omissions drop patients to level 0 in two of the
  three ladders. One ladder should own the ordering.
- **Unused `user_roles` table.** Present in generated types (`src/types/database.ts:2520`) with
  zero service/hook/UI consumers; `profiles.role` is the live authority. Decide: adopt or retire —
  do not let a second role source appear by accident.

---

## 5. Pointers

- **Driver-lens commits (2026-07-09):** `2522697e` — driver lens, dispatch-first Today for
  `provider_type='driver'`; `190434e6` — driver derivation without schema (`isDriver()`, rail
  slot, Requests "Mine" chip).
- **Source audits:** the 2026-07-09 three-agent persona audit sessions (population census,
  persona × surface matrix, vocabulary sweep). Distilled process lesson: Lesson 23 in
  `docs/ui-ux/UIUX_REVAMP_PROCESS_AND_LESSONS.md` (persona passes are part of the page loop;
  derive persona signals from existing data before reaching for schema).
- **Page admission authority:** `docs/planning/PAGE_REVAMP_GATE.md`.
- **Data-sync queue (doctor fragile-count et al.):** `docs/database/DATA_SYNC_REMEDIATION_AUDIT.md`.
- **Command-authority decision pattern:**
  `docs/implementation/console-service-alignment/contracts/INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md`.
- **Live derivation code:** `src/contexts/AuthContext.jsx` (`isDriver()`), `src/components/modals/UserModal.jsx`
  (assignable provider-type vocabulary).

---

## 6. Desktop-lane six-agent audit addenda (2026-07-09)

A second, six-agent persona walk (desktop lane) ran the same day; findings below are the residuals
that survive this document's arbitrations and population weighting (dispatcher/sponsor findings
dropped as deferred personas). Ordered by population served. **None are fixed yet — queue entries.**

| # | Finding | Population | Evidence | Fix direction (no schema) |
|---|---|---|---|---|
| 1 | **Statistics page degrades for every provider/driver**: `getAnalyticsIntakePage` omits `providerIdField`, so `applyAuthFilter`'s provider branch defaults to `doctor_id` — a column `emergency_requests` does not have → Postgres 42703 → source-issue fallbacks; the hospitals/ambulances count queries hit the same missing-`user_id` class. | 735 | `analyticsService.js:98-113`; `authService.js:176,226-236` | Pass `providerIdField: 'responder_id'` (exactly what `applyEmergencyRequestScope` already does); guard the count queries on tables lacking the field. |
| 2 | **Console dispatch may never write the column the driver lens reads**: `acceptEmergencyRequest` discards `responderId` (`void responderId;`) and `console_dispatch_emergency` takes no responder profile id. Unless the RPC derives `responder_id` from `ambulances.profile_id` server-side, every console-dispatched run leaves the driver's Requests/Today/"Mine" permanently empty. | 367 | `emergencyService.js:782-788`; `authService.js:230-232` | **Verify the RPC first** (backend read). If it doesn't derive, pass the ambulance's existing `profile_id` through; FK already exists. |
| 3 | **Skipped-onboarding dead-end**: skip sets `role='viewer'`, so Today serves the "ask an admin" activation lens — but a skipped user's correct self-service action is resuming `/onboarding` (still admits them). No surface routes back; the skip-time toast promise ("complete this later from your dashboard") is false. | funnel | `TodayHome.jsx` viewer branch; `onboardingService.js:318`; `OnboardingPage.jsx:50` | Fork the viewer lens on existing `isSkippedOnboarding()`: hero "Finish your organization setup" → `/onboarding`. Driver-precedent presentation fork. |
| 4 | **org_admin with resolved-empty `hospital_ids` ([]) sees the whole platform** on doctors/ambulances/map: `applyAuthFilter` treats `[]` as "skip client filter, RLS handles it", but doctors/ambulances RLS SELECT is public. Also: org_admin with null `organization_id` silently self-scopes everywhere with no explanatory surface. | 55 | `authService.js:66-68,190,198-206` | Make resolved-`[]` scope to nothing (null-uuid `.in()`); keep `null` = trust RLS. Banner for the null-org state. |
| 5 | **Ambulances fleet disagreement**: page projection scopes `.eq('organization_id', orgId)` while `getAmbulances` scopes `hospital_id .in(hospital_ids)`; hospital-linked rows with null `organization_id` appear in one and not the other. | 55 | `ambulancesService.js:64-70` vs `:261-265` | Unify both on the `hospital_id .in()` path (or `.or()` composite). |
| 6 | **Onboarding resubmit duplicates hospitals**: `submitOnboarding` inserts the hospital first; if the profile update fails the error is swallowed, the user stays `pending`, bounces back to the wizard, and resubmit inserts a duplicate. | funnel | `onboardingService.js:261`; `OnboardingContext.jsx:356` | Reuse the earlier-created hospital (match name+phone already in wizard state); surface the profile-update failure with a retry of only that step. |
| 7 | **Vocabulary residuals (joins §4 queue)**: `applyAuthFilter` accepts `role === 'doctor'` as a provider synonym (registered nowhere else — split-brain if such rows exist); `EmergencyRequestsPage`'s local roleKind memo lacks the driver arm (silent divergence when driver rail gets its own slot). | hygiene | `authService.js:211`; `EmergencyRequestsPage.jsx:561-566` | Remove the alias; fold page-local roleKind into one shared resolver. |
| 8 | **Patient hand-off honesty**: locked-out patients get /unauthorized with a "Go to Today" button that loops right back — and no pointer to the product that serves them. | 17 | `ProtectedRoute.jsx:128-131` | Detect `role='patient'`, show "Open the iVisit app" copy; hide Go-to-Today when accessible nav is empty. Console stays not-for-patients per §2. |
| 9 | **Admin Today counts drift at scale**: `fetchEmergencyData` counts client-side from an unbounded list read (Supabase caps at 1000 rows) while Requests uses exact head-counts for the same figures. | 2 | `PageDataContext.jsx:240-253` | Reuse `getEmergencyRequestsPageStats` for the stats slice; fetch only a small recent list. |

Backend-flagged (ivisit-app side, already-known class): visits RLS org/admin SELECT (gap C1),
profiles org-scoped SELECT for org_admin Users/verification, `console_complete_emergency` provider
authority (UI shows drivers a Complete button whose RPC gate is unproven), and #2's RPC derivation.
Full raw findings: desktop-lane session workflow `wf_36b9e5db-1e7` (66 findings, 6 lenses).

### §6 status — fix wave landed 2026-07-09 (same day)

- **#1 FIXED** — `providerIdField: 'responder_id'` + provider-safe hospitals/ambulances count
  scoping (`analyticsService.js`); no more 42703 on Statistics for providers/drivers.
- **#2 VERIFIED SAFE (live DB introspection)** — the live `console_dispatch_emergency` DOES derive
  `responder_id` from `ambulances.profile_id` server-side (`responder_id = COALESCE(v_amb_profile_id,
  er.responder_id)`); 98/168 live requests carry `responder_id`, 321/326 ambulances have
  `profile_id`. The client-side `void responderId` is correct — no change needed.
  **EDGE:** dispatching one of the 5 ambulances with NULL `profile_id` leaves `responder_id` NULL —
  that run is invisible to the driver lens and un-completable by the provider role (data-hygiene
  item, not code).
  **⚠️ PRODUCTION DRIFT FLAG:** the live function predates repo migration
  `20260219010000_core_rpcs.sql` — the migration's **cash-approval dispatch gate**
  (`payment_status` pending/requires-approval check) is **not enforced in production**. Needs a
  backend redeploy decision (ivisit-app side).
- **`console_complete_emergency` PROVEN server-backed** (was backend-flagged above): admin bypass;
  org_admin/dispatcher org-scoped; provider accepted ONLY when `responder_id = auth.uid()` — the
  driver Complete button's promise matches the live gate exactly.
- **#3 FIXED** — skipped-onboarding viewer lens (TodayHome hero "Finish your organization setup" →
  `/onboarding`; plain viewers keep the ask-admin lens).
- **#4 FIXED** — `authService` null-vs-[] contract: resolved-empty `hospital_ids` scopes to nothing
  (zero-UUID `.in()`); org_admin null-org honesty lens in TodayHome ("No organization linked").
  NOTE: the ambulances org_admin scope intentionally supersedes the sentinel with a composite
  `.or(organization_id.eq, hospital_id.in)` so org-direct, station-less units stay visible.
- **#5 FIXED** — both ambulance read paths share `applyAmbulanceOrgAdminScope` (composite `.or`
  mirroring the RLS ownership definition: org direct OR via hospital).
- **#6 FIXED** — `submitOnboarding` idempotent (reuses the pending hospital via
  `resumeOrganizationId` / name+phone match) and honest: `PROFILE_LINK_FAILED` surfaces with a
  retry that re-runs only the profile link — no false success navigation, no duplicate hospitals.
- **#7 FIXED** — `role === 'doctor'` alias removed (authService + the analyticsService guard);
  Requests page roleKind memo gained the driver arm mirroring `useRoleKind`.
- **#8 FIXED** — UnauthorizedPage: "Go to Today" hidden whenever the persona cannot reach `/`
  (loop-proof); patients get hand-off copy pointing to the iVisit app.
- **#9 FIXED** — `fetchEmergencyData` uses exact head-counts (`getEmergencyRequestsPageStats`) +
  a limit-10 recent slice; exposed consumer shape preserved byte-identical.
- **Requests §9/§10 companions closed:** sort whitelist pruned (lane commit `b3da13ee`); KPI stats
  now strip the sheet status — the chips ARE the status dimension (contract comment at the strip
  site); raw Postgres text no longer reaches the UI (console-only); search placeholder now names
  exactly what is searchable (ID / facility / responder / type).
