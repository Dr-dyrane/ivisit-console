# Motion & Interaction Canon — native-feel, Apple-HIG

**Created 2026-07-07.** Part of the one canonical guide (see `CONSOLE_DESIGN_SYSTEM_FROM_APP.md` + `../../tools/automation/AGENT_HANDSHAKE.md`). This governs *how things move and respond to touch*, especially on the mobile/native surface. Source of truth for intent: `ivisit-app/docs/product_design/ui_ux_bible.md` + `docs/research/IOS_PWA.md` + `APPLE_MAPS_IPHONE_UI_REFERENCE.md`.

> The bar: `console.ivisit.app` on a phone must feel like a native app, the way `app.ivisit.ng` does. If an interaction draws attention to itself, it has failed. **If a motion can't be explained in one sentence, it should not exist.** (`ui_ux_bible.md`)

---

## 0. The rule set (non-negotiable)

- **Every pressable presses.** All buttons, cards-as-buttons, list rows, chips, nav items: `whileTap={{ scale: 0.98 }}` (framer) or `active:scale-[0.98]`, with `style={{ WebkitTapHighlightColor: 'transparent' }}`. No exceptions — a control that doesn't depress feels dead.
- **One easing family.** Apple ease: framer `transition={{ ease: [0.16, 1, 0.3, 1] }}` for enters/reveals; native scroll/drag momentum uses `cubic-bezier(0.22, 1, 0.36, 1)`. Springs (sheets, layout) use `{ type: 'spring', stiffness: 380, damping: 34 }` (snappy, minimal overshoot). **Never** linear/ease-in-out for UI motion.
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

---

## 2. List-row layout (small screens) — the "readable identity" rule

The row's **primary identity must be readable**, not truncated to a stub. From the live Visits mobile screen, the facility was cut to ~8 chars ("LifeStre…") — that defeats facility-first identity.

- **Primary line** (facility / record identity): give it the width — `min-w-0 flex-1 truncate` on a line that actually spans the card, or a **2-line clamp** (`line-clamp-2`) when the name is long. It must not lose to a fixed-width status/date column.
- **Order & weight:** tiny eyebrow caption (type) → **primary (facility), full-size, readable** → secondary (patient · service, muted, truncatable) → status chip (fixed) → meta (when · ref, muted). The chip/date/chevron take *fixed* space; the identity takes the *rest*.
- **No hard 1-line truncate on the primary** below `sm`. Prefer 2-line clamp + `break-words`.
- This rule applies to **every** mobile list row (Visits, Users, Hospitals, Ambulances, Doctors, Support, …) — the same `recordIdentity` projection + the same layout discipline.

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

## 3. How we verify (process — from now on)

Every interaction/visual fix must end with ONE of:
- **Browser-confirm:** connect to the running local app (`http://localhost:3000`, user-authenticated) via claude-in-chrome and confirm the rendered behavior (read-only; never trigger irreversible writes). Capture the observed state.
- **A test:** a contract/interaction test asserting the behavior (press state present, reduced-motion honored, primary line not hard-truncated, projection field mapping, etc.).

No fix is "done" on parse+hardgate alone. And every decision here gets **visualized** (a mockup/spec) before build, and **written back into this canon** when settled.

---

## 4. Anti-patterns (the "sucks" list — do not ship)

- A tappable element with no press response.
- ease-in-out / linear UI motion; overshooting bouncy springs.
- Looping/ambient/decorative animation; shimmer beyond load.
- A centered dialog on mobile (must be a bottom sheet).
- A primary identity line truncated to a stub on small screens.
- Motion that ignores `prefers-reduced-motion`.
- Haptics that silently no-op on iOS with no fallback.
