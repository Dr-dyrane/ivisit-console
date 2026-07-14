import { getViewportState } from './breakpoints';

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
