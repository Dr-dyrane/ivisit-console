import React from 'react';
import { motion } from 'framer-motion';
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
      color: 'text-primary',
      bg: 'bg-primary/10',
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
      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Settings</h3>

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
              className={`p-4 flex flex-col items-center justify-center gap-2 rounded-card bg-white/5 shadow-soft transition-all active:scale-[0.98] group ${action.unavailable ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white/10 hover:-translate-y-0.5'}`}
            >
              <div className={`p-2 rounded-icon ${action.bg} ${action.unavailable ? '' : 'group-hover:scale-110'} transition-transform`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${action.color}`}>{action.label}</span>
            </button>
          ))}
        </div>

        <p role="status" aria-live="polite" className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {panelNotice}
        </p>
      </motion.div>

      {/* Account Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Security</h3>

        <div className="bg-success/5 p-4 rounded-card flex items-center gap-4 transition-all group overflow-hidden relative shadow-soft">
          <div className="w-10 h-10 bg-success/20 rounded-icon flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight">Account protection</p>
            <p className="text-[10px] text-success/60 uppercase font-black tracking-widest leading-none mt-1">Review security</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <Activity className="w-16 h-16" />
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-card flex items-center gap-4 group transition-all shadow-soft">
          <div className="w-10 h-10 bg-muted/20 rounded-icon flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight text-muted-foreground">Session</p>
            <p className="text-[10px] text-muted-foreground/40 uppercase font-bold tracking-widest leading-none mt-1">Signed in</p>
          </div>
        </div>
      </motion.div>

      {/* Help Alert */}
      <div className="p-4 rounded-inner bg-blue-500/5 flex items-start gap-3 mt-2">
        <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600/60 leading-relaxed">
          Need help? Open Support from this page.
        </p>
      </div>
    </div>
  );
};
