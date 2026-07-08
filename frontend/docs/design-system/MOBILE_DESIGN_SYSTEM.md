# iVisit Console — Mobile Design System (canonical)

> The single, comprehensive spec for the console's **mobile** UI/UX. One voice, built
> mobile-first, converged on **ivisit-app** (the native source of truth) and held to
> **Apple HIG**. This doc is both the **reference** (what every mobile surface must be)
> and the **backlog** (what's built ✅ / partial ◐ / to-build ☐ to get there).
>
> North-star artifacts (this session): the *one design system* comparison and the
> *unified mobile design* mockup. Companions: [`CONSOLE_DESIGN_SYSTEM_FROM_APP.md`](./CONSOLE_DESIGN_SYSTEM_FROM_APP.md),
> [`MOTION_AND_INTERACTION_CANON.md`](./MOTION_AND_INTERACTION_CANON.md), [`MOBILE_ENERGY_ROLLOUT_PLAN.md`](./MOBILE_ENERGY_ROLLOUT_PLAN.md).
>
> **Authority:** where the older `APPLE_GLASS_DESIGN_SYSTEM.md` / `DYRANE_UI_DESIGN_SYSTEM.md`
> disagree with this doc, **this doc wins** for mobile. They are kept for history.

Status: **DRAFT v1 — 2026-07-08.** Layers 4 (components) largely ✅ from the rollout;
Layers 1/3/7 (tokens·motion / elements / interaction) are the open foundation work.

---

## Decisions log (locked)

- **2026-07-08 · Borderless** — no borders / hairlines / left-accent bars anywhere; separation is
  spacing + surface tint + soft shadow. Enforced by the strict-radius/no-border hardgate.
- **2026-07-08 · One glass recipe** — chrome = `chrome-glass` / `chrome-glass-strong` (frosted,
  borderless); content = opaque cards. `apple-glass-heavy` is deprecated → migrate to `chrome-glass`.
- **2026-07-08 · State filter = compact CHIP row (pills)** — the list-page state/KPI filter is a
  horizontal row of frosted pills (`rounded-pill` + status dot + `label count`, e.g. "Active 1"),
  NOT a 2-col stats-grid and NOT the `rounded-icon` KPI strip. It takes one line, frees vertical
  space for the list (the mock's energy). Big number/stat cards are reserved **only** for the
  Home/dashboard billboard, where the number *is* the content. New primitive: `MobileStateChips`.

## 0. Principles (the feel)

1. **Chrome is frosted glass; content is opaque.** Header, chips, nav island, sheets float
   on `chrome-glass` (blur + translucency); rows/cards/badges are solid and readable.
   Depth = blur + soft shadow, **never borders**. (ivisit-app: "no borders — spacing + opacity".)
2. **One loud action per screen.** Crimson is the single action color; the route **FAB** is
   the one deliberately-loud element. Everything else is quiet.
3. **Readable identity first.** The record's name/facility is the primary line, `line-clamp-2`,
   never a stub. Status is a **semantic pill** in a raw hue, never brand-red, never a blade.
4. **Progressive disclosure.** List → tap → **detail bottom sheet** → (optional) full modal /
   edit. Never an inline dropdown.
5. **Everything is a token or a primitive.** No re-inlined eyebrows/buttons/cards. If it
   appears twice, it's a named element or component.
6. **Apple-HIG parity.** ≥44pt tap targets, graduated press, reduced-motion honored, haptics
   on meaningful actions, safe-area respected, sheets with grab handle + swipe-dismiss.

---

## 1. Tokens — foundation

| Group | Spec | Status |
|---|---|---|
| **Radius ladder** | `sheet 44 · modal 38 · card 30 · inner 22 · button 20 · icon 14 · pill 999`, squircle intent. In `index.css` + `tailwind rounded-{…}`. | ✅ defined · ◐ enforced (only Today/Requests strict-clean) |
| **Color / brand** | `--primary 357 74% 26%` crimson (one action); `--destructive` red for danger only. | ✅ |
| **Status hues (raw)** | semantic tokens collapse to red, so status uses raw hues via `constants/vitalTracks.js`: cyan `#0891B2` / amber `#B45309` / emerald `#047857` / sky `#0284C7` / slate. | ✅ (`resolveVital`, `statusPill`) |
| **Glass** | ONE recipe: `chrome-glass` (0.68 / blur 24 / sat 180%) + `chrome-glass-strong` (0.80 / blur 36). Frosted, borderless, `+ chrome-float` shadow. Content/controls = opaque (no blur). | ✅ collapsed 2026-07-08 — `apple-glass*` stripped of blur → opaque aliases; `chrome-glass` is the sole frosted recipe (legacy unused `glass-surface` remains, out of mobile scope) |
| **Spacing** | 4px grid (ivisit-app `SPACING xs4 sm8 md16 lg24 xl32`); mobile section rhythm 20/12/8. | ☐ not tokenized (inline) |
| **Typography** | scale: title 27–34 / h2 20 / body 15 / meta 12 / caption(eyebrow) 10–11 uppercase `tracking-[0.14em]`. | ☐ not tokenized (inline per component) |
| **Elevation** | soft: row `0 4px 10px /0.03`, card `0 22px 64px /0.14`, float `chrome-float`. app web shadow `0 18px 36px /0.18`. | ◐ inline; not tokenized |
| **Motion** | **spring `{stiffness:168, damping:30, mass:0.9}`**, ease `[0.21,0.47,0.32,0.98]`, sheet-snap `[0.21,0.47,0.32,0.98]`, press controls `0.96` / cards `0.988`. | ⚠️ **`mobileMotion.js` uses ease `[0.22,1,0.36,1]` + durations — NOT the canon. Align.** |

**Foundation gaps to close (highest-leverage for "one voice"):**
- ✅ **Collapse glass to one recipe** — `apple-glass*` stripped of blur → opaque; `chrome-glass` sole frosted recipe (2026-07-08).
- ✅ **State filter = one chip component** — recycled `MobileKPIStrip` into chips; Visits/Emergency bespoke grids deleted onto it (2026-07-08).
- ✅ **Align `mobileMotion.js` to the canon** — Apple ease + `mobileSpring 168/30/0.9` + `mobileMotion.press {control 0.96, card 0.988}` (2026-07-08). Follow-up: normalize inline `whileTap`/inline-spring values in components to these (component-parity pass).
- ☐ **Tokenize spacing + typography + elevation** (CSS vars / Tailwind theme) so elements stop re-inlining.
- ☐ **Element extraction** — `Eyebrow`, `MobileButton`, `MobileIconWell` (replace inline usages).
- ☐ **Strict-radius hardgate green on every mobile page** (not just Today/Requests).

---

## 2. Background & surfaces

- **Page background:** app-frosted gradient wash (Visits `MobileVisitsAtlasLayer` is the
  reference); default to a calm `bg-background` + optional subtle atlas layer. ☐ standardize one
  `MobilePageBackground`.
- **Chrome surface:** `chrome-glass` / `chrome-glass-strong` (header, chips, island, sheet).
- **Content surface:** opaque `bg-card` / `bg-muted/22–50`, rounded-card, soft shadow. Never glass.
- **Separation:** spacing + surface tint + shadow. **No hairlines / borders / left-accent bars.**

---

## 3. Elements (atoms) — the reusable vocabulary

Each must become a **named utility or tiny component**, not re-inlined. Status = mostly ☐.

| Element | Canon | Status |
|---|---|---|
| **Eyebrow / caption** | `text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground` | ☐ used everywhere inline → make `.eyebrow` utility |
| **Identity text** | primary `text-[15px] font-semibold line-clamp-2`; secondary/meta `text-sm/text-xs text-muted-foreground` | ◐ (row-level, not a shared text primitive) |
| **Button** | filled-primary (brand + `0 8px 18px tone/0.30` glow), ghost, destructive; h≥44, `rounded-button`, graduated press | ◐ `ui/button` + `MobileSheetActions` (CTA group) — no documented mobile button set |
| **Status pill** | `rounded-pill px-2.5 py-1 text-[11px] font-semibold` + `resolveVital().pill` tone | ✅ (`statusPill` prop) |
| **Icon well / tile** | `rounded-icon` tinted tile (status/neutral) | ◐ inline; make `MobileIconWell` |
| **Chip (filter/state)** | `rounded-pill chrome-glass` + dot + count; `.on` = brand | ◐ (in KPI strip / per page) |
| **Grab handle** | `h-1.5 w-[42px] rounded-pill bg-foreground/20` | ✅ (ModalShell / sheets) |
| **Divider** | none — spacing only | ✅ (borderless) |

---

## 4. Components (molecules) — the inventory

| Component | Role | Status |
|---|---|---|
| `MobilePageShell` | sticky KPI slot + padded content + error boundary + safe-area | ✅ |
| `MobileKPIStrip` | role-aware KPI/state chips | ✅ |
| `MobileMetricRow` (`MobileMetricList`) | readable row: icon well + eyebrow + name(line-clamp-2) + secondary + status pill + chevron; tap → sheet | ✅ (statusPill + secondary props; left-accent removed) |
| `MobileDetailSheet` | tap-opened bottom sheet: header + VitalTrack + islands + CTA | ✅ (new; on `ModalShell`) |
| `MobileDetailIslands` | labelled fact tiles | ✅ |
| `MobileSheetActions` | CTA group (filled primary + glow, ghost secondary) | ✅ |
| `VitalTrack` | stepped lifecycle (grounded in `lifecycles.js` via `vitalTracks`) | ✅ |
| `MobileListStates` | empty / skeleton / load-more / end | ✅ |
| `PullToRefresh` | pull-to-refresh | ✅ |
| `DynamicBottomBar` | **island + FAB** nav (route-owned action) | ✅ (`chrome-glass-strong`) |
| date-group | `groupByMonth` month-boundary feed | ✅ |
| `MobileFeaturedMetric` / `MobileActivityRow` / `MobileQuickNavPill` | dashboard billboard / event row / nav pill | ◐ exist; audit for token/motion parity |
| `MobileIconWell` · `MobileButton` · `MobilePageBackground` · `Eyebrow` | element primitives | ☐ to extract |

---

## 5. Patterns

- **Progressive disclosure:** list row → `MobileDetailSheet` → full modal / edit. ✅ (all 10 entity pages)
- **Date-grouped feed:** newest-first, month headers, temporal surfaces only. ✅
- **Lifecycle context:** `VitalTrack` in the sheet for stateful records. ✅
- **One state-CTA:** authority-gated primary via `MobileSheetActions`; extras demoted. ✅
- **Filter:** `FilterSheet` mobile bottom sheet. ◐ (align chrome to `chrome-glass`)
- **States:** empty / skeleton / error via `MobileListStates`. ✅

---

## 6. Navigation

- **Mobile:** frosted **island** (nav pill) + route **FAB** (`DynamicBottomBar`) — the app's split. ✅
- **Header:** shell `SmartHeader` (frosted, scroll-hide); back + avatar + route actions. ◐ (mobile header glass parity)
- **Detents (future):** app-style peek/half/full for the map/large sheets. ☐

---

## 7. Motion, microinteraction & side-effects

| Concern | Canon | Status |
|---|---|---|
| Press | controls `scale 0.96`, cards `0.988` (graduated) | ◐ (varies: some `0.97/0.95/0.98`) → normalize |
| Spring / ease | spring `168/30/0.9`; ease `[0.21,0.47,0.32,0.98]` | ⚠️ `mobileMotion` uses `[0.22,1,0.36,1]` + durations → align |
| Sheet | slide-up spring + grab handle + swipe-to-dismiss + backdrop | ✅ (ModalShell) |
| Reduced motion | global `prefers-reduced-motion` → fade only | ✅ (index.css + ModalShell) |
| Tap-flash | `-webkit-tap-highlight-color: transparent` global | ✅ |
| Haptics / sound | `useFeedback().triggerFromEvent` on meaningful actions (haptic + iOS fallback) | ◐ applied in some rows/CTAs → make consistent + documented |
| Focus | animates in place; keyboard focus trap in sheets/modals | ✅ (ModalShell focus trap) |

---

## 8. Modularity & reusability rules

- A page **composes** shell + primitives; it does not re-inline eyebrows/buttons/cards/tones.
- Status/lifecycle presentation comes **only** from `constants/vitalTracks.js`.
- Date grouping comes **only** from `utils/groupByMonth.js`.
- Detail comes **only** through `MobileDetailSheet` (mobile) / detail rail (desktop).
- New element repeated 2× → extract to an element primitive (Layer 3).

---

## 9. Enforcement

- `check-ui-surface-hardgate.js --strict-radius` (radius ladder + no legacy geometry/borders) — **target: green on every mobile page**.
- `check-mojibake.js` on touched files.
- Contract tests per page lock the composition (rows, sheet, borderless).

---

## 10. Parity checklist (Apple HIG / ivisit-app) — per new surface

- [ ] ≥44pt tap targets · safe-area insets honored
- [ ] frosted chrome / opaque content · no borders / hairlines / accent bars
- [ ] readable `line-clamp-2` identity · status = raw-hue pill
- [ ] tap → bottom sheet (not dropdown) · grab handle + swipe-dismiss
- [ ] VitalTrack for lifecycle · date groups for feeds · one state-CTA
- [ ] graduated press · canon spring/ease · reduced-motion · haptic feedback
- [ ] strict-radius hardgate green · one `chrome-glass` recipe · tokens (no re-inline)

---

## Build order (methodical, mobile-first)

1. **Foundation lock** — align `mobileMotion` to the canon spring/ease/press; collapse
   `apple-glass-heavy` → `chrome-glass`; tokenize spacing/type/elevation; drive strict-radius green.
2. **Element extraction** — `Eyebrow`, `MobileButton`, `MobileIconWell`, `MobilePageBackground`,
   status-pill (done) — replace inline usages.
3. **Component parity pass** — audit every mobile primitive against Layers 1/3/7 (tokens + press + haptics).
4. **Finish ① mobile gaps** — Ambulances, Hospitals, role Home onto the shell + template.
5. **② responsive/tablet**, then **③ desktop finishing** — same system scaled up.
