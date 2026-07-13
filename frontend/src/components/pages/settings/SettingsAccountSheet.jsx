import React from 'react';
import {
  CreditCard,
  HelpCircle,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Stethoscope,
  Sun,
  UserRound,
} from 'lucide-react';

import { Shimmer } from '../../console/primitives';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';

const SettingRow = ({ icon: Icon, iconClass, title, description, children }) => (
  <div className="flex min-h-[88px] items-center gap-3 rounded-card bg-background/40 p-3.5 dark:bg-black/[0.08]">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-icon ${iconClass}`}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-foreground">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </span>
    <span className="shrink-0">{children}</span>
  </div>
);

export const SettingsSheetSkeleton = ({ rowCount }) => (
  <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden xl:grid-cols-2" data-testid="settings-sheet-skeleton">
    {Array.from({ length: rowCount }).map((_, index) => (
      <Shimmer key={index} className="h-[88px] rounded-card" />
    ))}
  </div>
);

export const SettingsSheet = ({
  loading,
  darkMode,
  isSigningOut,
  isProvider,
  hasDoctorProfile,
  canOpenSupport,
  onToggleDarkMode,
  onEditProfile,
  onOpenSecurity,
  onOpenSupport,
  onOpenDoctor,
  onSignOut,
}) => (
  <section
    className="flex min-h-[330px] min-w-0 flex-1 flex-col overflow-hidden rounded-t-sheet bg-card/68 p-3 shadow-e3 backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet lg:min-h-0"
    data-testid="settings-account-sheet"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    <div className="flex items-start justify-between gap-4 px-2">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Account and preferences</h2>
        <p className="mt-1 text-xs text-muted-foreground">Profile, appearance, security, help, and session controls.</p>
      </div>
      {!loading && (
        <span className="rounded-pill bg-background/45 px-3 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/[0.05]">
          Personal settings
        </span>
      )}
    </div>

    {loading ? (
      <SettingsSheetSkeleton rowCount={isProvider ? 7 : 6} />
    ) : (
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1 no-scrollbar xl:grid-cols-2">
        <SettingRow
          icon={UserRound}
          iconClass="bg-sky-500/10 text-sky-700 dark:text-sky-200"
          title="Profile"
          description="Name, photo, and contact details."
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onEditProfile}
            className="h-9 rounded-button bg-foreground/[0.055] px-3 text-xs font-semibold hover:bg-foreground/10"
          >
            Edit
          </Button>
        </SettingRow>

        <SettingRow
          icon={darkMode ? Moon : Sun}
          iconClass="bg-amber-500/10 text-amber-700 dark:text-amber-200"
          title="Dark mode"
          description={darkMode ? 'Dark appearance is on.' : 'Light appearance is on.'}
        >
          <Switch
            checked={darkMode}
            onCheckedChange={onToggleDarkMode}
            aria-label="Toggle dark mode"
          />
        </SettingRow>

        <SettingRow
          icon={KeyRound}
          iconClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          title="Password and authentication"
          description="Review password and authentication options."
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenSecurity}
            className="h-9 rounded-button bg-foreground/[0.055] px-3 text-xs font-semibold hover:bg-foreground/10"
          >
            Review
          </Button>
        </SettingRow>

        <SettingRow
          icon={CreditCard}
          iconClass="bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]"
          title="Billing"
          description="Billing details are not available for this account yet."
        >
          <span className="rounded-pill bg-muted/35 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            Plan unavailable
          </span>
        </SettingRow>

        <SettingRow
          icon={HelpCircle}
          iconClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
          title="Support"
          description={canOpenSupport ? 'Start a support request.' : 'Support is unavailable for this account.'}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenSupport}
            aria-disabled={!canOpenSupport}
            data-state={canOpenSupport ? 'ready' : 'unavailable'}
            className="h-9 rounded-button bg-foreground/[0.055] px-3 text-xs font-semibold hover:bg-foreground/10"
          >
            {canOpenSupport ? 'Open' : 'Unavailable'}
          </Button>
        </SettingRow>

        {isProvider && (
          <SettingRow
            icon={Stethoscope}
            iconClass="bg-violet-500/10 text-violet-700 dark:text-violet-200"
            title="Professional profile"
            description={hasDoctorProfile ? 'View your professional account details.' : 'No professional profile is available for this account.'}
          >
            {hasDoctorProfile ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onOpenDoctor}
                className="h-9 rounded-button bg-foreground/[0.055] px-3 text-xs font-semibold hover:bg-foreground/10"
              >
                View
              </Button>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">Unavailable</span>
            )}
          </SettingRow>
        )}

        <SettingRow
          icon={LogOut}
          iconClass="bg-destructive/10 text-destructive"
          title={isSigningOut ? 'Signing out...' : 'Sign out'}
          description="End the current console session."
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onSignOut}
            disabled={isSigningOut}
            aria-busy={isSigningOut ? 'true' : undefined}
            data-state={isSigningOut ? 'pending' : 'ready'}
            className="h-9 rounded-button bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/15"
          >
            {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign out'}
          </Button>
        </SettingRow>
      </div>
    )}
  </section>
);
