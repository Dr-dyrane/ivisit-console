import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Newspaper, BarChart3, ArrowRight, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SEOHead } from '../common/SEOHead';

/**
 * SponsorHome — purpose-built "impact" home for the sponsor role (plan 1.4).
 *
 * Sponsors previously landed on an operations dashboard built for dispatchers.
 * This gives them an impact-oriented entry point. Detailed impact reporting
 * (funded programs, outcomes) is a future sprint, so we link to the live
 * analytics rather than inventing impact numbers.
 */
const greetingFor = (h) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

const LinkCard = ({ onClick, icon: Icon, title, sub, delay, ease }) => (
  <motion.button
    layout
    onClick={onClick}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease }}
    className="bg-card/70 rounded-card p-5 md:p-6 text-left flex items-center gap-4 min-h-[110px]"
  >
    <div className="w-11 h-11 rounded-icon bg-muted/40 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
  </motion.button>
);

export const SponsorHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = (profile?.full_name || profile?.username || '').trim().split(' ')[0] || 'there';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const ease = [0.4, 0, 0.2, 1];

  return (
    <div className="min-h-screen py-6 md:py-8 max-w-5xl">
      <SEOHead title="Home" description="Your impact overview." />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date().getHours())}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{dateLabel}</p>
      </motion.div>

      <p className="mt-7 mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">Your impact</p>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="bg-card/70 rounded-card p-5 md:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-icon bg-primary/10 flex items-center justify-center shrink-0">
            <HeartHandshake className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Impact overview</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              See how the programs you support are performing. Detailed impact reporting — funded programs and
              outcomes — is on the way. For now, the platform analytics give you the clearest live picture.
            </p>
            <button
              onClick={() => navigate('/analytics')}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-card bg-primary text-primary-foreground font-semibold text-sm py-2.5 px-5 hover:opacity-95 transition-opacity"
            >
              <BarChart3 className="h-4 w-4" /> View analytics
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <LinkCard onClick={() => navigate('/analytics')} icon={TrendingUp} title="Platform analytics" sub="Response times, volumes, trends" delay={0.05} ease={ease} />
        <LinkCard onClick={() => navigate('/health-news')} icon={Newspaper} title="Health news" sub="Community updates you help fund" delay={0.1} ease={ease} />
      </div>
    </div>
  );
};

export default SponsorHome;
