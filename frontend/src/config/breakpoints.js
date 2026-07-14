export const PHONE_BREAKPOINT = 768;
export const TABLET_NAV_BREAKPOINT = 1024;
export const DESKTOP_BREAKPOINT = 1280;

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
