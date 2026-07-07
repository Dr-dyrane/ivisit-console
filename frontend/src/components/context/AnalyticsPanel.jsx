import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  FileText
} from 'lucide-react';

const SOURCE_PENDING_LABEL = 'Source pending';
const ANALYTICS_UNAVAILABLE_MESSAGE = 'Reports unavailable until analytics scope is verified.';

const panelSignals = [
  { label: 'Request volume', Icon: BarChart3 },
  { label: 'Completion', Icon: TrendingUp },
  { label: 'Response time', Icon: Clock },
];

export const AnalyticsPanel = () => {
  const [panelNotice, setPanelNotice] = useState('Analytics scope pending.');

  const handleUnavailableAction = useCallback(() => {
    setPanelNotice(ANALYTICS_UNAVAILABLE_MESSAGE);
  }, []);

  return (
    <div className="space-y-4">
      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Overview</h3>

        <div className="bg-muted/20 p-4 rounded-3xl flex items-start gap-3">
          <div className="w-10 h-10 bg-muted/40 rounded-2xl flex items-center justify-center">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold tracking-tight">Analytics scope</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Verified reporting is not ready yet.
            </p>
          </div>
        </div>

        {panelSignals.map(({ label, Icon }) => (
          <div key={label} className="bg-muted/15 p-4 rounded-3xl flex items-center justify-between group transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted/30 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-bold tracking-tight">{label}</span>
            </div>
            <Badge className="bg-muted/40 text-muted-foreground border-0 rounded-full">{SOURCE_PENDING_LABEL}</Badge>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Reporting</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleUnavailableAction}
            aria-disabled="true"
            data-state="unavailable"
            title={ANALYTICS_UNAVAILABLE_MESSAGE}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-muted/30 hover:bg-muted/40 transition-all border-0 group"
          >
            <FileText className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reports</span>
          </button>

          <button
            type="button"
            onClick={handleUnavailableAction}
            aria-disabled="true"
            data-state="unavailable"
            title={ANALYTICS_UNAVAILABLE_MESSAGE}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-muted/30 hover:bg-muted/40 transition-all border-0 group"
          >
            <TrendingUp className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Export</span>
          </button>
        </div>
        <p role="status" aria-live="polite" className="px-1 text-xs leading-5 text-muted-foreground">
          {panelNotice}
        </p>
      </motion.div>
    </div>
  );
};
