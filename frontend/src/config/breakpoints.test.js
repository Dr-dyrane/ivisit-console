import { getTabletSplitMode, getViewportState, TABLET_SPLIT_MIN_EFFECTIVE_WIDTH } from './breakpoints';

describe('console viewport composition', () => {
  it.each([
    [390, true, false, false, false, true],
    [768, false, true, false, false, true],
    [834, false, true, false, false, true],
    [1024, false, true, true, false, false],
    [1194, false, true, true, false, false],
    [1280, false, false, false, true, false],
  ])('classifies %ipx without a composition gap', (
    width,
    isPhone,
    isTablet,
    isWideTablet,
    isDesktop,
    usesCompactNavigation,
  ) => {
    expect(getViewportState(width)).toEqual(expect.objectContaining({
      isPhone,
      isTablet,
      isWideTablet,
      isDesktop,
      isCompactSurface: !isDesktop,
      usesCompactNavigation,
      isMobile: !isDesktop,
    }));
  });
});

describe('tablet split mode from measured effective content width', () => {
  it.each([
    // Portrait iPads: compact navigation, no sidebar chrome -> stacked.
    [768, true, 0, 'stacked'],
    [834, true, 0, 'stacked'],
    // 1024 with the collapsed rail (effective 932) keeps the split...
    [1024, false, 72, 'split'],
    // ...but the SAME viewport with the sidebar expanded (effective 744) is
    // narrower than a portrait iPad -- isWideTablet alone would lie here.
    [1024, false, 260, 'stacked'],
    [1279, false, 72, 'split'],
  ])('%ipx compact=%s sidebar=%ipx -> %s', (width, usesCompactNavigation, sidebarWidth, expected) => {
    expect(getTabletSplitMode({ width, usesCompactNavigation, sidebarWidth })).toBe(expected);
  });

  it('flips exactly at the 896px effective floor (29rem list + 24rem detail + gap + padding)', () => {
    expect(TABLET_SPLIT_MIN_EFFECTIVE_WIDTH).toBe(896);
    expect(getTabletSplitMode({ width: 896, usesCompactNavigation: true, sidebarWidth: 0 })).toBe('split');
    expect(getTabletSplitMode({ width: 895, usesCompactNavigation: true, sidebarWidth: 0 })).toBe('stacked');
    // Sidebar chrome shifts the boundary by sidebarWidth + 20 (AppShell bleed).
    expect(getTabletSplitMode({ width: 988, usesCompactNavigation: false, sidebarWidth: 72 })).toBe('split');
    expect(getTabletSplitMode({ width: 987, usesCompactNavigation: false, sidebarWidth: 72 })).toBe('stacked');
  });

  it('keeps the legacy split when no measurement exists', () => {
    expect(getTabletSplitMode({})).toBe('split');
    expect(getTabletSplitMode({ width: 0, usesCompactNavigation: true, sidebarWidth: 0 })).toBe('split');
  });
});
