# Console Desktop Design System (v1.0 — 2026-07-09)

> The desktop workspace grammar as **reusable components + tokens**, extracted verbatim from the
> Requests gold standard. Docs alone failed as canon (pages drifted on the width rule and the
> neutral-shadow law); the canon now lives in CODE and is enforced by
> `src/components/console/ConsoleDesignSystem.contract.test.js`. Mobile counterpart:
> `MOBILE_DESIGN_SYSTEM.md`. Page-loop + lessons: `../ui-ux/UIUX_REVAMP_PROCESS_AND_LESSONS.md`.
> **Extraction source-of-record:** `CANON_COMPONENT_SPECS.md` (mobile lane, same day) — the
> verbatim gold recipes with `file:line` + `git log -S` provenance these components implement;
> when extending the library, copy from those recipes, do not restyle. Recipes not yet
> componentized there (DataGrid select-all/shift-range/BulkActionBar, 16-recipe button table)
> are the next extraction targets.

**The rule of this system: pages COMPOSE, they never re-implement.** A page owns only its
DOMAIN (status vocabulary, tone maps, signal copy, grid columns, guards, data wiring). Every
architectural decision — widths, heights, shadows, radii, motion, a11y semantics — lives in one
component and cannot drift.

---

## 1. Tokens

### Elevation (tailwind `boxShadow` — NEUTRAL ONLY)

| Token | Value | Use |
|---|---|---|
| `shadow-e1` | `0 1px 3px rgb(0 0 0 / 0.05)` | hairline lift (rows at rest) |
| `shadow-e2` | `0 4px 12px rgb(0 0 0 / 0.07)` | standard raise (pills, hover) |
| `shadow-e2-strong` | `0 6px 16px rgb(0 0 0 / 0.12)` | selected rows, primary CTAs |
| `shadow-e2-lift` | `0 16px 38px rgb(0 0 0 / 0.08)` | glance/KPI tiles ONLY |
| `shadow-e3` | `0 12px 32px rgb(0 0 0 / 0.10)` | sheets, rails, overlays (the cap) |

**LAW: no colored/bleeding shadows, anywhere.** No `rgba()`, no non-zero `rgb()` channels, no
brand/status `hsl()` inside any shadow. One sanctioned arbitrary value exists: the neutral focus
ring `shadow-[0_0_0_2px_hsl(var(--foreground)/0.22)]`. The ambient brand tint lives ONLY in the
`ConsoleAtlasLayer` backdrop (a background, not a shadow — do not strip it in audits).

### Layout constants (baked into components — listed here for orientation)

| Region | Spec | Lives in |
|---|---|---|
| Signal hero region | `min-h-[270px]` / `lg:min-h-[330px]`, headline `text-[34px] md:text-6xl`, subhead `max-w-lg` | `SignalPanel` |
| **KPI strip width** | **`max-w-2xl` · `grid-cols-2 sm:grid-cols-3` · gap-2** (the Today-matched width the user locked) | `KpiStrip` |
| KPI tile | `min-h-[66px] px-3 py-2.5 sm:px-4 md:py-3`, `rounded-inner`, e2-lift at rest | `KpiStrip` |
| Activity sheet | frosted `rounded-t-sheet md:rounded-sheet`, `bg-card/68`, `shadow-e3`, drag handle | `ActivitySheet` |
| List row | `min-h-[80px] px-4 py-3.5 rounded-card`; selected `bg-card/88 shadow-e2-strong`; hover `-translate-y-0.5 shadow-e2` | `ListRowShell` |
| Detail rail | `lg:w-[380px] xl:w-[440px]`, full height, frosted sheet radius, `bg-card/78`, `shadow-e3` | `DetailRailShell` |
| Rail inset hero | `rounded-modal bg-background/55 p-3 md:p-4` + fill-film rows (S1.4 recipe) | `RailInsetHero` + `DetailLine` |

Radius tokens (existing): `rounded-card/inner/icon/sheet/button/pill/modal`. Palette law: the
theme's `--primary/--info/--success/--warning` all render RED — use literal
sky/cyan/emerald/amber/violet or neutral; `--destructive` only for danger + "Needs attention".

## 2. Components (`src/components/console/`)

| Component | What it enforces | Page provides |
|---|---|---|
| `WorkspaceStage` | full-bleed stage: atlas + wayfinding dock + full-height flex + content column | `moduleRailItems`, `activePath`, rail, children |
| `ConsoleAtlasLayer` | THE ambient brand backdrop (only sanctioned tint) | — |
| `useWayfindingNav` | first-click-wins dock nav + 320ms pressed feedback | — |
| `SignalPanel` | hero heights, eyebrow chip, display headline, shimmer skeleton, **no entrance motion** | `signal`, `toneClassMap`, strip child |
| `KpiStrip` | **max-w-2xl width**, max-3 smart context (pinned-while-signal, count-desc fill), toggle-to-All, tile spec, refetch spinner | `options`, `getCount`, `pinnedIds`, `importance` |
| `ActivitySheet` | frosted sheet, drag handle, count-row triplet (`Loading…`/`Couldn't load`/count), `UpdatingPill`, pagination | `itemNoun`, `pagination`, toolbar, errorBanner, rows |
| `SheetToolbar` | 300ms debounced search, refresh-with-spin, Filters trigger (`aria-haspopup/expanded`), primary slot | placeholders, handlers, `primarySlot` |
| `PrimaryCommand` | the first visible command: fg-on-bg pill + opening state (never header-hidden, never white-on-white) | `label`, `opening`, `onClick` |
| `SortableColumnHeader` | `role="columnheader"` + `aria-sort` semantics | label, sortKey |
| `ListRowShell` | row spec + focus/open/keyboard/right-click semantics, `layout="position"` only (no stagger, ever) | grid cols, cells |
| `DetailRailShell` / `RailInsetHero` | rail container + S1.4 recessed inset | rail content |
| `primitives` | `Shimmer` `SkeletonRows` `UpdatingPill` `CopyChip` `StatusPill` `TonedAvatar` `DetailLine` `StageStrip` `EmptyState` `ErrorBanner` `LoadErrorState` | domain values |
| `useListKeyboardNav` / `useScrollResetOnPage` | Arrow/Enter/Escape list nav (input+dialog guarded), page-change scroll reset | items, refs |
| `useRowSelection` | the Requests/Users selection mechanism: checkbox toggle + shift-range (click-stash idiom) + select-all over every visible row + indeterminate; pairs with `BulkActionBar` — bulk WRITES stay per-page fail-closed (disabled with reason until receiver proof) | items; page renders the 28px checkbox column + bar actions |
| `getFilterTriggerState` | context-aware Filters trigger `data-state`: `open` / `filtered` / `idle` | `filterSheetOpen`, `filtersActive` |
| `utils/dayTime.formatDayTime` | day-aware local-boundary timestamps | — |

### Composition recipe (see `VisitsPage.jsx` — the reference adoption)

```
WorkspaceStage(dock, rail=DetailRailShell(RailInsetHero + DetailLines + actions))
  SignalPanel(signal, toneClassMap)
    KpiStrip(domain options)
  ActivitySheet(itemNoun, toolbar=SheetToolbar(+PrimaryCommand), errorBanner)
    scroller(keyboard nav) -> SkeletonRows | LoadErrorState | ListHeader + ListRowShell rows | EmptyState
```

## 3. Decision trail (the git history that answers "how did we handle X?")

Consult this BEFORE re-deciding an element; extend it when a decision lands. `git log --follow
-- <file>` on `EmergencyRequestsPage.jsx` replays the full evolution.

| Element | Decision + why | Trail |
|---|---|---|
| KPI region width | Widened to the Today-matched `max-w-2xl` tile grid after the user rejected narrow chips ("todays kpi cards are more elegant… increasing the width") | Requests KPI redesign commits, task "Widen Request KPI cards" |
| KPI smart context | Max-3, pinned-while-signal (zero-count chip never occupies a slot), toggle-to-All; regression once ("you mistakenly dropped the kpi smart context logic") — now in `KpiStrip` | `selectPrimaryKpis` history |
| Per-column row filters | REMOVED as impractical ("not practical… we are aiming apple stds"); filtering = KPI chips + FilterSheet only | Requests table rework |
| Sortable columns | **TIME ONLY.** Person/Status/Service/Facility are plain labels — alphabetical sorts are not operational, and Person has no scalar (JSON snapshot). Service allowlists may hold more capability in reserve; the UI does not expose it. Visits drifted to 5 sortable headers once (2026-07-09) — realigned same day. | Requests header comment + `EMERGENCY_REQUEST_SORT_FIELDS` |
| Select-all / bulk | Admin-only, header checkbox + BulkActionBar; the MECHANISM always renders on sortable-list surfaces, bulk WRITES stay per-page fail-closed (disabled with reason). Regressed a THIRD time at the Hospitals adoption (2026-07-09, user: "the table lacks the multiple select triggers"). Now one row in the **donor-mechanism registry** (below). | Requests selection commits + estate gate `dc899e1b` |
| **Donor-mechanism registry** (completeness backstop) | Per-page pins protect decisions a page ALREADY made; they cannot DEMAND a mechanism a NEW adoption silently omits (how the select triggers dropped). `ConsoleDesignSystem.contract` now requires every **list-workspace surface** (renders `SortableColumnHeader`) to carry each load-bearing donor mechanism — `selection`, `keyboard-nav`, `scroll-reset`, `honest-failed-hero`, `arrival-toast`, `deep-link` — OR record `<slug> excluded by decision: <ref>`. donor-diff is the mechanical token companion; this is the behavioural backstop it can't express (and can't be rationalised away). Generalised from the selection law; proven to bite (missing-mechanism → red, exclusion → pass, dashboards exempt). | selection law `dc899e1b` → registry (this pass) |
| Neutral shadows | Global HIG elevation reduction; colored glows stripped estate-wide; VisitsPanel glows user-reported (`c9271bea`) and killed in the DS pass | e-scale commits + DS contract |
| Sort crash class | `requester_name`-style phantom sort columns crash PostgRESTS — allowlists pruned; JSON sub-fields never `.order()`ed | `b3da13ee`, DATA_SYNC S9/S10 |
| Loading truth | Replace-in-place: skeleton only on first assembly, Updating pill for refetches, no entrance stagger (froze a panel at 39% opacity once) | lessons 15/16, `9bc448bb` |
| One canonical render | ViewToggle/density variants retired (Requests, then Visits) | `9bc448bb` |
| Cost column | CUT ("less is more, cut it") — live data never carried it | Visits conversion |

## 4. Adoption status

| Page | Status |
|---|---|
| **Requests** | **ADOPTED (2026-07-09)** — the canonical source now composes the library it donated; zero visual change (live-verified), filter-dot glow debt paid, in the estate-law sweep. Fidelity-kept page-local: row shell (aria-label passthrough gap), rail shells (className passthrough gap), avatars (img-overlay gap), row status pill + error states (donor-divergent). |
| Visits | ADOPTED — first consumer; measured against Requests, never the other way around |
| Today | **ADOPTED (2026-07-09)** — `GlanceTile` (nav-variant) born from its GlanceCard; tokens throughout; estate-law swept. Page-local: brand-primary atlas variant (atlas param gap), handleAction (useWayfindingNav lacks first-click-wins + cleanup), hero/sheet (near-miss paddings recorded). |
| Mobile gold three | ADOPTED — MobileVisits/MobileEmergency/MobileToday compose `mobile/canon/*` (zero-drift donor-diffs); mobile lane migrating the remaining estate |
| Remaining pages | Adopt on their revamp pass; new pages MUST compose, not copy |

### Consolidated kit-gap queue (one pass closes all)
`useWayfindingNav`: first-click-wins + timer cleanup + same-path skip · `ListRowShell`: aria-label passthrough · `DetailRailShell`: className passthrough · `TonedAvatar`: img-overlay variant · `ConsoleAtlasLayer`: tint/position/opacity params (Today's brand-primary variant) · `RailInsetHero`/`StatusPill`: near-miss padding reconciliation · mobile `MobileHero`: live-region placement arbitration (mobile lane) · mobile loading kit: dashboard-shaped skeleton.
