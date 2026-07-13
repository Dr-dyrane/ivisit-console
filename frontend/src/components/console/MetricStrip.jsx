// Console design system - contextual metric strip.
// Use for measurements that describe the page but do not filter it. KpiStrip
// remains the state-filter control. Both variants share the Today tile footprint
// and the estate-wide maximum of three visible tiles.
import React from 'react';
import { Shimmer } from './primitives';

export const selectContextMetrics = (items = [], max = 3) => {
  const visibleLimit = Math.min(3, Math.max(0, Number(max) || 3));
  return items
    .filter((item) => item && item.available !== false)
    .sort((left, right) => (left.priority ?? 99) - (right.priority ?? 99))
    .slice(0, visibleLimit);
};

export const MetricStrip = ({
  items = [],
  loading = false,
  max = 3,
  dataAttr = 'data-metric',
}) => {
  const visibleItems = selectContextMetrics(items, max);
  const skeletonCount = Math.min(3, Math.max(0, Number(max) || 3));

  return (
    <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
      {loading ? (
        Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="min-h-[66px] rounded-inner bg-card/65 px-3 py-2.5 shadow-e2-lift backdrop-blur-xl sm:px-4 md:py-3 dark:bg-white/[0.055]"
            aria-hidden="true"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-2">
                <Shimmer className="h-3 w-16 rounded-pill" />
                <Shimmer className="h-5 w-20 rounded-inner" />
              </div>
              <Shimmer className="h-7 w-7 rounded-pill" />
            </div>
          </div>
        ))
      ) : visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id || item.label}
            {...{ [dataAttr]: item.id || item.label }}
            className="min-h-[66px] rounded-inner bg-card/65 px-3 py-2.5 text-left shadow-e2-lift backdrop-blur-xl sm:px-4 md:py-3 dark:bg-white/[0.055]"
            aria-label={`${item.label}: ${item.value}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-lg font-semibold tracking-normal text-foreground">
                  {item.value}
                </span>
              </span>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${item.toneClass || 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]'}`}>
                {Icon && <Icon className="h-3.5 w-3.5" />}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
