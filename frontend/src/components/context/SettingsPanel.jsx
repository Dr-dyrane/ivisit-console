import React from 'react';
import { CreditCard, HelpCircle, Key, Mail, ShieldCheck, UserCog } from 'lucide-react';

const BILLING_UNAVAILABLE = 'Billing unavailable until account plan source is verified.';
const name = (profile) => profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || 'User profile';

export const SettingsPanel = ({ settingsContext = null }) => {
  const [panelNotice, setPanelNotice] = React.useState('Settings actions ready.');
  const profile = settingsContext?.profile || {};
  const actions = [
    { label: 'Edit profile', icon: UserCog, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-200', run: () => window.dispatchEvent(new Event('openProfileModal')) },
    { label: 'Security', icon: ShieldCheck, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200', run: () => window.dispatchEvent(new Event('openSecurityModal')) },
    { label: 'Billing', icon: CreditCard, tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]', unavailable: true, run: () => setPanelNotice(BILLING_UNAVAILABLE) },
    { label: 'Support', icon: HelpCircle, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200', unavailable: settingsContext ? !settingsContext.canOpenSupport : false, run: () => settingsContext?.canOpenSupport ? window.dispatchEvent(new Event('openSupportModal')) : setPanelNotice('Support is unavailable for this role.') },
  ];

  if (settingsContext?.loading && !settingsContext?.profile) return <div className="space-y-3 py-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}</div>;

  return <div className="space-y-5">
    <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200"><UserCog className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-base font-semibold">{name(profile)}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{settingsContext?.user?.email || profile.email || 'No email'}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-inner bg-background/50 p-3 dark:bg-white/[0.04]"><p className="text-xs text-muted-foreground">Role</p><p className="mt-1 truncate text-sm font-semibold capitalize">{String(profile.role || 'viewer').replace('_', ' ')}</p></div><div className="rounded-inner bg-background/50 p-3 dark:bg-white/[0.04]"><p className="text-xs text-muted-foreground">Theme</p><p className="mt-1 text-sm font-semibold">{settingsContext?.darkMode ? 'Dark' : 'Light'}</p></div></div></section>
    <section><h3 className="mb-3 text-sm font-semibold">Account actions</h3><div className="grid grid-cols-2 gap-2">{actions.map(({ label, icon: Icon, tone, unavailable, run }) => <button key={label} type="button" onClick={run} aria-disabled={unavailable ? 'true' : undefined} data-state={unavailable ? 'unavailable' : 'ready'} title={unavailable ? (label === 'Billing' ? BILLING_UNAVAILABLE : `${label} unavailable`) : label} className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-button bg-background/45 p-3 transition-all active:scale-[0.97] dark:bg-white/[0.04] ${unavailable ? 'text-muted-foreground opacity-70' : 'text-foreground hover:bg-foreground/10'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-icon ${tone}`}><Icon className="h-4 w-4" /></span><span className="text-xs font-medium">{label}</span></button>)}</div><p role="status" aria-live="polite" className="mt-2 px-1 text-xs text-muted-foreground">{panelNotice}</p></section>
    <section><h3 className="mb-3 text-sm font-semibold">Account evidence</h3><div className="space-y-2"><div className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><Mail className="h-4 w-4 text-sky-700 dark:text-sky-200" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Email</p><p className="mt-1 truncate text-sm font-medium">{settingsContext?.user?.email || profile.email || 'Not set'}</p></div></div><div className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><Key className="h-4 w-4 text-emerald-700 dark:text-emerald-200" /><div><p className="text-xs text-muted-foreground">Security</p><p className="mt-1 text-sm font-medium">Review available</p></div></div></div></section>
  </div>;
};
