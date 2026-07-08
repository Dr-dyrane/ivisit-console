# Mobile Energy Rollout Plan

> **Goal:** carry the approved mobile design *energy* — the one the user signed off on
> (frosted borderless shell · readable 2-line identity rows · date-grouped feeds ·
> VitalTrack lifecycle context in detail · identity-island detail · one authority-gated
> state-CTA · graduated Apple-HIG press) — to **every** page, so the whole app reads as
> one design. `MobileVisits.jsx` is the flagship reference; this plan makes the rest match.

Status: **Wave 0 (spine) + Wave 1 (Support Tickets proof) BUILT & VERIFIED — awaiting
green-light on §0 (The Standard) before the wide Wave 2 fan-out.**
Branch: `codex/ivisit-console-revamp-checkpoint-20260707`
Companions: [`CONSOLE_DESIGN_SYSTEM_FROM_APP.md`](./CONSOLE_DESIGN_SYSTEM_FROM_APP.md) · [`MOTION_AND_INTERACTION_CANON.md`](./MOTION_AND_INTERACTION_CANON.md)

### Progress log
- **Wave 0 spine — DONE.** New: `constants/vitalTracks.js` (grounded lifecycle→track +
  status pill), `utils/groupByMonth.js` (date-group). Extracted: `MobileDetailIslands.jsx`.
  Additive props on `MobileMetricRow`: `statusPill`, `secondary`. Verified: `vitalTracks.test.js`
  + `groupByMonth.test.js` = **27/27** (incl. the lock proving every display step is a real
  `lifecycles.js` state).
- **Wave 1 — Support Tickets — DONE.** `MobileSupportTickets.jsx`: status pill + secondary
  meta (blade removed), date-groups by `created_at`, expanded detail = VitalTrack
  (open→in_progress→resolved) + identity islands (Requester/Priority/Category/Opened) +
  message + CTAs. Verified: `SupportTicketsPage.contract.test.js` **7/7**, mojibake clean,
  strict-radius hardgate clean (no new violations on touched files), live compile clean at
  390px (queue currently empty in DB, so rows shown as a faithful mockup for sign-off).
- **Borderless + app-grounded CTA pass (user feedback 2026-07-08) — DONE.**
  Removed the `MobileMetricRow` 2px left-accent bar (+ dead `attentionPulse` prop) — status is
  now icon tone + pill only. `sheet.jsx` de-bordered (dropped border-t/b/l/r) + frosted backdrop
  + canon radii. New spine block **`MobileSheetActions.jsx`** — the app-grounded CTA group
  (grounded in ivisit-app `InputModal` footer + `AmbulanceServiceDetailSheet` actionRow):
  side-by-side, secondary ghost LEFT / primary FILLED + colored-glow shadow, wider (flex 1.2),
  bold label — enforces S7 (one primary state-CTA) identically everywhere. Support now uses it
  (Details filled primary + Edit ghost secondary). Remaining left-accent at `MobileDashboard.jsx:348`
  is in a **blocked lane** → flagged, not touched.
- **App grounding captured** (ivisit-app is borderless/glass/squircle): radii — row/tile ~18–20,
  card 26–36, sheet 38–44; CTA — primary filled brand `hsl(var(--primary))` + `0 8px 18px tone/0.30`
  glow, secondary ghost; separation via spacing + translucent surface + shadow, never borders.
  This is the pattern every Wave 2 sheet/detail must follow.

### Wave 2 outcome (2026-07-08)
**COMMITTED & verified (7 pages, each: contract test green + hardgate + mojibake + borderless):**
Support (7/7) · Wallet (15/15) · Insurance (10/10, read-only) · Doctors (8/8) · Pricing (3/3) ·
Users (4/4) · Health News (7/7, read-only). Commits `7953a3b3`, `61931da6`, `e4554f89`, `677c9352`, `91626d43`.
Authority note: Insurance/Users/Pricing are named "not admitted" in the RETIRED page-gate frame,
but the *active* enforcement (contract tests + hardgate + fail-closed) passes and only visuals
changed (no command authority loosened) — user decision 2026-07-08: **keep** (canon supersedes).

**APPLIED but NOT committed — blocked on a dirty test (other lane):**
- **Emergency** — `MobileEmergency.jsx` fully on standard (spine wired into bespoke row; hardgate
  PASS, mojibake clean, 10/11 contract assertions pass). Blocked by
  `EmergencyRequestsPage.contract.test.js:449` which pins the OLD detail-tile radius
  `rounded-inner bg-background/30 p-3`; the canon `MobileDetailIslands` renders `rounded-button`.
  That test is dirty/owned by the emergency desktop lane → assertion must be retired to
  `rounded-button` (or to check `MobileDetailIslands`) before Emergency can commit green.
  Change is left in the working tree.

**GATED — authority decision required (NOT applied):**
- **Subscriptions** — `SubscriptionManagementPage.contract.test.js` (Page 17) hard-locks the
  pre-revamp markup (`label={formatLabel(sub.status)}`, `rightBlade`, `onEdit/onDelete` literals)
  AND asserts `PAGE_REVAMP_GATE.md` still says "No visual revamp … authorized yet." Applying the
  standard is impossible without breaking that active lock. To unblock: close the Subscriptions
  blocker map in `PAGE_REVAMP_GATE.md` + rewrite the contract test to expect the new energy — a
  coordinated authority change, out of single-file scope.

**Still BLOCKED (dirty lanes, unchanged):** Verification, Ambulances, Hospitals, Organizations-VitalTrack.
**Deferred:** flagship `MobileVisits` CTA retrofit to `MobileSheetActions` (its `VisitsPage.contract.test.js`
is dirty). Optional: `TodayHome` rail polish.

---

## 0. The Standard — "the energy," made testable

A mobile entity page is **DONE** only when every applicable box is checked (verified live at
390px **or** by test — *no unverified done*):

| # | Criterion | Applies to |
|---|---|---|
| S1 | **Frosted shell** — page under `MobilePageShell`; nav island `chrome-glass-strong`. | all (already global ✅) |
| S2 | **Readable identity row** — primary line `line-clamp-2 break-words`, never a stub; meta on its own line; trailing = status pill + chevron. | all list rows |
| S3 | **Semantic status pill** on the row (raw-hue, distinct) — **not** a `rightBlade` badge. | all stateful rows |
| S4 | **VitalTrack in detail** — stepped lifecycle from the grounded track config, correct current step, terminal → muted track. | pages with a **linear** lifecycle |
| S5 | **Date-groups** — month-boundary headers, list sorted newest-first. | **temporal feeds** only |
| S6 | **Identity-island detail** — contact/meta tiles (`bg-white/[0.02] rounded-inner`), not a bare text block. | all detail panels |
| S7 | **One state-CTA** — a single authority-gated primary action derived from `getActionState`; secondary actions demoted. | pages with mutable state |
| S8 | **Graduated press** — controls `scale:0.96`, cards `0.988`; Apple ease; reduced-motion honored; safe-area padding. | all |

**Not every criterion applies to every page.** S4/S5/S7 are conditional — a directory
(Users) has no lifecycle and no feed; a ledger (Wallet) has a feed but no lifecycle; a
config surface (Pricing) has neither. The matrix in §2 records which apply where, so
"done" means *"met every box that applies,"* never "bolted a track onto a directory."

---

## 1. Shared spine (Wave 0) — build once, then every page is cheap

Four small **additive** building blocks on **new/clean** files. They turn each page lane
from "reinvent the pattern" into "wire the props," and guarantee the energy is *identical*
everywhere (no per-page drift). This is the keystone: get it right, everything downstream
is mechanical.

### 1a. `constants/vitalTracks.js` (NEW) — grounded lifecycle → display track

The single source for VitalTrack steps, **derived from the test-locked
`constants/lifecycles.js`** so tracks can't drift from real state machines. Exposes per
domain: ordered display `steps`, `tones` (raw distinct hues, per the palette-collapse
rule — cyan → amber → emerald, muted = slate), the muted/terminal set, and a
`resolveVitalStep(domain, status)` that reuses the same normalizers/canonicalizers as
`utils/transitions.js`.

Display tracks (grounded in `lifecycles.js` `STATES`/`TERMINAL`):

| Domain | Track (display) | Muted / terminal | Source |
|---|---|---|---|
| `visit` | scheduled → in_progress → completed | cancelled | `VISIT_LIFECYCLE` ✅ (flagship uses it) |
| `emergency` | pending_approval → in_progress → arrived → completed | cancelled, payment_declined; **collapse** accepted→in_progress | `EMERGENCY_LIFECYCLE` |
| `verification` | pending → in_progress → verified | rejected | `VERIFICATION_LIFECYCLE` |
| `support` | open → in_progress → resolved | closed | `SUPPORT_LIFECYCLE` |
| `insurance` | pending → active → expired | inactive (verified = separate pill axis) | `INSURANCE_LIFECYCLE` |
| `subscription` | pending → active | (display-only¹) | not in lifecycles.js |
| `healthNews` | draft → published | (display-only¹) | not in lifecycles.js |

> ¹ subscription & healthNews are 2-step **presentational** tracks with no transition-legality
> need, so they're defined display-only in `vitalTracks.js` with a comment — rather than
> destabilizing the L4 invariants (`utils/transitions.test.js`) for purely-visual tracks.
> If they later need real transition gating, promote them into `lifecycles.js` then.

### 1b. `MobileMetricRow` — optional `statusPill` prop (edit `MobileMetricList.jsx`)

Additive prop `statusPill={{ label, tone }}` renders the flagship semantic pill
(`MobileVisits.jsx:537`). Pages opt in; existing `rightBlade` callers are untouched
(controlled blast radius). Satisfies **S3** everywhere with one change.

### 1c. `MobileDetailIslands` (NEW) — identity-island tiles

Extracts the flagship's detail-island anatomy (contact/meta tiles) so Support,
Verification, and the metric-row pages get **identical** island detail (**S6**). Pure
presentational; takes `items=[{icon,label,value,href?}]`.

### 1d. `groupByMonth(items, getTime)` (NEW util) — date-group helper

Extracts the flagship's month-boundary grouping + newest-first sort
(`MobileVisits.jsx` `visitMonthLabel`/`timeOf`) so every temporal feed groups **identically**
(**S5**). Pure function; unit-testable.

**Wave 0 gate:** build all four, prove them on the Wave 1 page, verify live + hardgate
(`check-ui-surface-hardgate.js --strict-radius`), path-limited commit. Nothing fans out
until the spine is proven.

---

## 2. Per-page work matrix (from 4-agent recon, git-grounded)

Legend — **✔** apply/present · **✚** add · **—** N/A · **⛔** blocked

| Page | File (mobile) | S3 pill | S4 VitalTrack | S5 date-grp | S6 islands | S7 state-CTA | Effort | Status |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **Visits** (flagship) | `MobileVisits` | ✔ | ✔ visit | ✔ | ✔ | ✔ | — | **REFERENCE ✅** |
| **Support Tickets** | `MobileSupportTickets` | ✚ | ✚ support | ✚ created_at | ✚ | ✚ | **M** | CLEAN — **Wave 1 proof** |
| **Emergency** | `MobileEmergency` | ✚ | ✚ emergency | ✚ created_at | ✔ | ✔ | **M** | CLEAN (desktop views dirty — don't touch) |
| **Wallet** | `MobileWallet` | ✚ | — (ledger) | ✚ created_at | ✚ | — | **M** | CLEAN |
| **Insurance** | `MobileInsurance` | ✚ | ✚ insurance **(read-only)** | — | ✚ | ⛔ CTA (hooks in-flight) | **M** | CLEAN (ship track read-only) |
| **Subscriptions** | `MobileSubscriptions` | ✚ | ✚ subscription | ✚? sub_date | ✚ | ✚ (rewire onEdit) | **M** | CLEAN |
| **Health News** | `MobileHealthNews` | ✚ | ✚ healthNews | ✚? created_at | ✚ | ✚ publish | **M** | CLEAN |
| **Pricing** | `MobilePricing` | ✚ | — (config) | — | ✚ | ✔ CRUD | **S** | CLEAN |
| **Users** | `MobileUsers` | ✚ | — (2 booleans, no lifecycle) | — (directory) | ✔ | ✚ reduce triple→one | **S–M** | CLEAN |
| **Doctors** | `MobileDoctors` | ✚ | — (categorical) | — | ✔ | ✔ | **S** | CLEAN (mostly finalized) |
| **Organizations** | `MobileOrganizations` | ✚ | ✚ verification¹ | — (registry) | ✔ | ✚ reduce triple→one | **M→L** | CLEAN; VitalTrack needs `verification_status`/stripe plumbed into row |
| **Verification** | `MobileVerification` | ✚ | ✚ verification | — (queue) | ✚ | ✔ approve/reject | **M** | ⛔ **BLOCKED** — lane dirty (views + panel + mobile) |
| **Ambulances** | `MobileAmbulances` | ✚ | — (operational, cyclical) | — | ✚ rebuild | ✚ | **L** | ⛔ **BLOCKED** — page RQ-migration in-flight; heavy old-chrome rebuild |
| **Hospitals** | `MobileHospitals` | ✚ | — | — | ✚ rebuild | ✚ | **L** | ⛔ **BLOCKED** — page RQ-migration in-flight; heavy rebuild |
| **Analytics** | `MobileAnalytics` | — | — | — | — | — | — | **EXEMPT** (dashboard, no entity) |
| **Home (Today)** | `TodayHome` (responsive) | — | — | — | — | — | **S** | CLEAN — already responsive canon; optional rail-hide polish only |

> ¹ Orgs surfaces only `is_active` today; a real onboarding VitalTrack needs
> `verification_status` (or stripe onboarding status) plumbed through the service + page
> into the row. Do the pill/CTA parts now; treat VitalTrack as a follow-on if wiring lands.

**Home reality (recon):** the 5 dedicated `*Home.jsx` + `Overview.jsx` are **dead/unrouted**
— every console role renders `TodayHome`, which is already the responsive canon. Do **not**
build mobile for unrendered pages; they're also dirty (revived in another lane). Home lane
= optional `TodayHome` rail polish only.

---

## 3. Orchestration — waves, lanes, gates

Sequenced to **catch "not up to standard" early** (the explicit ask) and to run disjoint
clean files in parallel without collisions.

```
WAVE 0  Shared spine (me / 1 agent)          ── build 1a–1d, prove on Support, verify, commit
   │        gate: hardgate + live 390px
   ▼
WAVE 1  Support Tickets (me / 1 agent)        ── full standard end-to-end = the proof page
   │        gate: user confirms the STANDARD against a real working page  ◄── CHECK-IN
   ▼
WAVE 2  Parallel fan-out on CLEAN files       ── each: 1 page · consumes proven spine
   ├─ Emergency (M)     ├─ Wallet (M)         ── path-limited commit per page
   ├─ Insurance (M,RO)  ├─ Subscriptions (M)     verify live/hardgate/contract each
   ├─ Health News (M)   ├─ Pricing (S)           cap ~4–5 concurrent for reviewable diffs
   ├─ Users (S–M)       └─ Doctors (S)
   ▼
WAVE 3  Gated on other lanes landing          ── DO NOT start until unblocked
   ├─ Verification (M)   ← after its dirty lane lands
   ├─ Ambulances (L)     ← after RQ-migration lane lands (heavy rebuild)
   ├─ Hospitals (L)      ← after RQ-migration lane lands (heavy rebuild)
   └─ Organizations VitalTrack ← after verification_status wiring decision
   ▼
WAVE 4  Home polish (optional)                ── TodayHome rail-hide only; rest dead/deferred
```

**Per-agent contract (every execution agent gets):**
1. The §0 standard + which criteria apply to *its* page (from §2).
2. The exact spine APIs (`vitalTracks`, `statusPill` prop, `MobileDetailIslands`, `groupByMonth`).
3. **Path-limit:** touch only its one mobile file (+ its page only if wiring is unavoidable and clean).
4. **Do-not-touch** dirty files (§4).
5. **No unverified done:** verify live at 390px OR contract/hardgate; report what was verified and how.
6. Path-limited commit; disclose any scope beyond the criteria.

---

## 4. Guardrails

**Do-not-touch (dirty — other lanes own these):**
`AmbulancesPage.jsx`, `HospitalsPage.jsx`, `AmbulanceModal.jsx`, their contract tests +
`useAmbulances*/useHospitals*` hooks · `MobileVerification.jsx`, `VerificationPanel.jsx`,
`VerificationQueue{List,Table}View.jsx` · `EmergencyRequest{List,Table}View.jsx` +
`EmergencyRequestsPage.contract.test.js` · `useInsurance*` hooks · `PageDataContext.jsx` ·
`MobileDashboard.jsx`, `BentoHome.jsx`, `AdminHome/OrgAdminHome/SponsorHome/ViewerHome/Overview.jsx`
+ their tests · `VisitModal.jsx`, `GlobalFinancialModals.jsx`, `StatsCard.jsx`, `VisitsPage.contract.test.js`.

**Blocked services (ship read-only track / defer CTA):**
Insurance `updatePolicyStatus` (throws; hooks in-flight) → VitalTrack read-only, no state-CTA.
Verification whole lane dirty → defer entirely.

**Data-sync law (unchanged):** console must not write canonical shared tables directly;
reuse existing RPCs; read with `.maybeSingle()`; never loosen shared RLS. Mobile rollout is
**presentational** — it surfaces existing state/actions, it does not add new mutations.

**Verification protocol (No unverified done):** live at 390px on the running app (read-only;
user does sign-in) **or** contract test **or** `check-ui-surface-hardgate.js --strict-radius`.
Every "done" states what was checked and how.
