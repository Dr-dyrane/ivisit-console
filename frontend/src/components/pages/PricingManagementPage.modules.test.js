jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobilePricing } from '../mobile/MobilePricing';
import { MobilePricingDetailSheet } from '../mobile/pricing/MobilePricingDetailSheet';
import { MobilePricingList } from '../mobile/pricing/MobilePricingList';
import { PricingManagementPage } from './PricingManagementPage';
import { PricingDesktopWorkspace } from './pricing/PricingDesktopWorkspace';
import { PricingDetailRail } from './pricing/PricingDetailRail';
import { PricingManagementPageView } from './pricing/PricingManagementPageView';
import { usePricingPageChrome } from './pricing/usePricingPageChrome';
import { usePricingPageController } from './pricing/usePricingPageController';
import { usePricingRouteBridge } from './pricing/usePricingRouteBridge';

describe('Pricing module boundaries', () => {
  it.each([
    ['PricingManagementPage', PricingManagementPage],
    ['PricingManagementPageView', PricingManagementPageView],
    ['PricingDesktopWorkspace', PricingDesktopWorkspace],
    ['PricingDetailRail', PricingDetailRail],
    ['usePricingPageController', usePricingPageController],
    ['usePricingPageChrome', usePricingPageChrome],
    ['usePricingRouteBridge', usePricingRouteBridge],
    ['MobilePricing', MobilePricing],
    ['MobilePricingList', MobilePricingList],
    ['MobilePricingDetailSheet', MobilePricingDetailSheet],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
