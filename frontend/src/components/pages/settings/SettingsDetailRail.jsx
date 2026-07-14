import React from 'react';
import {
  BadgeCheck,
  KeyRound,
  Mail,
  Palette,
  Phone,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

import { DetailLine, Shimmer } from '../../console/primitives';
import {
  DetailRailShell,
  RailInsetHero,
} from '../../console/WorkspaceStage';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { formatSettingsAccountName } from './settingsPageModel';

export const SettingsDetailRail = ({
  loading,
  profile,
  user,
  displayId,
  avatarUrl,
  avatarFallback,
  darkMode,
  roleLabel,
  isProvider,
  doctorProfile,
  onAvatarError,
  onOpenSecurity,
  onOpenDoctor,
  embedded = false,
}) => {
  if (loading) {
    return (
      <DetailRailShell embedded={embedded}>
        <div data-testid="settings-detail-rail-skeleton">
          <Shimmer className="h-5 w-28 rounded-pill" />
          <Shimmer className="mt-5 h-40 rounded-modal" />
          <div className="mt-4 space-y-3">
            <Shimmer className="h-14 rounded-inner" />
            <Shimmer className="h-14 rounded-inner" />
            <Shimmer className="h-14 rounded-inner" />
            <Shimmer className="h-14 rounded-inner" />
          </div>
          <Shimmer className="mt-5 h-12 rounded-button" />
        </div>
      </DetailRailShell>
    );
  }

  const email = user?.email || profile?.email || 'Not set';
  const accountName = formatSettingsAccountName(profile);

  return (
    <DetailRailShell embedded={embedded}>
      <div data-testid="settings-detail-rail">
        <RailInsetHero>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0 rounded-icon bg-background shadow-e2">
              <AvatarImage src={avatarUrl} className="object-cover" onError={onAvatarError} />
              <AvatarFallback className="rounded-icon bg-muted text-xl font-semibold text-muted-foreground">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Signed-in account</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-foreground" title={accountName}>
                {accountName}
              </h2>
              {displayId && (
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" title={displayId}>
                  {displayId}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-pill bg-foreground/[0.055] px-3 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/[0.06]">
              {roleLabel}
            </span>
            {profile?.bvn_verified && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-200">
                <BadgeCheck className="h-3.5 w-3.5" />
                Identity verified
              </span>
            )}
          </div>
        </RailInsetHero>

        <div className="space-y-2">
          <DetailLine icon={Mail} label="Email" value={email} />
          <DetailLine icon={Phone} label="Mobile" value={profile?.phone || 'Not added'} />
          <DetailLine icon={Palette} label="Appearance" value={darkMode ? 'Dark' : 'Light'} />
          <DetailLine icon={ShieldCheck} label="Access" value={roleLabel} />
        </div>

        <div className="mt-5 space-y-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenSecurity}
            className="h-12 w-full justify-start rounded-button bg-foreground/[0.055] px-4 text-sm font-semibold hover:bg-foreground/10"
          >
            <KeyRound className="mr-3 h-4 w-4 text-muted-foreground" />
            Security settings
          </Button>
          {isProvider && doctorProfile && (
            <Button
              type="button"
              variant="ghost"
              onClick={onOpenDoctor}
              className="h-12 w-full justify-start rounded-button bg-foreground/[0.055] px-4 text-sm font-semibold hover:bg-foreground/10"
            >
              <Stethoscope className="mr-3 h-4 w-4 text-muted-foreground" />
              View professional profile
            </Button>
          )}
        </div>
      </div>
    </DetailRailShell>
  );
};
