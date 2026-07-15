import fs from 'fs';

// Mobile canon kit contract: the mobile half of the design system. Recipes are
// verbatim extractions from the gold pages (CANON_COMPONENT_SPECS.md); if a rule
// changes it changes HERE + in one component - never by a page drifting. Page
// contracts that pinned these strings migrate their pins to this file as pages
// re-compose onto the kit.
describe('Mobile canon kit contract', () => {
  const read = (p) => fs.readFileSync(p, 'utf8');
  const constants = () => read('src/components/mobile/canon/constants.js');
  const tap = () => read('src/components/mobile/canon/Tap.jsx');
  const statusPill = () => read('src/components/mobile/canon/StatusPill.jsx');
  const loading = () => read('src/components/mobile/canon/Loading.jsx');
  const groupedList = () => read('src/components/mobile/canon/GroupedList.jsx');
  const searchRow = () => read('src/components/mobile/canon/SearchRow.jsx');
  const searchDraftHook = () => read('src/hooks/useSearchDraft.js');
  const hero = () => read('src/components/mobile/canon/MobileHero.jsx');

  it('centralizes the behavioral constants', () => {
    const src = constants();
    expect(src).toContain('SKELETON_WARMUP_MS = 400');
    // The debounce constant lives with the lane-neutral hook (tablet composes
    // the same mechanism); canon re-exports it so pages keep one import home.
    expect(src).toContain("export { SEARCH_DEBOUNCE_MS } from '../../../hooks/useSearchDraft'");
    expect(searchDraftHook()).toContain('SEARCH_DEBOUNCE_MS = 300');
    expect(src).toContain('ROUTE_FEEDBACK_MS = 320');
    expect(src).toContain('SCROLL_COOLDOWN_MS = 180');
    expect(src).toContain("LOAD_MORE_ROOT_MARGIN = '120px'");
    expect(src).toContain('HAPTIC_THROTTLE_MS = 260');
  });

  it('bakes the press ladder + feedback into the tap primitives', () => {
    const src = tap();
    // Controls 0.96, cards/rows 0.988 - from mobileMotion, never re-declared.
    expect(src).toContain("from '../mobileMotion'");
    expect(src).toContain('whileTap={mobileMotion.press.control}');
    expect(src).toContain('whileTap={mobileMotion.press.card}');
    // Rows acknowledge on pointerdown; replace-in-place reflow only.
    expect(src).toContain('onPointerDown={(event) => {');
    expect(src).toContain('layout="position"');
    expect(src).not.toContain('initial={{');
    // Haptic/burst feedback baked; tap highlight suppressed.
    expect(src).toContain('triggerFromEvent(event, {');
    expect(src).toContain("WebkitTapHighlightColor: 'transparent'");
  });

  it('keeps status tones on vitalTracks ONLY - no local colour maps', () => {
    const src = statusPill();
    expect(src).toContain("from '../../../constants/vitalTracks'");
    // The single-status-truth rule: no literal palette classes in the component.
    expect(src).not.toContain('text-cyan-');
    expect(src).not.toContain('text-amber-');
    expect(src).not.toContain('text-emerald-');
    expect(src).not.toContain('text-sky-');
    expect(src).not.toContain('bg-destructive');
    // Variant recipes.
    expect(src).toContain("row: 'rounded-pill px-2.5 py-[5px] text-[11px] font-bold'");
    expect(src).toContain("sheet: 'mt-2 inline-flex rounded-pill px-2.5 py-1 text-[11px] font-semibold'");
  });

  it('locks the loading kit: warm-up idiom, Updating pill, group-shaped scaffolds', () => {
    const src = loading();
    expect(src).toContain('setTimeout(() => setWarmingUp(false), SKELETON_WARMUP_MS)');
    // The exact Updating pill markup (ME:400-406 family).
    expect(src).toContain('role="status" aria-live="polite" className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground"');
    expect(src).toContain('mt-4 flex items-center justify-end px-2');
    // Scaffolds mirror the real layout 1:1 and stay aria-hidden.
    expect(src).toContain('h-10 w-10 shrink-0 rounded-pill bg-muted/25 shimmer');
    expect(src).toContain('h-[15px] w-2/5 rounded-pill bg-muted/25 shimmer');
    // Trailing scaffold variants, both donor-verbatim: 'timePill' (Visits: time bar
    // over pill) and 'pill' (Emergency: single pill bar).
    expect(src).toContain('h-3 w-12 rounded-pill bg-muted/20 shimmer');
    expect(src).toContain('h-6 w-14 rounded-pill bg-muted/20 shimmer');
    expect(src).toContain("trailing === 'pill'");
    expect(src).toContain('ml-2 h-6 w-14 shrink-0 rounded-pill bg-muted/20 shimmer');
    expect(src).toContain('aria-hidden="true"');
    expect(src).not.toContain('initial={{');
  });

  it('locks the grouped list: frosted panel, hairline whisper, row anatomy', () => {
    const src = groupedList();
    // THE PANEL (frosted is a PROP - UsersPage blur ban - never a fork).
    expect(src).toContain("GROUP_PANEL_FROSTED = 'rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5'");
    expect(src).toContain("GROUP_PANEL_FLAT = 'rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] px-3 py-1.5'");
    // Hairline: /0.08 whisper, inset variants for 40px/36px orbs.
    expect(src).toContain("62: 'h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]'");
    expect(src).toContain("56: 'h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[56px]'");
    // Group header: sentence-case bold + tabular count (never all-caps).
    expect(src).toContain('text-[13px] font-bold leading-[17px] text-muted-foreground');
    expect(src).toContain('text-[13px] font-bold text-muted-foreground/60 tabular-nums');
    // Bucket rhythm + render-only grouping.
    expect(src).toContain('space-y-[18px]');
    expect(src).toContain("from '../../../utils/groupByRecency'");
    // Row anatomy: orb 40px, identity 15/500 + 12 meta, trailing bold tabular time
    // over pill + chevron; press via TapCard (0.988 + CLICK on pointerdown).
    expect(src).toContain('group/row w-full flex items-center gap-3 px-2 py-3 text-left rounded-inner transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]');
    expect(src).toContain('h-10 w-10 shrink-0 rounded-pill flex items-center justify-center');
    expect(src).toContain('text-[15px] leading-5 font-medium text-foreground truncate');
    expect(src).toContain('mt-0.5 text-xs leading-[17px] text-muted-foreground truncate');
    expect(src).toContain('ml-2 shrink-0 flex flex-col items-end gap-2 min-w-[72px]');
    expect(src).toContain('text-xs leading-[15px] font-bold text-foreground tabular-nums');
    expect(src).toContain("pill?.className || 'bg-muted/34 text-muted-foreground'");
    expect(src).toContain('aria-haspopup="dialog"');
    expect(src).toContain('<ChevronRight className="h-4 w-4 text-muted-foreground/60" />');
  });

  it('locks the search row: debounce, immediate clear-x, context-aware triggers', () => {
    const src = searchRow();
    // The debounce mechanism is composed from the lane-neutral hook (byte-pins
    // over the hook body live below so the behavior cannot silently change).
    expect(src).toContain("from '../../../hooks/useSearchDraft'");
    const hook = searchDraftHook();
    expect(hook).toContain('}, SEARCH_DEBOUNCE_MS)');
    // External writes sync back into the draft.
    expect(hook).toContain("useEffect(() => { setSearchDraft(search || ''); }, [search])");
    // The exact input recipe (mobile focus ring is the sanctioned primary/0.18).
    expect(src).toContain('h-9 w-full rounded-inner bg-background/60 pl-10 pr-10 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]');
    // Clear-x commits immediately (no debounce on clearing).
    expect(src).toContain("onClick={() => { setSearchDraft(''); onSearchCommit(''); }}");
    // Context-aware filter trigger.
    expect(src).toContain("if (isOpen) return 'open';");
    expect(src).toContain("if (hasFilter) return 'filtered';");
    expect(src).toContain('data-state={getFilterTriggerState({ isOpen: filterSheetOpen, hasFilter })}');
    expect(src).toContain('aria-expanded={filterSheetOpen}');
    // Both triggers render only when the page wires a surface for them -- a trigger
    // with no sheet is a dead tap (MobilePricing Wave-2 pass: tabs + KPI chips are
    // its only filter grammar, so it composes SearchRow without onOpenFilters).
    expect(src).toContain('{onOpenFilters && (');
    expect(src).toContain('{scopeControl}');
    // Stats trigger is context-aware too (gap found by the MobileEmergency pass).
    expect(src).toContain("data-state={statsOpen ? 'open' : 'idle'}");
    expect(src).toContain('aria-expanded={statsOpen}');
  });

  it('locks the heading + hero: honest count line, anchored Updating pill, no entrance motion', () => {
    const src = hero();
    expect(src).toContain('text-2xl font-semibold leading-tight tracking-tight text-foreground');
    // Honest line: loading -> failure -> pluralized scoped count; never a confident zero.
    expect(src).toContain('`Loading ${nounPlural}...`');
    expect(src).toContain('did not load');
    expect(src).toContain("`${count} ${noun}${count === 1 ? '' : 's'}`");
    // Dashboard hero: status pill + right-anchored Updating pill, no layout shift.
    expect(src).toContain('inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-semibold');
    expect(src).toContain('{isFetching && <UpdatingPill />}');
    expect(src).toContain('mt-4 flex flex-wrap gap-2');
    expect(src).not.toContain('initial={{');
  });

  it('keeps the whole kit free of colored shadows and banned chrome', () => {
    const files = { tap: tap(), statusPill: statusPill(), loading: loading(), groupedList: groupedList(), searchRow: searchRow(), hero: hero() };
    for (const [name, src] of Object.entries(files)) {
      expect({ name, coloredRgb: /shadow-\[[^\]]*rgb\((?!0[ _]0[ _]0)/.test(src) }).toEqual({ name, coloredRgb: false });
      expect({ name, rgba: /shadow-\[[^\]]*rgba\(/.test(src) }).toEqual({ name, rgba: false });
      expect({ name, border: /border(?![a-zA-Z-])/.test(src.replace(/\/\/[^\n]*/g, '')) }).toEqual({ name, border: false });
      expect({ name, nonCanonRadius: /rounded-(xl|2xl|3xl|full|lg|md|sm)(?![a-zA-Z-])/.test(src) }).toEqual({ name, nonCanonRadius: false });
    }
  });
});
