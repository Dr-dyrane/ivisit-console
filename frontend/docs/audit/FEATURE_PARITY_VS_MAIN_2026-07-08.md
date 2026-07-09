# Feature-parity audit — revamp branch vs `main`

> **Date:** 2026-07-08 · **Baseline:** `main` @ `f31f29ff` (also the merge-base — the revamp is entirely downstream) · **Method:** 17 per-domain read-only audits. For each domain, every user-facing capability on `main` (page + views + modals + mobile + context panel + hook + service) was enumerated, then the current tree was grepped to confirm whether each capability is genuinely gone vs merely relocated by the data-layer refactor. Only verified losses are listed.

## How to read this

The revamp bundled three things: a **UI revamp**, a **data-layer refactor** (React-Query rewrite; hook/service consolidation), and a deliberate **"no parallel truth" command-safety program** that gated most write/destructive actions. So a raw `git diff` massively over-reports. Findings are bucketed by *intent*:

| Bucket | Meaning | Action |
|---|---|---|
| **A. Silent drops** | Capability gone, **no** contract test / **no** "unavailable" UI copy / **no** decision doc. Looks like a migration oversight. | **Fix or gate deliberately** |
| **B. Read/desktop regressions** | At-a-glance data or robustness lost as a side-effect of the rework. | **Fix** |
| **C. Degraded / dead UI** | Control renders but is inert, or shows zeros. | **Polish** |
| **D. Deliberate authority-gating** | Write/destructive commands intentionally disabled ("…until X authority is verified"), documented in contract tests + `PAGE_REVAMP_GATE.md` + `INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07.md`. | **Confirm intent** (some backends now support the write) |
| **E. Home redesign** | Bento dashboard → task-oriented `TodayHome`; at-a-glance widgets dropped. | **Verify vs active Home lane** |

---

## A. Silent drops — likely accidental (no gate, no messaging)

These are the standout fix candidates: unlike every other gated domain, they have **no contract test and no "unavailable" affordance** — the capability simply isn't wired.

| # | Domain | Lost capability | Conf. | Evidence (main) → current |
|---|---|---|---|---|
| A1 | Doctors | **Delete doctor** (single) — gone from list/table/mobile | High | `DoctorsPage` `handleDelete`+`ConfirmationModal`+Trash2 → none; `deleteDoctor` orphaned in `doctorsService.js:313` |
| A2 | Doctors | **Row selection + bulk delete** | High | `BulkActionBar`+`selectedIds` → removed; no checkboxes in table/mobile |
| A3 | Support | **Delete ticket** | High | delete in page/list/table/mobile → only `onView`/`onEdit`; views now orphaned; `deleteSupportTicket` uncalled |
| A4 | Support | **Bulk delete** | High | `BulkActionBar`+checkboxes → removed |
| A5 | Support | **"Assign to me"** (provider self-assign, mobile) | High | `onAssign`/`canAssign` → not passed; `assignTicket` uncalled |
| A6 | Emergency | **Bulk cancel** (multi-select) | High | `selectedIds`+`executeBulkCancel`+bulk bar → none. **Not in any contract test** |
| A7 | Emergency | **Column sort UI** — plumbing kept, control dropped | Medium | `sortConfig` still sent to service, but no `setSortConfig`/sort headers → stuck newest-first |
| A8 | Emergency | **Mobile dispatch** action | Medium | mobile `onEdit`→`handleDispatch` → mobile now view-only (cash approve still works). Cancel removal *was* contract-gated; dispatch is the gap |

> **Pattern:** A1–A5 are the two domains (Doctors, Support) that never received the "command-safety" treatment applied everywhere else — either an oversight in the gating rollout, or they're meant to keep these actions and lost them in the React-Query rewrite. A6–A8 are Emergency controls dropped alongside the legacy density views (sort plumbing surviving strongly suggests oversight).

## B. Read-side / desktop regressions — fix

| # | Domain | Regression | Conf. | Note |
|---|---|---|---|---|
| B1 | Visits | **Page crashes at scale** — `getVisitsPageData` resolves statuses client-side with a 5,000-row cap and *throws* past it → admin sees "Visits could not load" instead of pagination | Medium | `visitsService.js:20,314-316`. Main paginated server-side. Bites only at >5k in-scope rows |
| B2 | Organizations | Desktop **"Network Float" ($)** + **"Avg Fee" (%)** aggregate KPIs gone (a code comment even claims they're "retained in strip," but strip shows *counts*) | Medium | Survive on mobile; `totalWallet` still computed but unused on desktop |
| B3 | Pricing | Desktop **"Avg Base Cost"** KPI gone | Low-Med | Survives on mobile |
| B4 | Insurance | Analytics **provider/category distribution now page-scoped** ("Visible page only") instead of full dataset | Med-Low | Side-effect of server pagination; aggregate KPIs still accurate |
| B5 | Insurance | **Search dropped `policy_holder_name`** (now number/provider/plan_type) | Low | Holder name still displayed, just not searchable |

> **Sub-pattern (B2/B3):** when desktop KPI *cards* became count-only *state-strip chips*, several money/percentage aggregates were silently dropped on desktop while surviving on mobile.

## C. Degraded display / dead UI — polish

| # | Domain | Issue | Conf. |
|---|---|---|---|
| C1 | Analytics | Sponsor **Subscription card renders `0/0/0`** instead of hiding (admin-only scope now) | Low-Med |
| C2 | Subscriptions | Bulk-select **checkboxes still render but are inert** (dead UI) | Low |
| C3 | Verification | Desktop page-footer summary ("Page X of Y • N pending") removed (pagination control still works) | Low |
| C4 | Verification | Mobile trend-delta chips removed | Low |
| C5 | Settings | A **viewer** can no longer open Support from the Settings page (gets a toast; role gate admits provider+) | Low |

## D. Deliberate authority-gating — BY DESIGN (confirm intent)

The "no parallel truth" program: the console must not write canonical shared tables until the backend receiver/RLS/app-consequence is proven. Each is documented (contract test + `PAGE_REVAMP_GATE.md` + the Insurance authority doc) and surfaces an "unavailable until … verified" notice. **These are not bugs** — listed so you have the full picture of what the console can no longer do.

- **Insurance** — create / edit / delete / verify / bulk, + card-image view/upload. *(Backend `insurance_policies` is patient-owned, no admin write RLS — genuinely can't write.)*
- **Pricing** — create / edit / delete / bulk (`PRICING_MUTATION_COMMANDS_ENABLED = false`).
- **Organizations** — create / edit / delete / bulk (+ fee-change confirm flow).
- **Hospitals** — create / delete / bulk / **staff-scheduling** / bed-reservation lifecycle actions / image upload.
- **Ambulances** — driver assignment / trip-management + utilization / delete / bulk / image / **crew rating** / last-maintenance date.
- **Users** — invite / create / delete / bulk.
- **Subscriptions** — edit / delete / bulk.
- **Health News** — create / edit / delete / publish-unpublish / bulk, + **admin draft visibility** (drafts now invisible; a dead "Draft" filter option remains).
- **Analytics** — CSV export (all surfaces); org-admin finance card; sponsor subscription scope.
- **Emergency** — mobile destructive shortcuts; unified "all requests" view (default now `pending` only; can't view bed+ambulance together).

> **Backends that already support the gated write** (so the gate is a UI-policy choice that *could* be lifted): **Hospital delete** (`delete_hospital_by_admin` RPC exists), **User delete** (`delete_user_by_admin` RPC exists).
>
> **App-wide consequences worth noting:** **staff scheduling** is now unreachable anywhere (HospitalsPage was its only entry → `StaffSchedulingModal` orphaned); ambulance **driver/trip management** is entirely gone from the console.

## E. Home / dashboard redesign (bento → TodayHome)

The per-role bento dashboard (`BentoHome`, 1484 lines) was replaced by task-oriented `TodayHome` for all console roles. At-a-glance data dropped from the home: recent-activity feed (all roles), wallet snapshot, response-time, subscription counts, analytics snapshot, system-status bars, entity counts (hospitals/ambulances/users), role status footer.

- ⚠️ **Genuine access hole:** **Sponsors lost all wallet/income visibility** — the home widget was their only view, and `/wallet` is gated at `org_admin`.
- 🔧 The dead `AdminHome` / `OrgAdminHome` / `SponsorHome` / `ViewerHome` files are **the same files the concurrent lane currently has dirty** — that lane is very likely rebuilding these role dashboards. **Re-verify Home findings against that lane before acting.**

---

## Appendix — verified NON-losses (cleared)

Deletions that looked alarming but are dead-code removals or clean moves (confirmed zero importers on `main`, or logic relocated):

- **Services/hooks:** `adminService.js` (847 lines) + `useAdmin.js` — dead on main. `useVisits.js` + `medicalProfilesService.js` — dead on main. `subscribersService.js` — dup of `subscriptionService.js`. `useAmbulances.js` — orphaned on main. `useHospitals.js` — split into `useHospitalsQuery`/`useHospitalsMutations`. `useHealthNews.js` — moved to service. All domain service mutation fns still exist (just unwired where gated).
- **Components:** `SupportTicketSimpleListView.jsx`, `BulkImportModal.jsx` / `hospitalImportService` — never mounted on main. `HospitalFleetManager` — orphaned in both trees.
- **Whole domains at parity:** **GodModeMap** (MapProvider moved to `App.js`; all renderers/refiners/layers/realtime intact), **Auth/Onboarding** (all login methods, wizard steps, password flows retained + some hardening), **Verification** (role-gate tightening removed only non-functional buttons; org "approved" filter is a *net bug-fix*).
- **Emergency:** cash-processing was already dead on main (`canProcessCash:false` both); service layer is a superset.

---

## Recommended next actions

1. **Fix the silent drops (A)** or give them the same explicit gate as their peers — decide per capability whether Doctors/Support/Emergency destructive+assign+sort actions should work or be formally gated.
2. **Fix Visits scale crash (B1)** — restore server-side pagination or raise/stream past the 5k resolver cap (a correctness bug regardless of intent).
3. **Restore desktop money/% KPIs (B2/B3)** dropped in the card→chip rework (data still computed).
4. **Close the sponsor wallet gap (E)** — give sponsors a read-only wallet view, or a home money widget.
5. **Confirm the authority-gating list (D)** is the intended end-state; lift the gates whose backend now supports the write (hospital/user delete).
6. **Polish C1–C5** (hide vs zero, remove dead checkboxes, etc.).
