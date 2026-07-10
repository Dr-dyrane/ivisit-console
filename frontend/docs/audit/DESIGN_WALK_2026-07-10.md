# Design Walk — Today → Users (2026-07-10)

> Durable record of a full design walk across the mobile console (Today through Users), the
> bugs it surfaced, the fixes it produced, and the honest by-design gaps it confirmed.
> Written so the findings survive a context refresh.

| Meta | Value |
|---|---|
| Date | 2026-07-10 |
| Branch | `codex/ivisit-console-revamp-checkpoint-20260707` |
| Scope | Mobile console pages Today → Users; Tailwind config; grammar harness |
| Status | 1 bug fixed (opacity), Users revamp deferred (correctly blocked) |
| Headline verdict | Design trajectory `main → revamp` (437 commits): **BETTER**, promise kept structurally |

---

## TL;DR

- **Fixed a silent, estate-wide surface bug**: canon tint classes on non-standard opacity steps
  (`/12 /14 /15 /34 /35 /55 /85` …) were compiling to **transparent** because Tailwind only emits
  bare slash color-opacity for values present in `theme.opacity`. ~59 dead classes in the mobile
  files alone, plus desktop pages and the canon kit. One additive config change fixed all of them
  (`7a5304e4`).
- **Deeper lesson**: the grammar harness checks *structure*, not *computed CSS*. A class that never
  compiles passes every static gate. The bug lived through the whole canon migration undetected.
- **Users mobile revamp: deferred, correctly** — blocked by both a lane collision (desktop Users
  revamp mid-flight) and an explicit governance gate.
- **By-design gaps recorded** (not bugs) so they are not re-litigated later.

---

## 1. Opacity dead-tint bug — FOUND + FIXED (`7a5304e4`)

**Symptom (user-reported):** "avatar wrapper bg surface differs from list-card surface." The tinted
disc behind avatar orbs / status discs was simply *not there*.

**Root cause.** Tailwind's bare slash color-opacity modifier (e.g. `bg-emerald-500/12`) only compiles
values that exist in `theme.opacity`. The default scale is:

```
5 · 10 · 20 · 25 · 30 · 40 · 50 · 60 · 70 · 75 · 80 · 90 · 95
```

The mobile canon surface tints were authored on **non-scale steps**. Those utilities were never
generated, so the tint silently rendered **transparent** — and the bug hid in plain sight because the
icon/text foreground color still rendered on top of the missing disc.

### Dead tints (representative)

| Class | Where | Intended surface |
|---|---|---|
| `bg-emerald-500/12` | avatar orbs (Doctors etc.) | soft emerald disc behind avatar |
| `bg-destructive/14` | attention avatars on Requests | soft red attention disc |
| `bg-muted/34` | muted discs | neutral inactive disc |
| `…/15  …/35  …/55  …/85` | assorted canon surfaces | tinted surface fills |

**Scope:** ~59 dead classes in the mobile files alone, plus desktop pages and the canon kit.

### The fix — one config file, additive, zero-regression

Extended `theme.extend.opacity` in `frontend/tailwind.config.js` (lines 16–19) with the missing steps:

```
8 · 12 · 14 · 15 · 18 · 22 · 34 · 35 · 45 · 55 · 65 · 85 · 88
```

One additive change fixes **mobile + desktop + canon kit** simultaneously — no per-file edits, no
regression risk (purely adds previously-missing utilities).

### Verified LIVE

- Doctors avatar orb now computes `rgba(16, 185, 129, 0.12)`.
- `bg-destructive/14` and `bg-muted/34` now compile to real fills.

**Follow-up (LANDED):** a harness guard in `check-mobile-grammar.js` now flags any non-scale bare
opacity (reading the valid set from `tailwind.config.js` so it can't drift) — authored-but-never-
generated tints can't recur. On its first run it surfaced **11 more dead steps** (`/16 /24 /26 /28 /36
/42 /68 /72 /78 /82 /92` — 109 tokens across 21 files) beyond this first fix; the config was then
completed to the full used set and the guard is now green (0 violations). See §2.

---

## 2. The harness's structural blind spot (the deeper lesson)

`frontend/scripts/check-mobile-grammar.js` enforces **STRUCTURE** — grammar anatomy plus pinned
source strings — but nothing in it verified **COMPUTED CSS rendering**. A class that does not compile
still passes every static gate, because the gate reads source text, not the rendered surface.

That is exactly why the opacity bug survived the entire canon migration: every structural pin was
green while the surfaces were invisible.

> **Rule going forward:** measure computed surfaces **LIVE**, not just source pins. Static string pins
> prove a class was *written*, never that it *renders*. The opacity guard is meant to close this
> specific gap (non-scale bare opacity), but it is one instance of a general blind spot — computed
> rendering is not something the static harness can see.

---

## 3. Users mobile revamp — BLOCKED (correctly)

The mobile Users rebuild was **deferred**. Two independent guards fired; either alone is sufficient.

### (a) Lane collision — desktop Users revamp is mid-flight

- `UsersPage.jsx` + `UserModal.jsx` are **uncommitted-modified**.
- Phase A data layer (`getUsersPage` / `useProfilesQuery`) just landed and **changed the data shape**.
- Phase B / C still pending.

Rebuilding mobile on top of a data shape that is actively moving would collide with the desktop lane.

### (b) Governance gate — explicitly forbids the visual revamp

- `UsersPage.contract.test.js` and `docs/planning/PAGE_REVAMP_GATE.md` **pin the current
  metric-billboard** and state: *"No visual revamp is authorized yet."*

### Conclusion

The rebuild was deferred. The **full blueprint (3 audits)** is ready for when **both** gates clear —
data shape settles (Phase B/C land) and the revamp gate authorizes the visual change.

---

## 4. Design trajectory (`main → revamp`, 437 commits): BETTER

The arc is coherent: **ad-hoc per-page UIs → a canon design system + an enforcing harness.**

Structural pillars now in place:

- Grammar linter (anatomy + source pins)
- Polish / motion gate
- Donor-mechanism registry
- Adaptive **DATA-DRIVEN** grouping via `resolveAdaptiveGroups`
- Dock / FAB completeness checks

Pages **Requests → Today → Hospitals → Ambulances → Doctors** were each rebuilt to the *same*
grammar. Desktop pages compose a **shared console DS** rather than bespoke one-offs.

**Verdict:** the promise — one coherent, no-parallel-truth operational console grounded in
`ivisit-app` — is **kept structurally**.

---

## 5. By-design gaps / honest UX critique (NOT bugs)

Recorded so they are **not re-litigated** as defects. Each is correct-by-design given current data
and governance rules.

| # | Observation | Why it's by-design / status |
|---|---|---|
| 1 | Active KPI chip was brand-**RED** for neutral filters (reads as alarming) | Being fixed to a **per-hue active state** so neutral filters don't signal alarm |
| 2 | Adaptive grouping **flattens to ONE panel** on uniform/singleton demo data | Honest + correct: demo data is all "Dr Demo Physician N", one specialty/status. **Distributes on varied real data** |
| 3 | **Degenerate status pills** | Doctors 99.7% "Available"; Users `is_active` is **not a real column** (always true). The pill advertises a state axis the data lacks |
| 4 | **Selection often fail-closed** | 3 of 5 rolled-out pages (Ambulances / Hospitals / Visits) mirror desktop's **LOCKED bulk delete** (selection UI + disabled button). Correct per *no parallel truth / don't fix gated actions*. Cosmetic selection by design |
| — | Authorized-live selection | **Requests** (bulk-cancel) and **Doctors** (bulk-delete) are the two authorized-live selection surfaces |
| 5 | **Mobile render blind spot** | The forced-mobile fork yields a stretched / sidebar-bleed hybrid. Surfaces are measurable live; **true layout is not** — layout polish still needs the user's eyes / device |

---

## Fixes applied this session

| Commit | Change |
|---|---|
| `ed91c466` | `fix(ambulances)`: wire `isFetching` → `<MobileAmbulances>` — revive the "Updating" pill |
| `df299ff9` | `feat(staff)`: rebuild `MobileDoctors` to canon LIST — harness-driven revamp |
| `2434e7ee` | `feat(staff)`: add A-Z directory grouping candidate to `MobileDoctors` |
| `7a5304e4` | `fix(ds)`: extend Tailwind opacity scale — restore the dead surface tints estate-wide |

---

## Verification notes (provenance, 2026-07-10)

Checks run while writing this record:

- **Commits confirmed to exist** on this branch: `7a5304e4`, `ed91c466`, `df299ff9`, `2434e7ee`.
- **Opacity fix confirmed present** in `frontend/tailwind.config.js` (lines 16–19), including the
  documenting comment (lines 10–15) that captures the same root cause described in §1.
- **Tint classes are live**: the `/12 /14 /34` … tint utilities appear across **21 mobile files**
  (73 occurrences), e.g. 8 in `MobileDoctors.jsx`, 6 in `MobileAmbulances.jsx` — now compiling
  thanks to the config fix.
- **Harness guard — LANDED (green):** `frontend/scripts/check-mobile-grammar.js` now carries a
  bare-opacity guard: it reads the valid opacity set from `tailwind.config.js` `theme.extend.opacity`
  plus the Tailwind default scale, scans `src/components/mobile` + `src/components/pages` for bare
  slash-opacity classes, and fails the build on any non-scale value (bracket `/[0.NN]` is exempt). On
  its first run it found **109 violations across 11 additional steps**; `tailwind.config.js` was
  extended to the full used set — `8/12/14/15/16/18/22/24/26/28/34/35/36/42/45/55/65/68/72/78/82/85/88/92`
  — and the guard is now green (0 fatal). Config is the single source of truth; the guard stays in sync.
