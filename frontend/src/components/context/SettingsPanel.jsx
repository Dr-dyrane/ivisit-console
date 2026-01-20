import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  UserCog,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const SettingsPanel = () => {
  // Quick Actions configuration
  const quickActions = [
    { label: 'Edit Profile', icon: UserCog, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'Security', icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { label: 'Billing', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Help', icon: HelpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className={`p-3 h-24 flex flex-col items-center justify-center gap-2 squircle-2xl border ${action.bg} ${action.border} hover:bg-opacity-80 transition-all`}
            >
              <action.icon className={`w-6 h-6 ${action.color}`} />
              <span className={`text-xs font-bold ${action.color}`}>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Account Health / Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Account Status</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-2xl p-4 border-0 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Activity className="w-12 h-12" />
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-full text-success">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Active & Verified</p>
                <p className="text-xs text-muted-foreground">No issues detected</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Last Synced</p>
                <p className="text-xs text-muted-foreground">Just now</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Support Snippet */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-4 squircle-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-blue-600">Need help?</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your administrator or create a support ticket.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
