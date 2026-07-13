jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileSubscriptions } from '../mobile/MobileSubscriptions';
import { MobileSubscriptionDetailSheet } from '../mobile/subscriptions/MobileSubscriptionDetailSheet';
import { MobileSubscriptionsAtlasLayer } from '../mobile/subscriptions/MobileSubscriptionsAtlasLayer';
import { useMobileSubscriptionsController } from '../mobile/subscriptions/useMobileSubscriptionsController';
import { SubscriptionManagementPage } from './SubscriptionManagementPage';
import { SubscriptionManagementPageView } from './subscriptions/SubscriptionManagementPageView';
import { SubscriptionsDesktopWorkspace } from './subscriptions/SubscriptionsDesktopWorkspace';
import { useSubscriptionPageChrome } from './subscriptions/useSubscriptionPageChrome';
import { useSubscriptionPageController } from './subscriptions/useSubscriptionPageController';

describe('Subscriptions module compatibility exports', () => {
  it.each([
    ['SubscriptionManagementPage', SubscriptionManagementPage],
    ['SubscriptionManagementPageView', SubscriptionManagementPageView],
    ['SubscriptionsDesktopWorkspace', SubscriptionsDesktopWorkspace],
    ['useSubscriptionPageController', useSubscriptionPageController],
    ['useSubscriptionPageChrome', useSubscriptionPageChrome],
    ['MobileSubscriptions', MobileSubscriptions],
    ['MobileSubscriptionDetailSheet', MobileSubscriptionDetailSheet],
    ['MobileSubscriptionsAtlasLayer', MobileSubscriptionsAtlasLayer],
    ['useMobileSubscriptionsController', useMobileSubscriptionsController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
