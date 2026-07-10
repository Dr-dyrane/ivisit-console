import React from 'react';
import {
  UserCog,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  Activity,
  Clock
} from 'lucide-react';

export const SettingsPanel = () => {
  const [panelNotice, setPanelNotice] = React.useState('Settings actions ready.');
  const billingUnavailableMessage = 'Billing unavailable until account plan source is verified.';

  // Quick Actions configuration
  const quickActions = [
    {
      label: 'Edit Profile',
      icon: UserCog,
      color: 'text-sky-600 dark:text-sky-200',
      bg: 'bg-sky-500/10',
      action: () => window.dispatchEvent(new Event('openProfileModal'))
    },
    {
      label: 'Security',
      icon: ShieldCheck,
      color: 'text-success',
      bg: 'bg-success/10',
      action: () => window.dispatchEvent(new Event('openSecurityModal'))
    },
    {
      label: 'Billing',
      icon: CreditCard,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      unavailable: true,
      action: () => setPanelNotice(billingUnavailableMessage)
    },
    {
      label: 'Help',
      icon: HelpCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      action: () => window.dispatchEvent(new Event('openSupportModal'))
    },
  ];

  return (
    <div className="space-y-4">
      {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
      {/* Quick Actions Grid */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground ml-1">Settings</h3>

        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={action.action}
              aria-disabled={action.unavailable ? 'true' : undefined}
              aria-label={action.unavailable ? `${action.label} unavailable` : action.label}
              data-state={action.unavailable ? 'unavailable' : 'ready'}
              title={action.unavailable ? billingUnavailableMessage : action.label}
              className={`p-4 flex flex-col items-center justify-center gap-2 rounded-card surface-card shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-all active:scale-[0.96] group ${action.unavailable ? 'opacity-70 cursor-not-allowed' : 'hover:bg-foreground/[0.08] dark:hover:bg-white/[0.10] hover:-translate-y-0.5'}`}
            >
              <div className={`p-2 rounded-icon ${action.bg} ${action.unavailable ? '' : 'group-hover:scale-110'} transition-transform`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${action.color}`}>{action.label}</span>
            </button>
          ))}
        </div>

        <p role="status" aria-live="polite" className="px-1 text-xs font-medium text-muted-foreground">
          {panelNotice}
        </p>
      </div>

      {/* Account Status */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground ml-1">Security</h3>

        <div className="bg-success/5 p-4 rounded-card flex items-center gap-4 transition-all group overflow-hidden relative shadow-[0_4px_12px_rgb(0_0_0/0.07)]">
          <div className="w-10 h-10 bg-success/20 rounded-icon flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight">Account protection</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Review security</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <Activity className="w-16 h-16" />
          </div>
        </div>

        <div className="surface-card p-4 rounded-card flex items-center gap-4 group transition-all shadow-[0_4px_12px_rgb(0_0_0/0.07)]">
          <div className="w-10 h-10 bg-muted/20 rounded-icon flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight text-muted-foreground">Session</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Signed in</p>
          </div>
        </div>
      </div>

      {/* Help Alert */}
      <div className="p-4 rounded-inner bg-blue-500/5 flex items-start gap-3 mt-2">
        <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs font-medium leading-5 text-muted-foreground">
          Need help? Open Support from this page.
        </p>
      </div>
    </div>
  );
};
