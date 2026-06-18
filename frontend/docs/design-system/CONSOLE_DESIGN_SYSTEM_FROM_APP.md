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
| Screen / page title | 24px | 900 | -0.5px | Tight editorial feel |
| Section header label | 10px | 900 | +3px CAPS | Uppercase eyebrow label |
| Card / panel title | 19px | 900 | -0.5px | Heavy, immediate recognition |
| Card subtitle | 14px | 600 | — | Supporting context |
| Body / description | 14px | 400 | — | Calm, readable, no weight |
| Table cell value | 14px | 400–500 | — | |
| Muted label / timestamp | 12px | 400 | — | `--color-text-faint` |
| Action / CTA button | 14px | 900 | +1.5px | UPPERCASE. Confidence. |

**Critical rules:**
- Only **actions** speak loudly. Button text is weight 900 + letter-spaced. Everything else is calm.
- `letterSpacing: -0.5` on large titles — tightens kerning, feels editorial (Apple-style).
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

// Modal appear
export const MODAL_ENTER = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.21, 0.47, 0.32, 0.98] } },
  exit:    { opacity: 0, y: 16, transition: { duration: 0.18, ease: [0.21, 0.47, 0.32, 0.98] } },
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

---

## 9. Component Patterns

### 9.1 Management Card (Entity Row)

The standard unit for hospital, doctor, ambulance, visit cards.

```jsx
// Tailwind classes
<motion.div
  {...CARD_PRESS}
  className="bg-[var(--color-bg-card)] rounded-[30px] p-5 mb-3 shadow-card
             flex items-start gap-4 cursor-pointer
             hover:shadow-[0px_10px_20px_rgba(134,16,14,0.08)]
             transition-shadow duration-200"
>
  {/* Icon tile — squircle, concentric */}
  <div className="w-11 h-11 rounded-[14px] bg-[var(--glass-muted)]
                  flex items-center justify-center flex-shrink-0">
    <Icon />
  </div>

  {/* Content */}
  <div className="flex-1 min-w-0">
    <p className="text-[19px] font-black tracking-[-0.5px] text-[var(--color-text)] truncate">
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
  <span className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-widest uppercase
                   bg-[var(--glass-muted)] text-[var(--color-text-muted)]">
    STATUS
  </span>
</motion.div>
```

### 9.2 Context Panel / Right Drawer

Mirrors `MapModalShell` — the right-side detail panel in the console.

```css
/* Panel shell */
.context-panel {
  border-radius: var(--radius-sheet) 0 0 var(--radius-sheet);  /* left side rounded */
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
  letter-spacing: -0.5px;
  color: var(--color-text);
}

/* Close button — full-round, not squircle */
.panel-close {
  width: 38px;
  height: 38px;
  border-radius: 999px;
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
  className="h-14 rounded-[20px] bg-[var(--color-brand)] px-8
             text-white text-[14px] font-black tracking-[1.5px] uppercase
             shadow-[0px_4px_16px_rgba(134,16,14,0.28)]
             active:scale-[0.988] active:opacity-90
             transition-transform duration-75"
>
  CONFIRM
</button>
```

### 9.4 Section Header Label

Used above card groups — eyebrow label style.

```jsx
<p className="text-[10px] font-black tracking-[3px] uppercase
              text-[var(--color-text-muted)] mb-2 px-1">
  SECTION LABEL
</p>
```

### 9.5 Vital / Progress Track

From the Trip Summary golden standard. Used for stage progress in onboarding, verification steps, multi-step workflows.

```jsx
<div className="h-1 rounded-full bg-[var(--color-border-faint)] overflow-hidden">
  <div
    className="h-full rounded-full bg-[var(--color-brand)] relative transition-all duration-500"
    style={{ width: `${progress}%` }}
  >
    {/* Leading plow dot */}
    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
                    w-3 h-3 rounded-full bg-[var(--color-brand)]
                    border-[3px] border-white" />
  </div>
</div>
```

### 9.6 Identity Island (Compact Info Widget)

For operator info, assigned provider, org context — encapsulated, not a list item.

```jsx
<div className="rounded-[24px] p-4 bg-[var(--glass-muted)] flex items-center gap-3">
  {/* Squircle avatar */}
  <div className="w-13 h-13 rounded-[16px] bg-[var(--glass-strong)] overflow-hidden flex-shrink-0">
    <Avatar />
  </div>
  <div>
    <p className="text-[14px] font-semibold text-[var(--color-text)]">Name</p>
    <p className="text-[12px] font-semibold text-[var(--color-text-muted)] tracking-wide uppercase">
      ROLE · ORG
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

## 11. What Console Gets From This

| App pattern | Console equivalent |
|---|---|
| MapSheetShell (floating, draggable) | Right-side ContextPanel + Modal drawers |
| Explore intent cards (glass + squircle) | Management entity cards |
| Modal close button (38px full-round) | All panel/modal close affordances |
| Identity island | Provider/org info widgets in panels |
| Vital track | Onboarding progress, verification step indicator |
| Card press (scale 0.988) | Every clickable row/card in the console |
| Section eyebrow label | All section headers above card groups |
| Glass search surface | QuickSearch bar |
| One primary action per surface | Every modal's main CTA button |

---

## 12. What to Stop Doing

These patterns conflict with the ivisit design language and make the console feel like generic enterprise SaaS:

- **Harsh full-opacity colored sections** — use glass tints or muted fills
- **Heavy borders everywhere** — prefer spacing and surface depth
- **Multiple primary buttons on one screen** — one commit action per surface
- **Dense tables with no breathing room** — 20px card padding, 12px gaps
- **Red for decorative category labels** — red means emergency or danger only
- **Flat squared corners** — use the radius tokens; squircle is the language
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
