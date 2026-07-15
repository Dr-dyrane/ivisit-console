import React, { useCallback } from 'react';

import { useFeedback } from '../../../hooks/useFeedback';
import { MobilePageShell } from '../MobilePageShell';
import { useSkeletonWarmup } from '../canon/Loading';
import { MobileSettingsContent } from './MobileSettingsContent';
import { MobileSettingsSkeleton } from './MobileSettingsSkeleton';
import {
  getMobileSettingsProjection,
  shouldShowMobileSettingsSkeleton,
} from './mobileSettingsModel';

export const MobileSettings = ({
  loading = false,
  profile,
  user,
  avatarUrl,
  avatarFallback,
  displayId,
  darkMode,
  onToggleDarkMode,
  onEditProfile,
  onOpenSecurity,
  onOpenSupport,
  onSignOut,
  isSigningOut = false,
  isProvider,
  hasDoctorProfile = false,
  doctorProfileLoading = false,
  onOpenDoctor,
}) => {
  // grammar:hero=account-identity-card-is-the-settings-signal-hero
  const warmingUp = useSkeletonWarmup();
  const { triggerInfo } = useFeedback();
  const showSkeleton = shouldShowMobileSettingsSkeleton({ warmingUp, loading, profile, user });
  const projection = getMobileSettingsProjection({ profile, user });
  const handleThemeChange = useCallback((checked) => {
    triggerInfo({
      color: 'hsl(var(--foreground))',
      haptic: true,
      sound: true,
    });
    onToggleDarkMode?.(checked);
  }, [onToggleDarkMode, triggerInfo]);

  return (
    <MobilePageShell
      animatePageLoad={false}
      contentClassName="min-h-[calc(100dvh-3rem)] bg-background px-0 pb-32 pt-6 text-foreground"
    >
      {showSkeleton ? (
        <MobileSettingsSkeleton />
      ) : (
        <MobileSettingsContent
          profile={profile}
          avatarUrl={avatarUrl}
          avatarFallback={avatarFallback}
          displayId={displayId}
          darkMode={darkMode}
          onThemeChange={handleThemeChange}
          onEditProfile={onEditProfile}
          onOpenSecurity={onOpenSecurity}
          onOpenSupport={onOpenSupport}
          onSignOut={onSignOut}
          isSigningOut={isSigningOut}
          isProvider={isProvider}
          hasDoctorProfile={hasDoctorProfile}
          doctorProfileLoading={doctorProfileLoading}
          onOpenDoctor={onOpenDoctor}
          {...projection}
        />
      )}
    </MobilePageShell>
  );
};
