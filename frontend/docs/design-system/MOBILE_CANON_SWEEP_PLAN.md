# Mobile Canon — Clean-Sweep Plan (goal)

> Written 2026-07-10 as the retrospective + roadmap. Where we are, what the canon IS,
> and the honest plan to bring every remaining mobile page up to it **with no loss of
> function — only improvement**. Companion: `MOBILE_DESIGN_SYSTEM.md` (the spec),
> `docs/audit/DESIGN_WALK_2026-07-10.md` (the walk that surfaced the last cross-cutting bugs).

---

## 1. The journey (main → now)

**444 commits** on `codex/ivisit-console-revamp-checkpoint-20260707` past `main`. The arc:

1. **Docs failed as memory.** Pages drifted (width rule, neutral-shadow law, dropped polish). The
   decision: *canon lives in CODE* — components + contract tests + a harness — not prose.
2. **The kit + the harness.** Extract the gold recipes (`CANON_COMPONENT_SPECS.md`) into the canon
   kit (`components/mobile/canon/`), then build `scripts/check-mobile-grammar.js` — the STATIC
   grammar linter that bans the off-grammar class, not just one instance.
3. **The gold pages, one at a time.** Requests → Today → Hospitals → Ambulances → Doctors →
   Approvals → Users, each **changelog-first** (drop-audit vs the `f31f29f` baseline, so nothing
   is lost), then rebuilt to the same grammar.
4. **Desktop composes the same system.** The console DS (`components/console/`) — desktop pages
   COMPOSE, never re-implement; enforced by `ConsoleDesignSystem.contract.test.js`.
5. **The cross-cutting sweeps.** Multi-select restored estate-wide (mirroring each page's real
   command authority); the dead-opacity surface bug found + fixed + guarded; the KPI chip
   own-hue fix; per-page FAB completeness; provider persona-pass.

The turning point was #1: every regression since has been caught because the canon is a **gate**,
not a memory.

---

## 2. What the canon IS (the thing we finally got right)

### 2a. Structure — page-type grammar
Two reference implementations, chosen by page identity, never mixed:
- **LIST** (`MobileEmergency`): atlas → `MobileHeading` (honest scope count) → `MobileKPIStrip`
  (status/role chips, active tints with its OWN hue) → `SearchRow` → adaptive grouped panels →
  tap→`MobileDetailSheet` → dock (nav pill + route-owned FAB).
- **DASHBOARD** (`MobileToday`): signal hero → 2-up NAVIGATION tiles → action sheet. Tiles
  navigate; they never filter.
- **DIRECTORY** expression of LIST: groups by an operational question, adaptively.

### 2b. Data-sync — measure, never assume
- **Audit the chain** before code: source truth → service → hook → UI → payload → receiver → app
  consequence. **No parallel truth.**
- **Adaptive DATA-DRIVEN grouping** (`resolveAdaptiveGroups`): score a factor on the real data;
  use it only if it distributes (2–8 groups, ≤50% singletons, ≤85% max share); else fall to
  coarse recency. Decided per-render — the same page adapts to the tenant.
- **Persona-pass**: a provider's avatar/label is its `provider_type` (responder vs clinician),
  never a generic role. Split where the data carries it; never fabricate it where it doesn't.
- **Fail-closed commands**: unproved create/invite/delete/status stay disabled with honest
  reasons — the mobile surface mirrors desktop authority, never invents a live mutation.

### 2c. The 5-stage state model (the "five levels")
A canon list manages its data lifecycle in five honest stages, none skipped:
1. **Warm-up** — `useSkeletonWarmup` forces a group-shaped skeleton on cached bottom-nav mounts.
2. **Load** — skeleton until first data; replace-in-place, no entrance stagger.
3. **Buffer** — `useStableList` holds placeholder rows through scope changes (no flash-to-empty).
4. **Refetch** — `isFetching` → the "Updating" pill; a background refresh never re-skeletons.
5. **Terminal** — empty / filtered-empty / search-empty / error / degraded, each with an honest
   reason + a recovery action.
Plus the **id-keyed accumulator** (load-more APPENDS, never replaces the window — the Hospitals
bug), **scope-count integrity** (the heading tracks the active KPI, never the raw total), and
**selection mode** (long-press → shared selection → bulk bar, action gated by authority).

### 2d. The harness — canon enforced, not remembered
Every page-close now passes, mechanically:
`check-mobile-grammar.js` (grammar tier anatomy + **opacity-hygiene guard** + **FAB completeness**
+ polish/motion + selection + dock/FAB) · per-lane contract tests · `check-ui-surface-hardgate.js`
(borderless / radius / no colored shadow) · `check-data-contract.js` (no phantom DB columns) ·
mojibake · and the live click-test matrix (`MOBILE_PAGE_CLOSE_CHECKLIST.md`).

---

## 3. The standard — "up to canon, no loss of function"

A page is canon when it passes the harness AND: (a) every affordance the baseline page had is
**preserved or improved** (guaranteed by the changelog-first drop audit vs `f31f29f`); (b) commands
keep their **exact authority** (fail-closed stays fail-closed; authorized stays authorized); (c)
metrics are **honest** (measured where the projection is proved, labeled visible/source-pending
where not); (d) it renders the full 5-stage state model; (e) it owns a dock FAB or an honest
exemption. "Improvement, not loss" is the whole contract of the sweep.

---

## 4. Remaining pages — HONEST scope (the gate decides order)

The sweep is **not** "rebuild all." Most remaining pages are `intake-only, not admitted` in
`docs/planning/PAGE_REVAMP_GATE.md`: their command/projection blockers must close first (exactly
as Users needed Phase A's server-projection before its mobile rebuild was unblocked). The mobile
lane cannot front-run a gate.

| Page | Mobile tier | Gate status | Sweep readiness |
|---|---|---|---|
| **Support Tickets** (10) | list-migrating | **admitted** (guarded continuation) | ✅ **Rebuild now** |
| **Health News** (11) | list-migrating | **admitted** (read-only; no authoring) | ✅ **Rebuild now** (read-only) |
| **Subscriptions** (17) | list-migrating | visual-only pass applied; backend intake-only | ◐ **Finish the grammar** (grouped panel) as a visual-only pass; commands stay fail-closed |
| **Insurance** (12) | list-migrating | intake-only, not admitted | ⛔ Gated — desktop closes policy/billing/Storage/receiver blockers first |
| **Pricing** (18) | list-migrating | intake-only, not admitted | ⛔ Gated — facility scope + pricing source owner + quote consequence |
| **Organizations** (15) | exempt | intake-only, not admitted | ⛔ Gated — org identity + wallet scope + command authority |
| **Settings** (16) | exempt | intake-only, not admitted | ⛔ Gated — own-user projection + auth/preference/billing receivers |
| **Analytics** (13) | exempt | intake-only, not admitted | ⛔ Gated — actor-scoped projection + export scope (report surface, not a list) |
| **Wallet** | dashboard | admitted · **read-only** (guarded continuation); money-moving submit / card delete / payout setup / cash approval **GATED** | ◐ **Landed with waivers** — classified dashboard-tier but via a `grammar:hero` waiver (inline finance headline, not the canon signal hero) + VitalTrack N/A; writes gated. NOT full-canon "done". |

---

## 5. The plan (ordered, per-page process)

**Per-page process (the proven loop):** changelog-first drop audit (vs `f31f29f`, nothing lost) →
data-sync (schema + real grouping axis + persona + command authority) → design (canon LIST
anatomy) → rebuild → verify (grammar + opacity guard + FAB + contract + hardgate + parse) → live
click-test → flip the grammar tier `list-migrating → list` so the harness enforces it forever.

- **Phase 1 — authorized now (mobile lane owns it):**
  1. **Support Tickets** → full canon LIST (Doctors/Users template). Data-sync: ticket status is a
     real lifecycle (`resolveVital('support')`), so status is a genuine grouping/pill axis (unlike
     the degenerate Doctors/Users status). Commands per its admitted authority.
  2. **Health News** → canon LIST, read-only (authoring stays blocked). Draft/published lifecycle
     is a real axis.
- **Phase 2 — finish the partial:**
  3. **Subscriptions** → complete the grouped-panel grammar over its existing visual-only pass;
     subscription VitalTrack + month-grouped feed already present; commands stay fail-closed.
- **Phase 3 — follows desktop admission (NOT front-run):** Insurance, Pricing, Organizations,
  Settings, Analytics. For each, the mobile canon rebuild is the **last step of its admission**,
  after the desktop lane proves projection + command authority + receiver (the Users pattern).
  Where a projection is already honest, a **visual-only canon pass** (grammar only, commands
  fail-closed, metrics labeled) may land earlier — but route-owned promotion + hardgate admission
  are gated, and that's a governance call, not a mobile-lane one.

**Definition of done for the sweep:** every `list-migrating` entry in the grammar manifest is
either `list` (rebuilt + harness-enforced) or carries an explicit, reasoned gate deferral — and
the manifest has zero silent `list-migrating` debt.
