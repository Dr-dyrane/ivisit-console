import React from 'react';

import { SettingsPageView } from './settings/SettingsPageView';
import { useSettingsPageController } from './settings/useSettingsPageController';

export const SettingsPage = () => {
  const controller = useSettingsPageController();

  return <SettingsPageView {...controller} />;
};
