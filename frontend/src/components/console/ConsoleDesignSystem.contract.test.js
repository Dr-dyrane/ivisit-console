import fs from 'fs';

// Console design system contract: the architecture rules the user kept having to
// repeat now live in components and are LOCKED here. If a rule needs to change,
// it changes in ONE component + this test -- never by a page drifting.
describe('Console design system contract', () => {
  const read = (p) => fs.readFileSync(p, 'utf8');
  const tailwind = () => read('tailwind.config.js');
  const primitives = () => read('src/components/console/primitives.jsx');
  const kpiStrip = () => read('src/components/console/KpiStrip.jsx');
  const glanceTile = () => read('src/components/console/GlanceTile.jsx');
  const signalPanel = () => read('src/components/console/SignalPanel.jsx');
  const activitySheet = () => read('src/components/console/ActivitySheet.jsx');
  const workspaceStage = () => read('src/components/console/WorkspaceStage.jsx');
  const keyboardNav = () => read('src/hooks/useListKeyboardNav.js');
  const dayTime = () => read('src/utils/dayTime.js');

  // THE SINGLE REGISTRY of adopted list-workspace pages (page + its paired
  // write-surface modal). Every LIST-scoped estate law below -- the
  // donor-mechanism registry, interaction-completeness, and TIME-only-sort --
  // iterates THIS one array, so a newly-adopted list page is registered ONCE and
  // cannot silently escape a gate. That closes the "green means not-checked" hole
  // a per-gate page list left open (Verification archaeology seam #5, 2026-07-10):
  // three separate maps meant a page forgotten from one silently skipped it.
  // A page listed here MUST render exactly ONE SortableColumnHeader -- the
  // single-shared-list discipline. For a DUAL-QUEUE page (e.g. Approvals:
  // providers|facilities) that means ONE ActivitySheet whose rows swap by queue
  // and ONE shared header, so the mechanisms (one useRowSelection/useListKeyboardNav
  // over the active queue) inherently cover both queues -- NOT two side-by-side
  // lists, which would give two headers (TIME-sort count!==1) and let a mechanism
  // be wired to one queue only (the queue-blind seam). One list = both lanes.
  const LIST_WORKSPACE_PAGES = [
    { name: 'requests', page: 'src/components/pages/EmergencyRequestsPage.jsx', modal: 'src/components/modals/EmergencyRequestModal.jsx' },
    { name: 'visits', page: 'src/components/pages/VisitsPage.jsx', modal: 'src/components/modals/VisitModal.jsx' },
    { name: 'hospitals', page: 'src/components/pages/HospitalsPage.jsx', modal: 'src/components/modals/HospitalModal.jsx' },
    { name: 'ambulances', page: 'src/components/pages/AmbulancesPage.jsx', modal: 'src/components/modals/AmbulanceModal.jsx' },
    // Approvals: a DUAL-QUEUE list page (providers|facilities) composed single-shared-list
    // -- ONE ActivitySheet whose rows swap by queueType, ONE Time header. The paired
    // write-surface is the provider modal; the facility inline write (rail) carries the
    // submit spinner via the page (animate-spin), which the interaction gate accepts.
    { name: 'verificationQueue', page: 'src/components/pages/VerificationQueue.jsx', modal: 'src/components/modals/VerificationModal.jsx' },
    { name: 'doctors', page: 'src/components/pages/DoctorsPage.jsx', modal: 'src/components/modals/DoctorModal.jsx' },
  ];

  const CONSOLE_FILES = () => ({
    primitives: primitives(),
    kpiStrip: kpiStrip(),
    glanceTile: glanceTile(),
    signalPanel: signalPanel(),
    activitySheet: activitySheet(),
    workspaceStage: workspaceStage(),
  });

  it('defines the neutral elevation scale as tailwind tokens', () => {
    const config = tailwind();
    expect(config).toContain("e1: '0 1px 3px rgb(0 0 0 / 0.05)'");
    expect(config).toContain("e2: '0 4px 12px rgb(0 0 0 / 0.07)'");
    expect(config).toContain("'e2-strong': '0 6px 16px rgb(0 0 0 / 0.12)'");
    expect(config).toContain("'e2-lift': '0 16px 38px rgb(0 0 0 / 0.08)'");
    expect(config).toContain("e3: '0 12px 32px rgb(0 0 0 / 0.10)'");
  });

  it('keeps every console component on NEUTRAL shadows -- no colored/bleeding glows', () => {
    for (const [name, src] of Object.entries(CONSOLE_FILES())) {
      // No colored rgb()/rgba()/hsl() inside any shadow utility; the ambient atlas
      // backdrop is a background, not a shadow, and is the only sanctioned tint.
      expect({ name, coloredRgb: /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(src) }).toEqual({ name, coloredRgb: false });
      expect({ name, rgba: /shadow-\[[^\]]*rgba\(/.test(src) }).toEqual({ name, rgba: false });
      // hsl() in a shadow is allowed ONLY on the neutral foreground token (the
      // canonical focus ring); any brand/status-tinted shadow is a bleeding glow.
      expect({ name, tintedHslShadow: /shadow-\[[^\]]*hsl\(var\(--(?!foreground)/.test(src) }).toEqual({ name, tintedHslShadow: false });
      // Arbitrary shadow values are banned in components -- tokens only, except the
      // one sanctioned neutral focus ring.
      expect({ name, arbitraryShadow: /shadow-\[0_(?!0_0_2px_hsl\(var\(--foreground\)\/0\.22\)\])/.test(src) }).toEqual({ name, arbitraryShadow: false });
    }
  });

  it('locks the KPI strip architecture: width, tile spec, smart context, toggle-to-All', () => {
    const src = kpiStrip();
    // THE WIDTH RULE: hero-matched strip, Today-tile grid -- pages cannot change it.
    expect(src).toContain('mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3');
    expect(src).toContain('min-h-[66px] rounded-inner px-3 py-2.5 text-left backdrop-blur-xl');
    expect(src).toContain('sm:px-4 md:py-3');
    expect(src).toContain('shadow-e2-lift');
    // Smart context: pinned-while-signal, count-desc fill, max 3, active always kept.
    expect(src).toContain('const pinned = pinnedIds.filter((id) => getCount(id) > 0)');
    expect(src).toContain('if (chosen.size >= max) break');
    // Re-tapping the active non-All chip returns to All.
    expect(src).toContain("setKpiFilter(active && item.id !== 'all' ? 'all' : item.id)");
    // The active chip's icon swaps to a spinner during background refetches.
    expect(src).toContain('{active && isFetching ? (');
  });

  it('locks the glance tile: the Today nav-tile spec + opening feedback', () => {
    const src = glanceTile();
    // THE Today tile recipe (KPI tiles must match it exactly): squircle,
    // frosted fill, neutral e2-lift at rest, e3 on focus lift.
    expect(src).toContain('group min-h-[66px] cursor-pointer rounded-inner bg-card/65 px-3 py-2.5 text-left shadow-e2-lift backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 hover:bg-card/82 focus-visible:-translate-y-0.5 focus-visible:bg-foreground/10 focus-visible:shadow-e3 active:bg-card/90 disabled:pointer-events-none disabled:opacity-70 dark:bg-white/[0.055] dark:hover:bg-white/[0.085] dark:focus-visible:bg-white/[0.12] sm:px-4 md:py-3');
    expect(src).toContain('whileHover={{ y: -2 }}');
    expect(src).toContain('whileTap={{ scale: 0.98 }}');
    // NAV variant (KpiStrip owns the filter tile): navigating swaps the trailing
    // orb ArrowRight -> Loader2 with an explicit opening state; pathless disables.
    expect(src).toContain('const isOpening = item.path && routingPath === item.path;');
    expect(src).toContain("data-state={isOpening ? 'opening' : 'idle'}");
    expect(src).toContain("aria-label={`${item.label}: ${item.value}${isOpening ? ', opening' : ''}`}");
    expect(src).toContain('{isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}');
    expect(src).toContain('disabled={!item.path}');
    // Anatomy: label over value, min-w-0 column; tone colour on the orb ONLY.
    expect(src).toContain('block text-[10px] font-medium text-muted-foreground sm:text-[11px]');
    expect(src).toContain('mt-1 block text-[13px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-sm');
    expect(src).toContain('group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 ${toneClass}');
    expect(src).toContain('const toneClass = toneClassMap[item.tone] || toneClassMap.muted;');
  });

  it('locks the signal panel architecture: heights, no entrance motion', () => {
    const src = signalPanel();
    expect(src).toContain('min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]');
    expect(src).toContain('text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl');
    // Replace-in-place: the shimmer holds the layout; no framer entrance ever.
    expect(src).not.toContain('framer-motion');
    expect(src).not.toContain('initial={{');
  });

  it('locks the activity sheet + toolbar + row shell architecture', () => {
    const src = activitySheet();
    expect(src).toContain('rounded-t-sheet bg-card/68 p-3 shadow-e3 backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet');
    expect(src).toContain("failedEmpty ? \"Couldn't load\"");
    expect(src).toContain('{isFetching && !loading && <UpdatingPill />}');
    // Debounced search: draft commits 300ms after typing pauses.
    expect(src).toContain('setTimeout(() => {');
    expect(src).toContain('}, 300)');
    expect(src).toContain('aria-haspopup="dialog"');
    expect(src).toContain('aria-expanded={filterSheetOpen}');
    // Context-aware filter trigger (donor getFilterTriggerState): open/filtered/idle.
    expect(src).toContain("if (isOpen) return 'open';");
    expect(src).toContain("if (hasFilter) return 'filtered';");
    expect(src).toContain('data-state={getFilterTriggerState({ isOpen: filterSheetOpen, hasFilter: filtersActive })}');
    // Primary command: fg-on-bg pill with the opening feedback state.
    expect(src).toContain('bg-foreground px-4 text-sm font-semibold text-background');
    expect(src).toContain("data-state={opening ? 'opening' : 'idle'}");
    // Rows: canonical spec; replace-in-place only (no entrance stagger, ever).
    expect(src).toContain("minHeight = 'min-h-[80px]'");
    expect(src).toContain('layout="position"');
    expect(src).not.toContain('initial={{');
    expect(src).toContain('aria-sort={isSorted');
  });

  it('locks the workspace stage: atlas, wayfinding dock, rail spec', () => {
    const src = workspaceStage();
    expect(src).toContain('<ConsoleAtlasLayer />');
    expect(src).toContain('<ConsoleModuleRail');
    expect(src).toContain('export const routeFeedbackMs = 320');
    // The detail rail spec the pages must not re-invent.
    expect(src).toContain('lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]');
    expect(src).toContain('rounded-t-sheet bg-card/78 p-4 text-foreground shadow-e3 backdrop-blur-2xl');
    // S1.4 recessed inset hero recipe.
    expect(src).toContain('rounded-modal bg-background/55 p-3 dark:bg-white/[0.05] md:p-4');
    // The ambient brand tint lives ONLY here (backdrop), never as a shadow.
    expect(src).toContain('hsl(var(--destructive) / 0.11)');
  });

  it('locks the shared row-selection mechanism (Requests/Users parity)', () => {
    const src = read('src/hooks/useRowSelection.js');
    // Shift-range via the click-stash idiom; select-all covers every visible row.
    expect(src).toContain('shiftSelectRef');
    expect(src).toContain('const rangeIds = items.slice(start, end + 1).map((row) => row.id)');
    expect(src).toContain('setSelectedIds(checked ? items.map((row) => row.id) : [])');
    expect(src).toContain('const someSelected = !allSelected && selectedIds.length > 0');
    // Prune-to-visible: ids that leave the list (filter change / row removed by a write)
    // are dropped so a bulk action can never fire on an off-screen record. This donor
    // mechanism was dropped when the hook was extracted and cost a real wrong-write bug
    // on Approvals (2026-07-10 adversarial review) -- locked here so it can't drop again.
    expect(src).toContain('const next = prev.filter((id) => items.some((row) => row.id === id));');
  });

  it('locks keyboard navigation and the shared day-aware time', () => {
    const nav = keyboardNav();
    expect(nav).toContain("event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter' && event.key !== 'Escape'");
    expect(nav).toContain("tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'");
    expect(nav).toContain("scrollIntoView({ block: 'nearest' })");
    const time = dayTime();
    // LOCAL day boundaries, never UTC.
    expect(time).toContain('new Date(d.getFullYear(), d.getMonth(), d.getDate())');
    expect(time).toContain('`Yesterday, ${time}`');
    expect(time).not.toContain('toISOString');
  });

  it('keeps consuming surfaces free of colored shadow glows (estate law)', () => {
    // Extend this list as pages adopt the DS; a colored glow anywhere here is a
    // regression of the user-locked neutral-shadow rule.
    const surfaces = {
      visitsPage: read('src/components/pages/VisitsPage.jsx'),
      visitsPanel: read('src/components/context/VisitsPanel.jsx'),
      emergencyRequestsPage: read('src/components/pages/EmergencyRequestsPage.jsx'),
      todayHome: read('src/components/pages/TodayHome.jsx'),
      hospitalsPage: read('src/components/pages/HospitalsPage.jsx'),
      ambulancesPage: read('src/components/pages/AmbulancesPage.jsx'),
      verificationQueue: read('src/components/pages/VerificationQueue.jsx'),
      doctorsPage: read('src/components/pages/DoctorsPage.jsx'),
    };
    for (const [name, src] of Object.entries(surfaces)) {
      expect({ name, coloredRgb: /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(src) }).toEqual({ name, coloredRgb: false });
      expect({ name, rgba: /shadow-\[[^\]]*rgba\(/.test(src) }).toEqual({ name, rgba: false });
      expect({ name, hslShadow: /shadow-\[[^\]]*hsl\(/.test(src) }).toEqual({ name, hslShadow: false });
    }
  });

  it('keeps every donor MECHANISM on the list-workspace surfaces (estate law: presence-or-recorded-exclusion)', () => {
    // WHY THIS EXISTS (the hole every other gate left open): per-page contract
    // pins protect decisions a page ALREADY made -- they cannot DEMAND a donor
    // mechanism a NEW adoption silently omits. That gap shipped the Hospitals
    // table with no select triggers (2026-07-09) and nothing went red, because
    // no pin required them. `scripts/donor-diff.js` is the mechanical token-level
    // companion, but it is report-only and human-overridable (the same 28px
    // selection column was rationalised away as a "domain delta"). This registry
    // is the behavioural backstop donor-diff cannot express: each load-bearing
    // donor mechanism must be PRESENT on every list-workspace surface (one that
    // renders a SortableColumnHeader list), OR the surface must record a
    // deliberate exclusion with the literal marker "<slug> excluded by decision:
    // <ref>". Adding a new list page? Wire each mechanism or write its marker --
    // the sweep reds otherwise. Bulk WRITES stay per-page fail-closed; this gate
    // is about the mechanism being present, not about what it is allowed to do.
    //
    // To register a new mechanism: add a row here (slug + presence signature),
    // confirm the existing surfaces satisfy it or carry the exclusion marker,
    // and cite the drop that motivated it. Composition-satisfied mechanisms
    // (debounce, updating-pill, drag handle -- baked into ActivitySheet/
    // SheetToolbar) are intentionally ABSENT: composing the component IS the
    // guarantee, so they cannot be dropped without dropping the component.
    const MECHANISMS = [
      // slug, presence signature, motivating drop
      { slug: 'selection', test: /useRowSelection\(|handleToggleSelect/ },        // Hospitals adoption 2026-07-09
      { slug: 'keyboard-nav', test: /useListKeyboardNav/ },                       // Requests list nav canon
      { slug: 'scroll-reset', test: /useScrollResetOnPage/ },                     // page-change scroll reset
      // auto-select: the detail rail defaults to the focused row OR the urgency/first
      // record so it is never empty when there is data. Composed via the shared
      // useFocusedRecord hook (Hospitals/Ambulances) OR the inline `find || list[0] ||
      // null` fallback (Requests/Visits). Approvals shipped WITHOUT it and it took a user
      // correction (2026-07-10) -- the exact "unregistered donor mechanism" gap.
      { slug: 'auto-select', test: /useFocusedRecord\(|\|\|\s*\w+\[0\]\s*\|\|\s*null/ },
      { slug: 'honest-failed-hero', test: /loadError/ },                          // F7: reassuring zero over a failed load
      { slug: 'arrival-toast', test: /lastInsertToastAtRef/ },                    // donor realtime INSERT toast
      { slug: 'deep-link', test: /params\.get\(|useSearchParams|location\.search/ }, // QuickSearch ?id focus
    ];
    // Iterates the ONE shared registry (LIST_WORKSPACE_PAGES) so a new list page
    // can't be added to the interaction gate but forgotten here (or vice-versa).
    for (const entry of LIST_WORKSPACE_PAGES) {
      const name = entry.name;
      const src = read(entry.page);
      // Every registered page MUST be a sortable-list surface -- assert, don't
      // silently skip (a registered page that lost its header must red, not pass).
      expect({ surface: name, isListSurface: /SortableColumnHeader/.test(src) })
        .toEqual({ surface: name, isListSurface: true });
      for (const m of MECHANISMS) {
        const present = m.test.test(src);
        const excluded = src.includes(`${m.slug} excluded by decision:`);
        expect({ surface: name, mechanism: m.slug, present_or_excluded: present || excluded })
          .toEqual({ surface: name, mechanism: m.slug, present_or_excluded: true });
      }
    }
  });

  it('enforces the interaction-completeness canon on every list-workspace page (estate law)', () => {
    // WHY THIS EXISTS: the Motion & Interaction Canon
    // (docs/design-system/MOTION_AND_INTERACTION_CANON.md) and the
    // "UX-Completeness Gate" checklist (docs/planning/PAGE_REVAMP_GATE.md) were
    // DOCS + MANUAL checklists -- so a page could pass structure, mechanism, and
    // data gates and still ship without press feedback, a submit spinner, honest
    // refetch, branched empty states, or with a re-introduced entrance stagger.
    // Ambulances did exactly that (row buttons with no press, modal with no
    // spinner) and every automated gate stayed green -- the "relying on memory"
    // failure. This gate turns the checklist's STATICALLY-CHECKABLE items into
    // machinery, grounded in the exact signatures the gold pages
    // (Requests/Visits/Hospitals) all share. Items that composition already
    // guarantees (SignalPanel no-entrance, KpiStrip isFetching spinner + chip
    // aria-pressed, UpdatingPill role=status, ListRowShell layout=position) are
    // NOT re-checked here -- using the DS component IS the guarantee; this gate
    // covers only what the PAGE/MODAL author writes by hand. Git provenance:
    // 27dbb30b (replace-in-place rows), ff9ab49c (no signal entrance), 083c63f8
    // (loading-motion canon + the gate), 70af6bcc (retry pending + submit spinner).
    //
    // Each list-workspace page (its own custom controls) must carry:
    //  - control-press : at least one `active:scale-*` (dead controls feel dead)
    //  - no-stage-reveal: NO `initial={{` (a re-introduced entrance stagger on
    //                     data content -- the banned mount-cascade)
    //  - isFetching     : `isFetching={isFetching}` surfaced to the DS strip/sheet
    //  - empty-branch   : `hasFilter ?` (empty vs filtered/search + recovery CTA)
    //  - submit-spinner : `animate-spin` in the write surface (the paired modal,
    //                     OR the page itself for rail-write pages like Requests)
    // Same shared registry as the mechanism gate -- one place to register a page.
    for (const entry of LIST_WORKSPACE_PAGES) {
      const src = read(entry.page);
      const modal = read(entry.modal);
      const checks = {
        // A registered page MUST be a list surface -- no silent skip if it lost
        // its header (singleTimeSort would also catch 0, but assert intent).
        listSurface: /SortableColumnHeader/.test(src),
        controlPress: /active:scale-/.test(src),
        noStageReveal: !/initial=\{\{/.test(src),
        isFetchingSurfaced: src.includes('isFetching={isFetching}'),
        emptyBranch: src.includes('hasFilter ?'),
        submitSpinner: /animate-spin/.test(src) || /animate-spin/.test(modal),
        // TIME-ONLY sort discipline (DS decision trail): exactly ONE sortable
        // column (the Time-equivalent). Person/Status/Service/Facility are plain
        // labels -- alphabetical sorts aren't operational and JSON snapshots have
        // no scalar to order on. Visits drifted to 5 sortable headers once
        // (2026-07-09) and only a same-day manual catch realigned it -- this is
        // the gate that makes that catch automatic instead of memory-dependent.
        singleTimeSort: (src.match(/<SortableColumnHeader/g) || []).length === 1,
      };
      for (const [item, ok] of Object.entries(checks)) {
        expect({ page: entry.name, item, ok }).toEqual({ page: entry.name, item, ok: true });
      }
    }
  });
});
