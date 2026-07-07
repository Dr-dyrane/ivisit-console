import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Users, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { SEOHead } from '../common/SEOHead';

/**
 * AdminHome — platform-oversight home for the system admin role (plan 1.3 / 3.1).
 *
 * Replaces the sparse metric grid with a calm task-based view: the live
 * operational counts an admin acts on (emergencies, approvals, members) plus
 * the actions they reach for most. Numbers render only when not in mock mode
 * and the value exists; otherwise an explicit em-dash.
 */
const greetingFor = (h) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

const StatCard = ({ icon: Icon, label, value, sub, accent, onClick, delay, ease }) => (
  <motion.button
    layout
    onClick={onClick}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease }}
    className="glass-card rounded-card p-5 md:p-6 text-left flex flex-col justify-between min-h-[140px] hover-lift"
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-icon flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
    <div className="mt-4">
      <span className="text-4xl font-semibold tracking-tight text-foreground">{value == null ? '—' : value}</span>
      {sub ? <span className="text-sm text-muted-foreground ml-2">{sub}</span> : null}
    </div>
  </motion.button>
);

const ActionCard = ({ icon: Icon, title, onClick, delay, ease }) => (
  <motion.button
    layout
    onClick={onClick}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease }}
    className="glass-card rounded-card p-5 text-left flex items-center gap-3 hover-lift"
  >
    <div className="w-10 h-10 rounded-icon bg-primary/10 flex items-center justify-center">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </motion.button>
);

export const AdminHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { emergencyStats, verificationData, userData, useMockData } = usePageData();

  const live = !useMockData;
  const activeEmergencies = live && emergencyStats?.active != null ? emergencyStats.active : null;
  const pendingApprovals = live && verificationData?.pending != null ? verificationData.pending : null;
  const members = live && userData?.statistics?.totalUsers != null ? userData.statistics.totalUsers : null;

  const firstName = (profile?.full_name || profile?.username || '').trim().split(' ')[0] || 'Admin';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const ease = [0.4, 0, 0.2, 1];

  return (
    <div className="min-h-screen py-6 md:py-8 max-w-5xl">
      <SEOHead title="Home" description="Platform overview." />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date().getHours())}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{dateLabel}</p>
      </motion.div>

      <p className="mt-7 mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">Platform today</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Activity}
          label="Active emergencies"
          value={activeEmergencies}
          sub="now"
          accent="bg-destructive/10 text-destructive"
          onClick={() => navigate('/emergencies')}
          delay={0}
          ease={ease}
        />
        <StatCard
          icon={ShieldCheck}
          label="Pending approvals"
          value={pendingApprovals}
          sub="to review"
          accent="bg-warning/10 text-warning"
          onClick={() => navigate('/verification')}
          delay={0.05}
          ease={ease}
        />
        <StatCard
          icon={Users}
          label="Members"
          value={members}
          accent="bg-info/10 text-info"
          onClick={() => navigate('/users')}
          delay={0.1}
          ease={ease}
        />
      </div>

      <p className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">Quick actions</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionCard icon={Users} title="Manage users" onClick={() => navigate('/users')} delay={0} ease={ease} />
        <ActionCard icon={Building2} title="Organizations" onClick={() => navigate('/organizations')} delay={0.05} ease={ease} />
        <ActionCard icon={ShieldCheck} title="Verification queue" onClick={() => navigate('/verification')} delay={0.1} ease={ease} />
      </div>
    </div>
  );
};

export default AdminHome;
