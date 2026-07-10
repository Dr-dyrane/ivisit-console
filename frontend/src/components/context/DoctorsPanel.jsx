import React from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope,
  UserCheck,
  CheckCircle,
  Plus,
  Filter,
  BarChart3,
  Loader2
} from 'lucide-react';

const getDisplayName = (staff) => (
  staff?.name || `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim() || 'Staff member'
);

const getStatusTone = (status) => {
  if (status === 'available') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  if (status === 'busy') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (status === 'on_call') return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
  return 'bg-muted/25 text-muted-foreground';
};

export const DoctorsPanel = ({ staffContext }) => {
  const [panelNotice, setPanelNotice] = React.useState('Staff actions ready.');
  const context = staffContext || {};
  const stats = context.stats || { totalDoctors: 0, onCall: 0, available: 0, busy: 0 };
  const visibleStaff = Array.isArray(context.recent) ? context.recent : [];
  const canManage = context.canManage !== false;

  const handleCreateStaff = () => {
    if (!canManage) {
      setPanelNotice('Add staff is unavailable for this role.');
      return;
    }
    setPanelNotice('Opening staff form.');
    window.dispatchEvent(new CustomEvent('openDoctorModal'));
  };

  const handleAnalytics = () => {
    setPanelNotice('Opening staff statistics.');
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  const handleFilters = () => {
    setPanelNotice('Opening staff filters.');
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const panelSurface = 'surface-card rounded-card p-4 shadow-[0_4px_12px_rgb(0_0_0/0.07)]';
  const compactSurface = 'surface-card rounded-card p-3 shadow-[0_4px_12px_rgb(0_0_0/0.07)]';
  const actionBase = 'group flex flex-col items-center justify-center gap-2 rounded-button p-3 shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-all duration-200 focus-visible:bg-foreground/10';
  const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
      <div className="space-y-3">
        <h3 className={eyebrow}>Staff overview</h3>

        <motion.div className={panelSurface} whileHover={{ y: -1 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-pill bg-sky-500/10 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-sky-600 dark:text-sky-300" aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight">Staff</span>
              <p className="text-xs text-muted-foreground">Current route scope</p>
            </div>
          </div>
          <span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
            {stats.totalDoctors || stats.total || 0}
          </span>
        </motion.div>

        <div className="grid grid-cols-2 gap-2">
          <motion.div className={compactSurface} whileHover={{ y: -1 }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-pill bg-cyan-500/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.onCall || stats.on_call || 0}</p>
                <p className="text-xs text-muted-foreground">On call</p>
              </div>
            </div>
          </motion.div>

          <motion.div className={compactSurface} whileHover={{ y: -1 }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-pill bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.available || 0}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className={eyebrow}>Panel actions</h3>

        <div className="grid grid-cols-3 gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleCreateStaff}
            className={`${actionBase} bg-sky-500/10 hover:bg-sky-500/15 text-sky-700 dark:text-sky-200`}
            data-state={canManage ? 'ready' : 'unavailable'}
            aria-disabled={!canManage}
            title="Add staff"
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
            <span className="text-xs font-semibold">Add</span>
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleAnalytics}
            className={`${actionBase} bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-700 dark:text-cyan-200`}
            title="View staff statistics"
          >
            <BarChart3 className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
            <span className="text-xs font-semibold">Stats</span>
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleFilters}
            className={`${actionBase} bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-200`}
            title="Filter staff"
          >
            <Filter className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
            <span className="text-xs font-semibold">Filter</span>
          </motion.button>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="rounded-inner bg-muted/25 px-3 py-2 text-xs text-muted-foreground shadow-sm"
        >
          {panelNotice}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className={eyebrow}>Current list</h3>
        <div className="space-y-1">
          {context.loading && (
            <div className={`${compactSurface} flex items-center justify-center gap-2 py-4`} role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-sky-500" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Loading staff</span>
            </div>
          )}
          {!context.loading && visibleStaff.map((staff, idx) => (
            <motion.div
              key={staff.id || idx}
              className="surface-card p-3 rounded-button flex items-center justify-between shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-colors hover:bg-foreground/[0.08] dark:hover:bg-white/[0.10] group"
              whileHover={{ y: -1 }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-pill flex items-center justify-center flex-shrink-0 ${getStatusTone(staff.status)} group-hover:scale-105 transition-transform`}>
                  <Stethoscope className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate max-w-[120px]">
                    {getDisplayName(staff)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                    {staff.specialization || 'Staff'}
                  </p>
                </div>
              </div>
              <span className={`rounded-pill px-2 py-1 text-[10px] font-semibold ${getStatusTone(staff.status)}`}>
                {staff.status === 'on_call' ? 'On call' : staff.status === 'off_duty' ? 'Away' : staff.status || 'Active'}
              </span>
            </motion.div>
          ))}
          {!context.loading && visibleStaff.length === 0 && (
            <div className={`${compactSurface} text-center py-5`}>
              <p className="text-xs text-muted-foreground">No staff in the current view.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
