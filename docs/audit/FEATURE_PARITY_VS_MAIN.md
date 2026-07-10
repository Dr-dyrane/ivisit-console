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

### Addendum 2026-07-09 — Hospitals vs Requests/Visits donor-parity matrix (mobile lane)

Requested comparison "navbar to bottombar, sidebar, modals, side effects, data-sync, RBAC":

| Anatomy | Requests (donor) | Hospitals verdict |
|---|---|---|
| Navbar (SmartTopNav) | context-aware avatar/back | Shell-level, identical — no gap. |
| Bottom bar | dock morph + '/' New-request FAB | Morph verified live (4th pill = Hospitals). FAB hidden via `usePageShell({hideFab})` — CORRECT: create is fail-closed by gate, so no FAB is the honest state. |
| KPI strip ↔ list sync | status-agnostic stats | Was date-BLIND: the sheet's "Registered On" filter was DEAD (offered since intake, never read by `applyHospitalFilters`). FIXED: donor-identical `date_from`/`date_to` mapping, applied to list AND stats so counts match the window. Busy was also missing from the sheet's status options — added. |
| Degraded/error states | mobile banner + retry + honest empty | Mobile had NONE (`hospitalPageError` stopped at desktop). FIXED: `mobile-hospitals-degraded-state` banner + retry + error-aware empty copy. |
| Detail surface | sheet → Details modal | Sheet (this rebuild) + `?id` deep link opens the view modal on both form factors — parity. |
| Realtime | route-owned channel → RQ invalidate | Present; UpdatingPillRow now signals it on mobile. |
| Toasts/side effects | stable ids, fail-closed notices | "Add facility is unavailable" toast preserved; edit writes via RQ mutation. |
| RBAC | provider+ | `/hospitals` minRole is **org_admin** (CLAUDE.md table said admin — corrected); `canManage = isAdmin || isOrgAdmin`; RLS scopes org rows; lower personas never see the route (dock is role-gated). |
| Sidebar / right panel | — | Desktop lane's claim (HospitalsPanel route-context cleaned 2026-07-06); out of mobile scope. |

**Data-sync sweep (schema vs rendered):** newly surfaced on the sheet — facility `type`
(row label + eyebrow), `icu_beds_available`, `emergency_wait_time_minutes`/`wait_time`
(positive-only; 0 reads as default-unset), eligibility flags (`emergency/dispatch/booking`),
`last_availability_update` freshness ("5d ago"), `specialties` chips (cap 4 + overflow).
Deliberately NOT surfaced: `base_price`/`price_range` (Pricing command authority gated),
`image` (storage/consent unproved), `bed_availability`/`ambulance_availability` Json blobs
(parser discipline — shape unproved), `organization_id`/`org_admin_id` (org identity is
Page 15's blocked domain).

---

## Ambulances (mobile) — PRE-REBUILD changelog, audited 2026-07-09

### Commit changelog (since `main` baseline)
| Commit | What it did to MobileAmbulances |
|---|---|
| `f31f29ff` (= main) | 457 ln. Dropdown pseudo-sheets, FeaturedMetric + fake `growthData` + `'LIVE'` trends + `toDeltaBadge` deltas, client-side `filteredAmbulances`, selection + delete wired. |
| `15acf6c9` checkpoint | The mass-revamp commit (−146): killed the dishonest block + client filtering; delete/selection gated. |
| `f586f1a0`/`ece759d1`/`4ecba364`/`03aa4587`/`69986ab2` | Borderless canon, DS parity, labelTone cleanup, one-voice, batch-A sweep. |

### Drops — all intentional and pinned
Dishonest metrics block: BANNED by pins (`not.toContain` MobileFeaturedMetric/growthData/
chartData/filteredAmbulances/`trend: 'LIVE'`/avgRating). Delete: BANNED harder than Hospitals
(`not.toContain('onDelete')`, `not.toContain('Trash2')`) per the gate row — destructive
delete, driver assignment, media upload, and active-trip commands stay excluded until
receiver proof. Edit is the only surviving command (canManage). **Unintentional: none.**

### Rebuild targets applied (Wave-2 grammar — NOT the Hospitals GroupPanel pilot; hold order respected)
1. Dropdown pseudo-sheet -> MobileDetailSheet; SearchRow (300ms debounce + clear-x it
   lacked; aria-labels preserved via entityLabel/statsLabel — pins migrated same-commit);
   useSkeletonWarmup + UpdatingPillRow; skeleton-gated, error-aware empty state.
2. Mobile error surface: `ambulancePageError` reached only the desktop sheet — mobile now
   gets errorMessage + onRetry (degraded banner `mobile-ambulances-degraded-state`).
3. Data-sync (schema carried it, UI ignored it): `display_id` as Unit ID (labels rule —
   truncated UUID only as fallback), `vehicle_label` (license_plate || vehicle_number)
   as Vehicle island + at-rest row secondary, `current_call` as a read-only Active-call
   reference (a LABEL, not a link — the Requests page has no `?id` receiver to deep-link
   into; noted as a future cross-page affordance if Requests grows one), ETA promoted to
   the row secondary while on a run.
4. Deliberately NOT surfaced: `crew` Json (parser discipline — shape unproved),
   `location` PostGIS blob (unlike hospitals' scalar lat/lng), `base_price` (Pricing
   command authority gated), `profile_id` (driver identity needs a name-join receiver;
   enrichment candidate recorded, service change deferred to avoid the desktop lane's
   in-flight service work).

### Hospitals (mobile) — CLOSE-OUT, 2026-07-10

**Live click-test matrix (all verified on the running app, mobile viewport):**
search debounce + clear-x + server commit ✓ · KPI chips filter + scope-aware heading count
("1417 hospitals" under Available) ✓ · "Registered On" date filter END-TO-END through the
sheet UI (2020 range → "0 hospitals", filtered-empty, Reset Filters recovery, trigger
data-state=filtered) ✓ · filter trigger open/filtered/idle truth ✓ · load-more ACCUMULATES
(21→40; arm → scroll-to-load grammar) ✓ · scope-change placeholder poisoning fixed +
re-verified (no-match search → honest empty, recover → full list) ✓ · capacity-first panels
with real data (5 reporting / 15 silent) ✓ · detail sheet: all islands, tel:/maps hrefs,
display_id label ✓ · `?id` deep link with a DISPLAY_ID (HSP-42ECCF → CMH Subhan view modal
auto-open; F12 round-trip fear unfounded for live rows) ✓ · degraded banner + error-aware
empty ✓ · dock left-pill + FAB grammar, FAB → facility approvals queue with Facilities tab
preselect ✓ · fail-closed create toast preserved (desktop pill + ?add=true) ✓.

**Open items, with owners (none block the mobile close):**
desktop navbar working-actions redistribution + panel native quick actions (arbitration #2 —
desktop lane, ledgered) · donor accumulator placeholder-poisoning port to MobileVisits/
MobileEmergency + kit useScopeAccumulator extraction (mobile lane, next page-scope window) ·
onboarding phantom columns (baselined data-contract debt) · one transient: a mid-edit HMR
chunk of the lane's dirty HospitalModal crashed the page during testing (ReferenceError:
isCreate) — clean tree reproduces nothing; noted per Lesson 4, their commit gate owns it.

**Verdict: mobile Hospitals CLOSED.** Zero unintentional baseline drops (pre-rebuild
changelog), grammar-conformant (LIST + directory expression, locked in DS §5), data-fitted
rows, every control click-tested, all pins green.

---

## Ambulances (mobile) — HARNESS-DRIVEN close, 2026-07-10

Built as the harness test ("use the next page to test if the harness works"). Promoted
list-migrating → list; `check-mobile-grammar.js` emitted the exact to-do (heading /
grouped panel / group skeleton / drop metric rail / accumulator) and this composed to it.

**The test found + fixed THREE real bugs (the harness earning its keep):**
1. **Linter false-pass** — `group` check matched "GroupPanel" in a COMMENT → now strips
   comments + matches rendered `<Tag`. Added a declared-waiver mechanism
   (`// grammar:<key>=<reason>`) so page-local equivalents (Emergency's inline search +
   local skeleton, Today's inline hero) pass with a documented reason, strict otherwise.
2. **Accumulator load-more REPLACE bug** — Gate-1's deterministic Node check caught the
   `provisional`-flag accumulator silently REBUILDING on the first same-scope page
   (load-more replaced page 1 with page 2). Replaced with a provably-correct rule
   (append non-empty same-scope pages; clear only on a settled-empty response). 5/5
   invariants pass. **The live click-test on Hospitals did NOT surface this** — its render
   timing masked it; the deterministic harness is stricter. → **Hospitals carries the
   identical buggy accumulator; flagged for the same fix.**

### Gate 1 — behavioral matrix — LIVE-VERIFIED 2026-07-10
The OS-window resize would not move `innerWidth` (stuck 1920) and the preview browser had no
auth session, so the mobile fork was forced by overriding `window.innerWidth=390` + firing a
`resize` event on the AUTHENTICATED browser — mounting the REAL MobileAmbulances with REAL
data (behavioral reads are DOM, not pixels; a legitimate fork-forcing technique, not faked
data). Every invariant driven live:
- **scope-count** — "Ready 322" chip → heading "322 units", not the raw 326 (the exact
  invariant that was broken on Hospitals) ✓
- **load-more APPENDS** — 20→40 rows, 40 unique ids, zero duplicates, page-1 unit D-AMB-1
  still present alongside page-2 (genuine append, not replace — the fix holds live) ✓
- **placeholder-poisoning guard** — "zzzqqnomatch" → 0 rows + "No units match" + Clear Search
  (not stale rows under a heading) → Clear → 20 back ✓
- **filter-trigger truth** — data-state idle → open (sheet renders) ✓
- **station grouping** — live headers (Fulcare Hospital Limited, Jaber Al Ahmad Armed Forces
  Hospital, CMH Subhan…) ✓
- **row scenting** — "D-AMB-1 · BLS · COV-GUES-1 · Jun 30 · Ready" (call_sign / type·vehicle /
  freshness / status pill) ✓
- **detail sheet** — tap → BLS eyebrow, station, vehicle COV-GUES-1, Unit ID AMB-E45E86
  (display_id label, not raw UUID) ✓
- Deterministic Node harness (the accumulator invariants) also 5/5 — it CAUGHT the load-more
  replace bug the earlier Hospitals click-test had missed.

### Gate 2 — data-fitting
Rows scented to fleet data (confirmed against the live desktop rail: D-AMB-5 / Natural Medicine
Clinics / COV-GUES-5 / BLS / Ready): call_sign identity, `type · vehicle` meta (station is the
group header, not repeated per row), ETA-on-run / freshness-at-rest trailing. Not surfaced:
crew (Json), location (PostGIS), base_price (Pricing-gated).

**Verdict: mobile Ambulances CLOSED (list directory grammar).** Static harness DROVE the
build; deterministic behavioral harness CAUGHT a bug the live loop missed. Net: the harness
works — and got sharper from the test.
