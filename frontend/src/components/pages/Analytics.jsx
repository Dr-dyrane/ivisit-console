import React from 'react';
import { AnalyticsPageView } from './analytics/AnalyticsPageView';
import { useAnalyticsPageChrome } from './analytics/useAnalyticsPageChrome';
import { useAnalyticsPageController } from './analytics/useAnalyticsPageController';

export const Analytics = () => {
  const controller = useAnalyticsPageController();
  useAnalyticsPageChrome(controller);

  return <AnalyticsPageView controller={controller} />;
};

export default Analytics;
