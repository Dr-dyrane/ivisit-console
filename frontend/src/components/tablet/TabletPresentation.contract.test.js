import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const routePresentations = [
  ['../pages/TodayHome.jsx', 'TabletToday'],
  ['../pages/GodModeMap.jsx', 'TabletMap'],
  ['../pages/analytics/AnalyticsPageView.jsx', 'TabletAnalytics'],
  ['../pages/hospitals/HospitalsPageView.jsx', 'TabletHospitals'],
  ['../pages/ambulances/AmbulancesPageView.jsx', 'TabletAmbulances'],
  ['../pages/doctors/DoctorsPageView.jsx', 'TabletStaff'],
  ['../pages/VisitsPage.jsx', 'TabletVisits'],
  ['../pages/EmergencyRequestsPage.jsx', 'TabletEmergency'],
  ['../pages/VerificationQueue.jsx', 'TabletApprovals'],
  ['../pages/UsersPage.jsx', 'TabletUsers'],
  ['../pages/organizations/OrganizationsPageView.jsx', 'TabletOrganizations'],
  ['../pages/settings/SettingsPageView.jsx', 'TabletSettings'],
  ['../pages/health-news/HealthNewsPageView.jsx', 'TabletHealthNews'],
  ['../pages/SupportTicketsPage.jsx', 'TabletSupport'],
  ['../pages/insurance/InsurancePageView.jsx', 'TabletInsurance'],
  ['../pages/subscriptions/SubscriptionManagementPageView.jsx', 'TabletSubscriptions'],
  ['../pages/WalletManagementPage.jsx', 'TabletWallet'],
  ['../pages/pricing/PricingManagementPageView.jsx', 'TabletPricing'],
];

describe('dedicated tablet presentation ownership', () => {
  it.each(routePresentations)('%s explicitly forks to %s', (routePath, componentName) => {
    const source = read(routePath);

    expect(source).toContain('isPhone');
    expect(source).toContain('isTablet');
    expect(source).toContain(`<${componentName}`);
  });

  it('keeps every tablet module independent from phone presentation files', () => {
    const tabletFiles = fs.readdirSync(__dirname)
      .filter((fileName) => /^Tablet.*\.jsx$/.test(fileName));

    expect(tabletFiles.length).toBeGreaterThanOrEqual(routePresentations.length);

    tabletFiles.forEach((fileName) => {
      const source = read(`./${fileName}`);

      expect(source).not.toMatch(/from\s+['"][^'"]*\/mobile(?:\/|['"])/);
      expect(source).not.toContain('MobilePageShell');
      expect(source).not.toMatch(/<Mobile[A-Z]/);
    });
  });

  it('keeps the phone shell free of tablet presentation APIs', () => {
    const source = read('../mobile/MobilePageShell.jsx');

    expect(source).not.toContain('tabletPane');
    expect(source).not.toContain('tabletLayout');
    expect(source).not.toContain('isTablet');
    expect(source).not.toContain('useNavigation');
    expect(source).toContain('data-compact-size="phone"');
  });

  it('gives tablet list and detail columns independent scroll ownership', () => {
    const shell = read('./TabletPageShell.jsx');

    expect(shell).toContain('data-tablet-primary-pane');
    expect(shell).toContain('data-scroll-owner="primary"');
    expect(shell).toContain('data-tablet-detail-pane');
    expect(shell).toContain('data-scroll-owner="detail"');
    expect(shell).toContain('sticky top-0');
    expect(shell).toContain('overflow-y-auto');
  });

  it('keeps tablet KPI and selection grammar inside the tablet collection', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain('onSelectAll');
    expect(collection).toContain("'indeterminate'");
    expect(collection).toContain('Select all visible records');
    expect(collection).toContain('role="checkbox"');
    expect(collection).toContain("aria-checked={indeterminate ? 'mixed' : selected}");
    expect(collection).not.toContain("from '../ui/checkbox'");
  });

  // ---- Tablet production-pass behavior gates (non-vacuous: each pins the
  // mechanism that fixes a verified defect; render-level behavior coverage
  // lives in TabletCollectionPage.test.jsx). ----

  const KPI_CONSUMERS = [
    './TabletEmergency.jsx',
    './TabletVisits.jsx',
    './TabletAmbulances.jsx',
    './TabletHospitals.jsx',
    './TabletStaff.jsx',
    './TabletOrganizations.jsx',
    './TabletUsers.jsx',
    './TabletApprovals.jsx',
    './TabletSupport.jsx',
    './TabletHealthNews.jsx',
    './TabletInsurance.jsx',
    './TabletSubscriptions.jsx',
    './TabletPricing.jsx',
  ];

  it('selects KPI chips through the shared selectPrimaryKpis and toggles back to All (g1/g2)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain("import { selectPrimaryKpis } from '../console/KpiStrip'");
    expect(collection).toContain('selectPrimaryKpis({');
    expect(collection).not.toContain('slice(0, 3)');
    // Re-tapping the active non-All chip returns the scope to All (donor KpiStrip).
    expect(collection).toContain("onChange?.(active && option.id !== 'all' ? 'all' : option.id)");
  });

  it.each(KPI_CONSUMERS)('%s threads its domain pinned/importance KPI constants (g1)', (file) => {
    const source = read(file);
    expect(source).toContain('kpiPinnedIds={');
    expect(source).toContain('kpiImportance={');
    // No consumer pre-slices the option list; the strip owns selection.
    expect(source).not.toContain('.slice(0, 3)');
  });

  it('debounces search through the lane-neutral useSearchDraft with an immediate clear-x (i2)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain("from '../../hooks/useSearchDraft'");
    expect(collection).toContain('useSearchDraft(searchValue');
    expect(collection).toContain('aria-label="Clear search"');
    // Blur-commit is gone; the debounce owns commits (Enter still commits via submit).
    expect(collection).not.toContain('onBlur={commit}');

    const hook = read('../../hooks/useSearchDraft.js');
    expect(hook).toContain('SEARCH_DEBOUNCE_MS = 300');
    expect(hook).toContain('}, SEARCH_DEBOUNCE_MS)');
    // The mobile canon consumes the SAME hook - one debounce mechanism, two lanes.
    expect(read('../mobile/canon/SearchRow.jsx')).toContain("from '../../../hooks/useSearchDraft'");
  });

  // Windowed feeds (Supabase range fetch) must present honest page controls;
  // a "Load more" that replaces rows is a lying label (i1). And the inverse:
  // grow-window feeds must NOT present "Page X of Y" Prev/Next -- Staff and
  // Ambulances shipped exactly that lie (their page models widen limit to
  // currentPage * itemsPerPage at offset 0 on compact surfaces) until the
  // 2026-07-11 adversarial review caught it.
  const WINDOWED_PAGES = [
    './TabletEmergency.jsx',
    './TabletVisits.jsx',
    './TabletHospitals.jsx',
    './TabletOrganizations.jsx',
    './TabletUsers.jsx',
    './TabletApprovals.jsx',
    './TabletSupport.jsx',
    './TabletHealthNews.jsx',
  ];
  // TWO-SIDED semantic pin: each accumulating page's label is bound to the
  // accumulation recipe IN ITS DATA SOURCE, not to a prose comment (the comment
  // gate was vacuous -- refuted by review). If a controller stops accumulating,
  // the recipe pin reds; if a page swaps to Prev/Next over a grow-window, the
  // no-TabletPaginationFooter pin reds.
  const ACCUMULATING_PAGES = [
    ['./TabletInsurance.jsx', '../pages/insurance/useInsurancePageData.js', 'currentPage * itemsPerPage'],
    ['./TabletPricing.jsx', '../pages/pricing/pricingPageModel.js', 'currentPage * itemsPerPage'],
    ['./TabletSubscriptions.jsx', '../pages/subscriptions/useSubscriptionPageController.js', 'mobileVisibleSubscribers'],
    ['./TabletWallet.jsx', '../pages/wallet/useWalletPageController.js', 'setMobileLimit'],
    ['./TabletStaff.jsx', '../pages/doctors/staffPageModel.js', 'currentPage * itemsPerPage'],
    ['./TabletAmbulances.jsx', '../pages/ambulances/ambulancePageModel.js', 'currentPage * itemsPerPage'],
  ];

  it.each(WINDOWED_PAGES)('%s paginates honestly via TabletPaginationFooter (i1)', (file) => {
    const source = read(file);
    expect(source).toContain('<TabletPaginationFooter');
    expect(source).not.toContain('Load more');
    // A page change resets the rows viewport to the top.
    expect(source).toContain('scrollResetKey={pagination?.currentPage}');
  });

  it.each(ACCUMULATING_PAGES)('%s keeps Load more only because its DATA SOURCE accumulates (i1)', (file, modelPath, recipe) => {
    const source = read(file);
    expect(source).toContain('Load more');
    // Never Prev/Next page numbers over an accumulating feed.
    expect(source).not.toContain('<TabletPaginationFooter');
    // No page-change scroll reset on an appending list (it would yank the user to the top).
    expect(source).not.toContain('scrollResetKey={pagination?.currentPage}');
    // 44px target + visible focus on the load-more control.
    expect(source).toContain('h-11 w-full rounded-button');
    expect(source).toContain('TABLET_FOCUS_RING');
    // The data source really accumulates -- the label is pinned to the recipe.
    expect(read(modelPath)).toContain(recipe);
  });

  it('forwards the checkbox mouse event so shift-range selection reaches useRowSelection (i3)', () => {
    const collection = read('./TabletCollectionPage.jsx');
    expect(collection).toContain('onSelectClick?.(event)');
    expect(collection).toContain('onSelectClick={onSelectClick}');

    const selectableConsumers = KPI_CONSUMERS.filter((file) => file !== './TabletHealthNews.jsx');
    [...selectableConsumers, './TabletWallet.jsx'].forEach((file) => {
      expect(read(file)).toContain('onSelectClick={');
    });
  });

  it('wires keyboard navigation and page-change scroll reset over the rows viewport (i4)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain("from '../../hooks/useListKeyboardNav'");
    expect(collection).toContain('useListKeyboardNav({');
    expect(collection).toContain("rowAttr: 'data-tablet-record-row'");
    expect(collection).toContain('onKeyDown={handleListKeyDown}');
    expect(collection).toContain('tabIndex={0}');
    expect(collection).toContain('useScrollResetOnPage(scrollRef, scrollResetKey)');
  });

  it('offers recovery from empty states and surfaces degraded refreshes (i5/i6)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    // emptyAction slot + honest fallbacks derived from page state.
    expect(collection).toContain('emptyAction');
    expect(collection).toContain("{ label: 'Clear search', onClick: () => onSearchCommit('') }");
    expect(collection).toContain("{ label: 'Adjust filters', onClick: onOpenFilters }");
    // Degraded banner: error while rows exist is visible and retryable.
    expect(collection).toContain('error && records.length > 0');
    expect(collection).toContain('data-tablet-degraded');
    expect(collection).toContain('role="alert"');
  });

  it('gives the filter trigger three honest states with popup semantics (i7)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain('haspopup="dialog"');
    expect(collection).toContain('expanded={filterSheetOpen}');
    expect(collection).toContain("filterSheetOpen ? 'open' : (filtersActive ? 'filtered' : 'idle')");
    expect(collection).toContain('aria-haspopup={haspopup}');
    expect(collection).toContain('aria-expanded={expanded}');

    // The former conflators now separate open-state from filtered-state.
    ['./TabletUsers.jsx', './TabletApprovals.jsx', './TabletSupport.jsx', './TabletHealthNews.jsx'].forEach((file) => {
      const source = read(file);
      expect(source).toContain('filterSheetOpen={filterSheetOpen}');
      expect(source).not.toContain('filterSheetOpen ||');
    });
  });

  it('meets 44px targets on tablet interactive controls (e1)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    // Icon buttons, KPI chips, row chevron, checkbox hit-slop, retry + empty CTAs.
    expect(collection).toContain('flex h-11 w-11 shrink-0 items-center justify-center rounded-icon transition-all active:scale-95');
    expect(collection).toContain('flex h-11 shrink-0 items-center gap-2 rounded-pill');
    // Checkbox: 16px visual box + 14px hit-slop pseudo-element = 44px target.
    expect(collection).toContain("before:absolute before:-inset-3.5 before:content-['']");
    expect(collection).not.toContain('h-9 w-9');
    expect(collection).not.toContain('h-10 w-10 shrink-0 items-center justify-center rounded-icon text-muted-foreground');

    const controls = read('./TabletCollectionControls.jsx');
    expect(controls).toContain('h-11');
    expect(controls).not.toContain('h-9');

    // MUTATION-RESISTANT sweep (the old single-line regex was proven vacuous by a
    // live mutation: reverting the wallet eye to h-7 w-7 passed 64/64). Parse every
    // <button ...> opening tag -- across newlines and template-literal classNames --
    // and flag any sub-44px h-*/w-* size unless the control carries a hit-slop
    // pseudo-element (before:-inset*) that restores the 44px target.
    fs.readdirSync(__dirname)
      .filter((fileName) => /^Tablet.*\.jsx$/.test(fileName))
      .forEach((fileName) => {
        const source = read(`./${fileName}`);
        const openingTags = source.match(/<button[\s\S]*?>/g) || [];
        openingTags.forEach((tag) => {
          const classMatch = tag.match(/className=\{?[`"]([\s\S]*?)[`"]\}?/);
          const cls = classMatch ? classMatch[1] : '';
          const subSize = /(?:^|[\s"'`])[hw]-(?:[1-9]|10)(?:[\s"'`]|$)/.test(cls);
          const hasHitSlop = cls.includes('before:-inset');
          expect({ file: fileName, tag: tag.replace(/\s+/g, ' ').slice(0, 90), sub44: subSize && !hasHitSlop })
            .toEqual({ file: fileName, tag: tag.replace(/\s+/g, ' ').slice(0, 90), sub44: false });
        });
      });
  });

  it('restores focus-visible rings on every tablet file that renders raw buttons (e2)', () => {
    const files = fs.readdirSync(__dirname).filter((fileName) => /^Tablet.*\.jsx$/.test(fileName));

    files.forEach((fileName) => {
      const source = read(`./${fileName}`);
      if (!source.includes('<button')) return;
      expect(`${fileName}: ${source.includes('TABLET_FOCUS_RING')}`).toBe(`${fileName}: true`);
    });

    const collection = read('./TabletCollectionPage.jsx');
    expect(collection).toContain("export const TABLET_FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2");
    // The checkbox composes the shared ring on its visual box.
    expect(collection).toMatch(/before:content-\[''\]\ \$\{TABLET_FOCUS_RING\}/);
  });

  it('announces refresh outcomes through a polite live region (e3)', () => {
    const collection = read('./TabletCollectionPage.jsx');

    expect(collection).toContain('aria-live="polite"');
    expect(collection).toContain('List updated');
    expect(collection).toContain('Refresh failed');
    // Falling edge of isFetching drives the announcement.
    expect(collection).toContain('wasFetchingRef.current && !isFetching');
  });

  it('uses the shared emergency lifecycle presentation in the tablet request list', () => {
    const source = read('./TabletEmergency.jsx');

    expect(source).toContain("from '../pages/requests/emergencyLifecyclePresentation'");
    expect(source).toContain('buildEmergencyLifecyclePresentation(request)');
    expect(source).toContain('getRequestStatusMeta(request, lifecycle)');
  });

  it.each([
    '../pages/health-news/HealthNewsDetailRail.jsx',
    '../pages/support/SupportDetailRail.jsx',
    '../pages/users/UsersDetailRail.jsx',
    '../pages/verification/ApprovalDetailRail.jsx',
  ])('%s supports an embedded tablet rail', (railPath) => {
    const source = read(railPath);

    expect(source).toContain('embedded = false');
    expect(source).toContain('<DetailRailShell embedded={embedded}>');
  });

  it('centers Today without adding a second route title', () => {
    const today = read('./TabletToday.jsx');

    expect(today).toContain('<TabletPageShell mode="centered">');
    expect(today).not.toContain('<h1');
  });
});
