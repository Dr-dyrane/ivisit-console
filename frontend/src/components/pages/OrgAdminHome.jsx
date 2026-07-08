import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Stethoscope, UserPlus, ArrowRight, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { SEOHead } from '../common/SEOHead';

/**
 * OrgAdminHome — approvals-first "your day" home for the hospital admin (org_admin) role.
 *
 * Their primary administrative task is the credential verification queue, so it leads.
 * Data honesty: counts render only when not in mock mode (`useMockData === false`) and
 * the value exists; otherwise an explicit empty state is shown.
 */
const greetingFor = (h) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

const EmptyState = ({ icon: Icon, title, sub }) => (
  <div className="rounded-inner bg-background/30 border border-dashed border-border/50 p-6 flex flex-col items-center text-center">
    <div className="w-11 h-11 rounded-icon bg-muted/40 flex items-center justify-center mb-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1 max-w-xs">{sub}</p>
  </div>
);

export const OrgAdminHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { verificationData, doctorsData, useMockData } = usePageData();

  const liveData = !useMockData;
  const pendingApprovals = liveData && verificationData?.pending != null ? verificationData.pending : null;
  const staffOnShift = liveData && doctorsData?.stats?.onCall != null ? doctorsData.stats.onCall : null;
  const totalStaff = liveData && doctorsData?.stats?.totalDoctors != null ? doctorsData.stats.totalDoctors : null;

  const firstName = (profile?.full_name || profile?.username || '').trim().split(' ')[0] || 'Admin';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const ease = [0.4, 0, 0.2, 1];

  return (
    <div className="min-h-screen py-6 md:py-8 max-w-5xl">
      <SEOHead title="Home" description="Pending approvals and staff overview for your facility." />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date().getHours())}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dateLabel}
          {pendingApprovals ? ` · ${pendingApprovals} pending approval${pendingApprovals === 1 ? '' : 's'}` : ''}
        </p>
      </motion.div>

      <p className="mt-7 mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">Today</p>

      {/* Pending approvals — the org admin's primary task */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="glass-card rounded-card p-5 md:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Pending approvals</h2>
          <button
            onClick={() => navigate('/verification')}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Review queue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {pendingApprovals == null ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Approvals will appear here"
            sub="When a provider submits credentials for review, they show up in this space."
          />
        ) : pendingApprovals === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="You're all caught up"
            sub="No credentials are waiting on your review right now."
          />
        ) : (
          <button
            onClick={() => navigate('/verification')}
            className="w-full text-left rounded-inner bg-background/40 hover:bg-background/70 transition-colors p-4 flex items-center gap-4 border border-border/40"
          >
            <div className="w-12 h-12 rounded-icon bg-warning/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold tracking-tight text-foreground leading-none">{pendingApprovals}</p>
              <p className="text-sm text-muted-foreground mt-1">
                provider{pendingApprovals === 1 ? '' : 's'} waiting on your review
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        )}
      </motion.div>

      {/* Staff + Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <motion.button
          layout
          onClick={() => navigate('/doctors')}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05, ease }}
          className="glass-card rounded-card p-5 md:p-6 text-left flex flex-col justify-between min-h-[150px] hover-lift"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-icon bg-info/10 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-info" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Staff on shift</span>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {staffOnShift == null ? '—' : staffOnShift}
            </span>
            <span className="text-sm text-muted-foreground ml-2">
              {totalStaff != null ? `of ${totalStaff} on call` : 'on call'}
            </span>
          </div>
        </motion.button>

        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease }}
          className="glass-card rounded-card p-5 md:p-6 flex flex-col gap-2.5 min-h-[150px] justify-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">Quick actions</p>
          <button
            onClick={() => navigate('/verification')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm py-3 hover:opacity-95 transition-opacity"
          >
            <ShieldCheck className="h-4 w-4" /> Review approvals
          </button>
          <button
            onClick={() => navigate('/doctors')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-muted/50 text-foreground font-medium text-sm py-3 hover:bg-muted transition-colors"
          >
            <UserPlus className="h-4 w-4" /> Add a doctor
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default OrgAdminHome;
