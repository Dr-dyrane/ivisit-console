import React, { useMemo } from 'react';

import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { SettingsHeaderAction } from './SettingsHeaderAction';

export const useSettingsPageChrome = ({
  isMobile,
  isProfileModalOpen,
  onOpenProfile,
}) => {
  const headerActions = useMemo(() => {
    if (isMobile) return null;

    return (
      <SettingsHeaderAction
        isProfileModalOpen={isProfileModalOpen}
        onOpenProfile={onOpenProfile}
      />
    );
  }, [isMobile, isProfileModalOpen, onOpenProfile]);

  usePageHeader('Settings', headerActions);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
