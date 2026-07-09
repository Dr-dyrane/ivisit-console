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

Status: **DRAFT v1.2 — 2026-07-09.** Layers 4 (components) largely ✅ from the rollout;
Layers 1/3/7 (tokens·motion / elements / interaction) are the open foundation work.
**v1.1 (2026-07-09):** the Requests-proven canon is folded in — surface token system (§2), loading &
refetch model (§5), KPI-scope + empty/error rules (§5), search field + Updating pill (§3),
dialog-name a11y (§7). Reference page: `src/components/mobile/MobileEmergency.jsx`.
**v1.2 (2026-07-09):** the Today-proven dashboard canon — page-type grammar LIST vs DASHBOARD (§5),
no-all-caps typography (§3), prop-driven mobile presentation (§8), dock-slot ranking +
context-aware top bar (§6). Second reference page: `src/components/mobile/MobileToday.jsx`.

---

## Decisions log (locked)

- **2026-07-08 · Borderless** — no borders / left-accent bars anywhere; separation is
  spacing + surface tint + soft shadow. Enforced by the strict-radius/no-border hardgate.
  *Amended 2026-07-09:* the intra-group **HAIRLINE** (`--muted-foreground/0.08`, §2) is canon
  inside grouped list panels — an alpha whisper of separation, not a border. Borders, outlines
  and accent bars stay banned.
- **2026-07-08 · One glass recipe** — chrome = `chrome-glass` / `chrome-glass-strong` (frosted,
  borderless); content = opaque cards. `apple-glass-heavy` is deprecated → migrate to `chrome-glass`.
- **2026-07-08 · State filter = compact CHIP row (pills)** — the list-page state/KPI filter is a
  horizontal row of frosted pills (`rounded-pill` + status dot + `label count`, e.g. "Active 1"),
  NOT a 2-col stats-grid and NOT the `rounded-icon` KPI strip. It takes one line, frees vertical
  space for the list (the mock's energy). Big number/stat cards are reserved **only** for the
  Home/dashboard billboard, where the number *is* the content. New primitive: `MobileStateChips`.
- **2026-07-08 · Chips are uniformly plain (one voice)** — the recycled `MobileKPIStrip` chip row
  renders labels plainly on every page; the vestigial `labelTone` caps/plain prop was removed so no
  page can diverge. `labelTone` still lives on `MobileSectionHeader`/`MobileListStates` (section
  copy), not on the chip strip.
- **2026-07-08 · Glass collapse complete** — `apple-glass*` removed from all clean mobile components
  (content → `bg-muted/40` / `bg-background/85`; only genuine floating chrome uses `chrome-glass`).
  Where the alias sat on a row with conditional `bg-*` state classes it was *masking* the
  expand/select background (cascade win) — removing it restored the intended state shift
  (`MobileMetricList` row, `MobileActivityRow`). Only `MobileDashboard`/`MobileVerification` (other
  lane, dirty) still carry the alias.
- **2026-07-08 · Graduated press canon everywhere** — controls (buttons/chips/icon buttons)
  `scale 0.96` (`whileTap` or `active:scale-[0.96]`); cards/rows `0.988`. All off-canon presses
  (`0.9`/`0.95`/`0.97`/`0.98`) collapsed; ad-hoc springs → `mobileMotion.spring` (168/30/0.9).
- **2026-07-08 · Tracking is tokenized** — eyebrow tracking is `var(--tracking-eyebrow)` (0.14em),
  not a raw value. Both the PageRevampGate contract and the UI hardgate ban raw non-zero
  `letter-spacing` but exempt `var(...)`, mirroring the `border-radius` token rule.
- **2026-07-09 · Surface token system (GROUND / RAISED / GLASS / HAIRLINE)** — every mobile
  surface differentiates through ONE relationship, not ad-hoc `bg-*`: GROUND `bg-background`,
  RAISED `.surface-card`, GLASS `chrome-glass` (floating chrome only), HAIRLINE
  `--muted-foreground/0.08` intra-group separators. Tokenized in `src/index.css` ("Mobile
  surface system" block); proven on Requests. Full system in §2.
- **2026-07-09 · Skeleton-first loading, replace-in-place** — every mount opens on a
  group-shaped skeleton (forced `SKELETON_WARMUP_MS = 400` warm-up covers cached bottom-nav
  mounts); content replaces it in place with zero layout jump; NO entrance
  translate/stagger/fade-from-blank. Background refetches surface as the "Updating" pill
  (`isFetching`), never a re-skeleton. Full model in §5.
- **2026-07-09 · No all-caps subtext or subheadings** — mobile renders no uppercase subtext or
  section subheadings, anywhere. The first question for a section label is whether to render it
  at all: whitespace + grouping guide first (Today's 'AT A GLANCE' label was **removed**, not
  recased). Data-tile labels are sentence-case (`text-[11px] font-medium text-muted-foreground`
  over the value); list group headers are sentence-case **bold** (`text-[13px] font-bold`,
  Requests' recency labels). `.eyebrow` (the uppercase micro-label) survives ONLY as established
  detail furniture (sheet captions, fact-tile labels) — never as a section subheading.
  Supersedes the earlier "eyebrow for captions everywhere" reading of §1/§3. Full vocabulary in §3.
- **2026-07-09 · Page-type grammar (LIST vs DASHBOARD)** — the mobile canon has TWO reference
  implementations, chosen by page identity and never mixed. LIST (`MobileEmergency.jsx`): KPI
  chip rail + search + grouped recency list + detail sheets. DASHBOARD (`MobileToday.jsx`):
  signal-first hero + 2-up glance NAVIGATION tiles + action-row sheet with in-place expansion +
  generous `space-y-8` rhythm. Dashboard tiles NAVIGATE — they never filter; no KPI filter
  strips on dashboards, no glance tiles on lists. Full grammar in §5.
- **2026-07-09 · Mobile surfaces are prop-driven presentation** — the mobile surface of a
  desktop page holds ZERO data logic; the desktop page stays the single model owner (counts,
  signal copy, context-panel publishing) and passes the computed model down (anti-drift: one
  model, two renders). Contract documented in `MobileToday.jsx`'s header JSDoc; fork lives in
  `TodayHome.jsx` (return-only, after every hook). Full rule in §8.
- **2026-07-09 · Dock slots rank by operational importance; top bar is context-aware** —
  Settings never holds a dock slot by right (the avatar sheet owns overflow —
  `MOBILE_NAV_CHROME.overflowOwner: 'avatar'`, `src/config/mobileNavigation.js`); admin dock =
  Today / Requests / Approvals / Map. Top bar (`SmartHeader.jsx`): on home ('/') the avatar
  owns the LEFT section (no history to render); on subpages it yields left to the back +
  previous-route chip and sits right. Details in §6.

## 0. Principles (the feel)

1. **Chrome is frosted glass; content is opaque.** Header, chips, nav island, sheets float
   on `chrome-glass` (blur + translucency); rows/cards/badges are solid and readable.
   Depth = blur + soft shadow, **never borders**. (ivisit-app: "no borders — spacing + opacity".)
   Inside a grouped panel, sibling rows separate with the `/0.08` HAIRLINE (§2) — an alpha
   film, not a border.
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
7. **Loading is shape-stable.** Every mount is skeleton-first (forced warm-up); the skeleton
   mirrors the real list 1:1 so content replaces it **in place**. Chrome (title/search) is
   simply present — no entrance motion, no fade-from-blank. (Full model in §5.)

---

## 1. Tokens — foundation

| Group | Spec | Status |
|---|---|---|
| **Radius ladder** | `sheet 44 · modal 38 · card 30 · inner 22 · button 20 · icon 14 · pill 999`, squircle intent. In `index.css` + `tailwind rounded-{…}`. | ✅ defined · ◐ enforced (only Today/Requests strict-clean) |
| **Color / brand** | `--primary 357 74% 26%` crimson (one action); `--destructive` red for danger only. | ✅ |
| **Status hues (raw)** | semantic tokens collapse to red, so status uses raw hues via `constants/vitalTracks.js`: cyan `#0891B2` / amber `#B45309` / emerald `#047857` / sky `#0284C7` / slate. | ✅ (`resolveVital`, `statusPill`) |
| **Glass** | ONE recipe: `chrome-glass` (0.68 / blur 24 / sat 180%) + `chrome-glass-strong` (0.80 / blur 36). Frosted, borderless, `+ chrome-float` shadow. Content/controls = opaque (no blur). | ✅ collapsed 2026-07-08 — `apple-glass*` stripped of blur → opaque aliases; `chrome-glass` is the sole frosted recipe (legacy unused `glass-surface` remains, out of mobile scope) |
| **Surfaces** | GROUND `bg-background` · RAISED `.surface-card` (fg/0.05 light · white/0.07 dark) · GLASS `chrome-glass` (chrome only) · HAIRLINE `--muted-foreground/0.08` · backdrop scrim `bg-black/[0.46] backdrop-blur-sm`. Full system → §2. | ✅ tokenized (`index.css` "Mobile surface system" block, 2026-07-09) · ◐ adoption sweep (Requests panels/chips still inline the film) |
| **Spacing** | 4px grid (ivisit-app `SPACING xs4 sm8 md16 lg24 xl32`); mobile section rhythm 20/12/8. | ☐ not tokenized (inline) |
| **Typography** | scale: title 27–34 / h2 20 / body 15 / meta 12 / caption 10–11. **Casing (2026-07-09):** no all-caps subtext/subheadings — the uppercase `.eyebrow` caption survives only as established detail furniture (§3); section labels are sentence-case or not rendered at all. | ◐ `.eyebrow`/`.text-identity`/`.text-meta` tokenized; scale otherwise inline per component |
| **Elevation** | soft: row `0 4px 10px /0.03`, card `0 22px 64px /0.14`, float `chrome-float`. app web shadow `0 18px 36px /0.18`. | ◐ inline; not tokenized |
| **Motion** | **spring `{stiffness:168, damping:30, mass:0.9}`**, ease `[0.21,0.47,0.32,0.98]`, sheet-snap `[0.21,0.47,0.32,0.98]`, press controls `0.96` / cards `0.988`. | ⚠️ **`mobileMotion.js` uses ease `[0.22,1,0.36,1]` + durations — NOT the canon. Align.** |

**Foundation gaps to close (highest-leverage for "one voice"):**
- ✅ **Collapse glass to one recipe** — `apple-glass*` stripped of blur → opaque; `chrome-glass` sole frosted recipe (2026-07-08).
- ✅ **State filter = one chip component** — recycled `MobileKPIStrip` into chips; Visits/Emergency bespoke grids deleted onto it (2026-07-08).
- ✅ **Align `mobileMotion.js` to the canon** — Apple ease + `mobileSpring 168/30/0.9` + `mobileMotion.press {control 0.96, card 0.988}` (2026-07-08). Follow-up: normalize inline `whileTap`/inline-spring values in components to these (component-parity pass).
- ✅ **Spacing** already tokenized — mobile uses the Tailwind 4px scale, zero arbitrary `px` spacings (audited 2026-07-08; no work needed).
- ◐ **Typography** — tokens defined: `.eyebrow` (caption) + `.text-identity` (14) + `.text-meta` (12), adopted in the shared row/detail primitives. Follow-up: collapse the scattered sub-10px micro-drift (7/8/9px labels/deltas) + sweep page-level usages. Elevation still inline (low priority).
- ☐ **Element extraction** — `Eyebrow`, `MobileButton`, `MobileIconWell` (replace inline usages).
- ☐ **Strict-radius hardgate green on every mobile page** (not just Today/Requests).

---

## 2. Background & surfaces

**The surface token system** (locked 2026-07-09; mirror of the `src/index.css` "Mobile surface
system" comment block; reference page `src/components/mobile/MobileEmergency.jsx`). Every mobile
surface differentiates using **ONE relationship, not ad-hoc `bg-*`:**

| Tier | Token | Use |
|---|---|---|
| **GROUND** | `bg-background` | page atlas backing, sheet/modal base |
| **RAISED** | `.surface-card` — foreground/0.05 film (light) · white/0.07 lift (dark) | list cards, KPI chips, section cards, sheet islands, context-panel cards. A flat alpha film that reads with the same delta over any ground; no blur (blur belongs to chrome) |
| **GLASS** | `chrome-glass` / `chrome-glass-strong` | floating chrome ONLY (header, nav island, bottom dock, sheet chrome) |
| **HAIRLINE** | `h-px bg-[hsl(var(--muted-foreground)/0.08)]`, inset `ml-[62px]` past the orb | intra-group row separators inside a grouped panel — a whisper, not a border. **Alpha is the lever**; `h-px` is already minimal |
| **Scrim** | `bg-black/[0.46] backdrop-blur-sm` | sheet/modal backdrop (`ModalShell`) |

Rules: **borderless** (no borders / outlines / left-accent bars — the hairline is an alpha film,
not a border); **shadow only on floating chrome**; **one loud action per surface** = `bg-primary`.

- **Page background:** calm `bg-background` GROUND + optional subtle atlas layer (Visits
  `MobileVisitsAtlasLayer`, Requests `MobileRequestsAtlasLayer`). ☐ standardize one
  `MobilePageBackground`.
- **Superseded 2026-07-09:** content `bg-card` / `bg-muted/22–50` → RAISED `.surface-card`;
  "no hairlines anywhere" → HAIRLINE is canon for intra-group separators (and only there).

---

## 3. Elements (atoms) — the reusable vocabulary

Each must become a **named utility or tiny component**, not re-inlined. Status = mostly ☐.

| Element | Canon | Status |
|---|---|---|
| **Eyebrow / caption** | `.eyebrow` utility (`index.css`): `text-[10px] font-semibold uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground`. **Demoted 2026-07-09:** survives ONLY where it is already established detail furniture — `MobileDetailSheet` caption, `MobileDetailIslands` fact labels, `MobileListStates` copy — NEVER a section subheading or new subtext. | ✅ utility exists · scope frozen (no new call sites); pages still using it as a list group header (HealthNews, SupportTickets) are off-canon → migrate to the group header below on their next pass |
| **Data-tile label** | sentence-case `text-[11px] font-medium text-muted-foreground`, sitting OVER the value (glance tiles — desktop `GlanceCard` parity) | ✅ (Today) |
| **Group / section header** | sentence-case bold `text-[13px] font-bold text-muted-foreground` + tabular count (Requests' recency labels); where whitespace + grouping already guide, render NO label at all (Today's glance grid carries none) | ✅ (Requests · Today) |
| **Identity text** | primary `text-[15px] font-semibold line-clamp-2`; secondary/meta `text-sm/text-xs text-muted-foreground` | ◐ (row-level, not a shared text primitive) |
| **Button** | filled-primary (brand + `0 8px 18px tone/0.30` glow), ghost, destructive; h≥44, `rounded-button`, graduated press | ◐ `ui/button` + `MobileSheetActions` (CTA group) — no documented mobile button set |
| **Status pill** | `rounded-pill px-2.5 py-1 text-[11px] font-semibold` + `resolveVital().pill` tone | ✅ (`statusPill` prop) |
| **Icon well / tile** | `rounded-icon` tinted tile (status/neutral) | ◐ inline; make `MobileIconWell` |
| **Chip (filter/state)** | `rounded-pill chrome-glass` + dot + count; `.on` = brand | ◐ (in KPI strip / per page) |
| **Grab handle** | `h-1.5 w-[42px] rounded-pill bg-foreground/20` | ✅ (ModalShell / sheets) |
| **Divider / hairline** | between sibling rows in a grouped panel ONLY: `h-px bg-[hsl(var(--muted-foreground)/0.08)]`, inset `ml-[62px]` past the orb (§2); everywhere else spacing only — never a border/outline | ✅ (Requests grouped list + skeleton) |
| **Search field** | `type="text" inputMode="search"` (`text` avoids the duplicate native clear) + leading icon + trailing clear (×) button when non-empty, `aria-label="Clear search"` | ✅ (Requests) — roll out per page |
| **Updating pill** | `rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground`, `role="status" aria-live="polite"` — background-refetch signal, hidden while the skeleton shows (§5) | ✅ (Requests) — roll out per page |

---

## 4. Components (molecules) — the inventory

| Component | Role | Status |
|---|---|---|
| `MobilePageShell` | sticky KPI slot + padded content + error boundary + safe-area | ✅ |
| `MobileKPIStrip` | role-aware KPI/state chips — every chip exposes `aria-pressed`; tapping the active non-All chip toggles back to All | ✅ |
| `MobileMetricRow` (`MobileMetricList`) | readable row: icon well + eyebrow + name(line-clamp-2) + secondary + status pill + chevron; tap → sheet | ✅ (statusPill + secondary props; left-accent removed) |
| `MobileDetailSheet` | tap-opened bottom sheet: header + VitalTrack + islands + CTA; titleless (`hideClose`) so it passes `ariaLabel` (record name → eyebrow → 'Details') for the dialog name (§7) | ✅ (new; on `ModalShell`) |
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
- **States:** empty / skeleton / error via `MobileListStates`. The empty state derives a
  `reason` (`search` / `filtered` / `empty`) and offers a recovery action (Clear Search /
  Adjust Filters / Retry). **Never render raw DB/PostgREST error text** — friendly copy on
  screen, raw error to the console only. ✅ (Requests) — roll out per page
- **KPI scope (count integrity):** the header summary count tracks the **active KPI** (= the
  visible scope), never the raw total — "40 requests" must not sit above a 3-row filtered
  list. Every KPI selection **including `all`** is enumerated on every dependent surface
  (count, empty copy, hero); fallbacks are neutral, never a specific entity. ✅ (Requests) —
  apply per page

### Page-type grammar — LIST vs DASHBOARD (canon, locked 2026-07-09)

Every mobile page speaks ONE of two grammars, chosen by page identity — never mixed.

| | **LIST-type** | **DASHBOARD-type** |
|---|---|---|
| Reference | `src/components/mobile/MobileEmergency.jsx` (Requests) | `src/components/mobile/MobileToday.jsx` (Today) |
| Anatomy | KPI chip rail → search field → grouped recency list (sentence-case bold headers, §3) → row tap → detail sheet | signal-first hero (status pill → headline → subhead → role pill) → 2-up glance tile grid → one RAISED action-sheet panel (status + title + hint, single primary CTA, action rows) |
| Numbers | KPI chips **FILTER** the list in place (`aria-pressed`, count-scope rules above) | glance tiles **NAVIGATE** — `min-h-[72px]`, sentence-case label over value + tone-tinted arrow orb (the desktop `GlanceCard` anatomy at mobile scale), `Loader2` glyph-swap opening feedback. They never filter this page |
| Disclosure | detail bottom sheet per record (`MobileDetailSheet`) | action rows expand **in place** (chevron rotate + revealed action pill); a dashboard never opens record sheets |
| Rhythm | grouped panels, `space-y-[18px]` | generous `space-y-8` — welcoming, easy on the eye, guiding |

No KPI filter strips on dashboards; no glance tiles on lists. A page that seems to want both
is two pages. (Both grammars share the same loading model below — Today's skeleton mirrors
its hero/tiles/sheet 1:1 exactly as Requests' mirrors its grouped list.)

### Loading & refetch model (canon)

Reference: `src/components/mobile/MobileEmergency.jsx` (list) · `src/components/mobile/MobileToday.jsx` (dashboard).

1. **Skeleton-first on EVERY mount.** A forced warm-up guarantees the skeleton on cached
   bottom-nav mounts too, not just hard refresh — without it, a page mounting with cached
   data skips the skeleton and assembles content top-to-bottom:
   `SKELETON_WARMUP_MS = 400` · `showSkeleton = warmingUp || (loading && no items)`.
2. **Group-shaped skeleton.** The skeleton mirrors the real list 1:1 (same panel, row
   rhythm, hairline + `ml-[62px]` inset) so content **replaces it in place** with zero
   layout jump.
3. **No entrance motion.** No translate/stagger, no fade-from-blank — a fade runs from
   blank on cached mounts and reads as a top-to-bottom load. When the skeleton clears, the
   list swaps in a single commit; nothing moves.
4. **Chrome is just present.** Title / summary / search / filter render immediately with no
   entrance motion (`animatePageLoad={false}`) — only DATA regions load.
5. **Background refetch = "Updating" pill.** React Query `placeholderData` keeps `isLoading`
   false on KPI-switch / search / filter / load-more refetches — **`isFetching` is the only
   signal.** The page passes it down and mobile shows the Updating pill (§3, `role="status"
   aria-live="polite"`), hidden while the skeleton shows. Never a re-skeleton.

---

## 6. Navigation

- **Mobile:** frosted **island** (nav pill) + route **FAB** (`DynamicBottomBar`) — the app's split. ✅
- **Dock slots rank by OPERATIONAL importance per role** (locked 2026-07-09;
  `src/config/mobileNavigation.js`). Settings never holds a slot by right — the avatar sheet
  owns overflow (`MOBILE_NAV_CHROME.overflowOwner: 'avatar'`; no bottom menu button). Admin
  (re-ranked) = **Today / Requests / Approvals / Map** — the Today hero's own signals, then map;
  Settings stays reachable via the avatar sheet. ✅ admin · ◐ the other role slates still seat
  Settings in their fourth slot — re-rank each as its role home lands.
- **Header:** shell `SmartHeader` (frosted, scroll-hide); back + avatar + route actions. ◐ (mobile header glass parity)
- **Context-aware top bar** (locked 2026-07-09; `SmartHeader.jsx`): on home (`/`) the avatar
  (account-menu trigger) owns the **LEFT** section — there is no history to render; on subpages
  it yields left to the back + previous-route chip (`getRouteLabel(previousPath)`) and joins the
  right cluster (search · notifications · avatar). ✅
- **Detents (future):** app-style peek/half/full for the map/large sheets. ☐

---

## 7. Motion, microinteraction & side-effects

| Concern | Canon | Status |
|---|---|---|
| Press | controls `scale 0.96`, cards `0.988` (graduated) | ◐ (varies: some `0.97/0.95/0.98`) → normalize |
| Spring / ease | spring `168/30/0.9`; ease `[0.21,0.47,0.32,0.98]` | ⚠️ `mobileMotion` uses `[0.22,1,0.36,1]` + durations → align |
| Entrance | none — skeleton-first, replace-in-place (§5); chrome present with no reveal sweep; no translate/stagger/fade-from-blank on mount | ✅ (Requests) — apply per page |
| Sheet | slide-up spring + grab handle + swipe-to-dismiss + backdrop scrim `bg-black/[0.46] backdrop-blur-sm` | ✅ (ModalShell) |
| Reduced motion | global `prefers-reduced-motion` → fade only | ✅ (index.css + ModalShell) |
| Tap-flash | `-webkit-tap-highlight-color: transparent` global | ✅ |
| Haptics / sound | `useFeedback().triggerFromEvent` on meaningful actions (haptic + iOS fallback) | ◐ applied in some rows/CTAs → make consistent + documented |
| Focus | animates in place; keyboard focus trap in sheets/modals | ✅ (ModalShell focus trap) |
| Dialog names | every sheet/dialog has an accessible name: titled `ModalShell` → `aria-labelledby`; titleless sheets pass `ariaLabel` (`MobileDetailSheet`: record name → eyebrow → 'Details') | ✅ (ModalShell + MobileDetailSheet) — verify per page |

---

## 8. Modularity & reusability rules

- A page **composes** shell + primitives; it does not re-inline eyebrows/buttons/cards/tones.
- **A mobile surface of a desktop page is a PROP-DRIVEN presentation component** (locked
  2026-07-09). The desktop page stays mounted as the **single model owner**: it computes the
  model ONCE (counts, signal copy, action rows), publishes the context-panel event, and passes
  everything down as props; the mobile component duplicates **zero** data logic and never reads
  PageData/Auth itself (anti-drift: one model, two renders). The `isMobile` fork is
  return-only, after every hook and effect. Reference: `TodayHome.jsx` (owner) →
  `MobileToday.jsx` (presentation; the prop contract lives in its header JSDoc).
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
- [ ] ONE page grammar, matching page identity (LIST vs DASHBOARD, §5) — chips filter, tiles navigate, never mixed
- [ ] no all-caps subtext/subheadings — section labels sentence-case or omitted; `.eyebrow` only in established detail furniture (§3)
- [ ] GROUND/RAISED/GLASS surfaces (§2) · no borders / outlines / accent bars · hairline `/0.08` intra-group only
- [ ] readable `line-clamp-2` identity · status = raw-hue pill
- [ ] tap → bottom sheet (not dropdown) · grab handle + swipe-dismiss · accessible dialog name (`aria-labelledby` / `ariaLabel`)
- [ ] VitalTrack for lifecycle · date groups for feeds · one state-CTA
- [ ] graduated press · canon spring/ease · reduced-motion · haptic feedback
- [ ] skeleton-first mount (400ms warm-up) · group-shaped skeleton · replace-in-place, no entrance motion
- [ ] `isFetching` → Updating pill · header count = active-KPI scope · `all` enumerated on every dependent surface
- [ ] empty `reason` + recovery action · no raw DB error text · chips `aria-pressed` · search `inputMode="search"` + clear (×)
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
