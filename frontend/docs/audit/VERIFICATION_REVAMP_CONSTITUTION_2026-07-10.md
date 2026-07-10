# Approvals (Verification) Desktop — Change Log, Constitution & HARNESS VERDICT (2026-07-10)

> Built by the hardened harness AS A STRESS TEST (user: "we have had so many redirections to
> [the] approval page — lets test our guardrails and see if we would land a pixel perfect page
> revamp"). Produced changelog-first by three parallel scouts (historian + data-sync/write-register
> + structure/invariants) + live-DB attempt. This is a **dual-queue** page (providers ⇄ facilities)
> — structurally unlike the single-list pages the guardrails were built on. Baseline = `15acf6c9`
> (the checkpoint that birthed `VerificationQueue.contract.test.js`; note: that contract carries NO
> pinned baseline SHA). Legacy dual-queue origin `921f42c8`; RBAC `cc96998f`.

## 0. THE HARNESS VERDICT (the point of this exercise)

**Would the guardrails, by themselves, land a pixel-perfect revamp? NO — and that is the valuable
result.** They handle STRUCTURE/COMPOSITION/INTERACTION and *do* generalize to a dual-queue page,
but only with discipline, and the test exposed real seams AND a whole axis the gates can't see.

**A. The gates generalize to dual-queue — IF composed "single-shared-list."** A dual-queue page is
TWO DATASETS behind ONE canonical render (the queue axis is orthogonal to the retired
grid/list/table axis). Compose: `WorkspaceStage` → a neutral **queue toggle** (Providers|Facilities,
its own control, NOT a KPI chip) → `SignalPanel`(active queue) → `KpiStrip`(status filter within
queue) → ONE `ActivitySheet` with ONE shared `ApprovalListHeader` (single Time `SortableColumnHeader`)
and rows swapped by `queueType`. That keeps `<SortableColumnHeader` at count===1 and one list
surface, so every estate law applies.

**B. The gates found FIVE real seams (the "did it find the seams?" answer = yes):**
1. **Queue-blind mechanism checks.** The registry greps a token exists ONCE — it cannot tell
   selection/keyboard-nav is wired to BOTH lanes or just providers. A dual-queue page could wire
   selection to providers only and stay green. *The exact silent-omission hole the registry closes,
   reopened along the queue axis.*
2. **TIME-only-sort counting assumes single-list.** `(...match(/<SortableColumnHeader/g)).length===1`
   is a whole-file string count. Two per-queue headers → count===2 → fails though only one shows.
   Reconciled by the single-shared-header discipline; if a page genuinely needs two, the gate must
   become queue-aware.
3. **interaction-completeness `LIST_PAGES[]` is a rigid `{page, modal}` pair.** Verification has a
   provider modal PLUS a modal-less facility inline write — the pairing shape mismatches; only the
   `animate-spin in page OR modal` disjunction saves it (the rail carries the facility spinner).
4. **single-source-color is a PATTERN, not a gate.** Nothing binds a page's colors to one module —
   and verification ALREADY drifts across 4 surfaces (page `getStatusBadge` vs org ternary vs rail
   switch vs mobile `hsl()`). Needs a `constants/verificationStatus.js` + a contract pin.
5. **Pages not in the gate maps are invisible.** Verification is in NONE of the DS-contract
   `surfaces{}`/`LIST_PAGES[]` maps, so every gate SKIPS it silently. Adoption must ADD it to all
   three — otherwise "green" means "not checked."

**C. The gates don't see DATA TRUTH at all — that axis is caught only by the archaeology's data-sync
step (below), never by a visual/structural gate.** The scouts found 8 correctness bugs (F1–F11) a
pixel-perfect *looking* page would still ship. **Conclusion: canon-conformance (gates) + data-sync
review (archaeology) + queue-axis gate-hardening — all three — is what lands a correct dual-queue
page. The gates alone guarantee conformance, not correctness.**

## 1. Write register (approvals are the CORE live writes — "how the page speaks to the website")

| Action | Receiver | Live |
|---|---|---|
| Approve provider | `verifyProvider` → `rpc update_profile_by_admin {bvn_verified:true}` (SECURITY DEFINER, admin-only) — flips `profiles.bvn_verified` that ivisit-app reads | ✅ |
| Reject provider | same RPC `bvn_verified:false` — **no-op** on already-false pending providers (F1) | ⚠️ |
| Approve facility | `verifyOrganization` → `rpc update_hospital_by_admin {verification_status:'verified',verified:true}` | ✅ |
| Reject facility | same RPC `{verification_status:'rejected',verified:false}` — real tri-state | ✅ |
| Bulk approve/reject | provider-only loop; **but the bar renders on BOTH queues → org ids misfire against `verifyProvider`** (F4) | 🐞 |
| Save verification notes | **NONE** — `profiles` has no `verification_notes`; phantom field (F5) | ❌ |
| Modal edit-mode save | **UNREACHABLE** — page always opens `mode='view'`; would misfire (F11) | ❌ |

## 2. Findings (data-truth bugs the GATES CANNOT SEE — caught by data-sync)

- **F1 FLAG (core):** providers have **no real rejected state** — `bvn_verified:false` == pending;
  `stats.rejected` hardcoded 0; the "rejected" provider filter == pending rows. Decide: add a
  provider `verification_status`/rejected column, or **remove Reject for the provider lane**.
- **F2 FIX:** provider status badge is data-broken — list/table render `provider.verification_status`
  (nonexistent on `profiles`); an APPROVED provider shows a "pending" badge. Project `bvn_verified`
  → approved/pending.
- **F3 FIX:** desktop AnalyticsModal always fed provider `stats` even on Facilities (mobile branches).
- **F4 FIX:** bulk is provider-only but renders on both queues → bulk-approve a facility calls
  `verifyProvider(orgId)` and fails. Scope the bar to providers or branch on `queueType` (+ add an
  org bulk path).
- **F5 FLAG:** `verification_notes` phantom (no column, no receiver). Wire an audit/notes write or remove.
- **F6 FLAG:** ViewToggle only affects the Providers lane (Facilities ignores `viewMode`) — dies with
  the one-canonical-render conversion anyway.
- **F7 FLAG (structural):** entirely outside the console DS + estate-law registry (§0).
- **F8 FLAG:** realtime gap — the org subscription filters `verification_status=eq.pending`, so an
  approve moves the row off pending and NO event fires (facility approvals only refresh via manual
  fetch). Provider sub fires. Also `hospitals` writes `verification_status` + `verified` together
  (dual-truth drift risk).
- **F9 FLAG:** the Facilities queue truth source is the **`hospitals`** table, not `organizations`
  (which has no `verification_status`). Any non-hospital org type never appears. Naming is cosmetic.
- **F10 QUEUE:** valuable approval signals hidden — providers: `provider_type` (doctor vs driver! the
  FAB scopes by it but the card never shows it), onboarding/org/phone/payout readiness; facilities:
  `org_admin_id`, `provider_source`, phone, eligibility trio, coordinates. Enrich projections + rail.
- **F11 FIX:** dead code — unused `sortConfig`, unreachable modal edit path, duplicated badge logic,
  colored-glow shadows + entrance staggers.

## 3. Perks that MUST survive

Dual-queue toggle (resets pagination/selection/focus on switch); `?queue=organizations` +
`?type=driver` deep-links (the Hospitals/Ambulances FAB + navbar receivers — LOAD-BEARING); provider
+ facility approve/reject; RBAC split canReview(org_admin+admin) vs canApprove(admin-only) with
honest role-gated empties; filters (search/status/date) + status KPIs; analytics modal;
per-queue exact-count pagination; per-lane realtime; bulk approve/reject (providers); mobile
projection (no local re-filter); VerificationDetailRail; right-panel route-context publish; seq-ref
race guards + transient-error fail-soft; facility `approved`⇄`verified` normalization.

## 4. Stranded VerificationPanel edit — LAND it (verified)

The uncommitted +28/-2 is the **missing receiver half** of a committed-but-dangling chain: the page
already PUBLISHES `verificationPanelContext` and `ContextPanel` already PASSES
`verificationContext=` into `<VerificationPanel>`, but the committed panel signature
`({verificationData, loading})` **ignores it** — so queue-aware stats + the focused selection never
reach the panel. The edit closes the loop, uses canonical tokens (literal palette, no border/ring),
and its entrance motion matches the panel's existing idiom. **Land it in the revamp commit.** One
caveat: its "Selected" mini-card duplicates the richer VerificationDetailRail — decide whether the
panel echoes selection or leaves it to the rail.

## 5. Decisions needed BEFORE composition (product/architecture — not mine to make)

1. **Provider Reject (F1):** remove Reject for providers (they have no rejected state), or add a
   provider `verification_status` column (backend, ivisit-app)?
2. **Stranded panel "Selected" card:** keep it (panel echoes selection) or drop it (rail owns detail)?
3. **RBAC panel gate:** `ContextPanel` gates the verification panel `isAdmin()` ONLY, but the page is
   org_admin-reachable — an org_admin who reviews gets NO panel. Widen to `isOrgAdmin` (match
   canReview) or keep admin-only deliberately?
4. **Phantom notes (F5):** wire a real notes/audit write, or remove the decorative textarea?
5. **Queue-blind gate-hardening:** harden the estate laws for the queue axis now (make the checks
   queue-aware so both-lane wiring is provable), or accept the single-shared-list discipline +
   recorded exclusions as sufficient?

## 6. Compose plan (once decisions land)

`WorkspaceStage`(atlas+dock+rail) ← `min-h-screen`+`<Tabs>`; neutral queue toggle ← amber `<TabsList>`;
`SignalPanel`+`KpiStrip` ← the 5 bento status cards (kills entrance stagger + colored glows); ONE
`ActivitySheet`+`SheetToolbar`+shared `ApprovalListHeader`(single Time sort)+queue-swapped
`ListRowShell` rows ← ViewToggle+grid/list/table+the two view files (deleted); `constants/
verificationStatus.js` single-source ← `getStatusBadge`/org ternary/rail switch/mobile hsl;
`useRowSelection(activeItems)` ← local handleSelect; `useListKeyboardNav`+`useScrollResetOnPage`
(keyed on currentPage AND queueType) ← row onKeyDown; `loadError` honest-failed-hero ← toast-only
errors; `isFetching` surfaced; `hasFilter ?` branched empty; `DetailRailShell`+`RailInsetHero` ←
bespoke rail; fix F2/F3/F4. **HARNESS deltas same-commit:** add `verificationQueue` to all three
`ConsoleDesignSystem.contract` maps; INVERT `VerificationQueue.contract.test.js` (it currently PINS
ViewToggle/amber-tab/bento/ListView+TableView — those must flip to pin the DS composition); pin the
verification color source. Verify: full gate stack + drop audit vs `15acf6c9`.
