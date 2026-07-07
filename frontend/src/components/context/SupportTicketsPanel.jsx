import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle,
  Filter,
  Headphones,
  Loader2,
  MessageSquare,
  Plus
} from 'lucide-react';

const toCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusTone = {
  open: {
    label: 'Open',
    iconClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    chipClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  },
  in_progress: {
    label: 'Active',
    iconClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    chipClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  },
  resolved: {
    label: 'Resolved',
    iconClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    chipClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  },
  closed: {
    label: 'Closed',
    iconClass: 'bg-muted/40 text-muted-foreground',
    chipClass: 'bg-muted/40 text-muted-foreground',
  },
};

const getStatusTone = (status) => statusTone[status] || statusTone.open;

const getTicketTitle = (ticket) => (
  ticket?.subject ||
  ticket?.title ||
  (ticket?.id ? `Request ${String(ticket.id).slice(0, 4)}` : 'Support request')
);

const getTicketMeta = (ticket) => {
  const priority = titleCase(ticket?.priority || 'normal');
  const category = titleCase(ticket?.category || 'general');
  return `${priority} priority - ${category}`;
};

export const SupportTicketsPanel = ({ supportContext }) => {
  const context = supportContext || {};
  const stats = context.stats || {};
  const recent = Array.isArray(context.recent) ? context.recent : [];
  const total = toCount(stats.total ?? context.count, recent.length);
  const active = toCount(stats.active ?? stats.inProgress ?? stats.in_progress, 0);
  const resolved = toCount(stats.resolved, 0);
  const loading = Boolean(context.loading);
  const canCreate = context.canCreate !== false;
  const canViewStats = context.canManage === true;
  const [panelNotice, setPanelNotice] = React.useState('Support actions ready.');

  const handleCreateTicket = () => {
    if (!canCreate) {
      setPanelNotice('New tickets are unavailable for this role.');
      return;
    }

    setPanelNotice('Opening support form.');
    window.dispatchEvent(new CustomEvent('openSupportTicketModal'));
  };

  const handleOpenFilters = () => {
    setPanelNotice('Opening filters.');
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const handleOpenAnalytics = () => {
    if (!canViewStats) {
      setPanelNotice('Support statistics are unavailable for this role.');
      return;
    }

    setPanelNotice('Opening support statistics.');
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  return (
    <div className="space-y-3">
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="space-y-3"
        aria-label="Support overview"
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Support overview
        </p>

        <div className="rounded-[28px] bg-sky-500/10 p-4 text-sky-900 shadow-[0_18px_54px_rgb(14_165_233/0.14)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 dark:text-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/75 dark:text-sky-100/70">
                Current route scope
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
                {loading ? '...' : total}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {total === 1 ? 'Request in this view' : 'Requests in this view'}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-background/55 text-sky-700 dark:text-sky-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Headphones className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[24px] bg-cyan-500/10 p-3 text-cyan-800 shadow-[0_14px_38px_rgb(6_182_212/0.12)] dark:text-cyan-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[16px] bg-background/55">
                <MessageSquare className="h-4 w-4" />
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

          <div className="rounded-[24px] bg-emerald-500/10 p-3 text-emerald-800 shadow-[0_14px_38px_rgb(16_185_129/0.12)] dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[16px] bg-background/55">
                <CheckCircle className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-normal text-foreground">
                  {loading ? '...' : resolved}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Resolved
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
            onClick={handleCreateTicket}
            disabled={!canCreate}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-[24px] bg-sky-500/10 px-3 text-sky-700 shadow-[0_14px_42px_rgb(14_165_233/0.12)] transition-[background,box-shadow,transform] duration-200 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-55 dark:text-sky-200"
            title="New ticket"
            aria-disabled={!canCreate}
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">New</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenFilters}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-[24px] bg-muted/34 px-3 text-muted-foreground shadow-[0_14px_42px_rgb(0_0_0/0.10)] transition-[background,box-shadow,transform] duration-200 hover:bg-muted/44 hover:text-foreground"
            title="Filter support"
          >
            <Filter className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Filter</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAnalytics}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-[24px] bg-cyan-500/10 px-3 text-cyan-700 shadow-[0_14px_42px_rgb(6_182_212/0.12)] transition-[background,box-shadow,transform] duration-200 hover:bg-cyan-500/15 dark:text-cyan-200"
            title={canViewStats ? 'View support statistics' : 'Support statistics unavailable'}
            aria-disabled={!canViewStats}
            data-state={canViewStats ? 'available' : 'unavailable'}
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
          {recent.map((ticket, index) => {
            const tone = getStatusTone(ticket?.status);

            return (
              <motion.div
                key={ticket?.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group rounded-[24px] bg-background/46 p-3 shadow-[0_12px_36px_rgb(0_0_0/0.10)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-muted/36"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] transition-transform duration-200 group-hover:scale-105 ${tone.iconClass}`}>
                      <Headphones className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">
                        {getTicketTitle(ticket)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                        {getTicketMeta(ticket)}
                      </span>
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${tone.chipClass}`}>
                    {tone.label}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {!loading && recent.length === 0 && (
            <div className="rounded-[24px] bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              No support requests in the current view.
            </div>
          )}

          {loading && recent.length === 0 && (
            <div className="rounded-[24px] bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              Loading support.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
