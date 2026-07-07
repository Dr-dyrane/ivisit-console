import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  Filter,
  BarChart3,
  Download,
  Loader2,
  ArrowUpRight
} from 'lucide-react';

export const VerificationPanel = ({ verificationData, loading }) => {
  const navigate = useNavigate();
  const [panelNotice, setPanelNotice] = React.useState('Approval actions ready.');
  const stats = verificationData || { pending: 0, approved: 0, rejected: 0, total: 0 };
  const verificationRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const handleCreate = () => {
    setPanelNotice('Opening provider management.');
    navigate('/users?role=provider');
  };

  const handleAnalytics = () => {
    setPanelNotice('Opening approval trends.');
    const event = new CustomEvent('openAnalyticsModal', {
      detail: { type: 'user' }
    });
    window.dispatchEvent(event);
  };

  const handleFilters = () => {
    setPanelNotice('Opening approval filters.');
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const handleExportUnavailable = () => {
    setPanelNotice('Export is unavailable until approval report authority is proved.');
  };

  const panelSurface = 'bg-background/55 backdrop-blur-xs squircle-lg p-4 shadow-premium';
  const compactSurface = 'bg-background/55 backdrop-blur-xs squircle-lg p-3 shadow-sm';
  const actionBase = 'group rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm transition-all duration-200 focus-visible:shadow-[0_0_0_3px_rgba(14,165,233,0.16),0_16px_40px_rgba(0,0,0,0.18)]';

  return (
    <div className="space-y-4">
      {loading?.verification && (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" aria-hidden="true" />
          <span className="sr-only">Loading approvals</span>
        </div>
      )}

      {!loading?.verification && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Approvals overview</h3>

            <motion.div className={panelSurface} whileHover={{ y: -1 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-sky-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-sky-600 dark:text-sky-300" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Total applications</span>
                    <p className="text-xs text-muted-foreground">All approval items</p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
                  {stats.total}
                </span>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-2">
              <motion.div className={compactSurface} whileHover={{ y: -1 }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </motion.div>

              <motion.div className={compactSurface} whileHover={{ y: -1 }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div className={panelSurface} whileHover={{ y: -1 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-cyan-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Approval rate</span>
                    <p className="text-xs text-muted-foreground">Approved share</p>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
                  {verificationRate}%
                </span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Panel actions</h3>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                className={`${actionBase} bg-sky-500/10 hover:bg-sky-500/15 text-sky-700 dark:text-sky-200`}
                title="Manage providers"
              >
                <Users className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
                <span className="font-normal text-xs">Manage</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalytics}
                className={`${actionBase} bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-700 dark:text-cyan-200`}
                title="View approval trends"
              >
                <BarChart3 className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
                <span className="font-normal text-xs">Analytics</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFilters}
                className={`${actionBase} bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-200`}
                title="Filter approvals"
              >
                <Filter className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
                <span className="font-normal text-xs">Filter</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportUnavailable}
                className={`${actionBase} bg-muted/20 hover:bg-muted/30 text-muted-foreground`}
                aria-disabled="true"
                data-state="unavailable"
                title="Export approvals unavailable"
              >
                <Download className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
                <span className="font-normal text-xs">Export</span>
              </motion.button>
            </div>
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl bg-muted/25 px-3 py-2 text-xs text-muted-foreground shadow-sm"
            >
              {panelNotice}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Next step</h3>
            <div className={`${compactSurface} py-5 text-center`}>
              <p className="text-xs text-muted-foreground">Filter the list or open a pending row to review details.</p>
            </div>
          </motion.div>

          {stats.pending > 5 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Needs review</h3>
              <div className="bg-amber-500/10 squircle-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-sm text-amber-700 dark:text-amber-200 uppercase tracking-tight">Backlog waiting</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-100/80 font-normal leading-relaxed">
                      {stats.pending} applications need admin review.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
