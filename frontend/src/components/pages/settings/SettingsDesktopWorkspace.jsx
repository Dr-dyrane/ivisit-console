import React, { useMemo } from 'react';

import { MetricStrip } from '../../console/MetricStrip';
import { SignalPanel } from '../../console/SignalPanel';
import { WorkspaceStage, useWayfindingNav } from '../../console/WorkspaceStage';
import { SettingsSheet } from './SettingsAccountSheet';
import { SettingsDetailRail } from './SettingsDetailRail';
import {
  getSettingsMetrics,
  getSettingsSignal,
  SETTINGS_TONE_CLASS,
} from './settingsDesktopModel';

export const SettingsDesktopWorkspace = ({
  moduleRailItems,
  loading,
  profile,
  user,
  displayId,
  avatarUrl,
  avatarFallback,
  darkMode,
  roleLabel,
  isSigningOut,
  isProvider,
  doctorProfile,
  canOpenSupport,
  onAvatarError,
  onToggleDarkMode,
  onEditProfile,
  onOpenSecurity,
  onOpenSupport,
  onOpenDoctor,
  onSignOut,
}) => {
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const signal = useMemo(() => getSettingsSignal(roleLabel), [roleLabel]);
  const metrics = useMemo(() => getSettingsMetrics({
    roleLabel,
    darkMode,
    phone: profile?.phone,
  }), [darkMode, profile?.phone, roleLabel]);

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/settings"
      routingPath={routingPath}
      onRailNavigate={handleRailNavigate}
      rail={(
        <SettingsDetailRail
          loading={loading}
          profile={profile}
          user={user}
          displayId={displayId}
          avatarUrl={avatarUrl}
          avatarFallback={avatarFallback}
          darkMode={darkMode}
          roleLabel={roleLabel}
          isProvider={isProvider}
          doctorProfile={doctorProfile}
          onAvatarError={onAvatarError}
          onOpenSecurity={onOpenSecurity}
          onOpenDoctor={onOpenDoctor}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={SETTINGS_TONE_CLASS}>
        <MetricStrip items={metrics} loading={loading} max={3} dataAttr="data-settings-metric" />
      </SignalPanel>

      <SettingsSheet
        loading={loading}
        darkMode={darkMode}
        isSigningOut={isSigningOut}
        isProvider={isProvider}
        hasDoctorProfile={Boolean(doctorProfile)}
        canOpenSupport={canOpenSupport}
        onToggleDarkMode={onToggleDarkMode}
        onEditProfile={onEditProfile}
        onOpenSecurity={onOpenSecurity}
        onOpenSupport={onOpenSupport}
        onOpenDoctor={onOpenDoctor}
        onSignOut={onSignOut}
      />
    </WorkspaceStage>
  );
};

export default SettingsDesktopWorkspace;
