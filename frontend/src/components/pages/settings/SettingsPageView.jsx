import React from 'react';

import { MobileSettings } from '../../mobile/MobileSettings';
import { SettingsDesktopWorkspace } from './SettingsDesktopWorkspace';
import { SettingsDetailRail } from './SettingsDetailRail';
import { SettingsModalStack } from './SettingsModalStack';

export const SettingsPageView = ({
  isMobile,
  isProfileModalOpen,
  mobileProps,
  desktopProps,
  ...modalProps
}) => (
    <div className={isMobile ? 'min-h-screen' : 'min-h-[calc(100dvh-3rem)] text-foreground'}>
      {isMobile
        ? (
          <MobileSettings
            {...mobileProps}
            tabletPane={<SettingsDetailRail {...desktopProps} embedded />}
          />
        )
        : <SettingsDesktopWorkspace {...desktopProps} />}
      <SettingsModalStack
        isProfileModalOpen={isProfileModalOpen}
        {...modalProps}
      />
    </div>
);
