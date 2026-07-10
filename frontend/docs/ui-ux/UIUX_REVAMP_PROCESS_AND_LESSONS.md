# UI/UX Revamp — Process & Lessons

> Living doc for the desktop UI/UX revamp lane. Started 2026-07-08.
> Canon references: [`MANAGEMENT_PAGE_STANDARDS.md`](MANAGEMENT_PAGE_STANDARDS.md) (§0 canon, §1.5 data-render),
> [`CONSOLE_DESIGN_SYSTEM_FROM_APP.md`](../design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md) (ivisit-app parity),
> [`PAGE_REVAMP_GATE.md`](../planning/PAGE_REVAMP_GATE.md) (locks),
> data-sync queue: [`DATA_SYNC_REMEDIATION_AUDIT.md`](../database/DATA_SYNC_REMEDIATION_AUDIT.md).

---

## The per-page loop (design → data-sync check → click test)

For **every page** we finish designing, before calling it done:

1. **Design to canon.** Borderless, canonical squircle radii, no red except `--destructive`, the
   reduced HIG elevation scale, ivisit-app surface language. One canonical render (no ViewToggle).
2. **Data-sync check.** Prove `source column → service → hook → UI` for every read/write on the page:
   - Every `.order()`, `.eq()`, `.select()`, `.in()` column MUST exist as a real scalar in
     `src/types/database.ts` (the truth). JSON sub-fields (e.g. `patient_snapshot`) can be *read*
     but **cannot be `.order()`ed / `.eq()`ed** directly.
   - Run the data-contract guardrail: `node scripts/check-data-contract.js`.
   - Validate live when unsure: `supabase db query --linked` (read-only, boundary-safe) — never
     trust static assumptions over the live schema or the user's empirical knowledge.
3. **Click test.** Exercise **every interactive control** and confirm it works (or is honestly
   gated): KPI/state chips (each filter), **sortable column headers** (each one — this is where the
   `requester_name` bug hid), row focus → detail rail, every detail-rail action, pagination
   prev/next, search, filter sheet, every modal open/submit/close. A control that can't work yet
   must be disabled with a reason, never a dead click.
4. **Queue, don't derail.** Any data-sync defect found → log it in `DATA_SYNC_REMEDIATION_AUDIT.md`
   (with symptom, root cause, evidence paths, fix direction) and keep moving on UI/UX. Fix data-sync
   in its own pass.
5. **Verify + commit — run the full gate stack, not just the page suite.**
   - `CI=true npx craco test <page>.contract.test.js src/components/console/ConsoleDesignSystem.contract.test.js --watchAll=false` — the page suite **and** the estate laws (colored-shadow + the **donor-mechanism registry**, below).
   - `node scripts/check-ui-surface-hardgate.js --strict-radius` (no borders/rings/rogue radii).
   - `node scripts/check-data-contract.js` (no phantom columns).
   - `npm run check:mojibake` / encoding.
   - `node scripts/donor-diff.js <donorPage> <thisPage> --universe <console/* used>` — mechanical token diff; every missing donor token must be either DS-composed (in the universe) or an enumerated domain delta.
   - Live compile (preview server) or `craco build`. Commit scoped files only.
   - **The donor-mechanism registry (the completeness backstop).** `ConsoleDesignSystem.contract`
     enforces that every **list-workspace surface** (renders a `SortableColumnHeader`) carries each
     load-bearing donor mechanism — `selection`, `keyboard-nav`, `scroll-reset`,
     `honest-failed-hero`, `arrival-toast`, `deep-link` — **or** records a cited exclusion
     (`<slug> excluded by decision: <ref>`). This is the gate that catches a mechanism a NEW
     adoption *silently omits* (per-page pins can't — they only protect decisions already made;
     the Hospitals table shipped with no select triggers and nothing went red until a user caught
     it). Adopting a list page? Wire all six or write the marker. Register a new mechanism by
     adding a row to `MECHANISMS` with its presence signature and the drop that motivated it.
     Composition-satisfied mechanisms (debounce, updating-pill, drag handle — baked into
     `ActivitySheet`/`SheetToolbar`) are deliberately NOT in the registry: composing the component
     IS the guarantee.
6. **Main-parity drop audit (user decision 2026-07-09).** After the revamp lands, diff the page
   family against `main` (= preservation baseline `f31f29f`) at the FEATURE level — handlers,
   window events, service exports, aria-labels — and classify EVERY disappearance as intentional
   (cite the contract pin / ledger row / arbitration) or unintentional (fix it). A drop with no
   citation is unintentional by definition. Method + per-page records:
   `docs/audit/FEATURE_PARITY_VS_MAIN.md` (repo root). Visits passed 2026-07-09 with zero
   unintentional drops.

---

## Lessons (durable)

1. **Test runner.** Always `CI=true npx craco test <file> --watchAll=false`. Raw `npx jest` bypasses
   the CRA/babel transform → `SyntaxError: Cannot use import statement outside a module` and
   `0 tests`. "0 total / parse error" means wrong runner, not a real failure.
2. **Reduced HIG elevation scale.** Depth comes from translucent material (`backdrop-blur`) + tone,
   not heavy diffuse shadows. Three neutral tiers: **e1** `shadow-[0_1px_3px_rgb(0_0_0/0.05)]`,
   **e2** `shadow-[0_4px_12px_rgb(0_0_0/0.07)]`, **e2-strong (CTA)** `shadow-[0_6px_16px_rgb(0_0_0/0.12)]`,
   **e3 (floating)** `shadow-[0_12px_32px_rgb(0_0_0/0.10)]`. No colored glows, no `0_24px_70px`-class.
3. **The red-token trap.** `primary` / `secondary` / `success` / `warning` / `info` ALL resolve to
   red in this theme. Never use them for color. Non-danger → literal palette (sky/emerald/amber/
   rose/violet/cyan) or neutral; only `--destructive` for genuine danger. Colors aren't caught by
   the hardgate — only rendered proof / grep catches a stray red. Recurring fixes this session:
   step tracker, payment-declined card, live dot, focus ring, mobile 'All' chip.
4. **Concurrent-lane discipline.** A second agent lane edits the working tree. Never edit a
   lane-owned **uncommitted** file (`git status` shows `M`) — including test files. Transient
   contract-test failures come from the lane rewriting a file *mid-run*; re-run to confirm before
   diagnosing. Commit only your own scoped files. Check the claim log: `tools/automation/revamp-queue.md`.
   The lane also **commits interleaved** onto the shared branch (its commits land *between* yours —
   e.g. its `413f17cf` filter-sheet fix appeared mid-session). Before committing a shared file,
   `git status` it: if the lane already committed its change the file reads clean, so path-limit
   `git add <file>` (**never `git add -A`**) and verify `git show --stat HEAD` lists only *your* files.
   If the lane's change is still uncommitted and tangled with yours in one file, stash *just that path*
   (`git stash push -- <file>`), make your edit, commit, `git stash pop`. Leave foreign stashes alone.
5. **Contract-pin discipline.** When you legitimately change a pinned string (a class, a signature),
   update the pin — but ONLY in a test file that is clean/yours, never a lane-owned (`M`) test. If a
   lane-owned test pins something your source change breaks, make the source compatible or report;
   do not edit their test. **Run the contract suite after touching ANY pinned file** — a value change
   (`/0.18 → /0.08`) or removing an element a pin references silently reds a `toContain`, and
   parse/mojibake/hardgate do NOT catch it. Update the pin in the **same commit** as the source change:
   this session left the Emergency contract red across *two* commits by verifying only parse+mojibake+
   hardgate and skipping `--testPathPattern="contract.test"`.
6. **Never leak raw DB errors to users.** Route error states show a friendly generic message
   ("… did not load. Try again.") and log the raw error to console only. Surfacing Postgres/SQL text
   is both a UX defect and an info leak.
7. **Canon changes are locked, not just written.** A UI/UX decision becomes canon by (a) documenting
   it in the readable canon (`MANAGEMENT_PAGE_STANDARDS.md`) and (b) locking it with a contract-test
   assertion (the `PAGE_REVAMP_GATE.md` + `PageRevampGate.contract.test.js` pattern).
8. **Parallelize with agents on isolated files.** Independent UI work (e.g. NotificationCenter vs
   the Requests KPI strip) fans out cleanly to subagents; keep commits in the parent (sequential) to
   avoid `.git/index.lock` races with the concurrent lane. For a study/redesign: fan out *read-only*
   study agents (e.g. one on the app's card component, one on its tokens) in parallel, then a build
   agent per isolated file — the parent verifies + commits.

### Mobile lessons

9. **Surface differentiation is FILL/elevation, never shadow (Apple HIG).** iOS grouped lists make the
   *group container* the surface (rounded, translucent/elevated); rows are **transparent**, separated
   only by a slate **hairline** (`bg-[hsl(var(--muted-foreground)/0.08)]`, indented `ml-[62px]` past
   the orb) — not per-row cards, borders, or shadows. (Hairline alpha is canon `/0.08` — a whisper;
   see lesson 16. Its *size* is `h-px` = 1px, already the thinnest real line — obviousness is the
   alpha, never the height.) Root trap: our `--card` is **inverted in dark**
   (`0 0% 3%` is *darker* than `--background` `224 41% 7%`) and only ~2% off in light, so cards can't
   separate by fill → we leaned on shadows. Fix at the token (elevated surface must be *lighter than
   the ground in both modes*); until then use mode-aware fills (`bg-card` light / `dark:bg-white/[0.06–0.08]`
   film). **Do NOT recolor the page background to fake separation** (that was explicitly rejected).
10. **Match the app's real components, not a re-interpretation.** The mobile list-card canon comes
    from ivisit-app `components/map/history` (`MapHistoryGroup`/`MapHistoryRow`): **recency-bucket**
    grouping (Active now → Upcoming → Today → Yesterday → This week → … → Older), a frosted group panel
    over the map holding transparent rows, and row anatomy: orb (type-tint) · title 15–16/500 ·
    `{type} · {date}` 12/500 · trailing time 12/700 + status pill (by status, 11/700) + chevron. Read
    the sibling repo (`../ivisit-app`) *before* designing a surface — don't invent one.
11. **Deterministic mobile gutter = ONE value, shared by content AND chrome.** The gutter is the app's
    page content padding: **`px-4` (16px)** — header, KPI/chips rail, search, group panels, nav bar
    (`left-4/right-4`), dock. Rows nest to **`px-2` (8px) INSIDE** the group panel (the app's model:
    page 16 → panel → row 8). Two traps that cost rounds: (a) `MobilePageShell` shipped a `px-1` that
    fought pages' `px-0` contentClassName (equal specificity → ambiguous cascade) — removed it so the
    gutter is per-page/deterministic; (b) fixed chrome **stacked two insets** — the header had `left-4`
    (position) *and* an `animate paddingLeft: 12` (padding) → the left section landed at 28px while
    content sat at 16px. Flat chrome = position to the gutter, **ZERO padding**; grep the `animate`/`style`
    for padding, not just `className`. (Promote the gutter to one token in the joint token pass.)
12. **Flatten single-child wrappers; top padding = nav-row height.** Redundant container divs (the nav
    back-button LEFT group once the avatar moved right; the frosted search-toolbar wrapper) add DOM +
    inset for nothing — remove them and let elements sit directly. Skip micro `-ml` optical nudges on
    the chevron — one made it *worse* (reversed); fix the real inset instead. Page top padding = the
    *nav-row height* (~`pt-8`), not more.
13. **Motion + icons.** Entrance = opacity fade + `layout="position"` (position-only reflow) — **never
    scale**: full framer `layout` and a `staggerFadeIn` `scale(0.95)` cause the ugly card "skew" on
    load/reorder. Press 0.96 controls / 0.988 cards; tap ripple only. Icons must match intent + the app
    set: stats/analytics = `BarChart3` (not `Info`); a "new-X" FAB = `Plus` (not `ClipboardCheck`).

### Mobile debugging — when you can't render, MEASURE (this page cost many rounds)

14. **Struggle:** Emergency's nav alignment + card surface-diff took ~8 iterations of guess-and-check.
    Root cause of the thrash: **I cannot screenshot a true mobile viewport** (the browser clamps to
    ~1500px), so I kept *inferring* pixel geometry from source and getting it wrong (px-2 vs px-3 vs
    px-4; left-2 vs left-3 vs left-4; a `-ml-1` chevron nudge that pulled the *wrong* way; a page-bg
    recolor the user rejected; light cards that looked identical to the bg). **Approach that actually
    worked — three tools, use them FIRST next time:**
    - **Debug outlines + a user screenshot.** Add `outline outline-1 outline-<distinct-color>` to each
      element of the suspect region (uncommitted), ask the user to screenshot, read the geometry off the
      colored boxes, then revert. This exposed the nav **double-padding** (`left-4` + `animate paddingLeft:12`)
      in one shot — after rounds of blind guessing. A screenshot from the user is worth 5 guessed edits.
    - **Read the source app for exact values, don't intuit.** `../ivisit-app` gave the real grouped-list
      structure and the token/spacing scale (4px grid; page content 16–24px; rows 8px). Guessing ended
      the moment I read `MapHistoryGroup`/`history.theme.js`.
    - **Numeric contrast diff for surface tokens.** Compute L (lightness) of card-vs-ground per mode
      before picking a fill. Dark card = white film → +7% lift (visible); a white light card over a 98%
      ground = +1.4% (invisible). You can't lift above a near-white ground, so match dark's delta with a
      *recessing* film (`bg-foreground/[0.06]`, ~−6%). Measure, don't eyeball.
    - **Meta:** when a fix needs a value you can't see, escalate to the user with a screenshot + concrete
      options, or read the source — do NOT ship successive blind tweaks. Each blind round burns a turn.

### Mobile — loading & mount motion (the skeleton saga, 2026-07-09)

15. **A top-to-bottom entrance IS the "skew" — go skeleton-first, replace-in-place; never fade from blank.**
    We chased a "skew on load" for several commits. It was not a transform bug (that was lesson 13); it
    was the **entrance model itself**. Progression that finally converged:
    - A staggered *translate* reveal (title → KPI → search → list rising in on an index delay) is, by
      definition, motion **sweeping down the page** — so even a clean canon stagger (`getMobilePageStageMotion`)
      reads as the cascade. **Don't stage-reveal a data page.**
    - Native/iOS model instead: a **skeleton holds the EXACT final layout**, then content **replaces it in
      place** — no translate, no per-row stagger. Mirror the real component **1:1** so the swap has *zero*
      layout jump (`MobileRequestsListSkeleton` clones the recency panel — same frosted panel, row rhythm,
      hairline, `ml-[62px]` inset). Animate the *container in*, **never the rows** (per-row is the skew).
    - **Fade-from-blank is a trap.** An `initial:{opacity:0}` on the list runs *from nothing* when the data
      is already present (cached mounts), hiding then revealing it → looks like a load/cascade. On a
      skeleton→content swap the *same* fade is invisible. Resolution: **no fade at all** — an instant swap
      is seamless when the skeleton layout is identical. If you want a materialize, cross-fade *from the
      skeleton*, not from blank.
16. **Navigation ≠ reload: it's the cache/auth branch, not the animation — force skeleton-first on every
    mount + gate the whole page on ONE flag.** Symptom the user nailed: "skews when I navigate via the
    bottom pill, but a hard refresh is fine." Same page, two load paths:
    - **Reload** = `authReady` false + empty React Query cache → `loading` true, query disabled → `showSkeleton`
      true → skeleton path (looked fine). **Bottom-nav navigation** = auth already resolved (context persists)
      + list **cached** → `loading` false *with data present* → `showSkeleton` false → skeleton **skipped** →
      cached content assembles top-to-bottom. `loading = !authReady || queryLoading` is the tell.
    - Fix (a): a short forced **mount warm-up** — `const [warmingUp,setWarmingUp]=useState(true)` +
      `setTimeout(()=>setWarmingUp(false), SKELETON_WARMUP_MS≈400)`, and `showSkeleton = warmingUp || (loading
      && !items)`. Now EVERY entry shows the skeleton first, then reveals in one commit → navigation matches
      refresh. (Named, tunable constant — don't bury a magic number.)
    - Fix (b): gate the **whole page's** loading on that one `showSkeleton`, **not raw `loading`** — pass
      `loading={showSkeleton}` to the KPI strip and gate the summary text on it too. Otherwise you get real
      KPI chips + a live "5 requests" count sitting *over* a skeleton list (chips-over-skeleton mismatch).
    - **Meta:** when a load "feels different depending on how you got to the page," suspect the cache/auth
      gating and which loading branch each path hits — not the motion curve.

### Desktop — live verification & canon maturity (2026-07-09)

17. **The live-verification loop catches what code review can't — connect the browser BEFORE
    calling a page done.** Chrome-MCP loop: edit → hot-reload → screenshot → commit. One session
    caught: a page mid-entrance looking broken (sheet at opacity-0 for 3+ seconds — the code read
    said 0.4s), a **renderer freeze** (30s CDP timeout on the main thread), theme-flip repaint
    transients (the rail "stuck dark" for a beat — NOT a bug), and colour-in-context misses (the
    "Needs attention" chip rendered amber because the HERO'S TONE was 'warning' — the danger CLASS
    fix alone changed nothing; you only see the tone-vs-class distinction rendered). Timing rule:
    screenshot at t≈0 AND settled — the t≈0 frame is the loading-truth evidence.
18. **Brand expression ≠ state colour — audits must not strip atlas glows.** "No red except
    danger" governs UI ELEMENTS (chips/pills/buttons/text). Page ATLAS/backdrop brand tints
    (`--primary/0.08–0.13`, Requests' `--destructive` stage stripes) are sanctioned ambient brand
    expression — stripping Today's glow "took the life out of the page" (user) and was reverted +
    canonized (MANAGEMENT_PAGE_STANDARDS colour section). State colours sit ON TOP of the
    atmosphere; both rules coexist.
19. **Scout the lane's live position before reworking ANYTHING shared** — `git status` the target
    + its test, `git log -3 -- <file>`, and read the working-tree state, in the SAME turn you plan.
    A planned "big rework" (Today load-sequence) turned out to be the other lane's in-flight work:
    the upstream contract had just landed (additive `domainFetching`), the consumer wiring was
    appearing in the working tree mid-conversation. The right move was pivoting to docs + letting
    convergence happen — not diff-fighting a file that changes under you. Corollary: a file that
    was clean an hour ago is not clean now until re-checked.
20. **A reviewer's canon-purity finding can be a user's brand feature — surface, don't auto-fix,
    taste calls.** The atlas de-red was applied as an approved batch item and still got reverted on
    sight. For anything that changes a page's FEELING (atmosphere, signature shadows like e2-lift,
    motion character), ship it behind a rendered before/after for the user, or expect the revert.
    The canon now encodes both user overrides (e2-lift tier, ambient brand tint) so future audits
    inherit the taste decisions instead of re-fighting them.
21. **Squircle vs circle is semantic (HIG), not decorative — ask "tile or entity-marker?"**
    The user flagged the sidebar-footer avatar as a *perfect* squircle where reflex says circle:
    the "you" avatar in nav is an app-icon-like ENTRY POINT (→ `rounded-icon` squircle), while
    other people's avatars in data rows are entity-markers (→ `rounded-pill` circle, Messages-
    style). Audit found exactly one miss (SmartHeader mobile account button, circle → squircle).
    Full rule in MANAGEMENT_PAGE_STANDARDS §0. When implementing, don't pattern-match "avatar =
    circle" — pattern-match the ROLE.
22. **A responsive fork that measures in an effect ships a wrong first frame — lazy-init from the
    real viewport.** `NavigationContext` held `isMobile` as `useState(false)` and measured in a
    `useEffect`, so EVERY mobile mount rendered one frame of the DESKTOP tree first — its entrance
    animations *started*, then the `isMobile` fork swapped in the mobile surface mid-animation.
    The user saw it as "stacking/skew as the skeleton mounts" on Today, and it silently affected
    every `isMobile`-forked page (Requests included). Two compounding fixes, both needed: (a)
    lazy-init the breakpoint state from `window.innerWidth` (`useState(() => ...)`, `typeof window`
    guard for tests/SSR) so frame one is correct; (b) the desktop tree must ALSO obey motion canon
    §3 (TodayHome still carried the banned `y:12` + delayed `y:18+scale` stage-reveal — flagged in
    the audit as M1/T4 but on neither lane's completed list; an "already flagged" finding is not a
    fixed finding). Debug heuristic: when a mount animation appears on a surface whose own code has
    no entrance motion, suspect the FORK rendering the other platform's tree for a frame.
23. **Persona passes are part of the page loop — and derive persona signals from EXISTING data
    before reaching for schema.** The user's driver test ("a provider with driver status") exposed
    Today serving drivers a visits-first hero ("No visits · Clear") during live dispatches. Two
    rules: (a) walk every page AS each role *and sub-persona* (driver, dispatcher, unattached
    responder…) — their hero, first action, data scope, dead ends; (b) the persona signal usually
    already exists — `profiles.provider_type === 'driver'` was live in ambulancesService/GodModeMap;
    promoting it (AuthContext `isDriver()`, roleKind `driver`, the Requests "Mine" chip via
    `responder_id = me`) needed ZERO schema change. Grep services/utils for the signal before
    queueing a migration. Convergence note: both lanes independently built the driver Today lens
    within the hour — persona gaps are that visible once you look.
24. **RBAC UI method (noted from the mobile lane, 2026-07-09 — the canon for persona fixes).**
    The mobile session's response to the persona findings, now the reference method
    (`docs/rbac/PERSONA_MATRIX_2026-07-09.md` is the canonical matrix):
    (a) **Census before fixes** — measure live population per persona and weight investment by it
    (812 users = 368 doctors + 367 drivers + 57 operators; sponsor 0, dispatcher 0 → deferred, not
    fixed). A critical-looking gap for a zero-population persona is a queue entry, not a fix.
    (b) **Reframe > grant** — when the UI promises authority the backend denies (org_admin
    approvals), fix the COPY to describe real capability; granting authority is a separate
    command-authority decision argued against backend truth (INSURANCE_COMMAND_AUTHORITY pattern).
    (c) **Delete dead permissions rather than "activating" them** — the dispatcher `can()` grant
    was provably unreachable and `dispatcher` is not a legal role/provider_type; it was removed,
    not wired up.
    (d) **Fold sub-personas into shared lenses** — responder provider types (`driver`, `paramedic`,
    `ambulance`, `ambulance_service`) share ONE dispatch-first lens; no per-type lenses. Keep every
    resolver on the same equivalence list (TodayHome `useRoleKind`, mobile `RESPONDER_PROVIDER_TYPES`,
    AuthContext `isDriver()`).
    (e) **Fix vocabulary at the writer** — UserModal's provider-type dropdown offered illegal
    (`nurse`, bounced off the DB CHECK) and mismatched (bare `ambulance` vs consumed
    `ambulance_service`) values; the assignable set now matches what consumers query.
    (f) **Per-role nav slates live in config with dead-tap prevention** — every slate slot must
    survive the routes.jsx gate (sponsor/viewer lost Map slots that landed on /unauthorized);
    each exclusion carries a comment citing the gate that would bounce it.
25. **DONOR PARITY IS THE DEFAULT — converting a page to the gold standard means adopting the
    donor's ENTIRE anatomy, then writing the intentional-divergence list.** The Visits conversion
    shipped canon-clean innards (chips, rows, rail recipe) but missed the STAGE — no atlas
    backdrop, no wayfinding dock, wrong rail width/radius, no keyboard nav, no failed-empty
    states, no CopyChip/stage-strip, no arrival toast. The user had to say "there is a reason we
    use the Requests page as an example — compare everything so I don't microinstruct." The rule:
    before calling a conversion done, diff it against the donor across this checklist and either
    ADOPT (copy the donor's classes/structure verbatim) or RECORD the divergence with its reason
    in the gate ledger. **Checklist:** (1) macro stage — atlas layer, ConsoleModuleRail dock,
    full-bleed flex, content column, rail width/height/radius; (2) signal panel — signature,
    shimmer skeleton, loadError honest hero, min-heights; (3) KPI strip — smart-select, tile
    classes, live-chip refetch spinner; (4) toolbar — debounced search, refresh, Filters
    (aria-haspopup/expanded), primary command; (5) count row — loading/failed/normal triplet +
    Updating pill; (6) list container — scroll ref, tabIndex, aria-label, keyboard nav
    (arrows/Enter/Escape), page-change scroll reset; (7) rows — grid cols, min-height, toned
    avatar, pill shadows, hover/selected states, double-click, right-click focus, aria-pressed;
    (8) states — page-shaped skeleton, filter-aware empty, failed-empty card, partial-failure
    banner; (9) rail — container spec, drag handle, heading + id + CopyChip, status pill + icon,
    lifecycle stage strip, S1.4 inset hero + film rows, action button classes, locked-actions
    line; (10) realtime — refetch wiring + INSERT arrival toast (throttled); (11) a11y sweep of
    every aria the donor carries. Divergences must be *arguable from the domain* (Visits: no
    bulk-select/cancel — fail-closed; no Mine chip — responders excluded from Visits entirely;
    no payment/cash chips or reverse geocode — visits carry neither; View/Edit-only rail —
    terminal outcomes locked), never from omission.

26. **Why the fine details keep needing the user's eyes — the agent's real constraints, named,
    and their countermeasures.** After the Visits conversion, the user had to point out (in
    sequence): the missing stage, the header command placement, the "Details" row-action label,
    two-letter initials, row selection, the filter-trigger context states, and finally Visits
    EXCEEDING the canon with five sortable headers. Each survived a checklist, a design system,
    contract tests, and screenshots. The honest failure modes:
    (a) **Sampled reading.** The donor is ~2400 lines; it gets read in grep-sized fragments and
    synthesized from fragments + memory. Anything not sampled is invisible — and "fine things"
    live precisely in the unsampled gaps. *Countermeasure:* a parity pass diffs the donor's FULL
    element inventory (every element, prop, aria-*, data-*, label string, class), not a category
    checklist; build the inventory first, then tick it. A `scripts/donor-diff` style extractor is
    the harness-grade version — candidate next tool.
    (b) **Compaction salience loss.** Session summaries preserve decisions ("width matters") but
    not their *salience distribution* — which details the user bled over. *Countermeasure:* the
    Decision Trail (DS doc) + `git log --follow` on the donor BEFORE converting; the trail is the
    salience record.
    (c) **Abstraction bias.** Comparison happens at named-concept level (rail, strip, toolbar);
    deltas without a name in the checklist don't register (initials arity, a label string, a
    data-state vocabulary). *Countermeasure:* same as (a) — mechanical enumeration beats
    conceptual comparison.
    (d) **Directional blindness.** "Adopt what the donor has" is additive-only; nothing asked
    "what does this page have that the donor DELIBERATELY lacks?" — so superset drift (5 sortable
    headers vs the canon's 1) was invisible. *Countermeasure:* every parity pass runs BOTH
    directions: missing AND exceeding.
    (e) **Pinned-test circularity.** Contract tests verify what got pinned, and what gets pinned
    is what was already thought of — green suites feel like "done" but only re-confirm the
    author's blind spots. *Countermeasure:* pins lock decisions AFTER they're found; finding them
    needs (a)/(d). The DS is the structural fix — once both pages render from ONE component there
    is nothing left to compare (every miss lived in page-local composition the DS didn't yet own).
    (f) **Single-state screenshots.** One default-state screenshot per page; fine things live in
    states (scrolled header, hover, admin vs provider, filtered). The header-command miss survived
    because the header was scroll-hidden in the frame reviewed. *Countermeasure:* the rendered
    proof is a state MATRIX (default + scrolled + admin + filtered + dark), donor and consumer
    side by side.
    (g) **Components travel without their usage grammar.** `SortableColumnHeader` was extracted
    from the donor and then used five times where the donor uses it ONCE — the restraint lived in
    a donor comment next to the usage, not in the component. *Countermeasure:* extracting a
    component means extracting its usage constraints into the DS doc's component table; a
    component without a "when NOT to use it" entry is half-extracted.

---

## donor-diff (the Lesson 26 harness tool)

`scripts/donor-diff.js` is the mechanical element-inventory diff promised in Lesson 26 --
it kills (a) sampled reading (it enumerates the donor's FULL inventory, no grep-sized
sampling) and (d) directional blindness (it always reports BOTH directions; superset
drift is drift).

```
node scripts/donor-diff.js <donorFile> <consumerFile> [--universe fileA,fileB,...] [--git-base <ref>] [--strict]
```

- Either file may be a git spec `ref:path` (repo-root-relative, `git show` semantics),
  e.g. `45bc5d8f~1:frontend/src/components/mobile/MobileVisits.jsx`.
- `--universe a,b,c` -- the kit files a page composes; they count as part of the consumer
  for the MISSING direction only (a shared kit legitimately holds more than one donor).
- `--git-base <ref>` -- read the donor from a ref when the donor arg is a plain path:
  `node scripts/donor-diff.js src/X.jsx src/X.jsx --git-base HEAD~2` compares a file's
  own past vs present (fidelity re-composition check).
- `--strict` -- non-zero exit when the donor-missing list is non-empty (report-only otherwise).

Inventory categories: className tokens (quoted strings, template static parts, AND bare
class-string consts/object values), aria-* names + static values, data-* names (including
ones carried as string literals like `dataAttr="data-mobile-visit-row"`), JSX PascalCase
components, and visible strings (JSX text + `label`/`title`/`placeholder`/`aria-label`/any
`*Label` prop statics, compared by VALUE so a prop rename that keeps the user-visible
string is parity).

**The loop MANDATES running it at two points:**
1. **Donor-parity passes** (Lesson 25) -- donor = the gold-standard page (Requests),
   consumer = the converted page + its `--universe` kit files. Every MISSING item is
   adopt-or-record-divergence; every EXCEEDING item is a superset-drift check (the
   five-sortable-headers class of miss).
2. **Fidelity re-compositions** (a page re-built to compose the kit, zero visual drift
   intended) -- donor = the file's own pre-recomposition ref, consumer = the new file,
   `--universe` = the kit it now composes. Expect ZERO missing className tokens; residual
   aria/visible misses are the static-to-dynamic moves (``aria-label={`Filter ${entityLabel}`}``)
   to verify by eye.

Reference run (the verified-by-hand MobileVisits re-composition, reports 0 missing classes):

```
node scripts/donor-diff.js "45bc5d8f~1:frontend/src/components/mobile/MobileVisits.jsx" \
  frontend/src/components/mobile/MobileVisits.jsx \
  --universe frontend/src/components/mobile/canon/GroupedList.jsx,frontend/src/components/mobile/canon/Loading.jsx,frontend/src/components/mobile/canon/SearchRow.jsx,frontend/src/components/mobile/canon/MobileHero.jsx,frontend/src/components/mobile/canon/Tap.jsx,frontend/src/components/mobile/canon/constants.js
```

The tool surfaces candidates; the human ticks them. It cannot see dynamically-assembled
strings, spread props, or rendered state -- it replaces the SAMPLING, not the judgment.

---

## The mobile harness — static + behavioral (born 2026-07-10, the Hospitals close-out)

Hospitals shipped **8 canon failures under a full green suite** — the gates were all static
(mojibake/hardgate/data-contract/pinned-strings) and blind to GRAMMAR conformance and
DATA-fitting; worse, a contract pin locked the metric rail that VIOLATED the LIST grammar
(Lesson 26e made concrete). The gap is closed by two pieces that split cleanly:

1. **`scripts/check-mobile-grammar.js` (STATIC).** A page-type grammar linter: every
   `Mobile*.jsx` needs a manifest entry (unclassified = fatal, so a NEW page can't ship
   without a conscious `list`/`dashboard`/`list-migrating`/`exempt` declaration). `list`
   pages MUST have heading + SearchRow + grouped panel + group-shaped skeleton + warm-up +
   Updating pill, and MUST NOT carry `MobileSecondaryMetricRail`/`MobileFeaturedMetric`
   (glance tiles are DASHBOARD-only). Bans the off-grammar CLASS, not one pinned instance
   (kills Lesson 26d/e). Wired into `npm run build`; `:strict` makes debt warnings fatal.
   It self-flagged the MobileEmergency load-more-without-accumulator on first run.
2. **`docs/ui-ux/MOBILE_PAGE_CLOSE_CHECKLIST.md` (BEHAVIORAL).** The runtime invariants no
   static tool can see — count=active-scope, load-more APPENDS, placeholder poisoning,
   filter-state truth, skeleton-on-both-load-paths, data-fitted rows (which FIELD to
   render). Driven on the LIVE page per close, recorded in `FEATURE_PARITY_VS_MAIN.md`.

**The loop now:** Gate 0 static (grammar linter + donor-diff + contract/mojibake/hardgate)
→ Gate 1 behavioral matrix (live) → Gate 2 data-fitting → Gate 3 record+close. Static for
structure, driven-live for behavior and data-fit; neither alone caught Hospitals.

---

## Data-sync issues found while doing UI/UX (queue pointer)

Logged in `DATA_SYNC_REMEDIATION_AUDIT.md` §9+ as they surface. Current:
- **`emergency_requests.requester_name` does not exist** — Person-column sort crashes the Requests
  list; raw SQL leaked to UI. (§9, 2026-07-08.)
