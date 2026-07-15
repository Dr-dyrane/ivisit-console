import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { PricingManagementPageView } from './pricing/PricingManagementPageView';
import { usePricingPageChrome } from './pricing/usePricingPageChrome';
import { usePricingPageController } from './pricing/usePricingPageController';
import { usePricingRouteBridge } from './pricing/usePricingRouteBridge';

export const PricingManagementPage = () => {
  const { profile, isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
  const { isPhone, isTablet, isMobile } = useNavigation();
  const controller = usePricingPageController({
    profile,
    admin: isAdmin(),
    orgAdmin: isOrgAdmin(),
    provider: isProvider(),
    driver: isDriver(),
    isMobile,
  });

  usePricingRouteBridge({
    pricingRouteContext: controller.pricingRouteContext,
    showPricingCommandUnavailable: controller.showPricingCommandUnavailable,
    handleOpenPricingStats: controller.handleOpenPricingStats,
  });

  const chrome = usePricingPageChrome({
    roleKind: controller.roleKind,
    analyticsModalOpen: controller.analyticsModalOpen,
    handleOpenPricingStats: controller.handleOpenPricingStats,
  });

  return (
    <PricingManagementPageView
      controller={controller}
      chrome={chrome}
      isPhone={isPhone}
      isTablet={isTablet}
      isMobile={isMobile}
    />
  );
};

export { PricingDesktopWorkspace } from './pricing/PricingDesktopWorkspace';
export { PricingManagementPageView } from './pricing/PricingManagementPageView';
