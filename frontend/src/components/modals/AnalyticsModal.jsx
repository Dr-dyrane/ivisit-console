import React from 'react';

import { AnalyticsModalView } from './analytics/AnalyticsModalView';
import { useAnalyticsModalController } from './analytics/useAnalyticsModalController';

export const AnalyticsModal = ({ open, onClose, analytics, type = 'news' }) => {
  const controller = useAnalyticsModalController({ onClose, type });

  if (!analytics) return null;

  return (
    <AnalyticsModalView
      analytics={analytics}
      controller={controller}
      open={open}
      type={type}
    />
  );
};
