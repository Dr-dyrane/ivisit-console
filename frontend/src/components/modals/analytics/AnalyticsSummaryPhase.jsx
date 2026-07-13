import React from 'react';
import { motion } from 'framer-motion';

import { TYPE_LABELS, getSummaryProjection } from './analyticsModalModel';
import { SECTION_CARD, SECTION_LABEL } from './analyticsModalStyles';
import { AnalyticsStatNode } from './AnalyticsStatNode';

export const AnalyticsSummaryPhase = ({ analytics, type }) => {
  const summary = getSummaryProjection({ analytics, type });

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-4"
    >
      <div className={SECTION_CARD}>
        <span className={`${SECTION_LABEL} mb-3 block`}>{TYPE_LABELS[type] || 'Overview'}</span>
        <div className="grid grid-cols-2 gap-2">
          {summary.currentItems.map((item, i) => (
            <AnalyticsStatNode
              key={i}
              label={item.label}
              value={item.value}
              trend={item.trend}
              icon={item.icon}
              color={item.color}
            />
          ))}
        </div>
      </div>

      <div className={`${SECTION_CARD} flex items-center justify-around text-center group`}>
        <div className="flex flex-col items-center">
          <span className="font-dashboard-numbers text-[14px] font-normal tracking-normal tabular-nums">
            {summary.shareValue}
          </span>
          <span className="eyebrow mt-1 text-muted-foreground/55">{summary.shareLabel}</span>
        </div>
        <div className="h-1.5 w-1.5 rounded-pill bg-foreground/10" />
        <div className="flex flex-col items-center">
          <span className="font-dashboard-numbers text-[14px] font-normal tracking-normal tabular-nums">
            {summary.secondaryValue}
          </span>
          <span className="eyebrow mt-1 text-muted-foreground/55">{summary.secondaryLabel}</span>
        </div>
        <div className="h-1.5 w-1.5 rounded-pill bg-foreground/10" />
        <div className="flex flex-col items-center">
          <span className="font-dashboard-numbers text-[14px] font-normal tracking-normal tabular-nums">{summary.groups}</span>
          <span className="eyebrow mt-1 text-muted-foreground/55">Groups</span>
        </div>
      </div>
    </motion.div>
  );
};
