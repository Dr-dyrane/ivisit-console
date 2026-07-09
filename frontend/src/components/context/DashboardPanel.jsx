import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Loader2,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';

const toneClass = {
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  primary: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  muted: 'bg-muted/34 text-muted-foreground',
};

const getToneClass = (tone = 'muted') => toneClass[tone] || toneClass.muted;

const normalizeTodayActions = ({ today, glanceItems, rows }) => {
  const actions = [];
  const seen = new Set();

  const pushAction = (candidate) => {
    const path = candidate?.path;
    if (!path || seen.has(path)) return;

    seen.add(path);
    actions.push({
      label: candidate.actionLabel || candidate.label || candidate.primaryAction || 'Open',
      path,
      tone: candidate.tone || 'muted',
      disabled: Boolean(candidate.disabled),
      disabledReason: candidate.disabledReason,
    });
  };

  pushAction(today);
  glanceItems.forEach(pushAction);
  rows.forEach(pushAction);

  return actions.slice(0, 3);
};

const CurrentListRow = ({ row, onOpen, routingPath }) => {
  const canOpen = Boolean(row.path) && !row.disabled && typeof onOpen === 'function';
  const isOpening = canOpen && routingPath === row.path;
  const StatusIcon = row.loading || isOpening ? Loader2 : row.disabled ? LockKeyhole : row.done ? CheckCircle2 : CircleDashed;
  const state = row.disabled ? 'unavailable' : isOpening ? 'opening' : row.loading ? 'loading' : row.done ? 'ready' : 'open';
  // Interactive affordances (hover lift, icon scale) render ONLY when the row actually
  // navigates — a styled-pressable dead click is a canon defect.
  const Wrapper = canOpen ? motion.button : motion.div;

  return (
    <Wrapper
      {...(canOpen
        ? { type: 'button', onClick: () => onOpen(row.path), whileTap: { scale: 0.99 }, 'aria-label': `Open ${row.label || 'Today item'}` }
        : {})}
      data-state={state}
      className={`group w-full rounded-inner bg-card/60 p-3 text-left shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 dark:bg-white/[0.05] ${
        canOpen ? 'hover:-translate-y-0.5 hover:bg-card/80 focus-visible:bg-foreground/10 dark:hover:bg-white/[0.08]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-button transition-transform duration-200 ${canOpen ? 'group-hover:scale-105' : ''} ${getToneClass(row.tone)}`}>
          <StatusIcon className={`h-4 w-4 ${row.loading || isOpening ? 'animate-spin' : ''}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground" title={row.label}>
            {row.label || 'Today item'}
          </span>
          <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground" title={row.meta || row.detail}>
            {row.meta || row.detail || 'Open Today for details'}
          </span>
        </span>
      </div>
    </Wrapper>
  );
};

export const DashboardPanel = ({ todayContext }) => {
  const context = todayContext || {};
  const today = context.today || {};
  const glanceItems = Array.isArray(context.glanceItems) ? context.glanceItems : [];
  const rows = Array.isArray(context.rows) ? context.rows : [];
  const hasContext = Boolean(todayContext);
  const loading = Boolean(context.loading) || !hasContext;
  const roleLabel = context.roleLabel || 'Today';
  const routeStatus = today.status || (loading ? 'Loading' : 'Ready');
  const actions = React.useMemo(
    () => normalizeTodayActions({ today, glanceItems, rows }),
    [glanceItems, rows, today],
  );
  const [panelNotice, setPanelNotice] = React.useState('Today actions ready.');

  React.useEffect(() => {
    if (!hasContext || loading) {
      setPanelNotice('Today is loading.');
      return;
    }

    if (context.hasError) {
      setPanelNotice('Today did not fully refresh. Open the role page to continue.');
      return;
    }

    setPanelNotice('Today actions ready.');
  }, [context.hasError, hasContext, loading]);

  const handlePanelAction = (action) => {
    if (action.disabled || !action.path) {
      setPanelNotice(action.disabledReason || 'This action is unavailable.');
      return;
    }

    if (typeof context.onNavigate !== 'function') {
      setPanelNotice('Open Today to continue.');
      return;
    }

    setPanelNotice(`Opening ${action.label.toLowerCase()}.`);
    context.onNavigate(action.path);
  };

  return (
    <div className="space-y-3">
      {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
      <motion.section
        className="space-y-3"
        aria-label="Today overview"
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Today overview
        </p>

        <div className="rounded-card bg-sky-500/10 p-4 text-sky-900 shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 dark:text-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/75 dark:text-sky-100/70">
                Current route scope
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground [overflow-wrap:anywhere]">
                {loading ? <span className="block h-7 w-28 animate-pulse rounded-inner bg-muted/40" /> : roleLabel}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {routeStatus}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button bg-background/55 text-sky-700 transition-transform duration-200 group-hover:scale-105 dark:text-sky-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {glanceItems.slice(0, 2).map((item) => (
            <div
              key={item.label}
              className={`rounded-inner p-3 shadow-[0_4px_12px_rgb(0_0_0/0.07)] ${getToneClass(item.tone)}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                {item.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground" title={item.value}>
                {loading ? <span className="block h-4 w-16 animate-pulse rounded-inner bg-muted/40" /> : item.value}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      <section className="space-y-2" aria-label="Panel actions">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Panel actions
        </p>
        <div className="grid grid-cols-1 gap-2">
          {actions.map((action) => (
            <motion.button
              key={action.path}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handlePanelAction(action)}
              disabled={action.disabled}
              data-state={action.disabled ? 'unavailable' : context.routingPath === action.path ? 'opening' : 'idle'}
              aria-disabled={action.disabled ? 'true' : undefined}
              className={`group flex min-h-[58px] items-center justify-between gap-3 rounded-inner px-4 text-left shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${getToneClass(action.tone)}`}
            >
              <span className="min-w-0 truncate text-sm font-semibold">
                {action.label}
              </span>
              {context.routingPath === action.path ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              )}
            </motion.button>
          ))}
        </div>
        <p className="px-1 text-xs font-medium text-muted-foreground" role="status" aria-live="polite">
          {panelNotice}
        </p>
      </section>

      <section className="space-y-2" aria-label="Current list">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Current list
        </p>

        <div className="space-y-2">
          {rows.slice(0, 4).map((row) => (
            <CurrentListRow
              key={row.id || row.label}
              row={row}
              onOpen={context.onNavigate}
              routingPath={context.routingPath}
            />
          ))}

          {!loading && rows.length === 0 && (
            <div className="rounded-inner bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              No Today items in this role.
            </div>
          )}

          {loading && rows.length === 0 && (
            <div className="rounded-inner bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              Loading Today.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
