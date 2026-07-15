import React, { useMemo } from 'react';
import { TabletPageShell } from './TabletPageShell';
import { SettingsSheet } from '../pages/settings/SettingsAccountSheet';
import { SettingsDetailRail } from '../pages/settings/SettingsDetailRail';
import { getSettingsMetrics } from '../pages/settings/settingsDesktopModel';

export const TabletSettings = ({
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
  const metrics = useMemo(() => getSettingsMetrics({
    roleLabel,
    darkMode,
    phone: profile?.phone,
  }).slice(0, 3), [darkMode, profile?.phone, roleLabel]);

  return (
    <TabletPageShell
      detail={(
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
          embedded
        />
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid grid-cols-3 gap-2" aria-label="Account summary">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.id} className="flex min-h-[64px] min-w-0 items-center gap-2.5 rounded-card bg-card/68 px-3 shadow-e1">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${metric.toneClass || 'bg-muted/35 text-muted-foreground'}`}>
                  {Icon && <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-muted-foreground">{metric.label}</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">{loading ? '-' : metric.value}</span>
                </span>
              </div>
            );
          })}
        </div>

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
      </div>
    </TabletPageShell>
  );
};

export default TabletSettings;
