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

// Users right-side context pane. CANON: mirrors the GOLD reference EmergencyPanel (Requests) --
// rounded-card big surface / rounded-inner compacts + rows / rounded-icon surface-card wells
// (SQUIRCLE, not circular rounded-pill) / rounded-pill badges / colored-tint metric bgs / neutral
// shadows. Single whole-object prop (usersContext) read off the page's PUBLISHED shape
// (context.stats/.recent), so it stays in sync with the server projection. (Was briefly copied
// from DoctorsPanel, which had regressed to circular pill wells + flat rounded-card compacts --
// user-caught surface regression 2026-07-10.)

const toCount = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getUserName = (user) => (
  user?.full_name || user?.name || user?.username || user?.profile_username || 'User'
);
const getInitial = (user) => (getUserName(user)?.[0] || 'U').toUpperCase();
const formatSignIn = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
};

export const UsersPanel = ({ usersContext }) => {
  const context = usersContext || {};
  const stats = context.stats || {};
  const recent = Array.isArray(context.recent) ? context.recent : [];
  const hasContext = Boolean(usersContext);
  const loading = Boolean(context.loading) || !hasContext;
  const total = toCount(stats.total ?? context.count, recent.length);
  const providers = toCount(stats.provider, 0);
  const patients = toCount(stats.patient, 0);
  const orgAdmins = toCount(stats.org_admin, 0);
  const verified = toCount(stats.verified, 0);
  const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
  const pending = Math.max(total - verified, 0);
  const canManage = context.canManage !== false;
  const [panelNotice, setPanelNotice] = React.useState('User actions ready.');

  const handleInvite = () => {
    if (!canManage) {
      setPanelNotice('Invite is unavailable for this role.');
      return;
    }
    setPanelNotice('Opening invite form.');
    window.dispatchEvent(new CustomEvent('openInviteUserModal'));
  };
  const handleOpenAnalytics = () => {
    setPanelNotice('Opening statistics.');
    window.dispatchEvent(new CustomEvent('openUserAnalytics'));
  };
  const handleOpenFilters = () => {
    setPanelNotice('Opening filters.');
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const shadow = 'shadow-[0_4px_12px_rgb(0_0_0/0.07)]';
  const eyebrow = 'px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';
  const actionBtn = `group flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-button surface-card px-3 text-muted-foreground ${shadow} transition-[background,box-shadow,transform] duration-200 hover:bg-foreground/10 hover:text-foreground`;

  const compacts = [
    { key: 'providers', label: 'Providers', value: providers, icon: Stethoscope, tint: 'bg-amber-500/10' },
    { key: 'patients', label: 'Patients', value: patients, icon: UserRound, tint: 'bg-cyan-500/10' },
    { key: 'orgAdmins', label: 'Org admins', value: orgAdmins, icon: Shield, tint: 'bg-violet-500/10' },
    { key: 'verified', label: `${verified} verified - ${pending} pending`, value: `${verifiedRate}%`, icon: UserCheck, tint: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-3">
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="space-y-3"
        aria-label="Users overview"
      >
        <p className={eyebrow}>Users overview</p>

        <div className={`group rounded-card bg-sky-500/10 p-4 text-sky-900 ${shadow} transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 dark:text-sky-100`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/75 dark:text-sky-100/70">
                Current route scope
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
                {loading ? '...' : total}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {total === 1 ? 'User in this view' : 'Users in this view'}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon surface-card text-sky-700 transition-transform duration-200 group-hover:scale-105 dark:text-sky-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {compacts.map(({ key, label, value, icon: Icon, tint }) => (
            <div key={key} className={`rounded-inner ${tint} p-3 ${shadow}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon surface-card">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold tracking-normal text-foreground">
                    {loading ? '...' : value}
                  </span>
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <section className="space-y-2" aria-label="Panel actions">
        <p className={eyebrow}>Panel actions</p>
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleInvite}
            className={actionBtn}
            data-state={canManage ? 'idle' : 'unavailable'}
            aria-disabled={!canManage}
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Invite</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAnalytics}
            className={actionBtn}
          >
            <BarChart3 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Stats</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenFilters}
            className={actionBtn}
          >
            <Filter className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Filter</span>
          </motion.button>
        </div>
        <p className="px-1 text-xs font-medium text-muted-foreground" role="status" aria-live="polite">
          {panelNotice}
        </p>
      </section>

      <section className="space-y-2" aria-label="Recent users">
        <p className={eyebrow}>Recent users</p>
        <div className="space-y-2">
          {recent.map((user, index) => {
            const signIn = formatSignIn(user?.last_sign_in_at);
            return (
              <motion.div
                key={user?.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`group rounded-inner surface-card p-3 ${shadow} transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-foreground/[0.08] dark:hover:bg-white/[0.10]`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon surface-card text-muted-foreground transition-transform duration-200 group-hover:scale-105">
                      <span className="text-[11px] font-semibold">{getInitial(user)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">
                        {getUserName(user)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                        {user?.email || 'No email'}
                      </span>
                    </span>
                  </div>
                  <span className="shrink-0 rounded-pill surface-card px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {signIn || (user?.bvn_verified ? 'Verified' : 'Pending')}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {!loading && recent.length === 0 && (
            <div className="rounded-inner surface-card px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              No users in the current view.
            </div>
          )}
          {loading && recent.length === 0 && (
            <div className="rounded-inner surface-card px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              Loading users.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
