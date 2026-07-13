import fs from 'fs';
import path from 'path';

// Console design system contract: the architecture rules the user kept having to
// repeat now live in components and are LOCKED here. If a rule needs to change,
// it changes in ONE component + this test -- never by a page drifting.
describe('Console design system contract', () => {
  const read = (p) => fs.readFileSync(p, 'utf8');
  const tailwind = () => read('tailwind.config.js');
  const primitives = () => read('src/components/console/primitives.jsx');
  const kpiStrip = () => read('src/components/console/KpiStrip.jsx');
  const metricStrip = () => read('src/components/console/MetricStrip.jsx');
  const glanceTile = () => read('src/components/console/GlanceTile.jsx');
  const mobileGlanceTile = () => read('src/components/mobile/canon/MobileGlanceTile.jsx');
  const signalPanel = () => read('src/components/console/SignalPanel.jsx');
  const activitySheet = () => read('src/components/console/ActivitySheet.jsx');
  const workspaceStage = () => read('src/components/console/WorkspaceStage.jsx');
  const keyboardNav = () => read('src/hooks/useListKeyboardNav.js');
  const dayTime = () => read('src/utils/dayTime.js');
  const readProductionTree = (dir) => {
    if (!fs.existsSync(dir)) return '';
    return fs.readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return readProductionTree(fullPath);
        if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) return '';
        if (/\.(test|spec)\.(js|jsx|ts|tsx)$/.test(entry.name)) return '';
        return read(fullPath);
      })
      .filter(Boolean)
      .join('\n');
  };

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
    { name: 'requests', page: 'src/components/pages/EmergencyRequestsPage.jsx', ownedDir: 'src/components/pages/requests', modal: 'src/components/modals/EmergencyRequestModal.jsx' },
    { name: 'visits', page: 'src/components/pages/VisitsPage.jsx', ownedDir: 'src/components/pages/visits', modal: 'src/components/modals/VisitModal.jsx' },
    { name: 'hospitals', page: 'src/components/pages/HospitalsPage.jsx', ownedDir: 'src/components/pages/hospitals', modal: 'src/components/modals/HospitalModal.jsx', modalOwnedDir: 'src/components/modals/hospital' },
    { name: 'ambulances', page: 'src/components/pages/AmbulancesPage.jsx', ownedDir: 'src/components/pages/ambulances', modal: 'src/components/modals/AmbulanceModal.jsx', exclusions: ['arrival-toast'] },
    // Approvals: a DUAL-QUEUE list page (providers|facilities) composed single-shared-list
    // -- ONE ActivitySheet whose rows swap by queueType, ONE Time header. The paired
    // write-surface is the provider modal; the facility inline write (rail) carries the
    // submit spinner via the page (animate-spin), which the interaction gate accepts.
    { name: 'verificationQueue', page: 'src/components/pages/VerificationQueue.jsx', ownedDir: 'src/components/pages/verification', modal: 'src/components/modals/VerificationModal.jsx', exclusions: ['arrival-toast'] },
    { name: 'doctors', page: 'src/components/pages/DoctorsPage.jsx', ownedDir: 'src/components/pages/doctors', modal: 'src/components/modals/DoctorModal.jsx', modalOwnedDir: 'src/components/modals/doctor' },
    { name: 'users', page: 'src/components/pages/UsersPage.jsx', ownedDir: 'src/components/pages/users', modal: 'src/components/modals/UserModal.jsx' },
    // Support: single-shared-list status-axis page (All/Open/Active/Resolved). The paired
    // write-surface is SupportTicketModal (create/edit); single+bulk delete and provider
    // self-assign are restored, while status-transition (resolve/close) stays fail-closed
    // (the per-page contract pins page.not.toContain('updateTicketStatus')).
    { name: 'support', page: 'src/components/pages/SupportTicketsPage.jsx', ownedDir: 'src/components/pages/support', modal: 'src/components/modals/SupportTicketModal.jsx', exclusions: ['arrival-toast'] },
    // Health News: a READ-ONLY published-feed list page. It composes the full workspace
    // grammar (one ActivitySheet, one Time header on created_at) so every list estate law
    // covers it, but authoring is absent and the route FAB opens read-only statistics. Selection
    // and arrival-toast are recorded exclusions (published feed, no bulk write target / no
    // realtime). The paired HealthNewsModal is a read-only details surface.
    { name: 'news', page: 'src/components/pages/HealthNewsManagementPage.jsx', ownedDir: 'src/components/pages/health-news', modal: 'src/components/modals/HealthNewsModal.jsx', exclusions: ['selection', 'arrival-toast', 'deep-link', 'submit-spinner'] },
    // Organizations: a READ-ONLY registry list page (payout-readiness axis: Registry/Funded/
    // Payout gap). It composes the full workspace grammar (one ActivitySheet, one Time header
    // on created_at) so every list estate law covers it, but every command is fail-closed --
    // create/edit/delete/bulk/save route to the unavailable notice, saveOrganization/
    // deleteOrganization are never imported, and the paired OrganizationModal is an unreachable
    // read-only surface (View opens it in view mode) that carries the submit spinner
    // (animate-spin). arrival-toast is a recorded exclusion (read-only registry, no bulk write
    // target); selection is present (admin-gated) with a fail-closed bulk delete.
    { name: 'organizations', page: 'src/components/pages/OrganizationsPage.jsx', ownedDir: 'src/components/pages/organizations', modal: 'src/components/modals/OrganizationModal.jsx', selectionRequired: true, exclusions: ['arrival-toast'] },
    // Insurance keeps route/data ownership and desktop composition in separate files.
    // `estate` declares both so every shared mechanism law inspects the effective surface.
    { name: 'insurance', page: 'src/components/pages/InsuranceManagementPage.jsx', ownedDir: 'src/components/pages/insurance', modal: 'src/components/modals/InsuranceModal.jsx', selectionRequired: true, exclusions: ['arrival-toast', 'deep-link', 'submit-spinner'] },
    { name: 'subscriptions', page: 'src/components/pages/SubscriptionManagementPage.jsx', ownedDir: 'src/components/pages/subscriptions', modal: 'src/components/modals/SubscriptionModal.jsx', selectionRequired: true, exclusions: ['arrival-toast', 'deep-link', 'submit-spinner'] },
    // Pricing is a read-only projection. Family tabs, scope chips, and inline search are
    // the complete filter surface; there is no write receiver or realtime arrival owner.
    { name: 'pricing', page: 'src/components/pages/PricingManagementPage.jsx', ownedDir: 'src/components/pages/pricing', selectionRequired: true, exclusions: ['arrival-toast', 'deep-link', 'submit-spinner', 'filter-icon'] },
  ];
  const readEstate = (entry) => [
    read(entry.page),
    entry.ownedDir ? readProductionTree(entry.ownedDir) : '',
  ].filter(Boolean).join('\n');

  const CONSOLE_FILES = () => ({
    primitives: primitives(),
    kpiStrip: kpiStrip(),
    metricStrip: metricStrip(),
    glanceTile: glanceTile(),
    mobileGlanceTile: mobileGlanceTile(),
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

  it('defines every numeric background-opacity modifier used by source', () => {
    const defaultOpacitySteps = new Set(['0', '5', '10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '95', '100']);
    const configuredOpacitySteps = new Set([
      ...defaultOpacitySteps,
      ...Object.keys(require('../../../tailwind.config.js').theme.extend.opacity || {}),
    ]);
    const undefinedSteps = new Set();

    const scan = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
          continue;
        }
        if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;

        const source = fs.readFileSync(fullPath, 'utf8');
        for (const match of source.matchAll(/\bbg-[^\s"'`]+\/(\d+)\b/g)) {
          if (!configuredOpacitySteps.has(match[1])) undefinedSteps.add(match[1]);
        }
      }
    };

    scan('src');
    expect([...undefinedSteps].sort((left, right) => Number(left) - Number(right))).toEqual([]);
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

  it('keeps shared status pills content-sized inside table grids', () => {
    const src = primitives();
    expect(src).toContain('inline-flex w-fit max-w-full shrink-0 justify-self-start items-center gap-2 whitespace-nowrap rounded-pill');
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

  it('keeps non-filtering measurements on the same max-three tile grammar', () => {
    const src = metricStrip();
    expect(src).toContain('export const selectContextMetrics = (items = [], max = 3)');
    expect(src).toContain('.filter((item) => item && item.available !== false)');
    expect(src).toContain('Math.min(3, Math.max(0, Number(max) || 3))');
    expect(src).toContain('.slice(0, visibleLimit)');
    expect(src).toContain('mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3');
    expect(src).toContain('min-h-[66px] rounded-inner bg-card/65 px-3 py-2.5');
    expect(src).not.toContain('onClick=');
    expect(src).not.toContain('aria-pressed');
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

  it('locks the mobile Today-height glance tile for dashboard statistics', () => {
    const src = mobileGlanceTile();
    const today = read('src/components/mobile/MobileToday.jsx');
    const analytics = read('src/components/mobile/MobileAnalytics.jsx');
    expect(src).toContain('surface-card flex min-h-[72px] items-start justify-between gap-2 rounded-inner px-4 py-3 text-left');
    expect(src).toContain('block text-[11px] font-medium text-muted-foreground');
    expect(src).toContain('mt-1 block text-[15px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]');
    expect(src).toContain('flex h-7 w-7 shrink-0 items-center justify-center rounded-pill');
    expect(src).not.toContain('min-h-[126px]');
    expect(today).toContain("import { MobileGlanceTile } from './canon/MobileGlanceTile';");
    expect(analytics).toContain("import { MobileGlanceTile } from './canon/MobileGlanceTile';");
    expect(analytics).toContain('<CompactStatTile key={metric.label} {...metric} onClick={onOpenDetails} />');
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
      visitsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'visits')),
      visitsPanel: read('src/components/context/VisitsPanel.jsx'),
      emergencyRequestsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'requests')),
      todayHome: [read('src/components/pages/TodayHome.jsx'), readProductionTree('src/components/pages/today')].join('\n'),
      hospitalsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'hospitals')),
      ambulancesPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'ambulances')),
      verificationQueue: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'verificationQueue')),
      doctorsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'doctors')),
      usersPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'users')),
      supportTicketsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'support')),
      healthNewsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'news')),
      organizationsPage: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'organizations')),
      analyticsPage: [read('src/components/pages/Analytics.jsx'), readProductionTree('src/components/pages/analytics')].join('\n'),
      mobileAnalytics: read('src/components/mobile/MobileAnalytics.jsx'),
      analyticsPanel: read('src/components/context/AnalyticsPanel.jsx'),
    };
    for (const [name, src] of Object.entries(surfaces)) {
      expect({ name, coloredRgb: /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(src) }).toEqual({ name, coloredRgb: false });
      expect({ name, rgba: /shadow-\[[^\]]*rgba\(/.test(src) }).toEqual({ name, rgba: false });
      expect({ name, hslShadow: /shadow-\[[^\]]*hsl\(/.test(src) }).toEqual({ name, hslShadow: false });
    }
  });

  it('keeps the route-owned context panels on canonical radius (Requests-panel parity)', () => {
    // The per-domain *Panel.jsx quick-actions panels are NOT covered by the list estate
    // laws (those gate pages), so VerificationPanel silently drifted to squircle-lg /
    // rounded-xl / rounded-full / geo-round / shadow-premium while the other six matched
    // the Requests reference (EmergencyPanel: rounded-card/inner/icon/button/pill, neutral
    // shadows). A user caught it by eye (2026-07-10). Lock the canonical vocabulary so a
    // context panel for a gated list page can't drift its card radii/shadows again.
    const PANELS = [
      'EmergencyPanel', 'VisitsPanel', 'HospitalsPanel', 'AmbulancesPanel',
      'VerificationPanel', 'DoctorsPanel', 'UsersPanel', 'SupportTicketsPanel',
      'HealthNewsPanel', 'OrganizationsPanel', 'AnalyticsPanel', 'MapPanel', 'SettingsPanel',
    ];
    const DRIFT = /\bsquircle(?:-[a-z]+)?\b|\brounded-(?:xl|2xl|3xl|full)\b|\bgeo-round\b|\bshadow-premium\b/;
    // No colored/bleeding shadow glow on ANY panel surface -- the gold EmergencyPanel is neutral-only
    // (shadow-[0_4px_12px_rgb(0_0_0/0.07)]). The console-components colored-shadow law never reached
    // the route-owned context panels, so SupportTicketsPanel shipped cyan glows (rgb(6 182 212 ...))
    // past every structural gate until an adversarial reviewer caught it (compose-review 2026-07-10).
    // Same regex as the component law -- colored rgb()/rgba()/tinted-hsl() inside a shadow utility.
    const COLORED_SHADOW = (src) => (
      /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(src) ||
      /shadow-\[[^\]]*rgba\(/.test(src) ||
      /shadow-\[[^\]]*hsl\(var\(--(?!foreground)/.test(src)
    );
    for (const name of PANELS) {
      const src = read(`src/components/context/${name}.jsx`);
      expect({ panel: name, drift: DRIFT.test(src) }).toEqual({ panel: name, drift: false });
      expect({ panel: name, coloredShadow: COLORED_SHADOW(src) }).toEqual({ panel: name, coloredShadow: false });
    }

    // Icon-well vocabulary -- the surface regression the DRIFT list CAN'T catch (user-caught
    // 2026-07-10): the gold EmergencyPanel renders metric-card icon wells as SQUIRCLES
    // (`rounded-icon surface-card`), NOT circular `rounded-pill` (or squircle-ish `rounded-button`)
    // boxes. UsersPanel had been copied from DoctorsPanel and regressed to circular pill wells;
    // `rounded-pill`/`rounded-card`/`rounded-button` are valid tokens so the DRIFT gate stayed
    // green -- the wrong canonical token in the wrong slot. ALL SEVEN route-owned panels now carry
    // the squircle well (Doctors: pill->icon, Ambulances: button->icon, both realigned 2026-07-10);
    // this locks every one of them so a panel can't drift its wells back to a circle again.
    const CANON_WELL_PANELS = ['EmergencyPanel', 'VisitsPanel', 'HospitalsPanel', 'AmbulancesPanel', 'VerificationPanel', 'DoctorsPanel', 'UsersPanel', 'SupportTicketsPanel', 'HealthNewsPanel', 'OrganizationsPanel', 'AnalyticsPanel', 'SettingsPanel'];
    // A circular fixed-size box = rounded-pill/full on an EQUAL h-N w-N (backref \1/\2), which is
    // an icon well; pill BADGES (padding-based, no equal h-N w-N) and pill DIVIDERS (h-8 w-1,
    // unequal) are legitimately allowed and do not match.
    const CIRCULAR_WELL = /(?:h-(\d+) w-\1|w-(\d+) h-\2)[^"']*rounded-(?:pill|full)\b/;
    for (const name of CANON_WELL_PANELS) {
      const src = read(`src/components/context/${name}.jsx`);
      expect({ panel: name, squircleWell: /rounded-icon/.test(src) }).toEqual({ panel: name, squircleWell: true });
      expect({ panel: name, circularWell: CIRCULAR_WELL.test(src) }).toEqual({ panel: name, circularWell: false });
    }
  });

  it('routes each canon panel its WHOLE page context -- no renamed cherry-picks (estate law)', () => {
    // WHY THIS EXISTS: the Users context pane desynced (2026-07-10, user-caught) because
    // ContextPanel cherry-picked the published route context into RENAMED props --
    // statistics={usersRouteContext?.statistics}, recentUsers={usersRouteContext?.recentUsers} --
    // that the page never publishes (after the React Query migration the page publishes
    // stats/recent). Those props arrived undefined and UsersPanel silently fell back to counting
    // the 25-row PAGE WINDOW instead of the true server totals, and the Trust-score block never
    // rendered. Every OTHER canon panel receives the WHOLE published object under a single
    // <name>Context prop (staffContext={doctorsRouteContext}, requestContext={emergencyRouteContext},
    // ...), so the page's published keys reach the panel verbatim -- a single-source contract with
    // no seam where fresh server stats can degrade to a stale window count. This locks that
    // pass-through: a canon panel cannot be re-wired to read a renamed sub-key the page never emits.
    const cp = read('src/components/navigation/ContextPanel.jsx');
    const CANON_PANELS = [
      { prop: 'requestContext', state: 'emergencyRouteContext' },
      { prop: 'visitContext', state: 'visitsRouteContext' },
      { prop: 'hospitalContext', state: 'hospitalsRouteContext' },
      { prop: 'ambulanceContext', state: 'ambulancesRouteContext' },
      { prop: 'staffContext', state: 'doctorsRouteContext' },
      { prop: 'usersContext', state: 'usersRouteContext' },
      { prop: 'supportContext', state: 'supportTicketsRouteContext' },
      { prop: 'healthNewsContext', state: 'healthNewsRouteContext' },
      { prop: 'orgContext', state: 'organizationsRouteContext' },
    ];
    for (const p of CANON_PANELS) {
      // whole-object pass-through present...
      expect({ prop: p.prop, passThrough: cp.includes(`${p.prop}={${p.state}}`) })
        .toEqual({ prop: p.prop, passThrough: true });
      // ...and NO cherry-pick of a renamed sub-key off that route-context state.
      expect({ prop: p.prop, cherryPick: new RegExp(`${p.state}\\?\\.`).test(cp) })
        .toEqual({ prop: p.prop, cherryPick: false });
    }
    // Consume side: Users mirrors the Doctors template -- one context prop read by the SAME keys
    // the page publishes (context.stats / context.recent), never the old renamed statistics/recentUsers.
    const usersPanel = read('src/components/context/UsersPanel.jsx');
    expect(usersPanel).toContain('usersContext');
    expect(usersPanel).toContain('context.stats');
    expect(usersPanel).toContain('context.recent');
    // The old broken interface: a `.statistics` member read or a `recentUsers` prop identifier.
    // (Property-access for `statistics` so plain prose can't trip it; identifier for recentUsers.)
    expect({ panel: 'UsersPanel', staleKeys: /\.statistics\b|\brecentUsers\b/.test(usersPanel) })
      .toEqual({ panel: 'UsersPanel', staleKeys: false });
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
    // renders a SortableColumnHeader list), OR the surface must register that
    // mechanism in its central `exclusions` metadata. Adding a new list page?
    // Wire each mechanism or record the reviewed exception here; the sweep reds
    // otherwise. Bulk WRITES stay per-page fail-closed; this gate
    // is about the mechanism being present, not about what it is allowed to do.
    //
    // To register a new mechanism: add a row here (slug + presence signature),
    // confirm the existing surfaces satisfy it or register a reviewed exclusion,
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
      const src = readEstate(entry);
      // Every registered page MUST be a sortable-list surface -- assert, don't
      // silently skip (a registered page that lost its header must red, not pass).
      expect({ surface: name, isListSurface: /SortableColumnHeader/.test(src) })
        .toEqual({ surface: name, isListSurface: true });
      for (const m of MECHANISMS) {
        const present = m.test.test(src);
        const excluded = entry.exclusions?.includes(m.slug);
        if (m.slug === 'selection' && entry.selectionRequired) {
          expect({ surface: name, mechanism: m.slug, required: present && !excluded })
            .toEqual({ surface: name, mechanism: m.slug, required: true });
          continue;
        }
        expect({ surface: name, mechanism: m.slug, present_or_excluded: present || excluded })
          .toEqual({ surface: name, mechanism: m.slug, present_or_excluded: true });
      }
    }
  });

  it('keeps selection mechanics on every current management registry, including Payments', () => {
    const surfaces = {
      organizations: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'organizations')),
      insurance: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'insurance')),
      subscriptions: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'subscriptions')),
      pricing: readEstate(LIST_WORKSPACE_PAGES.find((entry) => entry.name === 'pricing')),
      payments: read('src/components/pages/WalletManagementPage.jsx'),
    };

    for (const [name, src] of Object.entries(surfaces)) {
      expect({ surface: name, selectionHook: /useRowSelection\(/.test(src) })
        .toEqual({ surface: name, selectionHook: true });
      expect({ surface: name, bulkBar: /BulkActionBar/.test(src) })
        .toEqual({ surface: name, bulkBar: true });
      expect({ surface: name, staleExclusion: src.includes('selection excluded by decision:') })
        .toEqual({ surface: name, staleExclusion: false });
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
      const src = readEstate(entry);
      const modal = [
        entry.modal ? read(entry.modal) : '',
        entry.modalOwnedDir ? readProductionTree(entry.modalOwnedDir) : '',
      ].filter(Boolean).join('\n');
      const checks = {
        // A registered page MUST be a list surface -- no silent skip if it lost
        // its header (singleTimeSort would also catch 0, but assert intent).
        listSurface: /SortableColumnHeader/.test(src),
        controlPress: /active:scale-/.test(src),
        noStageReveal: !/initial=\{\{/.test(src),
        isFetchingSurfaced: src.includes('isFetching={isFetching}'),
        emptyBranch: /hasFilter\s*\?/.test(src),
        submitSpinner: Boolean(/animate-spin/.test(src) || /animate-spin/.test(modal) || entry.exclusions?.includes('submit-spinner')),
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

  it('binds every list page title + filter icon to the navbar canon (estate law)', () => {
    // WHY THIS EXISTS: two navbar-RELATIONSHIP drifts slipped every structural gate
    // and needed a user correction (2026-07-10) -- the "green means the navbar was
    // never checked" hole:
    //  (1) the header FILTER button rendered a DOMAIN icon (Approvals=Shield,
    //      Staff/Users=Users) instead of the canon funnel. The gold pages all render
    //      the lucide Filter glyph (Requests via the `Filter as FilterIcon` alias,
    //      Visits/Hospitals/Ambulances directly) -- the filter affordance must read
    //      as "filter", not as the page's subject.
    //  (2) Users named itself "User Management" (desktop SEOHead + usePageHeader)
    //      while the navbar label -- AND its own mobile SEOHead -- said "Users", so
    //      the page disagreed with the nav item that routes to it.
    // config/navigation.js is the SINGLE SOURCE OF TRUTH for a page's name. This gate
    // binds each page's SEOHead title(s) and usePageHeader literal (where present) to
    // that label, and forces the header filter button onto the canon Filter icon, so
    // neither can drift again without reddening. Same one-place-to-register discipline
    // as the mechanism/interaction gates -- keyed by LIST_WORKSPACE_PAGES name.
    const nav = read('src/config/navigation.js');
    const NAV_HEADER = [
      { name: 'requests', navPath: '/emergencies', title: 'Requests' },
      { name: 'visits', navPath: '/visits', title: 'Visits' },
      { name: 'hospitals', navPath: '/hospitals', title: 'Hospitals' },
      { name: 'ambulances', navPath: '/ambulances', title: 'Ambulances' },
      { name: 'verificationQueue', navPath: '/verification', title: 'Approvals' },
      { name: 'doctors', navPath: '/doctors', title: 'Staff' },
      { name: 'users', navPath: '/users', title: 'Users' },
      { name: 'support', navPath: '/support-tickets', title: 'Support' },
      { name: 'news', navPath: '/health-news', title: 'Health News' },
      { name: 'organizations', navPath: '/organizations', title: 'Organizations' },
      { name: 'insurance', navPath: '/insurance', title: 'Insurance' },
      { name: 'subscriptions', navPath: '/subscriptions', title: 'Email Subscribers' },
      { name: 'pricing', navPath: '/pricing', title: 'Pricing' },
    ];
    // Every registered list page must appear here (and vice-versa) -- no silent skip.
    expect(NAV_HEADER.map((e) => e.name).sort()).toEqual(LIST_WORKSPACE_PAGES.map((e) => e.name).sort());

    for (const entry of NAV_HEADER) {
      const pageEntry = LIST_WORKSPACE_PAGES.find((p) => p.name === entry.name);
      const src = readEstate(pageEntry);

      // (a) navbar declares this exact label for the route -- the source of truth.
      const navLabel = (nav.match(new RegExp(`path: '${entry.navPath}'[^}]*?label: '([^']*)'`)) || [])[1];
      expect({ route: entry.navPath, navLabel }).toEqual({ route: entry.navPath, navLabel: entry.title });

      // (b) EVERY SEOHead title on the page (mobile + desktop) equals the nav label.
      // Users drifted precisely here: mobile 'Users' vs desktop 'User Management'.
      const seoTitles = [...src.matchAll(/<SEOHead\s+title="([^"]*)"/g)].map((m) => m[1]);
      expect({ page: entry.name, hasSeo: seoTitles.length > 0 }).toEqual({ page: entry.name, hasSeo: true });
      for (const t of seoTitles) {
        expect({ page: entry.name, seoTitle: t }).toEqual({ page: entry.name, seoTitle: entry.title });
      }

      // (c) if the page names itself via usePageHeader('<literal>'), it equals the nav
      // label too (Approvals/Staff/Users use the inline literal; Requests/Visits pass
      // an empty/object title -- the hero carries the name -- so nothing to bind here).
      const headerLiteral = (src.match(/usePageHeader\('([^']*)'/) || [])[1];
      if (headerLiteral !== undefined) {
        expect({ page: entry.name, headerLiteral }).toEqual({ page: entry.name, headerLiteral: entry.title });
      }

      // (d) the header filter button's glyph is the canon lucide Filter (or its
      // FilterIcon alias) -- never a domain icon (Shield/Users/Stethoscope/...).
      const filterIcon = (src.match(/aria-label="Filter[^"]*"[\s\S]{0,160}?<([A-Za-z]\w*) className="h-4 w-4"/) || [])[1];
      const filterIconExcluded = Boolean(pageEntry.exclusions?.includes('filter-icon'));
      expect({ page: entry.name, canonFilterIcon: /^Filter(Icon)?$/.test(filterIcon || '') || filterIconExcluded })
        .toEqual({ page: entry.name, canonFilterIcon: true });
    }
  });
});
