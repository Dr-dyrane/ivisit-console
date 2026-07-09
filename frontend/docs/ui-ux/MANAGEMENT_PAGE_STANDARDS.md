# Management Page & Context Panel Standards
**Version 2.1** — supersedes v1.0 (the pre-revamp standard). v2.1 folds in the
Requests-proven behavioral canon: refetch feedback (§1.6), the KPI side-effect
matrix (§1.7), text/empty/error canon (§1.8), mutation safety (§3.1),
accessibility (§6).

> ⚠️ **v1.0 is retired.** The old version prescribed drawn borders (`border-*`,
> `ring-2`), `uppercase tracking-widest`, `geo-*` / `squircle-{size}` shapes,
> `shadow-premium` / `shadow-2xl`, and the `success` / `warning` / `info` semantic
> tokens. **All of those are now banned.** In this theme `--primary` / `--secondary`
> / `--info` / `--success` / `--warning` ALL resolve to red, so the old "semantic
> color" guidance made every state red. This version reflects the actual gold
> standard that the page revamp is built on.

The single source of truth is the **Design System Canon** in
[`tools/automation/AGENT_HANDSHAKE.md`](../../../tools/automation/AGENT_HANDSHAKE.md)
and the reference implementation
[`frontend/src/components/pages/EmergencyRequestsPage.jsx`](../../src/components/pages/EmergencyRequestsPage.jsx)
(the Requests canon) together with its data pair
[`useEmergencyQuery.js`](../../src/hooks/useEmergencyQuery.js) /
[`useEmergencyMutations.js`](../../src/hooks/useEmergencyMutations.js).
When this doc and the canon disagree, the canon wins.

---

## 0. Non-negotiable canon (read first)

- **No borders. No rings. No hairlines. Ever.** Zero `border` / `border-*` /
  `ring-*` / `outline-*` / `divide-*` / `*-px` / `0.5px` / `1px`. Depth comes from
  **tone** (`bg-card/NN`, `bg-muted/NN`), **soft arbitrary shadows**
  (`shadow-[0_12px_32px_rgb(0_0_0/0.10)]`), **`backdrop-blur*`**, and **spacing** —
  never a drawn line.
- **Reduced HIG elevation scale.** Depth is short and low-opacity — the glass
  (`backdrop-blur*`) carries most of it (per Apple HIG: translucent material elevates
  content; heavy diffuse shadows do not). Three neutral tiers only: **e1 resting**
  `shadow-[0_1px_3px_rgb(0_0_0/0.05)]` (small tiles), **e2 raised**
  `shadow-[0_4px_12px_rgb(0_0_0/0.07)]` (cards, chips, KPI, hovered rows) with
  `shadow-[0_6px_16px_rgb(0_0_0/0.12)]` for a prominent solid CTA, **e2-lift**
  `shadow-[0_16px_38px_rgb(0_0_0/0.08)]` (glance/KPI tiles ONLY — the sanctioned
  "Today tile" soft resting lift §1.2 references), and **e3 floating**
  `shadow-[0_12px_32px_rgb(0_0_0/0.10)]` (sheets, rails, panels, modals). No colored
  glows; no `0_24px_70px`-class diffuse shadows.
- **Canonical squircle radius only.** `rounded-{sheet,card,inner,icon,button,pill,modal,squircle}`
  (and directional `rounded-t-<token>` etc.). NEVER `rounded-2xl` / `xl` / `lg` /
  `3xl` / `full` / `rounded-[Npx]`. Every management page must pass
  `node scripts/check-ui-surface-hardgate.js --strict-radius <file>`.
- **No red except danger.** Ordinary/positive/informational state uses the **literal
  palette** (sky / emerald / amber / rose / violet / cyan) or neutral (`foreground` /
  `muted`). Only `--destructive` (bright danger red) is allowed, and only for genuine
  danger/destructive/error.
- **No legacy chrome utilities:** no `glass-card*`, `geo-*`, `squircle-{size}`,
  `hover-glow*`, `hover-lift`, `bg-orb`, `pulse-dot`, `shadow-2xl` / `shadow-premium`
  / `shadow-glow`, `uppercase`, `tracking-{tighter,wide,widest}`. Glass is manual:
  `bg-card/68 backdrop-blur-2xl`.
- **One `uppercase` exception:** the gold-standard "eyebrow" micro-label — tiny tracked caps
  `text-[10–11px] font-semibold uppercase tracking-[0.14em]` on `DetailLine` labels and grid headers
  (as in `EmergencyRequestsPage` lines 1087 / 1512) — IS canonical; do not strip it. That is the only
  allowed use of `uppercase` — never on body text, headings, or buttons.

Colors are **not** caught by the hardgate — only rendered proof catches a stray red.
Verify visually on a data page.

### Canonical status colour coding

**One colour per state, on every surface** (KPI strip, status pills, context panel, mobile).
Emergency ops is time-sensitive, so "needs attention" reads as **red** by deliberate domain
choice — this is the one sanctioned use of red beyond destructive actions.

| State | Colour | Meaning |
|---|---|---|
| `pending_approval` / needs attention · `payment_declined` / error | **`destructive` (red)** | requires immediate action |
| `in_progress` / active | **amber** | care underway |
| `accepted` | **cyan** | acknowledged |
| `arrived` / en route | **sky** | on scene |
| `completed` / clear (incl. a *needs-attention count of 0*) | **emerald** | done / all-clear |
| `cancelled` · `all` / total · inactive | **muted / neutral** | no state emphasis |
| `critical_care` (service severity) | **rose** | critical |
| service type — ambulance → **sky**, bed → **cyan** | | |

Rule: the SAME state uses the SAME colour on every surface — the `pending` KPI, the
`pending_approval` status pill, and the panel's "Needs attention" tile are **all red**, never
amber on one and red on another. `pending_approval` labels are "Needs attention" / "to review"
(canonical synonyms). Colour is context-aware only where documented (clear-at-zero → emerald).

**Sanctioned ambient brand tint (user canon, 2026-07-09).** Page ATLAS/backdrop layers may
carry a **low-opacity brand glow** (`hsl(var(--primary)/0.08–0.13)` or the page's stage tint,
e.g. Requests' `--destructive` stripes) as ambient atmosphere — it is **decorative brand
expression, not a state colour**, and is exempt from the no-red rule. It gives the page its
life; do NOT strip it in canon audits (that was tried on Today and reverted). The exemption is
strictly for backdrop atlas layers — UI elements (chips, pills, tiles, buttons, text) remain
governed by the state-colour table above.

---

## 1. The data-page "story" (desktop workspace)

A management page is **not** "render a table + KPIs." It tells a story: *survey the
signal → filter → focus one record → see it and act on it.* Copy the shape from
`EmergencyRequestsPage`; do not invent a new one.

```
ConsoleModuleRail │  LEFT column (flex-1)                 │  RIGHT column
   (left nav)     │    SignalPanel                        │    DetailRail
                  │    StateStrip (chips)                 │    (<aside>, focused record)
                  │    Handled sheet → ONE row/table      │
                  │      render (no ViewToggle)           │
```

Top-level wrapper:

```jsx
<div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
  <section className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:self-stretch">
    <XSignalPanel … />
    {/* state chips */}
    <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3
                    shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl
                    dark:bg-card/50 md:rounded-sheet">
      {/* drag handle */}
      <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      {/* list / table / grid */}
    </div>
  </section>

  <XDetailRail record={focusedX} onView={openModal} />
</div>
```

### 1.1 SignalPanel
`rounded-pill` label chip → big `text-5xl`/`text-6xl` headline (the primary number or
state) → one-line subhead. No borders, no uppercase.

The hero (icon / tone / label / headline / subhead) is **derived from the active KPI
selection** and must enumerate **every** selection — including `all` and unknown ids —
with a NEUTRAL fallback; see the side-effect matrix (§1.7) and `getRequestSignal` in
the reference. A failed load with nothing cached must surface the failure honestly —
never a reassuring zero-derived "all clear" hero above a list error state
(`getRequestSignal`'s `loadError` branch).

### 1.2 State-chip strip
`rounded-inner` chips for state filters, `rounded-button` icon tiles. Clicking a chip
sets `kpiFilter` and filters the list (the chips ARE the quick filters — no separate
bordered KPI cards).

**Toggle-to-All (canon, both platforms).** Re-tapping the ACTIVE chip clears the
filter back to `all` — a filter chip is a toggle, never a dead re-set. (Mobile
pioneered this; desktop adopted. One canonical answer.)

**Max 3 chips (canon).** Render **at most 3** state chips — the page's **smart-context
priority**: the page's **actionable triage states are pinned while they carry signal**
(Requests pins `pending` + `active` when their count > 0 — an actionable 5 outranks a
service-type 145, but a **zero-count chip never occupies a slot** another option could
fill with real data). Remaining slots fill **data-driven** (highest live count), and the
user's selected chip always stays visible. Display in canonical order for stable
positions — see `PINNED_KPI_IDS` / `selectPrimaryKpis`.
Only 3 keeps the strip simple and gives the wider, appealing "Today-length" tiles — **match
the Today glance tile exactly**: `max-w-2xl grid-cols-2 sm:grid-cols-3`, tile `min-h-[66px]
rounded-inner px-3 py-2.5 sm:px-4 md:py-3` with the soft resting lift
`shadow-[0_16px_38px_rgb(0_0_0/0.08)]`, `bg-card/65` (dark `bg-white/[0.055]`), neutral at
rest — colour appears only when selected. Secondary breakdowns (service type, sub-status)
belong in the **FilterSheet**, not the strip. The `kpiFilter` **default must resolve to a
rendered chip** (fall back to `all`), never a hidden or zero-count chip.

Chips expose `aria-pressed={active}` plus an `aria-label` of `` `${label}: ${count}` ``
(§6). While a refetch is in flight, the **ACTIVE chip swaps its icon glyph to
`Loader2 animate-spin`** — see `{active && isFetching ?` in `RequestKpiStrip` and the
refetch canon (§1.6). A chip that filters silently is a defect.

### 1.3 Handled sheet
**ONE canonical render** lives inside the glass sheet above (`rounded-t-sheet bg-card/68 …
backdrop-blur-2xl`, `md:rounded-sheet`) with the `rounded-pill` drag handle: the borderless
**row/table projection** (`XRow` inside a CSS-grid, as `RequestRow` in the reference). **No
`ViewToggle`. No `useViewMode`. No grid/card/list mode switching on desktop.** See §1.5 for why.

### 1.4 DetailRail — the focused record (this is the "story")
A right-side `<aside>`, **separate from the Context Panel slideout** (§2). Always
present on desktop; it shows the currently focused record.

- **Focus state:** `const [focusedXId, setFocusedXId] = useState(null)` +
  `const focusedX = useMemo(() => list.find(r => r.id === focusedXId) || list[0] || null, [list, focusedXId])`.
  It **defaults to the first record**, so the rail is never empty when data exists.
- **Wiring:** rows/cards call `onFocus={handleFocusX}`; `onView` (open modal) should
  also set focus.
- **Shell (copy verbatim, don't restyle):**
  ```
  relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet
  bg-card/78 p-4 text-foreground shadow-[0_12px_32px_rgb(0_0_0/0.10)]
  backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5
  lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]
  ```
- **Contents (Today-sheet surface recipe):** the hero block (header + status pill +
  stage strip + identity) sits in a **recessed inset panel**
  (`rounded-modal bg-background/55 p-3 dark:bg-white/[0.05]`) → `XDetailLine` rows are
  **fill-film cards** over the pane (`rounded-inner bg-foreground/[0.045] p-2.5
  dark:bg-white/[0.055]`, no per-card shadow; icon tile `rounded-button
  bg-background/45`) → a primary full-width action
  (`rounded-button bg-foreground text-background`) → secondary `XRailButton` (ghost) →
  a `role="note"` read-only hint when writes are gated behind authority
  (`getXActionState`).
- **Empty state:** icon + "No X selected" + "…that match your filters will appear here."
- **Action validity:** compute which actions are legal for the focused record's status
  with a `getXActionState(record)` helper (see `utils/emergencyActions.js`) — the rail
  shows the valid primary action and disabled hints, never a dead button.

Reference rails: `RequestDetailRail` (`EmergencyRequestsPage.jsx`), and the five data
pages — Insurance, Users, Subscriptions, Organizations, Pricing.

---

## 1.5 Data-render canon — ONE render, no ViewToggle (why tables-only on desktop)

**Decision (canon):** a desktop management page renders its records **exactly one way** — the
borderless **row/table projection** inside the handled sheet (§1.3). There is **no `ViewToggle`,
no `useViewMode`, no grid/card/list mode switching**. Card / grid / list view files
(`XListView`, `X*GridView`, `Card` variants) are **legacy-inactive**: kept in the tree as the
preservation anchor, never imported by the active route. The reference (`EmergencyRequestsPage`)
already ships this — zero `ViewToggle`, one `RequestRow` render.

**Why (grounded in the existing gate canon, not invented):**

1. **No second source of truth.** Multiple view modes each re-shape the same rows; the gate
   requires the handled sheet prove *"no second source of truth remains"* and render *"cards,
   rows, or a table only as variants of the same data projection, not as separate truth."* One
   render is the only way to prove that once, cheaply. (`PAGE_REVAMP_GATE.md` §Requests-As-Multi-Data,
   §Pattern-Extraction Handled-sheet slot.)
2. **The chips already own "survey the signal."** The KPI/state strip (§1.2) is the scan/summary
   surface a card grid used to provide. Keeping a card view duplicates that job.
3. **The DetailRail already owns per-record focus.** The always-present rail (§1.4) is the
   expanded/detail affordance a card's hover-expand used to provide. A card view duplicates it.
4. **One projection = one contract to prove.** The whole revamp thesis is quiet, route-owned data
   with no parallel truth. One render means one place where `service → hook → row → payload` is
   audited and hardgated — not three.
5. **Reuse the canon, not the markup.** Every data page reading identically is the point of the
   "Reuse Rule"; a per-page toggle re-introduces per-page divergence.

**Scope:** desktop only. **Mobile keeps its recomposed card/row rhythm** (`MobileX`) — that is a
separate design system (`MOBILE_DESIGN_SYSTEM.md`), recomposed for touch, not a desktop toggle.

**Roll-out (per-page, gated):** `ViewToggle`/`useViewMode` currently remain on
Ambulances, Doctors, HealthNews, Hospitals, Insurance, Organizations, Pricing, Subscription,
Users, Verification, Visits. Each is converted the canon way — record the old-behavior ledger,
mark the card/list variants `legacy inactive` (a **preservation decision**, not a silent drop),
delete the toggle from the active route, keep the one row/table render. No repo-wide rip; one page
at a time, contract test stays green.

---

## 1.6 Refetch feedback canon — a silent refetch is a defect

Page queries follow the Requests read path (`useEmergencyQuery.js`):
`placeholderData: (previous) => previous` keeps the last page on screen while the next
one loads. Consequence: on KPI / search / sort / page changes **`isLoading` stays
`false`** — the skeleton never re-appears — so **`isFetching` is the ONLY refetch
signal, and it MUST be surfaced**. A refetch with no visible indicator is a defect,
not a nicety: the operator must be able to tell "current" from "updating".

- **Desktop:** the **ACTIVE KPI chip swaps its icon to `Loader2 animate-spin`** while
  fetching — the Today-parity **glyph swap** (the original benchmark is the Today
  glance tile in `components/context/DashboardPanel.jsx`, which swaps
  `Sparkles → Loader2` while loading). Reference: `{active && isFetching ?` in
  `RequestKpiStrip` (`EmergencyRequestsPage.jsx`). Swap the glyph **in place** — no
  second spinner element, no overlay, no layout shift.
- **Mobile:** the counterpart is the **"Updating" pill** —
  `role="status" aria-live="polite"`, `rounded-pill bg-muted/28`, rendered when
  `isFetching && !showSkeleton` (see `MobileEmergency.jsx`; hidden under the
  first-load skeleton, which already communicates load).
- **Plumbing:** the query hook must expose `isFetching` alongside `loading` (as
  `useEmergencyQuery` does) and the page must thread it to the strip / pill;
  pagination controls disable on `loading || isFetching`.

**Loading truth (skeleton vs warm cache).** Skeleton is required when content is
unavailable or assembling. **If complete cached data is already available, instant
truthful paint is preferred over artificial loading** — never force a skeleton over
warm data. Platform note: mobile may keep its mount warm-up where it solves a real
paint-cascade problem; desktop keeps instant-render on a warm cache. A manual
refresh affordance must exist on every data page (desktop: toolbar refresh control
spinning on `isFetching`; mobile: pull-to-refresh).

---

## 1.7 KPI selection side-effect matrix — the airtight rule

A KPI/state filter is never "just a chip": every selection fans out to **every
dependent surface**. When adding or changing a KPI, enumerate **EVERY selection —
including `all` and unknown/unmapped ids** — across **EVERY** row of this matrix:

| Dependent surface | Must react to the selection |
|---|---|
| Signal hero (§1.1) | icon / tone / label / headline / subhead (`getRequestSignal`) |
| Header count | = the **filtered visible scope** — the server count for the active selection (`${pagination.totalCount}`), never the unfiltered total |
| Server list filter | the selection composes into the query filter (`kpiFilter` inside `queryFilter`; stats stay KPI-agnostic so chip counts hold while the list narrows) |
| Empty-state copy + recovery action | the zero state names the narrowing and offers the reset **for that control** (§1.8) |
| Context panel / analytics | any surface that echoes counts or state |

**Fallback branches must be NEUTRAL or derived from the option definition — never a
hardcoded specific entity.** The archetype bug: `all` fell through to a hardcoded
**Ambulance** hero, so the total count was mislabeled "ambulance". The fix, now canon
in the reference: the final branch of `getRequestSignal` is the neutral muted "All"
hero (`LayoutGrid`, tone `muted`, "Every request across services.").

**Before shipping a KPI, walk the full matrix:** every selection × each of
{count = 0, count > 0, loading, refetching}. If any combination renders copy, tone,
or counts belonging to a different selection, the KPI is not done.

---

## 1.8 Text, empty-state & error canon

- **Never render raw DB/PostgREST error text.** Map failures to friendly copy at the
  surface ("Requests did not load", "Requests could not refresh") and log the raw
  error to the console (`console.error`) for diagnosis. A `.message` pass-through is
  at most a fallback detail line, never the headline; PostgREST codes / SQL fragments
  must never reach the operator.
- **Two degraded states, both with Retry** (reference `RequestLoadErrorState` /
  `RequestLoadNotice`): failed + nothing cached → full-height error state; failed +
  stale rows still on screen → inline notice ABOVE the stale list ("Showing the last
  loaded requests. Try again."). Never silently show stale data after a failed
  refresh.
- **Pluralize every count:** `` `${n} request${n === 1 ? '' : 's'}` `` — hero
  headlines, toasts, bulk-action labels, header counts. "1 requests" is a defect.
- **Empty states must name their cause.** Distinguish at minimum: empty-system
  ("No requests yet" / "New requests will appear here."), sheet-filter or search
  ("No matching requests" / "Change filters or search again."), and KPI-narrowed
  zero (the hero carries the per-KPI zero copy — "No active requests").
- **The recovery CTA targets the control that caused the narrowing.** Search zero →
  clear the search; sheet-filter zero → open the FilterSheet ("Change filters");
  a **KPI-narrowed zero must offer the KPI reset** (select `all`), **not** the
  filter sheet. Mobile reference: `MobileListEmpty`'s `reason` / `onRecover` pair in
  `MobileEmergency.jsx` (search → Clear Search, filtered → Adjust Filters). Wiring
  recovery to the wrong control is a matrix failure (§1.7).
- **Labels must match value semantics.** "Ambulance" over a total count, or
  "requests" over a bed-only count, is the §1.7 archetype bug in copy form.

---

## 2. Context Panel (right slideout) — separate from the DetailRail

The **Context Panel** (`components/context/XPanel.jsx`, toggled) is a quick-access
control center that publishes route context. It is **not** the DetailRail — the
DetailRail is the always-present focused-record column inside the workspace; the
Context Panel is the toggled slideout.

- **Quick Actions:** 2×2 grid of `motion.button` (`whileTap={{ scale: 0.98 }}`).
  Style with **tone**, not borders: `bg-muted/20 hover:bg-muted/30`, `rounded-button`,
  literal-palette or neutral text. (No `border border-{color}/20`, no `rounded-xl`.)
- **Recent items:** the 3 most recently changed records — `bg-card/60 rounded-card p-3`,
  a small tone dot (not `geo-round`), truncated name, relative time.
- **Stats overview (optional):** simplified counts as tone rows.

---

## 3. Logic & state

- **kpiFilter** drives the state-chip strip (§1.2). **FilterSheet** handles detailed /
  multi-select filters. **Search** debounced across the record's key fields.
- **Data** via the domain hook (`useInsurance`, `useSubscription`, …) — and the
  **canon read path is the Requests React Query pair**: a route-owned page projection
  behind `useXQuery` (`useEmergencyQuery.js`) where one `['x', filter]` cache is the
  single store the page reads, mutations settle, and realtime invalidates — no
  parallel list store. Queries set `placeholderData: (previous) => previous` and
  expose `isFetching` (§1.6). **Pagination** via `usePagination`. **Real-time**
  (Supabase `on('postgres_changes')`) converges by **invalidating the same query
  key family**, never by writing a second store.
- **Authority-gated writes:** if a surface cannot yet mutate backend truth, disable the
  command, show the reason (`role="note"` / `title=`), and never enable a write path
  the app can't reconcile. No parallel truth.

### 3.1 Mutation safety — pending state + optimistic contract

Every mutating CTA (dispatch / complete / cancel / retry / save) follows the Requests
mutation canon (`useEmergencyMutations.js`):

- **Thread `isPending` to the button.** The page passes each mutation's `isPending`
  down (`dispatchPending={dispatchMutation.isPending}` …) and the button renders
  **disabled + the spinner glyph swap** (`Loader2 animate-spin` in place of the
  action icon — see the DetailRail primary action and `RequestRailButton`).
  **Double-submit must be impossible** — the disabled pending state is the
  guarantee, not debouncing or hope.
- **Toasts with stable ids.** Long-running flows use `toast.loading(…, { id })` →
  `toast.success/error(…, { id })` with the SAME id (reference: `'bulk-cancel'` in
  `EmergencyRequestsPage.jsx`), so progress collapses into its outcome instead of
  stacking.
- **Optimistic writes go through the shared mutation wrapper** — the
  `buildEmergencyMutationOptions` contract: `onMutate` cancels in-flight refetches,
  snapshots the cache (rollback token), and optionally writes the optimistic value
  with `setQueryData`; `onError` restores the exact snapshot; `onSettled`
  invalidates the key root so the cache converges to server truth. No hand-rolled
  optimistic state, no local mirrors.

---

## 4. Full surface (a page is more than the desktop route)

The revamp is the **whole surface**, not just the page component. When you revamp a
data page, bring these to the same canon:

- **Views** — ONE active render only (§1.5): the borderless row/table projection, borderless
  custom grid rows, not shadcn `Table`/`Badge` (those inject `border-b` and badge borders the
  page-source hardgate cannot see). Pattern: `rounded-card bg-background/30 p-3` container +
  CSS-grid header/rows (`rounded-inner px-3 py-3 hover:bg-muted/30`) + `rounded-pill` tone badges.
  Any `XListView` / `*GridView` / card-view file is **legacy-inactive** (kept as the preservation
  anchor, not imported by the active route). No `ViewToggle`.
- **Mobile** (`components/mobile/MobileX`) — same tone/radius/no-border canon, plus
  the "Updating" refetch pill (§1.6) and cause-targeted empty states
  (`MobileListEmpty` `reason` / `onRecover`, §1.8).
- **Context panel** (`components/context/XPanel`) — §2.
- **Modals** (`components/modals/XModal`) — `ModalShell`, `rounded-modal`, no borders.

Verify each with the hardgate; verify **color** by rendering (the gate does not see red).

---

## 5. Animation
`framer-motion`. `layout` for reordering; entrance
`initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`; hover `whileHover={{ y: -2 }}`
(not the `hover-lift` class).

---

## 6. Accessibility canon

- **Dialogs always have an accessible name.** `ModalShell`
  (`components/ui/ModalShell.jsx`) applies `role="dialog" aria-modal="true"` with
  `aria-labelledby` pointing at the title; headerless sheets MUST pass the
  `ariaLabel` prop instead. A dialog with neither is a defect.
- **KPI chips are toggles:** `aria-pressed={active}` plus an `aria-label` of
  `` `${label}: ${count}` `` (`RequestKpiStrip`). Selectable rows expose
  `aria-pressed` the same way (`RequestRow`).
- **Refetch indicators are live regions:** `role="status" aria-live="polite"` — the
  mobile "Updating" pill ships this; apply it to any textual refetch indicator.
- **Sortable headers must convey `aria-sort`** (`ascending` / `descending` / `none`
  on the active column). **Required by this canon; not yet implemented anywhere in
  the tree** — add it whenever you touch a sortable header.
- Triggers that open sheets/dialogs carry `aria-haspopup="dialog"` +
  `aria-expanded` (see the filter trigger and the empty-state "Change filters"
  button in the reference).

---

**Implementation checklist**
1. [ ] `--strict-radius` hardgate passes on the page.
2. [ ] Rendered: zero red outside `--destructive`; zero horizontal overflow.
3. [ ] Two-rail workspace: SignalPanel + state chips + handled sheet (LEFT) │ DetailRail (RIGHT).
3a. [ ] Handled sheet renders ONE row/table projection — no `ViewToggle`, no `useViewMode`, no
    grid/card/list switching; card/list view files are legacy-inactive (§1.5).
4. [ ] DetailRail defaults to first record and updates on row focus.
5. [ ] Writes gated behind authority show a reason, never a dead button.
6. [ ] Views + mobile + context panel + modal brought to the same canon.
7. [ ] Contract test still green.
8. [ ] Refetch surfaced (§1.6): query uses `placeholderData: previous` + exposes `isFetching`;
    active KPI chip glyph-swaps to `Loader2 animate-spin` (desktop) / "Updating" pill (mobile).
    No silent refetch.
9. [ ] KPI side-effect matrix walked (§1.7): every selection incl. `all` / unknown ids ×
    {count=0, count>0, loading, refetching} across hero, header count, list filter,
    empty state + recovery, context panel. Fallback branches neutral, never a
    hardcoded entity.
10. [ ] Every mutating CTA threads `isPending` — disabled + spinner glyph swap; toasts use
    stable ids; optimistic writes via the shared wrapper (snapshot → optimistic →
    rollback → invalidate) (§3.1).
11. [ ] Copy canon (§1.8): no raw DB error text rendered; every count pluralized;
    empty-state variant matches its cause and the recovery CTA targets the control
    that narrowed the list (KPI-narrowed zero offers the KPI reset).
12. [ ] A11y (§6): dialog accessible name; chips `aria-pressed`; refetch indicator
    `role="status" aria-live="polite"`; `aria-sort` on sortable headers.
