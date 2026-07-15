import React from 'react';

import { MobileSettings } from '../../mobile/MobileSettings';
import { TabletSettings } from '../../tablet/TabletSettings';
import { useNavigation } from '../../../contexts/NavigationContext';
import { SettingsDesktopWorkspace } from './SettingsDesktopWorkspace';
import { SettingsModalStack } from './SettingsModalStack';

export const SettingsPageView = ({
  isProfileModalOpen,
  mobileProps,
  desktopProps,
  ...modalProps
}) => {
  const { isPhone, isTablet } = useNavigation();

  return (
    <div className={isPhone || isTablet ? 'min-h-screen' : 'min-h-[calc(100dvh-3rem)] text-foreground'}>
      {isPhone ? (
        <MobileSettings {...mobileProps} />
      ) : isTablet ? (
        <TabletSettings {...desktopProps} />
      ) : (
        <SettingsDesktopWorkspace {...desktopProps} />
      )}
      <SettingsModalStack
        isProfileModalOpen={isProfileModalOpen}
        {...modalProps}
      />
    </div>
  );
};
