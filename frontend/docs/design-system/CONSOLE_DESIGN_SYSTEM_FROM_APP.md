---
status: living
owner: design
source: extracted from ivisit-app map/sheet UI (2026-06-18)
---

# iVisit Console Design System
### Extracted from ivisit-app — Map & Sheet UI

> The console should feel like the app — calm, trustworthy, and obvious. Not a generic SaaS dashboard. Not a spreadsheet with cards on top. A tool that makes healthcare operations feel guided and simple.

This document extracts the design tokens, patterns, and rules directly from `ivisit-app`'s map/sheet UI and translates them for the console's React + Tailwind + shadcn stack.

---

## 1. The One Rule

> If an interaction draws attention to itself, it has failed.

The console is an operational tool. It must make the user feel:
- **Safe** — nothing will break, data is real
- **Oriented** — they always know where they are
- **In control** — actions are clear, reversible, and have feedback

Everything else is noise.

---

## 2. Color Tokens

Translated directly from `ivisit-app/constants/colors.js` and `mapUI.tokens.js`.

### CSS Custom Properties (add to `index.css` or Tailwind config)

```css
:root {
  /* Brand */
  --color-brand:        #86100E;  /* Primary — decisions, actions, active states only */
  --color-brand-deep:   #B71C1C;  /* Hover/border accent */
  --color-emergency:    #C62828;  /* Danger/emergency — do not reuse for non-critical UI */

  /* Backgrounds */
  --color-bg:           #FAFAFA;  /* Page background — never pure white */
  --color-bg-card:      #F3E7E7;  /* Card fill (light mode) — warm tint, not cold gray */
  --color-bg-input:     #F3F4F6;  /* Input field background */

  /* Text */
  --color-text:         #0F172A;  /* Titles, primary content */
  --color-text-body:    #475569;  /* Body, descriptions */
  --color-text-muted:   #64748B;  /* Labels, secondary info */
  --color-text-faint:   #94A3B8;  /* Timestamps, disabled states */

  /* Borders */
  --color-border:       #E2E8F0;  /* Dividers, input borders */
  --color-border-faint: rgba(15, 23, 42, 0.06); /* Ghost borders */

  /* Glass surfaces */
  --glass-strong:  rgba(255, 255, 255, 0.72);  /* Prominent cards over image/map */
  --glass-muted:   rgba(15, 23, 42, 0.05);     /* Subtle section backgrounds */
  --glass-search:  rgba(255, 255, 255, 0.76);  /* Search bar, floating input */
  --glass-close:   rgba(255, 255, 255, 0.42);  /* Close/dismiss buttons */
}

[data-theme="dark"] {
  --color-bg:           #0D121D;
  --color-bg-card:      #0B0F1A;
  --color-bg-input:     #0B0F1A;
  --color-text:         #F8FAFC;
  --color-text-body:    #CBD5E1;
  --color-text-muted:   #94A3B8;
  --color-text-faint:   #64748B;
  --color-border:       rgba(255, 255, 255, 0.08);
  --color-border-faint: rgba(255, 255, 255, 0.04);
  --glass-strong:  rgba(255, 255, 255, 0.08);
  --glass-muted:   rgba(255, 255, 255, 0.06);
  --glass-search:  rgba(15, 23, 42, 0.74);
  --glass-close:   rgba(148, 163, 184, 0.14);
}
```

### Usage rules (non-negotiable)

- `--color-brand` is for **one primary action per screen** — the button that commits, submits, or confirms. Never for decorative fills, background sections, or body text.
- `--color-emergency` / red variants are **reserved** for emergency status, destructive actions, and real errors. Do not use red to decorate.
- Backgrounds should fade into irrelevance. Content and action lead.

**Console color bridge:** Console runtime CSS keeps the shadcn-compatible HSL token `--primary: 357 74% 26%` as the implementation owner for brand red. Treat app-derived `--color-brand` examples as the same brand value, not a second token to redefine. Tailwind's `brand` alias must resolve through `hsl(var(--primary))` so future revamp utilities cannot drift from the global theme.

---

## 3. Geometry & Radius Tokens

From `mapSheetTokens.js` and `mapModalShell.styles.js`. Continuous (squircle) corners are the ivisit standard.

```css
:root {
  --radius-sheet:  44px;   /* Full sheet, drawer, slide-out panels */
  --radius-card:   30px;   /* Management cards, entity cards */
  --radius-inner:  22px;   /* Inner cards, nested surfaces */
  --radius-icon:   14px;   /* Icon tiles, avatar wells */
  --radius-button: 20px;   /* Action buttons */
  --radius-pill:   999px;  /* Chips, badges, handles, capsule tags */
  --radius-modal:  38px;   /* Modal / dialog sheets */
}
```

**Squircle rule:** In the app, `borderCurve: "continuous"` makes corners feel organic and high-end. In CSS, approximate with large radius + standard `border-radius`. The shape matters less than the intent: avoid harsh squared corners on any surface the user interacts with.

**Console enforcement:** `src/index.css` is the canonical geometry owner. The generic `--squircle` alias resolves back to `--radius-card` so there is one radius ladder, not a second almost-matching curve. The legacy `geo-*` aliases, legacy size aliases such as `squircle-xl` / `squircle-sm`, and semantic `squircle-*` utilities must resolve to the radius tokens above, never to `border-radius: 0`. `tailwind.config.js` must expose `rounded-sheet`, `rounded-card`, `rounded-inner`, `rounded-icon`, `rounded-button`, `rounded-pill`, `rounded-modal`, and `rounded-squircle`. Active revamp code should use those Tailwind utilities or semantic global aliases such as `squircle-sheet`, `squircle-modal`, `squircle-card`, `squircle-inner`, `squircle-button`, `squircle-icon`, and `squircle-pill`; legacy `geo-*` utilities and size-named `squircle-*` utilities are compatibility aliases for older pages, not acceptable in new revamp files. New examples must also use plain readable labels with normal letter spacing and avoid decorative Tailwind border, ring, outline, divider, and hairline utilities; old all-caps/tracking/bordered chrome is not a pattern source. `scripts/check-ui-surface-hardgate.js` includes `App.js`, `src/index.css`, and `tailwind.config.js`; when run with `--strict-radius`, it rejects generic or arbitrary radius utilities such as `rounded-[30px]`, `rounded-2xl`, and `rounded-full`, plus legacy `geo-*` and `squircle-xl` / `squircle-sm` utilities, in candidate revamp files before admission. Use `npm run check:ui-hardgate:revamp -- <files>` for the exact page/component slice being admitted.

**Nested surfaces must be concentric** — an inner card (22px) inside an outer card (30px) inside a drawer (44px). Smaller radius inside bigger radius, always.

---

## 4. Spacing

From `SCREEN_CONSISTENCY_GUIDE.md` and `mapSheetStage.styles.js`.

```
Page horizontal padding:    20px  (px-5 in Tailwind)
Card padding:               20px  (p-5)
Sheet content padding:      14px  (px-3.5)
Modal content padding:      16px  (px-4)
Gap between cards/sections: 12px  (gap-3)
Sheet island margin:         8px  (m-2)
```

**One rule to remember:** 20 / 20 / 12. Page padding 20, card padding 20, gaps between things 12.

---

## 5. Typography

From `ui_ux_bible.md` and `SCREEN_CONSISTENCY_GUIDE.md`. Font: **Inter** (already in the console stack).

| Role | Size | Weight | Letter Spacing | Notes |
|---|---|---|---|---|
| Screen / page title | 24px | 800-900 | 0 | Clear page identity |
| Section label | 12px | 600 | 0 | Quiet grouping label |
| Card / panel title | 19px | 800-900 | 0 | Heavy, immediate recognition |
| Card subtitle | 14px | 600 | — | Supporting context |
| Body / description | 14px | 400 | — | Calm, readable, no weight |
| Table cell value | 14px | 400–500 | — | |
| Muted label / timestamp | 12px | 400 | — | `--color-text-faint` |
| Action / CTA button | 14px | 600-700 | 0 | Plain action text |

**Critical rules:**
- Only **actions** speak loudly through placement, color, and state. Do not use letter-spaced all-caps chrome.
- Letter spacing stays `0` in UI text and labels; use weight, scale, and spacing for hierarchy.
- Never put primary text on a primary (red) background.
- Supporting and descriptive text defaults to weight 400.

---

## 6. Shadow & Depth

No heavy drop shadows. Depth is suggested, not asserted.

```css
/* Cards — light suggestion of lift */
.shadow-card {
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.03);
}

/* Elevated panels / drawers */
.shadow-panel {
  box-shadow: 0px 10px 24px rgba(0, 0, 0, 0.08);
}

/* Active/selected card — brand glow (not black shadow) */
.shadow-active {
  box-shadow: 0px 10px 20px rgba(134, 16, 14, 0.12);
}

/* Floating controls / FABs / search */
.shadow-float {
  box-shadow: 0px 18px 36px rgba(0, 0, 0, 0.18);
}
```

**Never use `border-width` to create depth.** Use background color shifting and shadows. A selected card changes its shadow color to `brandPrimary` with 0.12–0.20 opacity — it looks like it's emitting light.

---

## 7. Glass Surfaces (Translucent Cards & Panels)

From `mapGlassTokens.js`. Used on context panels, modals, overlays, search bars.

```css
/* Backdrop behind modals */
.glass-backdrop {
  background: rgba(0, 0, 0, 0.46);
}

/* Sheet/panel glass surface — light mode */
.glass-surface {
  background: rgba(248, 250, 252, 0.84);
  backdrop-filter: blur(52px);
  -webkit-backdrop-filter: blur(52px);
}

/* Sheet/panel glass surface — dark mode */
[data-theme="dark"] .glass-surface {
  background: rgba(8, 15, 27, 0.84);
  backdrop-filter: blur(44px);
  -webkit-backdrop-filter: blur(44px);
}

/* Card inside glass panel — light */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
}
[data-theme="dark"] .glass-card {
  background: rgba(255, 255, 255, 0.08);
}

/* Ghost card — subtle section separation */
.glass-ghost {
  background: rgba(15, 23, 42, 0.05);
}
[data-theme="dark"] .glass-ghost {
  background: rgba(255, 255, 255, 0.06);
}
```

**Glass placement rules:**
- Use glass for: context panels, modals, search bars, floating controls
- Do NOT glass: every badge, metric chip, table row, status dot
- Never stack multiple translucent layers under text without a contrast guard

---

## 8. Motion & Animation

From `mapMotionTokens.js` and `ui_ux_bible.md`. Translated for Framer Motion (already in the console stack).

### Framer Motion variants

```js
// Standard panel/drawer open — feels physical
export const PANEL_SPRING = {
  type: "spring",
  damping: 30,
  mass: 0.9,
  stiffness: 168,
};

// Sheet snap — quick, natural
export const SHEET_SNAP_SPRING = {
  type: "spring",
  tension: 42,
  friction: 14,
};

// Modal/sheet open. Shared modal and sheet chrome unmounts when closed.
export const MODAL_OPEN = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.21, 0.47, 0.32, 0.98] } },
};

// Page / card mount — calm fade + lift
export const PAGE_ENTER = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// Pressed card — physical press feeling
export const CARD_PRESS = {
  whileTap: { scale: 0.988, opacity: 0.94 },
  transition: { duration: 0.08 },
};
```

### Timing constants

```js
export const MOTION = {
  easeApple:   [0.16, 1, 0.3, 1],          // Standard spring-like ease
  easeSnap:    [0.21, 0.47, 0.32, 0.98],   // Sheet/modal snap
  durationFast:   180,   // ms — exits, dismissals
  durationNormal: 260,   // ms — modal open, panel slide
  durationSlow:   400,   // ms — page enter, content reveal
  durationCare:   760,   // ms — pulse animations (emergency states)
};
```

### Rules
- Motion explains state change — it does not decorate.
- If you cannot explain the animation in one sentence, remove it.
- No looping animation after a user has made a choice.
- Every Pressable / interactive card uses `whileTap: { scale: 0.988 }`. This is the universal press feedback.
- Shared modal, sheet, and drawer chrome may animate open, but closed state must unmount. Do not leave invisible `role="dialog"`, backdrop, focus trap, pointer-catching layer, or hidden bottom-island suppression behind while waiting for an exit animation.

---

## 9. Component Patterns

### 9.1 Management Card (Entity Row)

The standard unit for hospital, doctor, ambulance, visit cards.

```jsx
// Tailwind classes
<motion.div
  {...CARD_PRESS}
  className="bg-[var(--color-bg-card)] rounded-card p-5 mb-3 shadow-card
             flex items-start gap-4 cursor-pointer
             hover:shadow-[0px_10px_20px_rgba(134,16,14,0.08)]
             transition-shadow duration-200"
>
  {/* Icon tile — squircle, concentric */}
  <div className="w-11 h-11 rounded-icon bg-[var(--glass-muted)]
                  flex items-center justify-center flex-shrink-0">
    <Icon />
  </div>

  {/* Content */}
  <div className="flex-1 min-w-0">
    <p className="text-[19px] font-black text-[var(--color-text)] truncate">
      Entity Name
    </p>
    <p className="text-[14px] font-semibold text-[var(--color-text-body)] mt-0.5">
      Subtitle / status
    </p>
    <p className="text-[12px] text-[var(--color-text-faint)] mt-1">
      Meta / timestamp
    </p>
  </div>

  {/* Trailing badge — pill */}
  <span className="rounded-pill px-2.5 py-1 text-[10px] font-semibold
                   bg-[var(--glass-muted)] text-[var(--color-text-muted)]">
    Status
  </span>
</motion.div>
```

### 9.2 Context Panel / Right Drawer

Mirrors `MapModalShell` — the right-side detail panel in the console.

```css
/* Panel shell */
.context-panel {
  border-radius: var(--radius-sheet);
  background: var(--glass-surface);
  backdrop-filter: blur(52px);
  box-shadow: var(--shadow-panel);
  padding: 14px;
}

/* Panel header row */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

/* Panel title */
.panel-title {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--color-text);
}

/* Close button - compact semantic pill, not a generic radius class */
.panel-close {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-pill);
  background: var(--glass-close);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 9.3 Action Button (Primary)

One primary action per screen. Bold, committed.

```jsx
<button
  className="h-14 rounded-button bg-[var(--color-brand)] px-8
             text-white text-[14px] font-semibold
             shadow-[0px_4px_16px_rgba(134,16,14,0.28)]
             active:scale-[0.988] active:opacity-90
             transition-transform duration-75"
>
  Confirm
</button>
```

### 9.4 Section Label

Used above card groups as a quiet grouping label.

```jsx
<p className="text-[12px] font-semibold
              text-[var(--color-text-muted)] mb-2 px-1">
  Section label
</p>
```

### 9.5 Vital / Progress Track

From the Trip Summary golden standard. Used for stage progress in onboarding, verification steps, multi-step workflows.

```jsx
<div className="h-1 rounded-pill bg-[var(--color-border-faint)] overflow-hidden">
  <div
    className="h-full rounded-pill bg-[var(--color-brand)] relative transition-all duration-500"
    style={{ width: `${progress}%` }}
  >
    {/* Leading plow dot */}
    <div className="absolute right-0 top-1/2 flex h-4 w-4 -translate-y-1/2 translate-x-1/2
                    items-center justify-center rounded-pill bg-[var(--glass-surface)]
                    shadow-[0_6px_14px_rgba(134,16,14,0.18)]">
      <span className="h-2.5 w-2.5 rounded-pill bg-[var(--color-brand)]" />
    </div>
  </div>
</div>
```

### 9.6 Identity Island (Compact Info Widget)

For operator info, assigned provider, org context — encapsulated, not a list item.

```jsx
<div className="rounded-inner p-4 bg-[var(--glass-muted)] flex items-center gap-3">
  {/* Squircle avatar */}
  <div className="w-13 h-13 rounded-icon bg-[var(--glass-strong)] overflow-hidden flex-shrink-0">
    <Avatar />
  </div>
  <div>
    <p className="text-[14px] font-semibold text-[var(--color-text)]">Name</p>
    <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">
      Role / org
    </p>
  </div>
</div>
```

---

## 10. Background Gradients

From `SCREEN_CONSISTENCY_GUIDE.md`. Page backgrounds use a subtle warm gradient, not a flat fill.

```js
// Light mode
const bgLight = ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

// Dark mode
const bgDark = ["#121826", "#0B0F1A", "#121826"];
```

In CSS:
```css
.page-bg-light {
  background: linear-gradient(180deg, #FFFFFF 0%, #F3E7E7 50%, #FFFFFF 100%);
}
.page-bg-dark {
  background: linear-gradient(180deg, #121826 0%, #0B0F1A 50%, #121826 100%);
}
```

---

## 11. Today/Requests Canonical Page Pattern

Today and Requests are the first reusable console page family. They translate the app's map plus sheet language into a console work surface.

Use this pattern for pages that need a calm first screen, role-aware data, and one obvious next action.

### 11.1 Stage Anatomy

| Region | Purpose | Canonical owner |
|---|---|---|
| Atlas field | Spatial, calm background and first-glance status. It gives the page place without becoming decoration. | Page stage inside the shared `App.js` shell. |
| Signal field | One short state sentence, one supporting line, and the route's current truth. | Page data owner. Never fake counts after failed or capped reads. |
| State choices | 2-4 KPI or status choices that filter the same canonical data projection. | Route query/service owner. |
| Handled sheet | The main scan surface: activity rows, cards, or table variants of the same projection. | Page body or mobile bottom sheet. |
| Focus rail | One selected object, one primary action, secondary actions revealed only after receiver proof. | Page-owned detail rail or context panel. |
| Route action | One clear create/review action when the role can use it. | Page header/FAB/mobile action, not duplicated by global FABs. |

### 11.2 Today Variant

Today is the role-first variant:

- Use full-bleed stage mode.
- Show one role signal.
- Show 2-3 glance actions as buttons, not static stats.
- Use a handled sheet for next steps.
- Navigate to the page that owns the command instead of performing high-risk writes on Today.
- Hide the global FAB and floating footer.

### 11.3 Requests Variant

Requests is the multi-data variant:

- Keep route copy as `Requests`; the canonical path can remain `/emergencies`.
- Use one route service owner for list, exact count, filters, pagination, enrichment, degraded states, and realtime refresh.
- Desktop layout is atlas field plus signal, state choices, handled activity sheet, and focused right rail.
- Mobile layout is signal first, 2x2 state choices, handled bottom sheet, row reveal, avatar account sheet, and bottom island nav.
- Modals use `ModalShell`; read/context detail uses rail or context panel.
- Legacy list/table/card views may exist only as variants of the same projection, never as a second source of truth.

### 11.4 Interaction Rules

- Every clickable card, row, state choice, modal trigger, and route action needs immediate pressed, selected, opening, pending, or loading feedback.
- Hover and focus reveal supporting detail; they do not hide the primary action.
- Mobile tap reveals the next useful action, not a crowded action bar.
- Route changes show opening feedback before the destination settles.
- Modal, sheet, and drawer close/dismiss must leave no active dialog, no hidden backdrop, no focus trap, no pointer-catching invisible surface, and no lingering app-chrome or bottom-island suppression.
- Empty, loading, and error states keep the final layout structure. Do not replace the page with a blank pause.

### 11.5 Reuse Limits

Reuse the pattern, not the markup.

- Do not copy Requests components into another route without a page ledger.
- Do not treat visual resemblance to Requests as admission. A page may reuse the canon only after its ledger maps signal field, state choices, handled sheet, focused detail, route-owned action, shared modal/sheet, mobile recomposition, data quieting, local semantic color, and interaction feedback.
- That ledger must include the gate's three-part evidence rule: targeted recent Git history, `git show HEAD:<old page>` behavior inventory, and active-source proof for shell ownership, data owner, side effects, actions, feedback states, and mobile recomposition.
- `planning/PAGE_REVAMP_GATE.md` owns the canonical interaction-surface checklist for modal triggers, modal design, drawers, dropdowns, filters, tabs, cards, tables, empty/loading/error states, right panels, notifications, and responsive behavior.
- A page may configure those surfaces only through the shared shell/component owners or a ledger-approved exception. It may not invent private modal triggers, private dropdown/menu chrome, private right-panel shells, private notification dropdowns, or private responsive navigation.
- Shared modal/sheet reuse means using `ModalShell` or `FilterSheet` semantics: open with immediate visible feedback, close by unmounting the shared chrome, and prove no stale dialog surface remains.
- Do not use red for clear, completed, informational, or success states.
- Do not add private headers, sidebars, footers, FAB models, notification dropdowns, modal chrome, filter language, or dropdown styles.
- Do not keep old bulk/destructive/money actions unless the receiver, role authority, confirmation, payload, and app consequence are proved.
- Do not keep an enabled action unless the page proves `source truth -> receiver -> app consequence` and shows immediate pressed, pending, success, failure, disabled, or route-transition feedback.
- Do not promote a page as revamped until `PAGE_REVAMP_GATE.md` admits it through old-behavior audit, shell relationship, data owner, RBAC/action authority, responsive proof, interaction proof, hardgate checks, rendered desktop/mobile proof, and local process cleanup.

---

## 12. What Console Gets From This

| App pattern | Console equivalent |
|---|---|
| MapSheetShell (floating, draggable) | Right-side ContextPanel + Modal drawers |
| Explore intent cards (glass + squircle) | Management entity cards |
| Modal close button (38px semantic pill) | All panel/modal close affordances |
| Identity island | Provider/org info widgets in panels |
| Vital track | Onboarding progress, verification step indicator |
| Card press (scale 0.988) | Every clickable row/card in the console |
| Section label | All section headers above card groups |
| Glass search surface | QuickSearch bar |
| One primary action per surface | Every modal's main CTA button |

---

## 13. What to Stop Doing

These patterns conflict with the ivisit design language and make the console feel like generic enterprise SaaS:

- **Harsh full-opacity colored sections** — use glass tints or muted fills
- **Heavy borders everywhere** — prefer spacing and surface depth
- **Multiple primary buttons on one screen** — one commit action per surface
- **Dense tables with no breathing room** — 20px card padding, 12px gaps
- **Red for decorative category labels** — red means emergency or danger only
- **Flat squared corners** — use the radius tokens; squircle is the language
- **Global orb/background decoration utilities** — page backgrounds should be calm system surfaces, not attention-seeking shapes
- **Looping animations** — motion stops when the user has context
- **Hardcoded `#000` shadows** — use the shadow patterns above; colored shadows for active states

---

## Source Files

All tokens extracted from live `ivisit-app` source (read 2026-06-18):

- `components/map/tokens/mapUI.tokens.js`
- `components/map/tokens/mapGlassTokens.js`
- `components/map/tokens/mapSheetTokens.js`
- `components/map/tokens/mapMotionTokens.js`
- `components/map/tokens/mapRenderTokens.js`
- `components/map/mapSheetShell.styles.js`
- `components/map/surfaces/mapModalShell.styles.js`
- `components/map/views/shared/mapSheetStage.styles.js`
- `components/map/shared/intentCard.styles.js`
- `constants/colors.js`
- `docs/product_design/ui_ux_bible.md`
- `docs/product_design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md`
- `docs/product_design/SCREEN_CONSISTENCY_GUIDE.md`
