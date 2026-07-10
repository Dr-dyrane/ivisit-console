import fs from 'fs';

// Console design system contract: the architecture rules the user kept having to
// repeat now live in components and are LOCKED here. If a rule needs to change,
// it changes in ONE component + this test -- never by a page drifting.
describe('Console design system contract', () => {
  const read = (p) => fs.readFileSync(p, 'utf8');
  const tailwind = () => read('tailwind.config.js');
  const primitives = () => read('src/components/console/primitives.jsx');
  const kpiStrip = () => read('src/components/console/KpiStrip.jsx');
  const signalPanel = () => read('src/components/console/SignalPanel.jsx');
  const activitySheet = () => read('src/components/console/ActivitySheet.jsx');
  const workspaceStage = () => read('src/components/console/WorkspaceStage.jsx');
  const keyboardNav = () => read('src/hooks/useListKeyboardNav.js');
  const dayTime = () => read('src/utils/dayTime.js');

  const CONSOLE_FILES = () => ({
    primitives: primitives(),
    kpiStrip: kpiStrip(),
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
    };
    for (const [name, src] of Object.entries(surfaces)) {
      expect({ name, coloredRgb: /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(src) }).toEqual({ name, coloredRgb: false });
      expect({ name, rgba: /shadow-\[[^\]]*rgba\(/.test(src) }).toEqual({ name, rgba: false });
      expect({ name, hslShadow: /shadow-\[[^\]]*hsl\(/.test(src) }).toEqual({ name, hslShadow: false });
    }
  });
});
