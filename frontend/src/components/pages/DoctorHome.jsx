import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Ambulance, Play, Flag, ArrowRight, CalendarClock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { SEOHead } from '../common/SEOHead';

/**
 * DoctorHome — task-based "your day" home for the provider (doctor) role.
 *
 * Replaces the platform-metric bento grid for doctors with a calm, role-scoped view:
 * their visits today, the active emergency count, and two primary actions.
 *
 * Data honesty: visits/emergency feeds fall back to mock data in PageDataContext,
 * so numbers render ONLY when not in mock mode (`useMockData === false`) and the
 * value exists. Otherwise we show an explicit empty state — never a fabricated list.
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

export const DoctorHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { emergencyStats, visitsStats, useMockData } = usePageData();

  const liveData = !useMockData;
  const visitsToday = liveData && visitsStats?.today != null ? visitsStats.today : null;
  const activeEmergencies = liveData && emergencyStats?.active != null ? emergencyStats.active : null;

  const firstName = (profile?.full_name || profile?.username || '').trim().split(' ')[0] || 'Doctor';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const ease = [0.4, 0, 0.2, 1];

  return (
    <div className="min-h-screen py-6 md:py-8 max-w-5xl">
      <SEOHead title="Home" description="Your visits and emergencies for today." />

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date().getHours())}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dateLabel}
          {visitsToday ? ` · ${visitsToday} visit${visitsToday === 1 ? '' : 's'} today` : ''}
        </p>
      </motion.div>

      <p className="mt-7 mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">Today</p>

      {/* Your visits today */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="glass-card rounded-card p-5 md:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Your visits today</h2>
          <button
            onClick={() => navigate('/visits')}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            View schedule <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {visitsToday == null ? (
          <EmptyState
            icon={CalendarClock}
            title="Your schedule will appear here"
            sub="Once your visits sync, today's appointments show up in this space."
          />
        ) : visitsToday === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No visits scheduled today"
            sub="When a visit is booked, you'll see the patient and time here."
          />
        ) : (
          <button
            onClick={() => navigate('/visits')}
            className="w-full text-left rounded-inner bg-background/40 hover:bg-background/70 transition-colors p-4 flex items-center gap-4 border border-border/40"
          >
            <div className="w-12 h-12 rounded-icon bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold tracking-tight text-foreground leading-none">{visitsToday}</p>
              <p className="text-sm text-muted-foreground mt-1">
                visit{visitsToday === 1 ? '' : 's'} on your schedule today
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        )}
      </motion.div>

      {/* Emergencies + Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <motion.button
          layout
          onClick={() => navigate('/emergencies')}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05, ease }}
          className="glass-card rounded-card p-5 md:p-6 text-left flex flex-col justify-between min-h-[150px] hover-lift"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-icon bg-destructive/10 flex items-center justify-center">
              <Ambulance className="h-5 w-5 text-destructive" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Emergency queue</span>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {activeEmergencies == null ? '—' : activeEmergencies}
            </span>
            <span className="text-sm text-muted-foreground ml-2">active now</span>
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
            onClick={() => navigate('/visits')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm py-3 hover:opacity-95 transition-opacity"
          >
            <Play className="h-4 w-4" /> Start a visit
          </button>
          <button
            onClick={() => navigate('/support-tickets')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-muted/50 text-foreground font-medium text-sm py-3 hover:bg-muted transition-colors"
          >
            <Flag className="h-4 w-4" /> Report a problem
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default DoctorHome;
