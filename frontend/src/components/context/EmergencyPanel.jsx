import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Ambulance,
  BarChart3,
  BedDouble,
  Clock,
  ClipboardCheck,
  Filter,
  Loader2,
  Plus,
  Radio,
} from 'lucide-react';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';

const toCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const serviceTone = {
  ambulance: {
    icon: Ambulance,
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  },
  bed: {
    icon: BedDouble,
    className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  },
  booking: {
    icon: ClipboardCheck,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  },
};

const statusLabel = {
  pending_approval: 'Needs attention',
  in_progress: 'Active',
  accepted: 'Accepted',
  arrived: 'Arrived',
  completed: 'Done',
  cancelled: 'Cancelled',
  payment_declined: 'Payment issue',
};

const getPatientName = (request) => (
  request?.patient_snapshot?.fullName ||
  request?.patient_name ||
  request?.requester_name ||
  request?.display_id ||
  'Request'
);

const getRequestMeta = (request) => {
  const service = String(request?.service_type || 'request').replace(/_/g, ' ');
  const displayId = request?.display_id || request?.id?.slice?.(0, 8);
  return [service, displayId].filter(Boolean).join(' - ');
};

const getStatusLabel = (request) => {
  const canonical = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  return statusLabel[canonical] || 'New';
};

const getServiceTone = (request) => serviceTone[request?.service_type] || {
  icon: Radio,
  className: 'surface-card text-muted-foreground',
};

export const EmergencyPanel = ({ requestContext }) => {
  const context = requestContext || {};
  const stats = context.stats || {};
  const recent = Array.isArray(context.recent) ? context.recent : [];
  const hasContext = Boolean(requestContext);
  const loading = Boolean(context.loading) || !hasContext;
  const total = toCount(context.count ?? stats.total, recent.length);
  const pending = toCount(stats.pending, 0);
  const active = toCount(stats.active, 0);
  const canCreate = context.canCreate === true;
  const errorMessage = context.errorMessage;
  const [panelNotice, setPanelNotice] = React.useState('Requests actions ready.');

  React.useEffect(() => {
    if (errorMessage) {
      setPanelNotice('Requests did not fully refresh. The page can retry.');
    }
  }, [errorMessage]);

  const handleCreateRequest = () => {
    if (!canCreate) {
      setPanelNotice('New requests are unavailable for this role.');
      return;
    }

    setPanelNotice('Opening request form.');
    window.dispatchEvent(new CustomEvent('openEmergencyModal'));
  };

  const handleOpenFilters = () => {
    setPanelNotice('Opening filters.');
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const handleOpenAnalytics = () => {
    setPanelNotice('Opening statistics.');
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  return (
    <div className="space-y-3">
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="space-y-3"
        aria-label="Requests overview"
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Requests overview
        </p>

        <div className="rounded-card bg-sky-500/10 p-4 text-sky-900 shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 dark:text-sky-100">
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
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon surface-card text-sky-700 transition-transform duration-200 group-hover:scale-105 dark:text-sky-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-inner bg-destructive/10 p-3 text-destructive shadow-[0_4px_12px_rgb(0_0_0/0.07)]">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon surface-card">
                <AlertCircle className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-normal text-foreground">
                  {loading ? '...' : pending}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Needs attention
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-inner bg-amber-500/10 p-3 text-amber-800 shadow-[0_4px_12px_rgb(0_0_0/0.07)] dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon surface-card">
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
        </div>
      </motion.section>

      <section className="space-y-2" aria-label="Panel actions">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Panel actions
        </p>
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateRequest}
            disabled={!canCreate}
            className="group flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-button bg-primary px-3 text-primary-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
            data-state={canCreate ? 'idle' : 'unavailable'}
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
            className="group flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-button surface-card px-3 text-muted-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 hover:bg-foreground/10 hover:text-foreground"
          >
            <Filter className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Filter</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAnalytics}
            className="group flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-button surface-card px-3 text-muted-foreground shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 hover:bg-foreground/10 hover:text-foreground"
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
          {recent.map((request, index) => {
            const tone = getServiceTone(request);
            const ServiceIcon = tone.icon;

            return (
              <motion.div
                key={request?.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group rounded-inner surface-card p-3 shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-foreground/[0.08] dark:hover:bg-white/[0.10]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon transition-transform duration-200 group-hover:scale-105 ${tone.className}`}>
                      <ServiceIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">
                        {getPatientName(request)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                        {getRequestMeta(request)}
                      </span>
                    </span>
                  </div>
                  <span className="shrink-0 rounded-pill surface-card px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {getStatusLabel(request)}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {!loading && recent.length === 0 && (
            <div className="rounded-inner surface-card px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              No requests in the current view.
            </div>
          )}

          {loading && recent.length === 0 && (
            <div className="rounded-inner surface-card px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              Loading requests.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
