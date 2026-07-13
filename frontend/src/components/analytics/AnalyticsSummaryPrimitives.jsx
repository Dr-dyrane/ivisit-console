import React from 'react';

export const ANALYTICS_RANGE_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export const formatAnalyticsWindow = (timeRange) => (
  ANALYTICS_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label || 'Selected window'
);

export const getAnalyticsScopeLabel = (role = {}) => {
  if (role.isProvider) return 'Provider scope';
  if (role.isSponsor) return 'Sponsor scope';
  if (role.isOrgAdmin) return 'Organization scope';
  if (role.isAdmin) return 'Admin scope';
  return 'Scoped view';
};

export const formatMetricNumber = (value) => (
  Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '0'
);

export const formatResponseMinutes = (value, sampleSize = 0) => (
  Number(sampleSize) > 0 && Number.isFinite(Number(value))
    ? `${Number(value).toFixed(1)} min`
    : 'No timing data'
);

export const getVolumeComparison = (series = []) => {
  if (!Array.isArray(series) || series.length < 2) return null;

  const midpoint = Math.floor(series.length / 2);
  const previous = series
    .slice(0, midpoint)
    .reduce((sum, item) => sum + (Number(item?.requests) || 0), 0);
  const recent = series
    .slice(midpoint)
    .reduce((sum, item) => sum + (Number(item?.requests) || 0), 0);

  if (previous === 0 && recent === 0) return null;

  const direction = recent === previous ? 'flat' : recent > previous ? 'up' : 'down';
  const changePercent = previous > 0
    ? Math.round(((recent - previous) / previous) * 100)
    : null;

  return {
    previous,
    recent,
    direction,
    changePercent,
    badge: changePercent === null
      ? 'New activity'
      : changePercent === 0
        ? 'No change'
        : `${Math.abs(changePercent)}% ${direction}`,
  };
};

export const AnalyticsTimeRangeControl = ({ value, onChange, compact = false }) => (
  <div
    className={`grid grid-cols-3 rounded-pill bg-foreground/[0.06] p-1 dark:bg-white/[0.07] ${compact ? 'w-full' : 'w-[286px]'}`}
    role="group"
    aria-label="Analytics time window"
  >
    {ANALYTICS_RANGE_OPTIONS.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected}
          data-state={selected ? 'selected' : 'idle'}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-pill px-3 text-xs font-semibold transition-[background,color,box-shadow,transform] active:scale-[0.97] ${selected
            ? 'bg-foreground text-background shadow-e2'
            : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
