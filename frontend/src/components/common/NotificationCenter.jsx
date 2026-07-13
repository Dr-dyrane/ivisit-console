import React from 'react';
import { NotificationCenterView } from './notification-center/NotificationCenterView';
import { useNotificationCenterController } from './notification-center/useNotificationCenterController';

export const NotificationCenter = () => {
  const controller = useNotificationCenterController();
  return <NotificationCenterView controller={controller} />;
};
