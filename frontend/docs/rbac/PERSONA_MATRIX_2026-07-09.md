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
