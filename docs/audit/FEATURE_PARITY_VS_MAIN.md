# Feature parity vs `main` — the post-revamp drop audit

> Standing per-page step (user decision 2026-07-09): after a page's revamp lands, diff the
> page family against `main` (= the preservation baseline `f31f29f`) at the FEATURE level to
> catch anything dropped unintentionally, and put every intentional drop on the record.
>
> Method (cheap, identifier-level):
> ```bash
> git show main:frontend/<file> | grep -oE "const handle[A-Za-z]+|CustomEvent\('[a-zA-Z]+'\)|export (async )?(function|const) [a-zA-Z]+|aria-label=\"[^\"]+\"" | sort -u > /tmp/main_ids
> grep -oE "<same>" <file> | sort -u > /tmp/head_ids
> comm -23 /tmp/main_ids /tmp/head_ids   # in main, gone from HEAD -> classify each
> ```
> Classify every disappearance as INTENTIONAL (cite the contract pin / ledger row / arbitration)
> or UNINTENTIONAL (fix it). A drop with no citation is unintentional by definition.

---

## Visits (Page 7) — audited 2026-07-09, post both-lane revamp

Files diffed: `VisitsPage.jsx`, `MobileVisits.jsx`, `VisitModal.jsx`,
`visitsService.js` (HEAD `5e905c18`-era vs `main`/`f31f29f`).

### Dropped INTENTIONALLY (all cited)
| What (from main) | Why / where recorded |
|---|---|
| `handleDelete`, `handleBulkDelete`, `handleSelect`, `handleSelectAll` | Fail-closed writes: no delete/bulk on Visits. Contract-pinned (`canDelete={false}`, `selectionEnabled={false}`, `not.toContain('<BulkActionBar')`) + ledger row-104 shared contract item 4. |
| ViewToggle + `<VisitListView>`/`<VisitTableView>` renders | §1.5 one-canonical-render conversion, "Explicitly converted 2026-07-09" comment in `VisitsPage.contract.test.js`; legacy views retained unimported as chrome-lint targets. |
| Static chip aria-labels ("Filter by scheduled visits" etc.) | Superseded, not lost: chips now render via the shared `console/KpiStrip`, which bakes `aria-pressed` + `aria-label={label}: {count}` (richer than main's). |

### Dropped UNINTENTIONALLY
**None found** at identifier level (handlers, events, exports, aria-labels) across the four files.

### Added since main (highlights)
`getVisitsPageData` single projection · keyboard list nav (`handleListKeyDown`) ·
clear-search / statistics a11y labels on mobile · the console DS components
(`KpiStrip`/`SignalPanel`/`ActivitySheet`/`WorkspaceStage`) composed on the page.

### Verdict
PASS — zero unintentional drops. Every removal is contract-pinned or ledgered.

---

## Requests (Page 2) — audited 2026-07-09, retroactive (the gold-standard page itself)

Files diffed: `EmergencyRequestsPage.jsx`, `MobileEmergency.jsx`, `EmergencyDetailsModal.jsx`,
`EmergencyRequestModal.jsx`, `emergencyService.js` vs `main`/`f31f29f`.

### Dropped INTENTIONALLY (all verified replaced or cited)
| What (from main) | Why / where recorded |
|---|---|
| `handleBulkDelete`, `handleSelect` | Converted, not dropped: destructive bulk DELETE became fail-closed bulk CANCEL — `handleToggleSelect`/`handleSelectAll`/`handleBulkCancel` live at page:940/969/1022 with stable toast ids; "removes mobile destructive shortcuts" is contract-pinned. |
| Static chip aria-labels ("Filter by pending requests" etc.) | Superseded: chips carry `aria-label={label}: {count}` (page:1752) — richer than main's. |
| "Create new emergency request" / "Filter emergency requests" labels | Relabeled with the page's rename to "Requests": "Create new request" / "Filter requests" (page:780/798). |

### Dropped UNINTENTIONALLY
**None found.** MobileEmergency, both modals, and emergencyService lost zero identifiers.

### Verdict
PASS — zero unintentional drops. The reference page holds its own bar.

---

## Hospitals (mobile) — PRE-REBUILD changelog, audited 2026-07-09

> User decision 2026-07-09: "a mass revamp never works because each page has its perks and
> features dropped mistakenly" — so the changelog comes FIRST, then the rebuild. This section
> is the understanding pass for `MobileHospitals.jsx` before its kit re-composition.

### Commit changelog (15 commits total; the 5 since the `main` baseline)
| Commit | What it did to MobileHospitals |
|---|---|
| `f31f29ff` (= main, baseline) | 448 ln. Dropdown-row pseudo-sheets (`expandedContent`), apple-glass chrome, FAKE `growthData` sparklines `[32,44,51,49,61,69]`, `'LIVE'` trend labels, `statistics?.previous` delta badges, client-side `filteredHospitals` (name/address search + kpi filter), MobileFeaturedMetric ("Network Capacity"/"Avg Rating"...) + "Operations Pulse" rail, Beds/Fleet KPIs, selection + schedule + delete all wired. |
| `15acf6c9` checkpoint ("preserve console revamp gate work") | THE mass-revamp commit: −146/+89. Killed the dishonest block (FeaturedMetric, growthData, LIVE, delta badges, avgRating), moved filtering server-side (`handleStatusFilter` → `filters.status`), introduced the honest `visibleBeds`/`visibleAmbulances` "This page" rail + Busy/Full KPIs. Kept the dropdown grammar. |
| `2b90369f` | Borderless canon (border-0 purge, page+views+panel+mobile). |
| `bbcbaa21` | DS parity: canon press, `.eyebrow`, opaque content, apple-glass removed. |
| `03aa4587` | One-voice micro-drift collapse (glass alias + control press). |
| `69986ab2` | Batch-A facility-cluster sweep (~69 mechanical parity fixes). |

### Dropped INTENTIONALLY (all cited)
| What (from main) | Why / where recorded |
|---|---|
| `growthData`, `chartData`, `'LIVE'`, `calcDeltaPercent`/`toDeltaBadge` trends, MobileFeaturedMetric, "Avg Rating"/"Network Capacity"/"Operations Pulse" | Dishonest (fake sparkline; deltas fed by `statistics.previous` that no service supplies). BANNED by contract pins: `not.toContain` growthData/chartData/'LIVE'/formatSignedPercent/calcDeltaPercent/toDeltaBadge/MobileFeaturedMetric. |
| `filteredHospitals` client-side search/filter | Replaced, not lost: server-side via `handleStatusFilter` + page-owned search filters. Pinned both ways (`not.toContain('filteredHospitals')`, `toContain('handleStatusFilter')`). |
| Beds/Fleet KPI-strip entries | Moved to the rail as honest "Visible Beds"/"Visible Fleet" ("This page" scope) — pinned. Busy/Full KPIs added in their place. |
| Selection, bulk, delete, schedule ACTIVATION | Fail-closed BY DESIGN, not dropped: component keeps the inventory (`canDelete && onDelete`, `onSchedule && (` — both contract-pinned) but the page passes `canDelete={false}`, `selectionEnabled={false}`, no `onDelete`/`onSchedule`/`onSelect`. Gate ledger row: Hospitals "Create, scheduling, storage upload, destructive delete, staff scheduling, contact, and reservation lifecycle actions remain unavailable/read-only until receiver proof". |

### Dropped UNINTENTIONALLY
**None found** at identifier level. The checkpoint's big deletion was the dishonest-metrics
block plus grammar swaps, all pinned or replaced.

### Current gaps → rebuild targets (structure / UX / data-sync)
1. **Structure:** dropdown-row pseudo-sheet (`expandedContent`/`isExpanded`/`onExpand`) — the
   estate's last-but-two inline-expand page. Canon = tap opens `MobileDetailSheet` (Doctors/
   Insurance/Subscriptions grammar). No contract pin blocks the conversion.
2. **UX:** inline search recipe (no 300ms debounce, no clear-x) → kit `SearchRow`; no
   `useSkeletonWarmup` (cached bottom-nav mounts skip skeleton-first); `isBuffering` not even
   destructured → no `UpdatingPillRow` refetch signal; empty state not skeleton-gated.
3. **Data-sync (available but unrendered / mis-rendered):**
   - `display_id` (ORG-XXXXXX) exists on rows via the service's displayIds map, but the row
     detail shows a truncated raw UUID `#{id.slice(0,12)}` — violates "Display IDs are labels".
   - `phone` is on every row (modal edits it) — never rendered; DetailSheet island with `tel:`
     href (MobileDetailIslands supports href; Emergency precedent).
   - `latitude`/`longitude` on rows — address island gets a maps deep-link
     (`https://maps.google.com/?q=lat,lng`, Emergency precedent; address-text fallback).
   - `total_beds` on rows — only `available_beds` is shown; occupancy reads "X of Y available".
4. **Chrome:** `bg-white/[0.02]` islands in expanded content are invisible in light mode —
   dies with the DetailSheet conversion. `rightBlade` decorative badge → readable secondary
   line (Pricing precedent: the defining numbers ride the secondary line, not a blade).

### Verdict
Baseline drops: all intentional and cited. The rebuild is grammar + kit + native-data work,
NOT feature restoration — with three genuine data-sync upgrades (display_id, tel:, maps/occupancy).
