import React from 'react';
import { motion } from 'framer-motion';

import { getDetailsProjection, getPercentage } from './analyticsModalModel';
import { SECTION_CARD, SECTION_LABEL } from './analyticsModalStyles';

export const AnalyticsDetailsPhase = ({ analytics, phaseId, phaseLabel, type }) => {
  const projection = getDetailsProjection({ analytics, phaseId, type });

  return (
    <motion.div
      key="detailed"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
    >
      <div className={SECTION_CARD}>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1.5 w-1.5 rounded-pill bg-emerald-500/55" />
          <span className={SECTION_LABEL}>{phaseLabel}</span>
        </div>
        {projection.visibleScopedDistribution && (
          <p className="mb-4 rounded-inner bg-foreground/[0.04] dark:bg-white/[0.05] px-3 py-2 text-xs font-semibold text-muted-foreground">
            {projection.distributionLabel}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(projection.dataSet)
            .sort(([, a], [, b]) => b - a)
            .map(([key, count]) => (
              <div key={key} className="p-3 rounded-inner bg-foreground/[0.03] dark:bg-white/[0.04] flex flex-col items-center text-center group active:scale-[0.98] transition-transform">
                <span className="mb-1 w-full truncate px-1 text-xs font-semibold capitalize text-muted-foreground/65">{key.replace('_', ' ')}</span>
                <span className="font-dashboard-numbers text-[16px] font-normal tracking-normal tabular-nums">{count}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-sky-600/70 dark:text-sky-300/80">
                  {getPercentage(count, projection.scopedTotal)}%
                </span>
              </div>
            ))}
          {Object.keys(projection.dataSet).length === 0 && (
            <p className="col-span-2 py-10 text-center text-xs font-semibold text-muted-foreground/55">No groups yet</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
