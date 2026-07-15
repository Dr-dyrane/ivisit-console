import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { TabletPageShell } from './TabletPageShell';
import { TABLET_FOCUS_RING } from './TabletCollectionPage';

const toneClass = {
  danger: 'bg-destructive/14 text-destructive',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  primary: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  muted: 'bg-muted/38 text-muted-foreground',
};

const TabletTodaySkeleton = () => (
  <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-5" aria-hidden="true">
    <div className="space-y-4">
      <span className="block h-8 w-32 rounded-pill bg-muted/24 shimmer" />
      <span className="block h-8 w-4/5 rounded-pill bg-muted/24 shimmer" />
      <span className="block h-4 w-full rounded-pill bg-muted/18 shimmer" />
      <div className="grid grid-cols-2 gap-3 pt-3">
        <span className="h-20 rounded-card bg-muted/20 shimmer" />
        <span className="h-20 rounded-card bg-muted/20 shimmer" />
      </div>
    </div>
    <div className="h-[360px] rounded-card bg-muted/20 shimmer" />
  </div>
);

const TodayGlance = ({ item, opening, onAction }) => (
  <button
    type="button"
    onClick={() => onAction?.(item.path)}
    disabled={!item.path || opening}
    data-state={opening ? 'opening' : 'idle'}
    className={`surface-card flex min-h-[78px] min-w-0 items-start justify-between gap-3 rounded-card px-4 py-3 text-left shadow-e1 transition-all hover:bg-card active:scale-[0.98] disabled:opacity-60 ${TABLET_FOCUS_RING}`}
  >
    <span className="min-w-0">
      <span className="block text-[11px] font-medium text-muted-foreground">{item.label}</span>
      <span className="mt-1 block truncate text-sm font-semibold text-foreground">{item.value}</span>
    </span>
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${toneClass[item.tone] || toneClass.muted}`}>
      {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
    </span>
  </button>
);

const TodayActionRow = ({ row, expanded, opening, onToggle, onAction }) => {
  const Icon = row.loading ? Loader2 : row.disabled ? LockKeyhole : row.done ? CheckCircle2 : CircleDashed;

  return (
    <div data-tablet-today-row={row.id} data-state={row.disabled ? 'unavailable' : expanded ? 'expanded' : 'idle'}>
      <button
        type="button"
        onClick={() => onToggle(row.id)}
        aria-expanded={expanded}
        disabled={row.loading}
        className={`flex min-h-11 w-full items-center gap-3 rounded-inner px-2 py-3 text-left transition-colors hover:bg-foreground/[0.035] active:scale-[0.99] disabled:opacity-60 ${TABLET_FOCUS_RING}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${toneClass[row.tone] || toneClass.muted}`}>
          <Icon className={`h-4 w-4 ${row.loading ? 'animate-spin' : ''}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{row.label}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.meta}</span>
        </span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="pb-3 pl-14 pr-2">
          <p className="text-xs leading-5 text-muted-foreground">{row.detail}</p>
          {row.disabledReason && <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.disabledReason}</p>}
          {row.path && row.actionLabel && !row.disabled && (
            <button
              type="button"
              onClick={() => onAction?.(row.path)}
              disabled={opening}
              className={`mt-3 inline-flex h-11 items-center gap-2 rounded-pill bg-foreground/[0.07] px-3 text-xs font-semibold text-foreground transition-all active:scale-95 disabled:opacity-60 ${TABLET_FOCUS_RING}`}
            >
              {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {opening ? 'Opening...' : row.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const TabletToday = ({
  today,
  glanceItems = [],
  rows = [],
  live = false,
  role,
  loading = false,
  isFetching = false,
  routingPath = null,
  onAction,
  onRefresh,
}) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const activeExpandedRow = useMemo(
    () => (rows.some((row) => row.id === expandedRow) ? expandedRow : null),
    [expandedRow, rows],
  );

  if (loading || !today) {
    return (
      <TabletPageShell mode="centered">
        <TabletTodaySkeleton />
      </TabletPageShell>
    );
  }

  const HeroIcon = today.icon || Activity;
  const primaryOpening = Boolean(today.path) && routingPath === today.path;

  return (
    <TabletPageShell mode="centered">
      <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] items-start gap-5">
        <section className="min-w-0 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-semibold ${toneClass[today.tone] || toneClass.muted}`}>
              <HeroIcon className="h-4 w-4" />
              {today.status}
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isFetching}
                className={`flex h-11 w-11 items-center justify-center rounded-icon bg-card/70 text-muted-foreground shadow-e1 transition-all active:scale-95 disabled:opacity-60 ${TABLET_FOCUS_RING}`}
                aria-label={isFetching ? 'Refreshing today' : 'Refresh today'}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <h2 className="mt-5 text-[30px] font-semibold leading-[1.08] text-foreground [overflow-wrap:anywhere]">
            {today.headline}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{today.subhead}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {role?.label && <span className="surface-card rounded-pill px-3 py-1.5 text-xs font-medium text-muted-foreground">{role.label}</span>}
            {!live && <span className="surface-card rounded-pill px-3 py-1.5 text-xs font-medium text-muted-foreground">Retry needed</span>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {glanceItems.map((item) => (
              <TodayGlance key={item.label} item={item} opening={routingPath === item.path} onAction={onAction} />
            ))}
          </div>
        </section>

        <section className="surface-card min-w-0 rounded-card p-4 shadow-e2">
          <span className={`inline-flex rounded-pill px-2.5 py-1 text-[11px] font-semibold ${toneClass[today.tone] || toneClass.muted}`}>
            {today.status}
          </span>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{today.sheetTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{today.sheetHint}</p>
          <button
            type="button"
            onClick={() => onAction?.(today.path)}
            disabled={!today.path || primaryOpening}
            className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50 ${TABLET_FOCUS_RING}`}
          >
            {primaryOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {primaryOpening ? 'Opening...' : today.primaryAction}
          </button>
          <div className="mt-3">
            {rows.map((row, index) => (
              <React.Fragment key={row.id}>
                <TodayActionRow
                  row={row}
                  expanded={activeExpandedRow === row.id}
                  opening={routingPath === row.path}
                  onToggle={(rowId) => setExpandedRow((current) => (current === rowId ? null : rowId))}
                  onAction={onAction}
                />
                {index < rows.length - 1 && <div className="ml-14 h-px bg-[hsl(var(--muted-foreground)/0.08)]" />}
              </React.Fragment>
            ))}
          </div>
        </section>
      </div>
    </TabletPageShell>
  );
};

export default TabletToday;
