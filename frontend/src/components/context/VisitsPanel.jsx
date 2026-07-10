import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Plus
} from 'lucide-react';
import { visitRowProjection } from '../../utils/visitRowProjection';

const toCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const statusTone = {
  scheduled: {
    label: 'Scheduled',
    iconClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    chipClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  },
  in_progress: {
    label: 'Active',
    iconClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    chipClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  },
  completed: {
    label: 'Done',
    iconClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    chipClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    iconClass: 'bg-muted/40 text-muted-foreground',
    chipClass: 'bg-muted/40 text-muted-foreground',
  },
};

const getStatusTone = (status) => statusTone[status] || statusTone.scheduled;

export const VisitsPanel = ({ visitContext }) => {
  const context = visitContext || {};
  const stats = context.stats || {};
  const recent = Array.isArray(context.recent) ? context.recent : [];
  const total = toCount(stats.total ?? stats.today ?? context.count, recent.length);
  const active = toCount(stats.inProgress ?? stats.in_progress ?? stats.pending, 0);
  const completed = toCount(stats.completed, 0);
  const loading = Boolean(context.loading);
  const canCreate = context.canCreate !== false;
  const [panelNotice, setPanelNotice] = React.useState('Visit actions ready.');

  const handleCreateVisit = () => {
    if (!canCreate) {
      setPanelNotice('New visits are unavailable for this role.');
      return;
    }

    setPanelNotice('Opening visit form.');
    window.dispatchEvent(new CustomEvent('openVisitModal'));
  };

  const handleOpenAnalytics = () => {
    setPanelNotice('Opening visit statistics.');
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  return (
    <div className="space-y-3">
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="space-y-3"
        aria-label="Visits overview"
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Visits overview
        </p>

        <div className="rounded-card bg-sky-500/10 p-4 text-sky-900 shadow-e2-lift transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 dark:text-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/75 dark:text-sky-100/70">
                Current route scope
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
                {loading ? '...' : total}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {total === 1 ? 'Visit in this view' : 'Visits in this view'}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-background/55 text-sky-700 transition-transform duration-200 group-hover:scale-105 dark:text-sky-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-inner bg-amber-500/10 p-3 text-amber-800 shadow-e2 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/55">
                <Clock className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-normal text-foreground">
                  {loading ? '...' : active}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Active
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-inner bg-emerald-500/10 p-3 text-emerald-800 shadow-e2 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/55">
                <CheckCircle className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-normal text-foreground">
                  {loading ? '...' : completed}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Done
                </span>
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-2" aria-label="Panel actions">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Panel actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateVisit}
            disabled={!canCreate}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-button bg-sky-500/10 px-3 text-sky-700 shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-55 dark:text-sky-200"
            title="New visit"
            aria-disabled={!canCreate}
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">New visit</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAnalytics}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-button bg-cyan-500/10 px-3 text-cyan-700 shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:bg-cyan-500/15 dark:text-cyan-200"
            title="View visit statistics"
          >
            <BarChart3 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Stats</span>
          </motion.button>
        </div>
        <p className="px-1 text-xs font-medium text-muted-foreground" role="status" aria-live="polite">
          {panelNotice}
        </p>
      </section>

      <section className="space-y-2" aria-label="Current list">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Current list
        </p>

        <div className="space-y-2">
          {recent.map((visit, index) => {
            const tone = getStatusTone(visit?.status);
            const row = visitRowProjection(visit);

            return (
              <motion.div
                key={visit?.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group rounded-inner bg-background/46 p-3 shadow-[0_12px_36px_rgb(0_0_0/0.10)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-muted/36"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon transition-transform duration-200 group-hover:scale-105 ${tone.iconClass}`}>
                      <Calendar className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">
                        {row.primary}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                        {row.secondary}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground/80">
                        {row.meta}
                      </span>
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-pill px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${tone.chipClass}`}>
                    {row.statusLabel}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {!loading && recent.length === 0 && (
            <div className="rounded-inner bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              No visits in the current view.
            </div>
          )}

          {loading && recent.length === 0 && (
            <div className="rounded-inner bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              Loading visits.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
