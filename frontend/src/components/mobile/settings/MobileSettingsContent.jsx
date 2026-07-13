import React from 'react';
import {
  BadgeCheck,
  HelpCircle,
  Key,
  LogOut,
  Mail,
  Moon,
  Shield,
  Smartphone,
  Sun,
  User,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { Hairline } from '../canon/GroupedList';
import {
  SettingsActionRow,
  SettingsInfoRow,
  SettingsSection,
} from './MobileSettingsPrimitives';

export const MobileSettingsContent = ({
  profile,
  avatarUrl,
  avatarFallback,
  displayId,
  darkMode,
  accountEmail,
  phone,
  roleLabel,
  displayName,
  onThemeChange,
  onEditProfile,
  onOpenSecurity,
  onOpenSupport,
  onSignOut,
  isSigningOut,
  isProvider,
  hasDoctorProfile,
  doctorProfileLoading,
  onOpenDoctor,
}) => (
  <div className="space-y-7">
    <section className="px-4">
      <div className="surface-card rounded-card p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 shrink-0 rounded-icon">
            <AvatarImage src={avatarUrl} className="object-cover" />
            <AvatarFallback className="bg-muted text-xl font-bold text-muted-foreground">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold leading-tight text-foreground">
              {displayName}
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">{accountEmail}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="rounded-pill bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                {roleLabel}
              </Badge>
              {profile?.bvn_verified && (
                <Badge className="rounded-pill bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                  <BadgeCheck className="mr-1 h-3 w-3" />
                  Identity verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        {displayId && (
          <div className="mt-4 rounded-inner bg-foreground/[0.04] px-3 py-2 font-mono text-[11px] text-muted-foreground dark:bg-white/[0.05]">
            Account ID: {displayId}
          </div>
        )}
      </div>
    </section>

    <SettingsSection label="Account">
      <SettingsActionRow
        icon={User}
        title="Edit profile"
        detail="Update your account details and photo"
        onClick={onEditProfile}
        toneClass="bg-sky-500/10 text-sky-700 dark:text-sky-200"
      />
      <Hairline inset={56} />
      <SettingsInfoRow
        icon={Mail}
        title="Email"
        value={accountEmail}
        toneClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
      />
      <Hairline inset={56} />
      <SettingsInfoRow
        icon={Smartphone}
        title="Phone"
        value={phone}
        toneClass="bg-amber-500/10 text-amber-700 dark:text-amber-200"
      />
    </SettingsSection>

    <SettingsSection label="Preferences">
      <div className="flex min-h-[56px] items-center gap-3 px-2 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-violet-500/10 text-violet-700 dark:text-violet-200">
          {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-5 text-foreground">Dark mode</span>
          <span className="mt-0.5 block text-xs leading-[17px] text-muted-foreground">
            Applies on this device
          </span>
        </span>
        <Switch
          checked={darkMode}
          onCheckedChange={onThemeChange}
          aria-label="Toggle dark mode"
        />
      </div>
    </SettingsSection>

    <SettingsSection label="Security and help">
      <SettingsActionRow
        icon={Key}
        title="Password and authentication"
        detail="Review your account security options"
        onClick={onOpenSecurity}
        toneClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
      />
      {isProvider && (
        <>
          <Hairline inset={56} />
          <SettingsActionRow
            icon={Shield}
            title="Professional profile"
            detail={doctorProfileLoading && !hasDoctorProfile
              ? 'Checking provider details'
              : hasDoctorProfile
                ? 'View your provider details'
                : 'No professional profile is available'}
            onClick={hasDoctorProfile ? onOpenDoctor : undefined}
            pending={doctorProfileLoading && !hasDoctorProfile}
            disabled={!doctorProfileLoading && !hasDoctorProfile}
            toneClass="bg-violet-500/10 text-violet-700 dark:text-violet-200"
          />
        </>
      )}
      <Hairline inset={56} />
      <SettingsActionRow
        icon={HelpCircle}
        title="Support"
        detail="Open the support workspace"
        onClick={onOpenSupport}
        toneClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
      />
    </SettingsSection>

    <SettingsSection label="Session">
      <SettingsActionRow
        icon={LogOut}
        title={isSigningOut ? 'Signing out' : 'Sign out'}
        detail={isSigningOut ? 'Ending this session' : 'End this Console session'}
        onClick={onSignOut}
        pending={isSigningOut}
        destructive
        toneClass="bg-destructive/10 text-destructive"
      />
    </SettingsSection>
  </div>
);
