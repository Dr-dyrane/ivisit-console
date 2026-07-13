import React from 'react';
import { CreditCard, HelpCircle, KeyRound, Mail, ShieldCheck, UserCog } from 'lucide-react';

import { Shimmer } from '../console/primitives';

const BILLING_UNAVAILABLE = 'Billing is not available for this account yet.';
const SUPPORT_UNAVAILABLE = 'Support is unavailable for this account.';
const name = (profile) => profile?.full_name
  || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  || profile?.username
  || 'User profile';

const SettingsPanelSkeleton = () => (
  <div className="space-y-5 py-1" data-testid="settings-panel-skeleton">
    <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        <Shimmer className="h-11 w-11 shrink-0 rounded-icon" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-4 w-2/3 rounded-inner" />
          <Shimmer className="h-3 w-5/6 rounded-inner" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Shimmer className="h-[58px] rounded-inner" />
        <Shimmer className="h-[58px] rounded-inner" />
      </div>
    </section>
    <section>
      <Shimmer className="h-4 w-28 rounded-inner" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((item) => <Shimmer key={item} className="h-[76px] rounded-button" />)}
      </div>
    </section>
    <section className="space-y-2">
      <Shimmer className="h-4 w-24 rounded-inner" />
      <Shimmer className="h-[58px] rounded-inner" />
      <Shimmer className="h-[58px] rounded-inner" />
    </section>
  </div>
);

export const SettingsPanel = ({ settingsContext = null }) => {
  const [panelNotice, setPanelNotice] = React.useState('Choose an account action.');

  if (!settingsContext || (settingsContext.loading && !settingsContext.profile)) {
    return <SettingsPanelSkeleton />;
  }

  const profile = settingsContext.profile || {};
  const dispatchAction = (eventName, pendingMessage) => {
    setPanelNotice(pendingMessage);
    window.dispatchEvent(new Event(eventName));
  };
  const actions = [
    {
      label: 'Edit profile',
      icon: UserCog,
      tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
      run: () => dispatchAction('openProfileModal', 'Opening profile editor...'),
    },
    {
      label: 'Security',
      icon: ShieldCheck,
      tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
      run: () => dispatchAction('openSecurityModal', 'Opening security settings...'),
    },
    {
      label: 'Billing',
      icon: CreditCard,
      tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
      unavailable: true,
      run: () => setPanelNotice(BILLING_UNAVAILABLE),
    },
    {
      label: 'Support',
      icon: HelpCircle,
      tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
      unavailable: !settingsContext.canOpenSupport,
      run: () => settingsContext.canOpenSupport
        ? dispatchAction('openSupportModal', 'Opening support...')
        : setPanelNotice(SUPPORT_UNAVAILABLE),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
            <UserCog className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{name(profile)}</h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">{settingsContext.user?.email || profile.email || 'No email'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-inner bg-background/50 p-3 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Access</p>
            <p className="mt-1 truncate text-sm font-semibold capitalize">{String(profile.role || 'viewer').replace('_', ' ')}</p>
          </div>
          <div className="rounded-inner bg-background/50 p-3 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Theme</p>
            <p className="mt-1 text-sm font-semibold">{settingsContext.darkMode ? 'Dark' : 'Light'}</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Account actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ label, icon: Icon, tone, unavailable, run }) => (
            <button
              key={label}
              type="button"
              onClick={run}
              aria-disabled={unavailable ? 'true' : undefined}
              data-state={unavailable ? 'unavailable' : 'ready'}
              title={unavailable ? (label === 'Billing' ? BILLING_UNAVAILABLE : SUPPORT_UNAVAILABLE) : label}
              className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-button bg-background/45 p-3 transition-all active:scale-[0.97] dark:bg-white/[0.04] ${unavailable ? 'text-muted-foreground opacity-70' : 'text-foreground hover:bg-foreground/10'}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-icon ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="mt-2 px-1 text-xs text-muted-foreground">{panelNotice}</p>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Account details</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
            <Mail className="h-4 w-4 text-sky-700 dark:text-sky-200" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="mt-1 truncate text-sm font-medium">{settingsContext.user?.email || profile.email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
            <KeyRound className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
            <div>
              <p className="text-xs text-muted-foreground">Security</p>
              <p className="mt-1 text-sm font-medium">Password and authentication</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
