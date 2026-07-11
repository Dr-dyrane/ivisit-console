import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Stethoscope,
  UserRound,
  Shield,
  UserCheck,
  Plus,
  Filter,
  BarChart3,
  Loader2
} from 'lucide-react';

// Users right-side context pane. CANON: single whole-object prop (usersContext), read straight
// off the page's PUBLISHED shape -- the exact Doctors/Staff template (staffContext). It used to
// take renamed cherry-picked props that ContextPanel mapped from the route context, which never
// matched the page's { stats, recent, ... } payload -- so the panel silently fell back to counting
// the 25-row page window (2026-07-10 desync). One source now: context.stats
// { total, provider, org_admin, patient, verified } + context.recent (raw rows).

const getUserName = (user) => (
  user?.full_name || user?.name || user?.username || user?.profile_username || 'User'
);

const getInitial = (user) => (getUserName(user)?.[0] || 'U').toUpperCase();

const formatSignIn = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

export const UsersPanel = ({ usersContext }) => {
  const [panelNotice, setPanelNotice] = React.useState('User actions ready.');
  const context = usersContext || {};
  const stats = context.stats || { total: 0, provider: 0, org_admin: 0, patient: 0, verified: 0 };
  const recentRows = Array.isArray(context.recent) ? context.recent : [];
  const canManage = context.canManage !== false;

  const total = Number(stats.total) || 0;
  const verified = Number(stats.verified) || 0;
  const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
  const pending = Math.max(total - verified, 0);

  const handleInvite = () => {
    if (!canManage) {
      setPanelNotice('Invite is unavailable for this role.');
      return;
    }
    setPanelNotice('Opening invite form.');
    window.dispatchEvent(new CustomEvent('openInviteUserModal'));
  };

  const handleAnalytics = () => {
    setPanelNotice('Opening user statistics.');
    window.dispatchEvent(new CustomEvent('openUserAnalytics'));
  };

  const handleFilters = () => {
    setPanelNotice('Opening user filters.');
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
        <h3 className={eyebrow}>Users overview</h3>

        <motion.div className={panelSurface} whileHover={{ y: -1 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-pill bg-sky-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-sky-600 dark:text-sky-300" aria-hidden="true" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight">Total users</span>
                <p className="text-xs text-muted-foreground">Current route scope</p>
              </div>
            </div>
            <span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
              {total}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-2">
          <motion.div className={compactSurface} whileHover={{ y: -1 }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-pill bg-amber-500/10 flex items-center justify-center">
                <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm">{Number(stats.provider) || 0}</p>
                <p className="text-xs text-muted-foreground">Providers</p>
              </div>
            </div>
          </motion.div>

          <motion.div className={compactSurface} whileHover={{ y: -1 }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-pill bg-sky-500/10 flex items-center justify-center">
                <UserRound className="h-4 w-4 text-sky-600 dark:text-sky-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm">{Number(stats.patient) || 0}</p>
                <p className="text-xs text-muted-foreground">Patients</p>
              </div>
            </div>
          </motion.div>

          <motion.div className={compactSurface} whileHover={{ y: -1 }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-pill bg-violet-500/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm">{Number(stats.org_admin) || 0}</p>
                <p className="text-xs text-muted-foreground">Org admins</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div className={panelSurface} whileHover={{ y: -1 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-pill bg-emerald-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight">Verified</span>
                <p className="text-xs text-muted-foreground">{verified} of {total} - {pending} pending</p>
              </div>
            </div>
            <span className="rounded-pill bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
              {verifiedRate}%
            </span>
          </div>
        </motion.div>
      </div>

      <div className="space-y-3">
        <h3 className={eyebrow}>Panel actions</h3>

        <div className="grid grid-cols-3 gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleInvite}
            className={`${actionBase} bg-sky-500/10 hover:bg-sky-500/15 text-sky-700 dark:text-sky-200`}
            data-state={canManage ? 'ready' : 'unavailable'}
            aria-disabled={!canManage}
            title="Invite user"
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
            <span className="text-xs font-semibold">Invite</span>
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleAnalytics}
            className={`${actionBase} bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-700 dark:text-cyan-200`}
            title="View user statistics"
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
            title="Filter users"
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
        <h3 className={eyebrow}>Recent users</h3>
        <div className="space-y-1">
          {context.loading && (
            <div className={`${compactSurface} flex items-center justify-center gap-2 py-4`} role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-sky-500" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Loading users</span>
            </div>
          )}
          {!context.loading && recentRows.map((user, idx) => {
            const signIn = formatSignIn(user.last_sign_in_at);
            return (
              <motion.div
                key={user.id || idx}
                className="surface-card p-3 rounded-button flex items-center justify-between shadow-[0_4px_12px_rgb(0_0_0/0.07)] transition-colors hover:bg-foreground/[0.08] dark:hover:bg-white/[0.10] group"
                whileHover={{ y: -1 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-pill bg-muted flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-[10px] font-bold text-muted-foreground">{getInitial(user)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate max-w-[120px]">{getUserName(user)}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user.email || 'No email'}</p>
                  </div>
                </div>
                <span className="rounded-pill px-2 py-1 text-[10px] font-semibold bg-muted/25 text-muted-foreground whitespace-nowrap">
                  {signIn || (user.bvn_verified ? 'Verified' : 'Pending')}
                </span>
              </motion.div>
            );
          })}
          {!context.loading && recentRows.length === 0 && (
            <div className={`${compactSurface} text-center py-5`}>
              <p className="text-xs text-muted-foreground">No users in the current view.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
