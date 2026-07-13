import React from 'react';
import { motion } from 'framer-motion';

export const AnalyticsStatNode = ({ label, value, trend, icon: Icon, color }) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    className="p-3.5 rounded-inner bg-foreground/[0.03] dark:bg-white/[0.04] relative overflow-hidden group active:bg-foreground/[0.06] transition-colors"
  >
    <div className="flex justify-between items-start mb-2.5">
      <div
        className="w-8 h-8 rounded-icon flex items-center justify-center relative z-10"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color.replace(/\)$/, ' / 0.15)')}, ${color.replace(/\)$/, ' / 0.05)')})` }}
      >
        <Icon size={14} className="opacity-80" style={{ color }} />
      </div>
      {trend && (
        <span className="text-[10px] font-bold tabular-nums text-emerald-500 px-1.5 py-0.5 rounded-pill bg-emerald-500/5 self-center">
          {trend}
        </span>
      )}
    </div>

    <div className="flex flex-col">
      <span className="eyebrow mb-0.5 text-muted-foreground/60 transition-opacity group-hover:text-muted-foreground/80">
        {label}
      </span>
      <span className="font-dashboard-numbers text-[18px] font-normal tracking-normal tabular-nums leading-none">
        {value}
      </span>
    </div>
  </motion.div>
);
