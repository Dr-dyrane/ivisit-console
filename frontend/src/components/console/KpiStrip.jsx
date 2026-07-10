// Console design system - KPI/state strip (S1.2 canon, donor: Requests).
// THE ARCHITECTURE RULES LIVE HERE, not in pages:
//   - the strip is capped at MAX-W-2XL and lays out grid-cols-2 sm:grid-cols-3
//     (the Today-matched width the user locked; pages cannot widen or narrow it)
//   - AT MOST `max` (3) chips render -- smart-context selection: actionable ids
//     pin only while count > 0, the active chip always stays visible, remaining
//     slots fill data-driven (count desc, then importance), canonical order
//   - tiles: min-h-[66px] px-3 py-2.5 sm:px-4 md:py-3, neutral e2-lift at rest,
//     colour only when selected; re-tapping the active non-All chip returns to All
//   - the active chip's icon swaps to a spinner while a background refetch runs
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Shimmer } from './primitives';

export const KPI_TILE_REST = 'bg-card/65 text-muted-foreground shadow-e2-lift hover:bg-card/82 dark:bg-white/[0.055] dark:hover:bg-white/[0.085]';

export const selectPrimaryKpis = ({ options, getCount, kpiFilter, pinnedIds = [], importance = {}, max = 3 }) => {
  const pinned = pinnedIds.filter((id) => getCount(id) > 0);
  const chosen = new Set(pinned);
  if (kpiFilter && !chosen.has(kpiFilter) && options.some((option) => option.id === kpiFilter)) {
    chosen.add(kpiFilter);
  }
  const ranked = options
    .map((option) => ({ option, count: getCount(option.id) }))
    .sort((a, b) => b.count - a.count || (importance[a.option.id] ?? 9) - (importance[b.option.id] ?? 9))
    .map((entry) => entry.option);
  for (const option of ranked) {
    if (chosen.size >= max) break;
    chosen.add(option.id);
  }
  return options.filter((option) => chosen.has(option.id)).slice(0, max);
};

export const KpiStrip = ({
  options,
  getCount,
  kpiFilter,
  setKpiFilter,
  loading = false,
  isFetching = false,
  pinnedIds = [],
  importance = {},
  max = 3,
  defaultId = 'all',
  dataAttr = 'data-kpi',
  resolveActive = null,
}) => (
  <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
    {loading ? (
      Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="min-h-[66px] rounded-inner bg-card/65 px-3 py-2.5 shadow-e2-lift backdrop-blur-xl sm:px-4 md:py-3 dark:bg-white/[0.055]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2">
              <Shimmer className="h-3 w-16 rounded-pill" />
              <Shimmer className="h-6 w-9 rounded-inner" />
            </div>
            <Shimmer className="h-7 w-7 rounded-pill" />
          </div>
        </div>
      ))
    ) : (
      selectPrimaryKpis({ options, getCount, kpiFilter, pinnedIds, importance, max }).map((item) => {
        const Icon = item.icon;
        const active = (kpiFilter || defaultId) === item.id;
        const count = getCount(item.id);
        // Pages may override the selected look for a chip state (e.g. Requests'
        // zero-count "Needs attention" renders as an emerald all-clear).
        const override = resolveActive ? resolveActive(item, count) : null;
        const activeClass = override?.activeClass || item.activeClass;
        const colorClass = override?.colorClass || item.colorClass;

        return (
          <motion.button
            key={item.id}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setKpiFilter(active && item.id !== 'all' ? 'all' : item.id)}
            {...{ [dataAttr]: item.id }}
            data-state={active ? 'selected' : 'idle'}
            className={`group min-h-[66px] rounded-inner px-3 py-2.5 text-left backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 sm:px-4 md:py-3 ${active ? activeClass : KPI_TILE_REST}`}
            aria-pressed={active}
            aria-label={`${item.label}: ${count}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[10px] font-medium leading-tight sm:text-[11px]">{item.label}</span>
                <span className="mt-1 block text-2xl font-semibold tracking-normal text-foreground">{count}</span>
              </span>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-background/45 transition-transform group-hover:scale-105 ${active ? colorClass : ''}`}>
                {active && isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
            </span>
          </motion.button>
        );
      })
    )}
  </div>
);
