import React from 'react';
import { HealthNewsPageView } from './health-news/HealthNewsPageView';
import { useHealthNewsPageChrome } from './health-news/useHealthNewsPageChrome';
import { useHealthNewsPageController } from './health-news/useHealthNewsPageController';

// Compatibility entry for AppRoutes. Health News remains a read-only published-feed
// projection; page-owned state, projection, and presentation live under ./health-news.
export const HealthNewsManagementPage = () => {
  const controller = useHealthNewsPageController();
  useHealthNewsPageChrome({
    filterSheetOpen: controller.filterSheetOpen,
    hasFilter: controller.hasFilter,
    onOpenFilters: controller.handleOpenFilters,
  });

  return <HealthNewsPageView controller={controller} />;
};
