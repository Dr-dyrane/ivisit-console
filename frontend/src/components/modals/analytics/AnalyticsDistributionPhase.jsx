import React from 'react';
import { motion } from 'framer-motion';

import { getDistributionProjection, getPercentage } from './analyticsModalModel';
import { SECTION_CARD, SECTION_LABEL } from './analyticsModalStyles';

export const AnalyticsDistributionPhase = ({ analytics, phaseLabel, type }) => {
  const projection = getDistributionProjection({ analytics, type });

  return (
    <motion.div
      key="distribution"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-2"
    >
      <div className={SECTION_CARD}>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1.5 w-1.5 rounded-pill bg-sky-500/55" />
          <span className={SECTION_LABEL}>{phaseLabel}</span>
        </div>
        {projection.visibleScopedDistribution && (
          <p className="mb-4 rounded-inner bg-foreground/[0.04] dark:bg-white/[0.05] px-3 py-2 text-xs font-semibold text-muted-foreground">
            {projection.distributionLabel}
          </p>
        )}
        <div className="space-y-3">
          {Object.entries(projection.dataSet)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([key, count]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[11px] font-normal tracking-normal capitalize opacity-80">{key.replace('_', ' ')}</span>
                  <span className="font-dashboard-numbers text-[10px] font-medium tabular-nums opacity-40">{getPercentage(count, projection.scopedTotal)}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted/20 rounded-pill overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercentage(count, projection.scopedTotal)}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-pill bg-sky-500/65 shadow-[0_0_8px_rgba(14,165,233,0.18)]"
                  />
                </div>
              </div>
            ))}
          {Object.keys(projection.dataSet).length === 0 && (
            <p className="py-10 text-center text-xs font-semibold text-muted-foreground/55">No data yet</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
