# Canon Component Specs — verbatim extraction source-of-record

> **Purpose.** The extraction source for the upcoming canon component library. Every spec below is
> mined VERBATIM from the gold-standard surfaces — the recipes the user has had to re-teach
> repeatedly. Each spec carries (a) the exact class strings/values, (b) `file:line` in current
> source (branch `codex/ivisit-console-revamp-checkpoint-20260707`, 2026-07-09), and (c) git-commit
> provenance (`git log -S`). **When building a component, copy the recipe — do not restyle.**
>
> Gold sources: `src/components/pages/EmergencyRequestsPage.jsx` (ERP) + `src/components/mobile/MobileEmergency.jsx` (ME)
> primary; `src/components/pages/TodayHome.jsx` (TH) + `src/components/mobile/MobileToday.jsx` (MT);
> `src/components/mobile/MobileVisits.jsx` (MV, freshest donor copy); shared mobile primitives;
> `src/index.css`; cross-checked against `docs/ui-ux/MANAGEMENT_PAGE_STANDARDS.md` (MPS) and
> `docs/design-system/MOBILE_DESIGN_SYSTEM.md` (MDS). Where prose and code disagree, **code at the
> gold pages wins** — discrepancies are flagged inline (search "DISCREPANCY").

---

## 1. HeadingRegion (desktop hero column) + mobile heading

**Purpose.** The page's voice: eyebrow/status pill → big headline → one-line subhead → (optional)
context pills → the glance/KPI tile grid. The whole region is width-constrained to `max-w-2xl`;
the tile grid repeats that constraint — this is the width rule the user kept re-teaching.

### Desktop recipe (TodayCenter — TH:729-777; RequestSignalPanel — ERP:1665-1706)

```jsx
// Section wrapper (Today):        TH:736
<section className="relative z-10 flex min-h-[210px] min-w-0 flex-1 items-center px-6 pb-5 pt-7 md:min-h-[520px] md:px-12 md:py-10 lg:pl-24">
  <div className="max-w-2xl">                                             {/* TH:738 — WIDTH CONSTRAINT */}
// Section wrapper (Requests):     ERP:1671 — bottom-anchored variant
<section className="flex min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]">

// 1) Status/eyebrow pill (tone-mapped, live region on Today):            TH:739-746 / ERP:1681-1684
className={`mb-4 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold md:mb-5 ${rowToneClass[tone]}`}
// Requests spells it: `mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${requestToneClass[tone]}`
// contains <Icon className="h-4 w-4" /> + label. Today adds role="status" aria-live="polite".

// 2) Headline:                                                            TH:747 / ERP:1685
className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl"

// 3) Subhead:                                                             TH:750 / ERP:1688
className="mt-3 max-w-md text-sm leading-6 text-muted-foreground md:mt-4 md:text-base"   // Today
className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground"                        // Requests

// 4) Context pills (role / retry-needed):                                 TH:754
className="rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]"

// 5) Tile grid (THE grid recipe — identical on Today glance + Requests KPI):  TH:764 / ERP:1731
className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3 md:mt-7"   // Today (md:mt-7)
className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3"           // Requests
```

**Tile (the "Today tile" — GlanceCard, TH:710; KPI tiles must match it EXACTLY per ERP:155-160 comment):**

```
group min-h-[66px] cursor-pointer rounded-inner bg-card/65 px-3 py-2.5 text-left
shadow-[0_16px_38px_rgb(0_0_0/0.08)] backdrop-blur-xl
transition-[background,box-shadow,transform] duration-200 hover:bg-card/82
focus-visible:-translate-y-0.5 focus-visible:bg-foreground/10 focus-visible:shadow-[0_12px_32px_rgb(0_0_0/0.10)]
active:bg-card/90 disabled:pointer-events-none disabled:opacity-70
dark:bg-white/[0.055] dark:hover:bg-white/[0.085] dark:focus-visible:bg-white/[0.12]
sm:px-4 md:py-3
```

Tile anatomy (TH:712-724): `flex items-start justify-between gap-2` → left `min-w-0` column with
label `block text-[10px] font-medium text-muted-foreground sm:text-[11px]` over value
`mt-1 block text-[13px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-sm`;
trailing orb `mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${toneClass}`
holding `ArrowRight h-3.5 w-3.5` (swaps to `Loader2 h-3.5 w-3.5 animate-spin` while opening,
`group-hover:translate-x-0.5`). Motion: `whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}`.

### Mobile heading (ME:311-322 / MV:300-311 / MT hero:323-356)

```jsx
<section className="px-4">                                       {/* page gutter = px-4 always */}
  <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">Requests</h1>
  <p className="mt-1 text-sm text-muted-foreground">
    {showSkeleton ? 'Loading requests...'
      : loadError && items.length === 0 ? 'Requests did not load'      // honest failure, never "0 requests"
      : `${totalRequests} request${totalRequests === 1 ? '' : 's'}`}   {/* pluralized, ACTIVE-KPI-scoped count */}
  </p>
</section>
```

Dashboard hero variant (MT:323-356): status pill `inline-flex items-center gap-2 rounded-pill px-3
py-1.5 text-xs font-semibold ${toneClass}` (+ Updating pill right-anchored in the same row) →
`h1 mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]`
→ `p mt-2 text-sm leading-6 text-muted-foreground` → pills row `mt-4 flex flex-wrap gap-2` with
`surface-card rounded-pill px-3 py-1.5 text-xs font-medium text-muted-foreground`.

**Behavioral rules.** Chrome (title + summary) is always present — no entrance motion; the count
line tracks the ACTIVE KPI scope, never the raw total (ME:290-293); a failed load never renders a
confident zero (ME:314-320). Page rhythm: list pages `space-y-3` (ME:307), dashboards `space-y-8`
(MT:319).

Provenance: TH hero shipped in `15acf6c9` (2026-07-06 checkpoint); tile/KPI exact-match rule
`6c4fae4b` (2026-07-08 "KPI data-driven priority + exact Today-tile match"); `min-h-[66px]` +
canon dial-in `05e02d23` (2026-07-08); mobile heading + count honesty `fcb6e6dc` / `574968fd` (2026-07-08/09).

---

## 2. KpiStrip

**Purpose.** The page's state filter. Desktop: max-3 Today-tiles that FILTER. Mobile: a horizontal
chip rail (`MobileKPIStrip`). Chips are toggles — re-tapping the active chip returns to All.

### 2a. Desktop (RequestKpiStrip — ERP:1708-1772)

Config per option (kpiOptions ERP:102-153) — each chip carries `colorClass`, `activeClass`, `restClass`:

```js
// ERP:160 — shared rest state (neutral, e2-lift shadow):
const KPI_REST = 'bg-card/65 text-muted-foreground shadow-[0_16px_38px_rgb(0_0_0/0.08)] hover:bg-card/82 dark:bg-white/[0.055] dark:hover:bg-white/[0.085]';

// active classes per state (ERP:102-153) — colour ONLY when selected:
all:       'bg-foreground/[0.06] text-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:bg-white/[0.06]'
pending:   'bg-destructive/16 text-destructive shadow-[0_4px_12px_rgb(0_0_0/0.07)]'
active:    'bg-amber-500/10 text-amber-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-amber-200'
mine:      'bg-violet-500/10 text-violet-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-violet-200'
bed:       'bg-cyan-500/10 text-cyan-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-cyan-200'
ambulance: 'bg-sky-500/10 text-sky-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-sky-200'
```

Chip markup (ERP:1742-1767):

```jsx
<motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
  onClick={() => setKpiFilter(active && item.id !== 'all' ? 'all' : item.id)}   // toggle-to-All (ERP:1747)
  data-request-kpi={item.id} data-state={active ? 'selected' : 'idle'}
  className={`group min-h-[66px] rounded-inner px-3 py-2.5 text-left backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 sm:px-4 md:py-3 ${active ? activeClass : KPI_REST}`}
  aria-pressed={active} aria-label={`${item.label}: ${count}`}>
  <span className="flex items-start justify-between gap-2">
    <span className="min-w-0">
      <span className="block text-[10px] font-medium leading-tight sm:text-[11px]">{item.label}</span>
      <span className="mt-1 block text-2xl font-semibold tracking-normal text-foreground">{count}</span>
    </span>
    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-background/45 transition-transform group-hover:scale-105 ${active ? colorClass : ''}`}>
      {active && isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
    </span>
  </span>
</motion.button>
```

**Selection algorithm — max 3, data-driven (ERP:155-161, 426-470):**

```js
const KPI_IMPORTANCE = { all: 0, pending: 1, active: 2, mine: 3, bed: 4, ambulance: 5 };
const PINNED_KPI_IDS = ['pending', 'active'];   // pinned ONLY while count > 0
// rankKpiOptions: sort by live count desc, KPI_IMPORTANCE tiebreak (ERP:427-435)
// selectPrimaryKpis (ERP:444-459): pin actionable states with signal -> keep the user's
// selected chip visible -> fill remaining of 3 slots by rank -> render in canonical order.
// A ZERO-count chip never occupies a slot another option could fill with real data.
// getDefaultRequestKpi (ERP:461-470): pending>0 ? 'pending' : active>0 ? 'active' : 'all'
// — the default must resolve to a chip that will actually render.
```

Extra rule: the `pending` chip at count 0 re-tones to emerald "clear" (`bg-emerald-500/10
text-emerald-700 dark:text-emerald-200`, ERP:1736-1740). Skeleton variant: 3 tiles `min-h-[66px]
rounded-inner bg-card/65 px-3 py-2.5 shadow-[0_16px_38px_rgb(0_0_0/0.08)] backdrop-blur-xl sm:px-4
md:py-3` with Shimmer bars (ERP:1709-1728).

Provenance: `6c4fae4b` (2026-07-08, data-driven priority + Today-tile match + KPI_REST),
`190434e6` (2026-07-09, selectPrimaryKpis + Mine chip + includeMine), `ff9ab49c` (2026-07-09,
toggle-to-All + Loader2 glyph swap parity).

### 2b. Desktop contextual metrics

`MetricStrip` is the non-filtering sibling of `KpiStrip`. Use it for balances,
amounts, rates, or measured outcomes that describe a page without changing the
visible dataset. It keeps the same `max-w-2xl`, `min-h-[66px]`, label/value/orb
anatomy and renders at most three source-backed measurements. Items with
`available: false` are removed before priority ordering. It has no click or
`aria-pressed` behavior; source tabs and state filters remain separate controls.

### 2c. Mobile chip rail (MobileKPIStrip.jsx:14-112)

```jsx
// Wrapper: sticky rail, hidden scrollbars               MobileKPIStrip:67-73
<div className="sticky top-0 z-40 w-full px-4 py-3 shadow-none relative overflow-hidden">
  <div className="flex gap-2 overflow-x-auto no-scrollbar" {...bind}>   {/* useScrollCooldown(180) */}

// Chip (MobileKPIStrip:80-107):
<motion.button whileTap={{ scale: 0.96 }} transition={mobileMotion.quick}
  aria-pressed={isActive} data-state={isActive ? 'selected' : 'idle'}
  className={`shrink-0 flex items-center gap-2 rounded-pill px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap transition-[background,transform] duration-200 ease-out ${isActive
    ? 'bg-primary text-primary-foreground'                                            // active = brand fill
    : 'bg-foreground/[0.06] dark:bg-white/[0.08] text-muted-foreground backdrop-blur-xl active:bg-foreground/[0.1]'}`}
  style={{ WebkitTapHighlightColor: 'transparent' }}>
  {!isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-pill" style={{ backgroundColor: kpi.color }} />}  {/* status dot */}
  <span className="leading-none">{kpi.label}</span>
  <span className={`leading-none tabular-nums font-dashboard-numbers ${isActive ? 'opacity-90' : 'text-foreground'}`}>{kpi.value}</span>
</motion.button>
```

Behavior (MobileKPIStrip:28-42): re-tap of the active non-All chip → `onKpiClick('all')`;
feedback `triggerFromEvent(event, { variant: isReapply ? INFO : SUCCESS, color: kpi.color, haptic: true, sound: true })`.
Loading state: pills `h-9 w-24 rounded-pill bg-muted/20` (MobileKPIStrip:50-60). Chip config feeds
`color` as a raw status hue string — Requests hardcodes hues mirroring desktop (ME:54-60:
destructive var / `#f59e0b` amber / `#06b6d4` cyan / `#0ea5e9` sky); **Visits derives them from
vitalTracks accents** (MV:49-59, `visitStateAccent`) — the freshest pattern; prefer it.

Provenance: chip-row recycle `c66dc263` (2026-07-08); vitalTracks-derived hues `2f499403`
(2026-07-09, MobileVisits donor).

---

## 3. SignalHero (count-keyed hero copy) + honest loadError branch

**Purpose.** The hero copy machine: every KPI selection (including `all` and unknown ids) maps to
icon / tone / label / headline / subhead. Never a hardcoded entity fallback.

### Desktop (getRequestSignal — ERP:337-424; tone map ERP:472-480)

```js
const requestToneClass = {           // ERP:472-480
  danger:   'bg-destructive/12 text-destructive shadow-[0_4px_12px_rgb(0_0_0/0.07)]',
  clear:    'bg-emerald-500/10 text-emerald-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-emerald-200',
  warning:  'bg-amber-500/10 text-amber-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-amber-200',
  critical: 'bg-rose-500/10 text-rose-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-rose-200',
  info:     'bg-cyan-500/10 text-cyan-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-cyan-200',
  primary:  'bg-sky-500/10 text-sky-700 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-sky-200',
  muted:    'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};
```

Copy rules (extract verbatim into the component contract):
- **Honest loadError branch first** (ERP:344-352): failed load + nothing cached → `{ icon: AlertCircle,
  tone: 'danger', label: 'Load failed', headline: 'Requests did not load', subhead: 'Retry to load
  the queue.' }` — NEVER a reassuring zero-derived "all clear" over a list error.
- Count-keyed + pluralized: `` `${count} request${count === 1 ? '' : 's'} to review` `` vs the
  per-KPI zero line ("No requests need review" / "No active requests" / ...).
- `pending` flips icon + tone at zero: `AlertCircle`/danger → `CheckCheck`/clear (ERP:354-363).
- Neutral `all` fallback (ERP:415-423): `LayoutGrid`, tone `muted`, "Every request across
  services." — the final branch is NEVER a specific entity (the Ambulance-hero archetype bug, MPS §1.7).

Today's equivalents: `buildToday` (TH:117-302, role-scoped, same tone names) with
`rowToneClass`/`statusClass` (TH:656-670) — note Today's darker-mode tone strings differ slightly
(`dark:bg-amber-300/15 dark:text-amber-100` family); Requests' `requestToneClass` is the canonical
management-page set.

### Mobile hero + tones (MT:64-70)

```js
const toneClass = {                  // MT:64-70 — the canonical mobile tone map
  danger:  'bg-destructive/14 text-destructive',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  primary: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  muted:   'bg-muted/34 text-muted-foreground',
};
```

Mobile list pages carry the hero in the summary line (ME:313-321 — 'Loading...' / 'did not load' /
scoped count), not a big hero; dashboards render the full hero (MT §1 above).

Provenance: signal panel `15acf6c9`; loadError honesty + neutral-All `d128487b` /
`763e1aeb` (2026-07-09); mobile toneClass `d3d0487d` (2026-07-09).

---

## 4. GroupedList / GroupPanel / ListRow (mobile)

**Purpose.** The iOS-Settings grouped list: one frosted PANEL per recency bucket over the atlas;
transparent rows separated by a hairline whisper. Grouping is render-only.

### Recipe (ME:437-498; MV:415-438 identical)

```jsx
<div className="space-y-[18px]">                       {/* bucket rhythm */}
  {groupByRecency(displayItems, (r) => r.created_at, (r) => canonicalizeEmergencyStatus(r.status, null))
    .map(({ key, label, items }) => (
    <div key={key}>
      {/* Group header — sentence-case BOLD + tabular count (never all-caps): ME:444-447 */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <span className="text-[13px] font-bold leading-[17px] text-muted-foreground">{label}</span>
        <span className="text-[13px] font-bold text-muted-foreground/60 tabular-nums">{items.length}</span>
      </div>
      {/* THE PANEL: ME:448 */}
      <div className="rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListRow ... />
            {index < items.length - 1 && (
              /* HAIRLINE: ME:490 — inset past the 40px orb + gap */
              <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  ))}
</div>
```

### ListRow anatomy (ME:461-488; MV MobileVisitRow:596-633 — freshest copy, adds `layout="position"`)

```jsx
<motion.button type="button" layout="position" whileTap={{ scale: 0.988 }}     /* card press */
  onClick={() => onOpen(item)}
  onPointerDown={(e) => triggerFromEvent(e, { variant: FEEDBACK_TYPES.CLICK, haptic: true, sound: true })}
  className="group/row w-full flex items-center gap-3 px-2 py-3 text-left rounded-inner transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]"
  data-mobile-visit-row={item.id} aria-haspopup="dialog" aria-label={`Open ${name}`}>
  {/* Orb: status-tinted circle, 40px, icon size 20 */}
  <span className={`h-10 w-10 shrink-0 rounded-pill flex items-center justify-center ${orbClass}`}>
    <TypeIcon size={20} />
  </span>
  {/* Identity: title 15/500, meta 12 */}
  <div className="min-w-0 flex-1">
    <p className="text-[15px] leading-5 font-medium text-foreground truncate">{name}</p>
    <p className="mt-0.5 text-xs leading-[17px] text-muted-foreground truncate">{type} · {metaLine}</p>
  </div>
  {/* Trailing: day-aware time (bold, tabular) over pill + chevron */}
  <span className="ml-2 shrink-0 flex flex-col items-end gap-2 min-w-[72px]">
    <span className="text-xs leading-[15px] font-bold text-foreground tabular-nums">{formatRequestDayTime(when)}</span>
    <span className="flex items-center gap-2">
      {/* optional quiet marker chip (e.g. unsettled Cash): rounded-pill bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground */}
      <span className={`rounded-pill px-2.5 py-[5px] text-[11px] font-bold ${pill?.className || 'bg-muted/34 text-muted-foreground'}`}>{pill?.label || 'New'}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
    </span>
  </span>
</motion.button>
```

**Rules.** Orb + pill tones come ONLY from `constants/vitalTracks.js` (`resolveVital(domain,
status).pill`); grouping ONLY from `utils/groupByRecency.js` (buckets: active_now / upcoming /
today / yesterday / this_week / last_week / this_month / last_month / older; newest-first inside;
empty buckets dropped). Row tap opens `MobileDetailSheet`, never an inline dropdown. Hairline inset
`ml-[62px]` for 40px-orb rows; `ml-[56px]` for 36px-orb rows (MT:421).

Provenance: grouped list `fcb6e6dc` (2026-07-08); hairline whisper + replace-in-place `d89db0f6`
(2026-07-09); Visits donor rebuild `2f499403` (2026-07-09); trailing time/pill column `574968fd`.

---

## 5. SearchRow

**Purpose.** Flat search bar + filter/stats icon triggers, sitting directly on the page (mobile) or
in the handled-sheet toolbar (desktop). 300ms draft-debounce; clear-x commits immediately.

### Mobile (ME:335-394; MV:324-382 identical)

```jsx
<div className="flex items-center gap-2">
  <div className="relative flex-1">
    <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
    <input type="text" inputMode="search" placeholder="Search requests..."
      value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)}
      className="h-9 w-full rounded-inner bg-background/60 pl-10 pr-10 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]" />
    {searchDraft && (
      <button type="button" aria-label="Clear search"
        onClick={() => { setSearchDraft(''); setFilters?.((prev) => ({ ...prev, search: '' })); }}  /* clear commits immediately */
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-pill bg-foreground/10 text-muted-foreground transition-colors hover:bg-foreground/15 active:scale-95">
        <X size={12} />
      </button>
    )}
  </div>
  {/* Filter trigger */}
  <motion.button whileTap={{ scale: 0.96 }} data-state={filterTriggerState}          /* 'open'|'filtered'|'idle' */
    onClick={(e) => { onOpenFilters?.(); triggerFromEvent(e, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true }); }}
    className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
    aria-label="Filter requests" aria-haspopup="dialog" aria-expanded={filterSheetOpen}>
    <Filter size={18} />
  </motion.button>
  {/* Stats trigger (admin-gated): same class, BarChart3 size 18, FEEDBACK_TYPES.CLICK */}
</div>
```

**The 300ms draft-debounce pattern (code sketch — ME:241-256, ERP:1806-1822 identical idea):**

```js
const [searchDraft, setSearchDraft] = useState(filters?.search || '');
useEffect(() => { setSearchDraft(filters?.search || ''); }, [filters?.search]);   // external writes sync back
useEffect(() => {
  const handle = setTimeout(() => {
    setFilters?.((prev) => ((prev?.search || '') === searchDraft ? prev : { ...prev, search: searchDraft }));
  }, 300);
  return () => clearTimeout(handle);
}, [searchDraft, setFilters]);
```

### Desktop toolbar (RequestToolbar — ERP:1806-1862)

```jsx
<div className="flex items-center gap-3">
  <div className="relative flex-1">
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
    <input type="search"
      className="h-12 w-full rounded-button bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_2px_hsl(var(--foreground)/0.22)]" />
  </div>
  {/* Manual refresh (desktop pull-to-refresh equivalent): */}
  <Button variant="ghost" size="icon" disabled={refreshing}
    className="h-12 w-12 rounded-button bg-muted/30 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 disabled:opacity-60"
    aria-label={refreshing ? 'Refreshing requests' : 'Refresh requests'}>
    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
  </Button>
  <Button variant="ghost" data-state={filterTriggerState}
    className="h-12 rounded-button bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
    aria-haspopup="dialog" aria-expanded={filterSheetOpen}>
    <FilterIcon className="mr-2 h-4 w-4" /> Filters
  </Button>
</div>
```

Header filter icon variant (ERP:773-789): `squircle h-9 w-9 bg-muted/20 text-muted-foreground
transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95` + active-filter dot
`absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500 shadow-[0_0_24px_rgba(14,165,233,0.55)]`.

`getFilterTriggerState` (ERP:86-90): `isOpen → 'open'`, `hasFilter → 'filtered'`, else `'idle'`.

Provenance: mobile clear-x `562f97d0`; mobile debounce `b3da13ee`; desktop debounce + toolbar
close-out `70af6bcc`; toolbar base `15acf6c9`.

---

## 6. Buttons — every sanctioned action recipe

| Recipe | Exact class string | Source | Press |
|---|---|---|---|
| **Quiet CTA (ink-toned primary)** — Today's one loud-ish action; deliberately `bg-foreground`, NOT `bg-primary` | `mt-3 flex w-full items-center justify-center gap-2 rounded-button bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-[0_6px_16px_rgb(0_0_0/0.12)] transition-[background,box-shadow,transform] hover:bg-foreground/90 focus-visible:shadow-[0_12px_32px_rgb(0_0_0/0.10)] active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-white/90 md:mt-5 md:py-3.5` | TH:868 | `active:scale-[0.98]` |
| **Quiet CTA (mobile)** | `mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-[0_8px_18px_hsl(var(--foreground)/0.18)] transition-colors hover:bg-foreground/90 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90` | MT:404 | `whileTap 0.96` |
| **Header action (primary, ink pill)** — "New request" | `h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-[0_6px_16px_rgb(0_0_0/0.12)] transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95` + `data-state={open?'open':'idle'}` + `aria-haspopup="dialog" aria-expanded` | ERP:797 | `active:scale-95` |
| **Header action (quiet fill)** — **REQUIRES `text-foreground`** | `bg-card/70 h-9 px-4 text-[10px] font-bold text-foreground` | OrganizationsPage:442, PricingManagementPage:469 | — |
| **Loud rail primary (state-toned)** | base `h-12 w-full rounded-button text-base font-semibold transition-all active:scale-[0.99]` + one of `railPrimaryActionClass`: review `bg-destructive text-white shadow-[0_6px_16px_rgb(0_0_0/0.12)] hover:bg-destructive/90` · dispatch `bg-sky-600 text-white ... hover:bg-sky-500` · complete `bg-emerald-600 text-white ... hover:bg-emerald-500` · retry `bg-amber-500 text-slate-950 ... hover:bg-amber-400` · details `bg-foreground text-background ... hover:bg-foreground/90` (all `shadow-[0_6px_16px_rgb(0_0_0/0.12)]`). Icon `mr-2 h-5 w-5` (Loader2 swap when pending) + `ChevronRight ml-auto h-5 w-5` | ERP:482-488, 2267-2279 | `active:scale-[0.99]`, disabled on `isPending` |
| **Rail secondary grid button** (2-col `grid grid-cols-2 gap-3`) | `h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98] disabled:opacity-50`; icon `mr-2 h-4 w-4 text-muted-foreground` (Loader2 swap when pending) | ERP:2360-2374 | `active:scale-[0.98]` |
| **Row action pill** — "Details" | `justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95` | ERP:2029 | `active:scale-95` |
| **Pill action (revealed row CTA, desktop)** | `mt-3 inline-flex items-center gap-2 rounded-pill bg-foreground/[0.18] px-3 py-2 text-xs font-semibold text-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,transform] active:scale-[0.98] hover:bg-foreground/[0.22] focus-visible:bg-foreground/[0.26] dark:bg-white/[0.24] dark:hover:bg-white/[0.30]` | TH:829 | `active:scale-[0.98]` |
| **Pill action (mobile, >=44pt)** | `mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-foreground/[0.08] px-4 text-xs font-semibold text-foreground transition-colors active:bg-foreground/[0.12] dark:bg-white/[0.10] dark:active:bg-white/[0.14]` | MT:246 | `whileTap 0.96` |
| **Quiet destructive** — rail cancel | `h-10 w-full rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.99]` | ERP:2309 | `active:scale-[0.99]` |
| **Destructive retry pill** (error states) | `rounded-pill bg-destructive/10 px-5 font-semibold text-destructive transition-all hover:bg-destructive/15 active:scale-95` (mobile: `h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold ... active:scale-[0.96]`) | ERP:1785 / ME:416 | `active:scale-95` |
| **Bulk bar icon action** | `h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40` | ERP:1293 | `active:scale-[0.96]` |
| **Mobile sheet PRIMARY (filled + glow)** | `flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-button text-sm font-bold tracking-wide text-primary-foreground transition-transform disabled:opacity-50` + inline `style={{ background: tone, boxShadow: '0 8px 18px ${tone/0.30}' }}` (tone default `hsl(var(--primary))`) | MobileSheetActions:48-64 | `whileTap 0.96` |
| **Mobile sheet SECONDARY (ghost)** | `flex h-12 items-center justify-center gap-2 rounded-button bg-muted/40 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60` + `flex-1` (labelled) or `w-12 shrink-0` (icon-only) | MobileSheetActions:34-46 | `whileTap 0.96` |
| **Mobile sheet EXTRA (quiet 2-col grid)** | `flex h-11 items-center justify-center gap-2 rounded-button bg-foreground/[0.05] text-[13px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.08] dark:bg-white/[0.07] dark:hover:bg-white/[0.10]`; icon tinted via `style={{ color: tone }}` — fill stays quiet | MobileSheetActions:83-99 | `whileTap 0.96` |
| **Gated/fail-closed stub** | `h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.99]` (mobile `active:scale-[0.96]`) | ERP:2299 / ME:693 | — |

**The contrast trap (commit `ca6548b3`, 2026-07-09).** shadcn Button's DEFAULT variant is
`bg-primary text-primary-foreground` (near-white text). Any page that overrides only the
background to a light fill (`bg-card/70`) MUST also claim `text-foreground`, or the label is
light-on-light in light mode. This was user-reported twice; the one-class fix is canonical:
`bg-card/70 ... text-foreground`. Bake `text-foreground` into the future HeaderAction component so
the trap cannot recur.

**Press ladder (canon).** Controls (buttons/chips/icons) `0.96`; cards/rows `0.988`
(`mobileMotion.press`, mobileMotion.js:48-57, commit `1d899ecc`); desktop tile hover `y: -2` +
tap `0.98`; large CTAs `0.98-0.99`; small icon chips `active:scale-95`.

---

## 7. Table / desktop list (RequestRow grid + sort + select-all + bulk)

### Grid recipe (ERP:1864-1867)

```js
// Person | Status | Service | Facility | Time | Action — status owns its own column.
const REQUEST_GRID_COLS        = 'grid-cols-[minmax(140px,1.25fr)_minmax(96px,auto)_minmax(88px,0.62fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';
const REQUEST_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(140px,1.25fr)_minmax(96px,auto)_minmax(88px,0.62fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';
```

### Header (RequestListHeader — ERP:1898-1920)

```jsx
<div className={`grid ${selectable ? REQUEST_GRID_COLS_SELECT : REQUEST_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
  {selectable && <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={onSelectAll}
     onClick={(e) => e.stopPropagation()} aria-label={allSelected ? 'Clear selection' : 'Select all requests'} className="h-4 w-4" />}
  <span>Person</span><span>Status</span><span>Service</span><span>Facility</span>
  <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
  <span className="justify-self-end text-right">Action</span>
</div>
```

### SortableColumnHeader (ERP:1871-1896) — incl. aria-sort

```jsx
<span role="columnheader" aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
  <button type="button" onClick={() => onSort?.(sortKey)} data-state={isSorted ? 'sorted' : 'idle'}
    className="flex items-center gap-1 transition-colors hover:text-foreground active:scale-[0.96]"
    aria-label={`Sort by ${label}`}>
    {label}
    {isSorted ? (direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
              : <ArrowUpDown className="h-3 w-3 opacity-40" />}
  </button>
</span>
```

Sort toggle (ERP:910-915): new key → asc; re-tap active key → flip. Feeds
`queryFilter.sortKey/sortDirection` server-side. (DISCREPANCY: MPS §6 still says aria-sort is "not
yet implemented anywhere" — stale; landed in `70af6bcc`. Code wins.)

### Row (RequestRow — ERP:1922-2035)

```
// Row shell (ERP:1941): motion.div layout="position", role="button" tabIndex={0}
group mb-2 grid min-h-[80px] ${GRID} items-center gap-2 rounded-card px-4 py-3.5
transition-[background,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
selected: bg-card/88 shadow-[0_6px_16px_rgb(0_0_0/0.12)] dark:bg-white/[0.08]
rest:     bg-card/50 hover:-translate-y-0.5 hover:bg-card/72 hover:shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:bg-white/[0.035] dark:hover:bg-white/[0.06]
```

Interactions: click → focus (rail follows); double-click → `onView`; right-click →
`preventDefault` + focus (cheap context menu); Enter/Space → focus; `data-state`
selected/idle + `aria-pressed`. Cells: avatar `relative flex h-12 w-12 shrink-0 items-center
justify-center overflow-hidden rounded-pill text-sm font-semibold ${statusAvatarClass}` with
initials + `img` overlay that hides itself on error; name `truncate text-[15px] font-semibold`;
phone `mt-1 truncate text-xs text-muted-foreground`; status pill `inline-flex max-w-full
items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`; cash chip
`rounded-pill bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground`; service
icon well `flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45
text-muted-foreground`; time `text-sm font-medium text-muted-foreground` via
`formatRequestDayTime`. No entrance stagger — `layout="position"` only (replace-in-place, ERP:1610-1613).

### Select-all + shift-range + BulkActionBar (the whole Requests pattern)

- **Row checkbox** (ERP:1967-1978): `Checkbox className="h-4 w-4"`,
  `onCheckedChange={(v) => onToggleSelect(id, v)}`, `onClick` calls `onSelectClick(event)` THEN
  `stopPropagation()` — the click fires before onCheckedChange, so shiftKey is stashed in a ref.
- **Shift-click range** (ERP:933-965): `shiftSelectRef = { shiftKey, lastIndex }`; on toggle, if
  shift and both indices valid, expand the add/remove over `requests.slice(start, end+1)`.
- **Select-all** (ERP:969-971): covers EVERY visible row; header checkbox shows `'indeterminate'`
  when partially selected.
- **Selection pruning** (ERP:920-926): drop ids that left the list; return same reference when
  unchanged to avoid loops.
- **Bulk cancel** (ERP:976-1032): acts only on the actionable subset
  (`getEmergencyActionState(row).canCancel`), loops the SAME single-record mutation
  (`cancelMutation.mutateAsync`) — never a parallel bulk service call; `toast.loading/success/error`
  share the stable id `'bulk-cancel'`; confirm modal names the actionable count.
- **BulkActionBar shell** (common/BulkActionBar.jsx:6-37): fixed right-center vertical pill —
  `fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15
  backdrop-blur-sm shadow-none rounded-pill`; count badge `bg-primary text-primary-foreground
  text-[10px] font-bold h-6 min-w-[24px] px-1.5 rounded-pill`; clear button `h-8 w-8 rounded-pill`.
  Entrance `initial={{ x: 50, opacity: 0, scale: 0.9 }}`.
- **Gating:** desktop-only + `currentUser.isAdmin()` (ERP:1286).

### Viewport + count strip + pagination

- Rows viewport (ERP:1552-1558): `mt-3 min-h-0 flex-1 overflow-y-auto rounded-card
  bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]`, `tabIndex={0}` with
  ArrowUp/Down/Enter/Escape keyboard nav (ERP:1477-1510; skips inputs and open dialogs); page
  change scrolls to top (ERP:1469-1471).
- Count strip (ERP:1547-1550): `mt-3 flex items-center justify-between px-2 text-xs font-semibold
  text-muted-foreground` — `"{totalCount} requests"` / `"Page X of Y"`, with loading and
  failed-empty voices.
- `PaginationControls` (ui/PaginationControls.jsx:19-98): buttons `h-10 rounded-button bg-muted/30
  px-4 text-sm font-semibold text-foreground shadow-[0_2px_8px_rgb(0_0_0/0.06)] backdrop-blur-xl
  ... active:scale-[0.98] disabled:opacity-35`; indicator `rounded-pill bg-muted/20 px-4 py-2`;
  ArrowLeft/Right keyboard paging (ignores editable targets); pass `loading={loading || isFetching}`.

Provenance: grid + bulk restore `2ac8197f` (2026-07-08); shift-select + CopyChip + gap close
`763e1aeb` (2026-07-09); aria-sort + debounce `70af6bcc`; row canon `05e02d23` / `15acf6c9`.

---

## 8. DetailRail (desktop) + DetailSheet/Islands (mobile)

### 8a. Rail shell (ERP:2166 — copy VERBATIM; also the TodaySheet shell TH:845)

```
relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet
bg-card/78 p-4 text-foreground shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl no-scrollbar
dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px]
lg:shrink-0 lg:self-stretch xl:w-[440px]
```

Drag handle (everywhere): `mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20` (handled
sheet uses `mb-3`).

**Recessed hero panel (the "Today-sheet surface recipe", ERP:2170 / TH:849):**
`mb-4 rounded-modal bg-background/55 p-3 dark:bg-white/[0.05] md:p-4` — the hero block (title +
display-id + status pill + stage strip + identity) sits inside; the detail cards below read as
fill-films over the pane, no per-card shadow. Provenance: `23e8ad40` (2026-07-09, "port the
Today-sheet surface recipe to the Requests detail rail").

**Stage progression strip (ERP:2185-2189, order ERP:241-249):**

```jsx
<div className="mt-3 flex w-[200px] max-w-full gap-1" aria-hidden="true">
  {REQUEST_STAGE_ORDER.map((stage, i) => (
    <span key={stage} className={`h-1 flex-1 rounded-pill ${!cancelled && i <= stageIndex ? stageFill : 'bg-muted/40'}`} />
  ))}
</div>
// REQUEST_STAGE_FILL: pending_approval/payment_declined bg-destructive · accepted bg-cyan-500 ·
// arrived bg-sky-500 · in_progress bg-amber-500 · completed bg-emerald-500; cancelled = all muted.
```

**DetailLine (ERP:2321-2336):**

```jsx
<div className="flex items-center gap-3 rounded-inner bg-foreground/[0.045] p-2.5 dark:bg-white/[0.055]">
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
    <Icon className="h-4 w-4" />
  </span>
  <div className="min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    <div className="mt-1 truncate text-sm font-semibold text-foreground">{value || 'Not set'}</div>
  </div>
</div>
```

(DISCREPANCY: DetailLine tracks `0.16em`; the eyebrow token and grid headers use `0.14em`
(`--tracking-eyebrow`). Unify on `0.14em` when extracting.)

**CopyChip (ERP:2341-2358):** `inline-flex h-5 w-5 shrink-0 items-center justify-center
rounded-pill text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground
active:scale-95` with `Copy h-3 w-3`; `stopPropagation()` + `navigator.clipboard.writeText(...)
.catch(() => {})` + `toast('Copied')`. Used on display-id and phone (guard: value must not be a
"No ..." placeholder — ERP:2123-2125).

**Action gating chain (getPrimaryRailAction — ERP:2376-2425):** priority `review (status ===
pending_approval) > dispatch (canManage && canDispatch) > complete ((canManage ||
canCompleteAsProvider) && canComplete) > retry (canRetryPayment) > details`. Legality comes ONLY
from `getEmergencyActionState(record)` (utils/emergencyActions.js); role fold `canManage = isAdmin
|| isOrgAdmin`. Every other eligible action lands in the 2-col grid minus whatever the primary
claims; pending flags (`dispatchPending` etc.) disable + Loader2-swap in place (ERP:2158-2163,
2270-2276). Gated writes render the fail-closed stub, never a dead button.

Empty + loading rail variants: same shell; empty = `Info h-10 w-10` + "No request selected" +
filter-aware hint (ERP:2096-2111); loading = Shimmer scaffold mirroring the final layout (ERP:2062-2094).

### 8b. Mobile DetailSheet (MobileDetailSheet.jsx:36-117)

Composition: `ModalShell size="lg" hideClose ariaLabel={title || eyebrow || 'Details'}` (accessible
name required) with footer = `MobileSheetActions`. Body `space-y-4 px-4 pt-1 pb-4 md:px-6`:

- **Header orb** (48px): `flex h-12 w-12 shrink-0 items-center justify-center rounded-pill
  bg-muted/40` + inline `style={{ color: iconTone, backgroundColor: 'color-mix(in srgb, ${iconTone}
  12%, transparent)' }}`; initials `text-[15px] font-semibold` or `Icon h-5 w-5`; avatar img
  overlay `absolute inset-0 h-full w-full object-cover` hides on error.
- **Eyebrow** `.eyebrow` → **title** `mt-0.5 text-[17px] font-semibold leading-tight text-foreground
  line-clamp-2 break-words` → **status pill** `mt-2 inline-flex rounded-pill px-2.5 py-1 text-[11px]
  font-semibold ${statusPill.className}`.
- **VitalTrack** (lifecycle) when `vital` present — from `resolveVital(domain, status)`.
- **Islands** then optional children (gated extras).

**Island tile (MobileDetailIslands.jsx:21-95):**

```js
const TILE_CLASS  = 'flex items-center gap-3 rounded-button bg-background/30 p-3';
const PRESS_CLASS = 'w-full text-left transition-transform duration-200 active:scale-[0.96]';
// icon well: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-muted/28 text-muted-foreground' (Icon size 15)
// label: .eyebrow · value: 'mt-1 block truncate text-sm font-semibold text-foreground' (fallback 'Not set')
```

Variants: static `div`; `href` → `<a rel="noopener" target={_blank for http(s)}>` + trailing
`ArrowUpRight size={14} text-muted-foreground/60` (tel:/mailto:/maps deep links); `onPress` →
`<button>` + trailing `ChevronRight size={14}`. Falsy items skipped → conditional facts drop out
cleanly. **Copy-chip island pattern** (ME:666-674 / MV:523-531): Reference island `onPress` writes
`display_id || id` to clipboard + `triggerFromEvent(event, { variant: SUCCESS, color:
'hsl(var(--spark))', haptic: true, sound: true })`.

Mobile action chain mirrors desktop 1:1 (ME:585-628): same priority, same gates, tones from
vitalTracks accents (`dispatch hsl(200 98% 39%)` sky · `complete hsl(162 94% 24%)` emerald ·
`retry hsl(26 90% 37%)` amber · `review hsl(var(--destructive))`); every extra closes the sheet
then routes to the page receiver — no new mutation paths.

Provenance: sheet spine `7953a3b3` + `c5a16e25` (2026-07-08); interactive islands `8d260ddc`;
full-record sheet + gated actions `c0f4473d`; day-aware stamps + copy reference `574968fd`.

---

## 9. Loading kit

### SKELETON_WARMUP_MS idiom (ME:44-48, 230-272; MT:54-58; MV:34-38 — identical in all three)

```js
const SKELETON_WARMUP_MS = 400;                 // forced skeleton on EVERY mount (covers cached bottom-nav mounts)
const [warmingUp, setWarmingUp] = useState(true);
useEffect(() => { const t = setTimeout(() => setWarmingUp(false), SKELETON_WARMUP_MS); return () => clearTimeout(t); }, []);
const showSkeleton = warmingUp || (loading && displayItems.length === 0);   // list pages
const showSkeleton = warmingUp || Boolean(loading) || !today;               // dashboard (MT:284)
```

Mobile-only: desktop keeps instant paint on a warm cache (MPS §1.6 "loading truth").

### Group-shaped skeletons (replace-in-place)

Skeletons mirror the REAL layout 1:1 so content replaces them with zero jump — same panel class,
same row rhythm, same hairline inset. List recipe (MobileRequestsListSkeleton ME:173-201 /
MobileVisitsListSkeleton MV:105-136): header row `flex items-center justify-between px-1 pb-2.5`
with `h-[13px] w-24 rounded-pill bg-muted/25 shimmer` + `h-[13px] w-5`; panel `rounded-inner
bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5`; row = `h-10 w-10 rounded-pill
bg-muted/25 shimmer` orb + `h-[15px] w-2/5` and `h-3 w-3/5` bars + trailing `h-6 w-14` pill;
hairline `h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]` between rows; `aria-hidden="true"`.
Dashboard recipe (MobileTodaySkeleton MT:99-157) mirrors hero bars + 2-up `surface-card
min-h-[72px]` tiles + sheet panel with `h-12 rounded-button` CTA bar + rows with `ml-[56px]` inset.

Desktop primitives (ERP:2427-2439): `Shimmer` = `block animate-pulse bg-muted/38
dark:bg-white/[0.055]`; `RequestSkeletonRows` = 7 × `h-[80px] rounded-card`; KPI skeleton
(ERP:1709-1728), signal skeleton (ERP:1673-1678), rail skeleton (ERP:2062-2094) — every region has
a shape-matched scaffold, "no bare dots". Mobile `.shimmer` utility = animated gradient
(index.css:774-781).

### UpdatingPill — exact markup (ME:400-406; MV:388-394; MT:334-338)

```jsx
<div className="mt-4 flex items-center justify-end px-2">        {/* list pages; Today anchors it in the status row */}
  {isFetching && !showSkeleton && (
    <span role="status" aria-live="polite" className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
      Updating
    </span>
  )}
</div>
```

**isFetching derivation.** React Query pages: `placeholderData: (prev) => prev` keeps `loading`
false on refetch — `isFetching` from the query hook is the ONLY signal (useEmergencyQuery;
ERP:615-623). PageData-fed pages: `isFetching = !hasLoading && domains.some((d) =>
domainFetching?.[d])` (TH:954). Desktop counterpart = the ACTIVE KPI chip's Loader2 glyph swap
(§2a) + toolbar RefreshCw spin; pagination disables on `loading || isFetching`.

**Replace-in-place rules (MOTION canon; ERP:1610-1613, ME:423-433).** The skeleton holds the exact
final layout; content swaps in a single commit. NO entrance translate/stagger/fade-from-blank on
data regions (a fade runs from blank on cached mounts = the banned top-to-bottom load).
`layout="position"` only for reflow. Chrome renders immediately (`MobilePageShell
animatePageLoad={false}`, contentClassName `relative min-h-[calc(100dvh-3rem)] overflow-hidden
px-0 pb-32 pt-8 text-foreground`). Load-more sentinel (ME:501-510): `flex min-h-[64px] items-center
justify-center` — in-flight `MobileListLoadingMore` (local spinner, may coexist with the global
Updating pill), idle `MobileListLoadMore` (`armed` two-step via `useLoadMoreControl`), exhausted
`MobileListEnd`. List identity kept stable during loads via `useStableList(items, loading)`.

Provenance: warm-up `7adc1521`; replace-in-place + hairline `d89db0f6`; Updating pill `574968fd`
(base `15acf6c9`); dashboard skeleton `d3d0487d`; Visits donor `2f499403`.

---

## 10. Elevation + tokens table

### Neutral elevation ladder (MPS §0; verified against gold-page usage)

| Tier | Exact string | Where seen |
|---|---|---|
| e1 resting | `shadow-[0_1px_3px_rgb(0_0_0/0.05)]` | small tiles (MPS §0; rare in gold pages) |
| e2 raised | `shadow-[0_4px_12px_rgb(0_0_0/0.07)]` | status pills, tone chips, hovered rows, revealed pills (ERP:166+, TH:829) |
| e2-strong (CTA) | `shadow-[0_6px_16px_rgb(0_0_0/0.12)]` | solid CTAs, selected rows, rail primaries (ERP:483-488, 797, 1941; TH:868) |
| e2-lift (tiles ONLY) | `shadow-[0_16px_38px_rgb(0_0_0/0.08)]` | Today glance + KPI tiles at rest (TH:710, ERP:160) |
| e3 floating | `shadow-[0_12px_32px_rgb(0_0_0/0.10)]` | sheets, rails, panels, module rail (ERP:1535, 2166; TH:845) |

No colored glows on desktop; the two sanctioned colored shadows are the mobile filled-CTA glow
`0 8px 18px ${tone / 0.30}` (MobileSheetActions:32,57) / `shadow-[0_8px_18px_hsl(var(--foreground)/0.18)]`
(MT:404), and the mobile destructive banner `shadow-[0_18px_54px_rgba(239,68,68,0.10)]` (ME:410, MV:563).

### Surface tokens (index.css:489-523; MDS §2)

| Tier | Value | Use |
|---|---|---|
| GROUND | `bg-background` | page + sheet/modal base |
| RAISED | `.surface-card` = `hsl(var(--foreground)/0.05)` light / `hsl(0 0% 100%/0.07)` dark | cards, chips, islands (mobile) |
| Grouped panel (mobile) | `bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl` | recency panels (ME:448) — near-identical to .surface-card + blur; adoption sweep pending |
| GLASS (chrome) | `.chrome-glass` (bg `--chrome-glass`, blur 24px, saturate 180%, `--chrome-float`) / `.chrome-glass-strong` (blur 36px) | floating chrome ONLY |
| Desktop sheet glass | `bg-card/68 backdrop-blur-2xl dark:bg-card/50` (handled sheet) · `bg-card/78 backdrop-blur-2xl dark:bg-card/55` (rail) | ERP:1535, 2166 |
| Recessed inset | `bg-background/55 dark:bg-white/[0.05]` | rail/sheet hero pane (ERP:2170, TH:849) |
| Fill-film card | `bg-foreground/[0.045] dark:bg-white/[0.055]` | DetailLine rows (ERP:2322) |
| HAIRLINE | `h-px bg-[hsl(var(--muted-foreground)/0.08)]` + inset `ml-[62px]` (40px orb) / `ml-[56px]` (36px orb) | intra-group separators only |
| Scrim | `bg-black/[0.46] backdrop-blur-sm` | ModalShell backdrop |

### Radii ladder (index.css:220-227 → tailwind.config.js:15-22)

`rounded-sheet 44px · rounded-modal 38px · rounded-card 30px · rounded-inner 22px · rounded-button
20px · rounded-icon 14px · rounded-pill 999px` (+ `squircle` alias 1.75rem). Directional variants
allowed (`rounded-t-sheet`). NEVER `rounded-xl/2xl/full/[Npx]`. Semantic pick: squircle
(`rounded-icon/card`) = tiles you act on; circle (`rounded-pill`) = people/status markers in content.

### Canonical status tones

Single source: `constants/vitalTracks.js` (commit `4ace945d`). `EMERGENCY_STATUS_TONES`
(vitalTracks:58-66): `pending_approval/payment_declined → destructive · accepted → cyan · arrived
→ sky · in_progress → amber · completed → emerald · cancelled → slate`. TONES table
(vitalTracks:37-49) — each tone has `hex` (VitalTrack nodes), `accent` (space-separated hsl for
alpha injection), `pill` (Tailwind classes):

| tone | hex | accent | pill |
|---|---|---|---|
| cyan | `#0891B2` | `hsl(192 91% 36%)` | `bg-cyan-500/10 text-cyan-700 dark:text-cyan-200` |
| amber | `#B45309` | `hsl(26 90% 37%)` | `bg-amber-500/10 text-amber-700 dark:text-amber-200` |
| emerald | `#047857` | `hsl(162 94% 24%)` | `bg-emerald-500/10 text-emerald-700 dark:text-emerald-200` |
| sky | `#0284C7` | `hsl(200 98% 39%)` | `bg-sky-500/10 text-sky-700 dark:text-sky-200` |
| slate | `#64748B` | `hsl(215 16% 47%)` | `bg-muted/34 text-muted-foreground` |
| destructive | `#EF4444` | `hsl(0 84% 60%)` | `bg-destructive/14 text-destructive` |

Desktop still holds local mirrors (`statusStyles` ERP:163-193, `getRequestAvatarClass` ERP:279-300,
`REQUEST_STAGE_FILL` ERP:242-249) — per the vitalTracks header comment, desktop consumes
EMERGENCY_STATUS_TONES "next desktop batch"; the canon component library should read vitalTracks
directly. `resolveVital(domain, status)` → `{ steps, currentKey, cancelled, tone(hex),
accent(hsl), pill }`; `statusPill(status)` is the keyword fallback for lifecycle-less domains.

### Gutters + layout constants

- Mobile: page gutter `px-4`; shell content `px-0 pb-32 pt-8`; page rhythm `space-y-3` (list) /
  `space-y-8` (dashboard); group rhythm `space-y-[18px]`; KPI rail `px-4 py-3`.
- Desktop workspace (ERP:1522): `px-4 pb-8 pt-20 sm:px-5 md:pt-24 lg:h-[calc(100dvh-3rem)]
  lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28` + `gap-5`; rail width
  `lg:w-[380px] xl:w-[440px]`; min heights `min-h-[calc(100dvh-3rem)]`.
- Route feedback delay `routeFeedbackMs = 320` (TH:28, ERP:71); search debounce 300ms;
  `SKELETON_WARMUP_MS = 400`; scroll cooldown 180ms (KPI rail); load-more observer
  `{ threshold: 0.1, rootMargin: '120px' }`.

### Type scale (as observed)

| Role | Recipe |
|---|---|
| Desktop hero | `text-[34px] font-semibold leading-[1.05] tracking-tight md:text-6xl` |
| Mobile page title / hero | `text-2xl font-semibold leading-tight tracking-tight` |
| Sheet/rail title | `text-xl font-semibold tracking-tight` (TH sheet adds `md:text-2xl`); mobile sheet record title `text-[17px] font-semibold leading-tight line-clamp-2` |
| Row identity | `text-[15px] font-medium leading-5` (mobile) / `text-[15px] font-semibold` (desktop) — token `.text-identity` = 14px (size only) |
| Meta line | `text-xs leading-[17px] text-muted-foreground` — token `.text-meta` = 12px |
| Trailing time | `text-xs leading-[15px] font-bold tabular-nums` |
| Group header | `text-[13px] font-bold leading-[17px] text-muted-foreground` (+ count `/60 tabular-nums`) |
| Eyebrow | `.eyebrow` = 10px / 600 / uppercase / `var(--tracking-eyebrow)` (0.14em) / muted-foreground — detail furniture ONLY, never section subheadings |
| Grid/table header | `text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground` |
| Tile label | `text-[10px] font-medium sm:text-[11px]` (desktop) / `text-[11px] font-medium` (mobile), sentence case |
| KPI count | `text-2xl font-semibold tracking-normal text-foreground`; numeric chips add `tabular-nums font-dashboard-numbers` |
| Status pill | `text-xs font-semibold` px-3 py-1 (desktop) / `text-[11px] font-bold` px-2.5 py-[5px] (mobile row) / `text-[11px] font-semibold` px-2.5 py-1 (sheet/pill) |

DISCREPANCY (prose vs code, code wins): MDS §1 flags `mobileMotion.js` as off-canon ease
`[0.22,1,0.36,1]` — stale; code is `[0.21,0.47,0.32,0.98]` + spring 168/30/0.9 since `1d899ecc`.
MDS elevation row (`card 0 22px 64px /0.14`) does not match gold pages — use the e-ladder above.
MPS §0 "no hairlines ever" is desktop-scoped; the mobile hairline (MDS amendment 2026-07-09) is canon.

---

## 11. Feedback kit (haptics / burst / opening feedback)

### triggerFromEvent variants per interaction (FeedbackContext.jsx:6-39; usage in gold pages)

| Interaction | Call |
|---|---|
| Row tap / navigation press | `{ variant: FEEDBACK_TYPES.CLICK, haptic: true, sound: true }` (rows fire on `onPointerDown`) |
| Filter sheet open / row expand-toggle | `{ variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true }` |
| Stats/analytics open | `{ variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--foreground))', haptic: true, sound: true }` |
| KPI chip select (new) | `{ variant: FEEDBACK_TYPES.SUCCESS, color: kpi.color, haptic: true, sound: true }` |
| KPI chip re-tap (toggle-to-All) | `{ variant: FEEDBACK_TYPES.INFO, color: kpi.color, ... }` (MobileKPIStrip:36-41) |
| Copy-to-clipboard island | `{ variant: FEEDBACK_TYPES.SUCCESS, color: 'hsl(var(--spark))', haptic: true, sound: true }` |
| Empty-state recover / load-more | `{ variant: FEEDBACK_TYPES.INFO or CLICK, color: 'hsl(var(--spark))' / 'hsl(var(--primary))', ... }` (MobileListStates:66-71, 128-135) |

`FEEDBACK_TYPES = { CLICK, SUCCESS, INFO, WARNING, DESTRUCTIVE }`; each variant carries its own
particle palette, haptic pattern (`click [4]`, `success [5]`, `warning [4,8,4]`, `destructive
[5,10,4]`) and soft-pop oscillator config; haptics are throttled to one per 260ms.

### Press values (canon — mobileMotion.js:48-57, commit `1d899ecc`)

`mobileMotion.press = { control: { scale: 0.96 }, card: { scale: 0.988 } }` · spring
`{ stiffness: 168, damping: 30, mass: 0.9 }` · ease `[0.21, 0.47, 0.32, 0.98]` · durations
`quick 0.16 / base 0.2 / reveal 0.22 / linger 0.3`.

### Opening-feedback pattern (route actions — TH:1054-1066 / MT:196-256 / ERP:573-582)

```js
const routeFeedbackMs = 320;
const [routingPath, setRoutingPath] = useState(null);
const handleAction = useCallback((path) => {
  if (!path) return;
  if (routingPath) return;                    // first click wins — no double navigation
  setRoutingPath(path);
  routeTimerRef.current = window.setTimeout(() => {
    navigate(path);
    setRoutingPath(null);                     // same-route navigations don't unmount — reset
  }, routeFeedbackMs);
}, [navigate, routingPath]);
```

Every route-triggering control renders the acknowledgement in place:
`data-state={isOpening ? 'opening' : 'idle'}` + glyph swap `ArrowRight → Loader2 h-3.5/h-4
animate-spin` + label swap to `'Opening...'` + `aria-label` gains `', opening'` (TH:827-833,
866-872; MT:186, 244-250). Mutation buttons do the same with `isPending` (disabled + Loader2 in
place of the action icon; toasts with stable ids).

Provenance: opening feedback `15acf6c9`; first-click-wins + timer cleanup `d128487b`; mobile
haptic wiring `fcb6e6dc` / `d3d0487d`.

---

## Proposed component inventory

| # | Component | Source recipe (verbatim from) | Consumers to migrate |
|---|---|---|---|
| 1 | `HeadingRegion` / `SignalHero` (desktop) | TH:729-777 + ERP:1665-1706 (§1, §3) | Hospitals, Doctors, Ambulances, Users, Insurance, Subscriptions, Organizations, Pricing, Verification, Visits, SupportTickets, HealthNews, Wallet pages |
| 2 | `GlanceTileDesktop` (nav) / `KpiTileDesktop` (filter) | TH:695-727 / ERP:1708-1772 (§1, §2a) | same desktop set; DashboardPanel glance tiles |
| 3 | `selectPrimaryKpis` + `KpiStripDesktop` | ERP:155-161, 426-470, 1708-1772 (§2a) | every desktop data page's chip strip |
| 4 | `MobileKPIStrip` (exists — keep; feed colors from vitalTracks) | MobileKPIStrip.jsx + MV:49-59 (§2b) | MobileEmergency (hardcoded hues → vitalTracks), all MobileX list pages |
| 5 | `MobileHeading` (title + honest count line) | ME:311-322 / MV:300-311 (§1) | all MobileX pages |
| 6 | `GroupedList` / `GroupPanel` / `MobileListRow` | ME:437-498 / MV:415-438, 596-633 (§4) | MobileHospitals, MobileDoctors, MobileAmbulances, MobileUsers, MobileWallet, MobileSupportTickets, MobileHealthNews, MobileVerification, MobileInsurance, MobileSubscriptions |
| 7 | `SearchRow` (mobile) + `Toolbar` (desktop) + `useSearchDraft(300)` | ME:335-394 / ERP:1806-1862 (§5) | every list surface, both platforms |
| 8 | `Buttons` set: `QuietCTA`, `HeaderAction` (text-foreground baked in), `RailPrimary`, `RailActionButton`, `PillAction`, `RowActionPill`, `QuietDestructive` | §6 table | all pages; kills the ca6548b3 contrast-trap class |
| 9 | `DataGrid` kit: grid-cols contract, `ListHeader`, `SortableColumnHeader` (aria-sort), `SelectAllCheckbox` + shift-range hook, `BulkActionBar` wiring | ERP:1864-2035, 920-1032 (§7) | Users (already close), Hospitals, Doctors, Visits, Insurance, Subscriptions, Organizations, Pricing |
| 10 | `DetailRail` shell + `DetailLine` + `CopyChip` + `StageStrip` + `getPrimaryAction` contract | ERP:2037-2425 (§8a) | every desktop data page's rail |
| 11 | `MobileDetailSheet` + `MobileDetailIslands` + `MobileSheetActions` (exist — canonical as-is) | §8b | keep; migrate any page still opening inline dropdowns |
| 12 | `LoadingKit`: `Shimmer`, `SkeletonRows`, group-shaped skeleton factory, `UpdatingPill`, `useSkeletonWarmup(400)` | §9 | every page; replace bespoke skeletons |
| 13 | `vitalTracks` (exists — single status-tone truth) | constants/vitalTracks.js (§10) | EmergencyRequestsPage desktop local maps (statusStyles / avatarClass / STAGE_FILL) → consume EMERGENCY_STATUS_TONES |
| 14 | `FeedbackKit`: `triggerFromEvent` variant map + `useOpeningFeedback(320)` | §11 | every navigation/mutation control |
| 15 | `AtlasLayer` factory (per-page tinted backdrop) | ERP:490-509 / TH:672-693 / MV:61-80 | every page (sanctioned ambient brand tint) |

## Tokens to add (extraction backlog)

```
--shadow-e1:        0 1px 3px rgb(0 0 0 / 0.05);
--shadow-e2:        0 4px 12px rgb(0 0 0 / 0.07);
--shadow-e2-strong: 0 6px 16px rgb(0 0 0 / 0.12);
--shadow-e2-lift:   0 16px 38px rgb(0 0 0 / 0.08);    /* glance/KPI tiles only */
--shadow-e3:        0 12px 32px rgb(0 0 0 / 0.10);
--shadow-cta-glow:  0 8px 18px;                        /* compose with tone/0.30 (mobile filled CTA) */
--hairline:         hsl(var(--muted-foreground) / 0.08);
--hairline-inset:   62px;                              /* 40px orb rows; 56px for 36px orbs */
--rail-w:           380px;  --rail-w-xl: 440px;
--tile-min-h:       66px;                              /* desktop Today tile */  (mobile glance: 72px)
--row-min-h:        80px;                              /* desktop RequestRow */
--focus-ring-desktop: 0 0 0 2px hsl(var(--foreground) / 0.22);
--focus-ring-mobile:  0 0 0 3px hsl(var(--primary) / 0.18);
--scrim:            rgb(0 0 0 / 0.46);                 /* + backdrop-blur-sm */
JS constants to centralize: SKELETON_WARMUP_MS = 400 · SEARCH_DEBOUNCE_MS = 300 ·
ROUTE_FEEDBACK_MS = 320 · SCROLL_COOLDOWN_MS = 180 · LOAD_MORE_ROOT_MARGIN = '120px' ·
HAPTIC_THROTTLE_MS = 260.
Unify: DetailLine label tracking 0.16em → var(--tracking-eyebrow) (0.14em).
```

---
*Extraction pass 2026-07-09. Line numbers refer to the working tree at branch
`codex/ivisit-console-revamp-checkpoint-20260707` (HEAD `fd241724`). Provenance commits are from
`git log -S` on the named fragments; `15acf6c9` (2026-07-06) is the revamp checkpoint that seeded
most desktop recipes.*
