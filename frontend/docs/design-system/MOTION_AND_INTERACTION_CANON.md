# Motion & Interaction Canon — native-feel, Apple-HIG

**Created 2026-07-07.** Part of the one canonical guide (see `CONSOLE_DESIGN_SYSTEM_FROM_APP.md` + `../../tools/automation/AGENT_HANDSHAKE.md`). This governs *how things move and respond to touch*, especially on the mobile/native surface. Source of truth for intent: `ivisit-app/docs/product_design/ui_ux_bible.md` + `docs/research/IOS_PWA.md` + `APPLE_MAPS_IPHONE_UI_REFERENCE.md`.

> The bar: `console.ivisit.app` on a phone must feel like a native app, the way `app.ivisit.ng` does. If an interaction draws attention to itself, it has failed. **If a motion can't be explained in one sentence, it should not exist.** (`ui_ux_bible.md`)

---

## 0. The rule set (non-negotiable)

- **Every pressable presses — depth graduated by surface size.** No exceptions; a control that doesn't depress feels dead. Grounded in ivisit-app's real press values (`intentCard.styles.js`, `MapHeaderIconButton.jsx`, `mapExploreIntent.styles.js`): **small controls** (buttons, chips, icon/close buttons) depress to `active:scale-[0.96]` / `whileTap={{ scale: 0.96 }}`; **large surfaces** (cards, list rows) barely depress — `0.98`–`0.99` (app uses `0.988` on cards, `0.996` on rows). Big things move a little, small things move more.
- **Tap-flash is killed globally.** The grey/blue box the browser paints on touch is removed for every pressable (including `onClick` divs) by a single `* { -webkit-tap-highlight-color: transparent; }` rule in `index.css` — settled 2026-07-08. Components should NOT re-add the inline `WebkitTapHighlightColor` style; it's handled once, app-wide. Touch feedback is our own press + haptic, not the browser's.
- **One easing family.** Apple ease: framer `transition={{ ease: [0.16, 1, 0.3, 1] }}` for enters/reveals — *chrome* enters only (sheets, panels, nav); data content never entrance-animates on load, see §3; sheet/modal snap uses the app's `MAP_APPLE_EASE` = `[0.21, 0.47, 0.32, 0.98]`; native scroll/drag momentum uses `cubic-bezier(0.22, 1, 0.36, 1)`. **Never** linear/ease-in-out for UI motion.
- **Springs = the app's real configs (corrected 2026-07-08).** Panels/modals use `CONSOLE_DESIGN_SYSTEM_FROM_APP`'s `PANEL_SPRING` = `{ type: 'spring', stiffness: 168, damping: 30, mass: 0.9 }` (ivisit-app `mapMotionTokens.js` modal spring); sheet-snap uses the softer `SHEET_SNAP_SPRING` = `{ tension: 42, friction: 14 }`. The earlier `{ stiffness: 380, damping: 34 }` was NOT grounded in the app — do not use it; the design-system doc already carried the correct `168/30/0.9`.
- **Purposeful, reversible, short.** 180–320ms for transitions; a motion must explain a state change (opened, focused, arrived). **No looping/ambient/decorative animation.** No pulsing dots, no infinite shimmer beyond skeleton load.
- **Respect `prefers-reduced-motion`.** Gate every non-essential transform behind `useReducedMotion()`; reduced = cross-fade only, no slide/scale. (Global CSS rule already exists in `index.css`.)
- **Physicality = trust.** Motion should feel like one surface responding, not screens swapping. Sheets grow from where they're anchored; the focused record animates in place (`layout`), it doesn't hard-cut.

---

## 1. Mobile / native surface (where it matters most)

- **Sheets, not dialogs.** Mobile modals are bottom sheets: spring up `y: '100%' → 0`, a `rounded-t-sheet` top with a `rounded-pill` grab handle, backdrop fade, and **drag-to-dismiss** past a threshold with rubber-band (`dragElastic`). `ModalShell` already implements this (commit `578c08b5`) — reuse it; do not hand-roll a centered dialog on mobile.
- **Pull-to-refresh** on every data list (`PullToRefresh` — resistance ~0.4, spring release). Already built; ensure adoption.
- **Momentum rails** (peek-scroll metric strips) use scroll snapping + a tap-cooldown, native easing.
- **Haptic-feel on intent.** Fire `FeedbackContext` haptics on commit/toggle/select. iOS Safari has **no Vibration API** — provide a visual/audio "tap" fallback so tactility isn't Android-only.
- **Safe-area + `dvh` always** (`env(safe-area-inset-*)`, `100dvh`) so nothing hides behind the home indicator or Safari's collapsing toolbar.
- **Selection/focus is animated in place.** When a row is focused (`useFocusedRecord`), the detail surface updates with a `layout` spring; the row gets a tone accent + a subtle lift — never a jump.
- **Selection is a spring *grow*, not just a color change** (grounded in ivisit-app `IntentCard.jsx` / `IntentOrb.jsx`). A selected card springs to `scale 1.01` (its icon to `1.04`, an orb to `1.05`) with `{ stiffness: 320, damping: 22, mass: 1 }`, and reveals a check badge. The focused-record surface should express "chosen" by growing slightly, not only by tone/shadow.
- **≥2000ms minimum perceptible feedback** (ivisit-app `EMERGENCY_SHEET_AND_MAP_UI_SPEC` §0.1). Every submit/verify/commit/approve/dispatch/payment action shows immediate pressed/pending feedback; if the API returns faster than the user can perceive it, hold the pending affordance ~2s before changing state. A too-fast success that flickers reads as "did anything happen?" — the opposite of trust.
- **Decision-copy, not progression-copy** (`EMERGENCY_SHEET_AND_MAP_UI_SPEC` §2). A control names the outcome, not the step: "Verify provider" not "Submit", "Confirm bed update" not "Save", "Approve request" not "Continue". Normalize backend error codes (`INVALID_INPUT|…`) to plain language before display.

---

## 2. List-row layout (small screens) — the "readable identity" rule

The row's **primary identity must be readable**, not truncated to a stub. From the live Visits mobile screen, the facility was cut to ~8 chars ("LifeStre…") — that defeats facility-first identity.

- **Primary line** (facility / record identity): give it the width — `min-w-0 flex-1 truncate` on a line that actually spans the card, or a **2-line clamp** (`line-clamp-2`) when the name is long. It must not lose to a fixed-width status/date column.
- **Order & weight:** tiny eyebrow caption (type) → **primary (facility), full-size, readable** → secondary (patient · service, muted, truncatable) → status chip (fixed) → meta (when · ref, muted). The chip/date/chevron take *fixed* space; the identity takes the *rest*.
- **No hard 1-line truncate on the primary** below `sm`. Prefer 2-line clamp + `break-words`.
- This rule applies to **every** mobile list row (Visits, Users, Hospitals, Ambulances, Doctors, Support, …) — the same per-entity row projection (the `visitRowProjection` pattern today; a shared `recordIdentity` normalizer is the L1.5 target in `../architecture/CONSOLE_LAYER_MODEL_PLAN.md`) + the same layout discipline.

### 2.1 Canonical mobile row structure (settled 2026-07-08, from the live Visits repro)

The live Visits mobile row cut the facility to "LifeS…" and the caption to "EMER…" because the **trailing column carried the long `meta`** ("Mar 5, 04:00 PM · VIST-B17843") *and* the status chip, starving the identity column. The fix that every mobile row must follow:

```
[ leading icon ]  [ identity column — min-w-0 flex-1 ]              [ trailing — shrink-0 ]
                    caption   (eyebrow, tiny, truncate ok)            status chip (fixed, short)
                    PRIMARY   (facility — line-clamp-2 break-words)   chevron
                    secondary (patient · service — truncate, muted)
                    meta      (when · ref — truncate, muted)          ← own full-width line, NOT the trailing column
```

- The identity column is `min-w-0 flex-1`; the trailing column is `shrink-0` and holds **only** the fixed status chip + chevron. Nothing width-variable (dates, ids) lives in the trailing column.
- `meta` (when · ref) drops to its own line beneath `secondary` so it can never steal width from the primary.
- Primary line: `line-clamp-2 break-words leading-tight` — never `truncate`.
- Verified on the running app at 390px (Visits): facility now reads in full / wraps to 2 lines; caption reads "Emergency".

---

## 3. Loading motion — skeleton-first, replace-in-place (settled 2026-07-09)

From the Requests full-UX pass (`EmergencyRequestsPage.jsx` + `MobileEmergency.jsx`, the airtight
reference pair). This section **supersedes** any earlier reading of §0's "enters/reveals" ease as
permission to stage-reveal page content — that ease governs chrome (sheet snap, panel slide, nav),
never data. If a prior mockup or page staged its regions in on load, it is now off-canon.

- **Data pages NEVER stage-reveal.** A top-to-bottom staggered translate IS a cascade/skew by
  definition — each region arriving on its own clock reads as the page assembling itself, not one
  surface responding. Entrance motion is for chrome only, if at all.
- **The load model is skeleton → replace-in-place.** A group-shaped skeleton holds the *exact*
  final layout (same grid, same row heights — `RequestSkeletonRows` mirrors `RequestRow` 1:1),
  then real content REPLACES it in place in one commit. **No fade-from-blank:** on cached mounts a
  fade hides-then-reveals data that was already present, which reads as a load that never happened.
- **Skeleton-first on every mount — forced warm-up.** Bottom-nav navigation mounts with cached
  data (`loading` already false), so without a floor the page skips the skeleton and assembles
  cached content top-to-bottom. `SKELETON_WARMUP_MS` (400ms, `MobileEmergency.jsx`) forces
  skeleton-first-then-reveal so cached navigation is identical to a hard refresh.
- **A responsive `isMobile` fork must be viewport-correct on the FIRST frame** (settled
  2026-07-09, Today). Breakpoint state **lazy-inits from the real viewport** —
  `useState(() => typeof window !== 'undefined' && window.innerWidth < 768)`
  (`NavigationContext.jsx`) — never `useState(false)` + measure-in-effect. The false default
  renders one desktop-tree frame on every mobile mount: desktop entrances start, then the fork
  flips and replaces the tree mid-motion — the "stacking/skew on mount" defect. The `typeof
  window` guard keeps tests/SSR safe; the resize listener still updates after mount.
- **Refetch = glyph-swap, not overlay.** Background refetch (`isFetching`) swaps the glyph on the
  control that triggered the work for a spinner in place — `Loader2` + `animate-spin`, the
  Today/DashboardPanel pattern (`{busy ? <Loader2 className="animate-spin" /> : <Glyph />}`); on
  desktop the active KPI chip carries it. Mobile lists show an "Updating" pill
  (`role="status" aria-live="polite"`). Never a silent refetch, never a full-surface dimmer.
- **The rest of the canon is unchanged.** Apple ease `[0.21, 0.47, 0.32, 0.98]` for sheet/modal
  snap, `PANEL_SPRING` `168/30/0.9`, press `0.96` controls / `0.988` cards — loading motion adds
  to this, it does not replace it.
- **Known caveat — `animate-spin` vs reduced motion.** Tailwind's `animate-spin` utility carries
  no reduced-motion gating of its own; it is only neutralized by the global
  `@media (prefers-reduced-motion: reduce)` clamp in `index.css`, which freezes it to a static
  glyph. That frozen-glyph outcome is accepted for busy indicators (consistent with every existing
  spinner), but do not rely on Tailwind itself to gate a spinner on any surface that escapes the
  global rule.

The cross-page enforcement checklist lives in
[`PAGE_REVAMP_GATE.md`](../planning/PAGE_REVAMP_GATE.md) § UX-Completeness Gate - 2026-07-09.

## 3b. ENFORCED (2026-07-10) — the static items are now machinery, not memory

The Requests→Today→Visits→Hospitals polish was hand-applied and the completeness checklist (§UX-Completeness Gate in `PAGE_REVAMP_GATE.md`) was **manual** — so Ambulances passed structure/mechanism/data gates and still shipped without a modal submit spinner and with un-pressable row buttons, and every automated gate stayed green. That "relying on memory" failure is closed: the **statically-checkable** items are now enforced by the *interaction-completeness estate law* in `src/components/console/ConsoleDesignSystem.contract.test.js`, grounded in the exact signatures all gold list pages share. Per list-workspace page (renders `SortableColumnHeader`) it requires:
`control-press` (≥1 `active:scale-*`) · `no-stage-reveal` (NO `initial={{` — banned entrance) · `isFetching` surfaced (`isFetching={isFetching}`) · `empty-branch` (`hasFilter ?`) · `submit-spinner` (`animate-spin` in the paired modal or the page's rail write surface). Composition-guaranteed items (SignalPanel no-entrance, KpiStrip refetch spinner + `aria-pressed`, `UpdatingPill` `role=status`, `ListRowShell` `layout="position"`) are NOT re-checked — using the DS component IS the guarantee. **Limitation (honest):** the floor proves *presence*, not per-control coverage — a page with press on some buttons but not others passes the floor, so per-button press stays a page-contract pin (e.g. AmbulancesPage's row-button `active:scale`+`aria-busy` pins). Runtime-only items (reduced-motion, actual press feel, warm-cache instant paint) still need §4 browser-confirm.

## 4. How we verify (process — from now on)

Every interaction/visual fix must end with ONE of:
- **Browser-confirm:** connect to the running local app (`http://localhost:3000`, user-authenticated) via claude-in-chrome and confirm the rendered behavior (read-only; never trigger irreversible writes). Capture the observed state.
- **A test:** a contract/interaction test asserting the behavior (press state present, reduced-motion honored, primary line not hard-truncated, projection field mapping, etc.).

No fix is "done" on parse+hardgate alone. And every decision here gets **visualized** (a mockup/spec) before build, and **written back into this canon** when settled.

**Flagged ≠ fixed** (2026-07-09). An audit finding stays OPEN until a lane actually closes it —
naming a defect in a doc or checklist changes nothing on screen. TodayHome's banned staged
entrances were flagged and still survived **two** motion passes before the Today lane removed
them (its hero now carries the §3 comment "Data regions never entrance-animate"). Track findings
in the gate/checklist with an owner lane, and re-verify on the running surface when the lane lands.

---

## 5. Anti-patterns (the "sucks" list — do not ship)

- A tappable element with no press response.
- A data page that stage-reveals on load (top-to-bottom staggered/translated region entrances).
- A fade-from-blank over cached data; a mount that skips the skeleton because data was cached.
- A breakpoint fork initialized `useState(false)` + measure-in-effect — one wrong-viewport
  desktop frame on every mobile mount whose entrances start before the swap (mount-skew).
- A skeleton whose shape does not match the layout it is holding for.
- A silent background refetch — no spinner on the triggering control, no "Updating" pill.
- ease-in-out / linear UI motion; overshooting bouncy springs.
- Looping/ambient/decorative animation; shimmer beyond load.
- A centered dialog on mobile (must be a bottom sheet).
- A primary identity line truncated to a stub on small screens.
- Motion that ignores `prefers-reduced-motion`.
- Haptics that silently no-op on iOS with no fallback.
