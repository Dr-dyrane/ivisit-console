export const PHONE_BREAKPOINT = 768;
export const TABLET_NAV_BREAKPOINT = 1024;
export const DESKTOP_BREAKPOINT = 1280;

// Effective-width floor for the tablet two-pane split: list primary floor
// (29rem) + detail rail cap (24rem) + 1rem gap + 2rem shell padding = 56rem.
export const TABLET_SPLIT_MIN_EFFECTIVE_WIDTH = 896;

// 'split' | 'stacked' from MEASURED effective content width, never orientation
// labels: isWideTablet lies at 1024px with the sidebar expanded (~744px of
// real content -- narrower than a 768 portrait iPad). The chrome deduction
// mirrors AppShell's bleed padding, `sidebarWidth + (isBleedPage ? 20 : 48)`
// left and 0 right -- every tablet page runs usePageShell({ bleed: true }),
// and compact navigation (phone/narrow tablet) has no sidebar chrome at all.
export const getTabletSplitMode = ({ width, usesCompactNavigation, sidebarWidth } = {}) => {
  const viewportWidth = Number(width);
  // No measurement (tests/SSR before the first frame) keeps legacy split.
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 'split';
  const chromeWidth = usesCompactNavigation ? 0 : (Number(sidebarWidth) || 0) + 20;
  const effectiveWidth = viewportWidth - chromeWidth;
  return effectiveWidth >= TABLET_SPLIT_MIN_EFFECTIVE_WIDTH ? 'split' : 'stacked';
};

export const getViewportState = (width) => {
  const viewportWidth = Number(width);
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return {
      isPhone: false,
      isTablet: false,
      isWideTablet: false,
      isDesktop: false,
      isCompactSurface: false,
      usesCompactNavigation: false,
      isMobile: false,
      width: 0,
    };
  }

  const isPhone = viewportWidth < PHONE_BREAKPOINT;
  const isTablet = viewportWidth >= PHONE_BREAKPOINT && viewportWidth < DESKTOP_BREAKPOINT;
  const isWideTablet = isTablet && viewportWidth >= TABLET_NAV_BREAKPOINT;
  const isDesktop = viewportWidth >= DESKTOP_BREAKPOINT;
  const isCompactSurface = !isDesktop;
  const usesCompactNavigation = isPhone || (isTablet && !isWideTablet);

  return {
    isPhone,
    isTablet,
    isWideTablet,
    isDesktop,
    isCompactSurface,
    usesCompactNavigation,
    // Compatibility alias while page controllers migrate to isCompactSurface.
    isMobile: isCompactSurface,
    width: viewportWidth,
  };
};
