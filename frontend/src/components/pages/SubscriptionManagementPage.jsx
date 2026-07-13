import React from 'react';
import { SubscriptionManagementPageView } from './subscriptions/SubscriptionManagementPageView';
import { useSubscriptionPageChrome } from './subscriptions/useSubscriptionPageChrome';
import { useSubscriptionPageController } from './subscriptions/useSubscriptionPageController';

// Compatibility entry point for AppRoutes and existing named imports. Subscriber projection,
// route state, shell chrome, and responsive presentation live under ./subscriptions.
export const SubscriptionManagementPage = () => {
  const controller = useSubscriptionPageController();
  useSubscriptionPageChrome(controller);

  return <SubscriptionManagementPageView controller={controller} />;
};
