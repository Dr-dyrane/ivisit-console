import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Newspaper, Settings, LifeBuoy, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SEOHead } from '../common/SEOHead';

/**
 * ViewerHome — orientation home for the pre-activation viewer role (plan 1.5).
 *
 * Replaces the near-empty bento grid (which read as "your account is broken")
 * with a clear activation message and a few read-only destinations.
 */
const greetingFor = (h) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

const LinkCard = ({ onClick, icon: Icon, title, delay, ease }) => (
  <motion.button
    layout
    onClick={onClick}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease }}
    className="bg-card/70 rounded-card p-5 text-left flex items-center gap-3"
  >
    <div className="w-10 h-10 rounded-icon bg-muted/40 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-foreground" />
    </div>
    <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </motion.button>
);

export const ViewerHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = (profile?.full_name || profile?.username || '').trim().split(' ')[0] || 'there';
  const ease = [0.4, 0, 0.2, 1];

  return (
    <div className="min-h-screen py-6 md:py-8 max-w-3xl">
      <SEOHead title="Home" description="Your account is pending activation." />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date().getHours())}, {firstName}
        </h1>
      </motion.div>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="bg-card/70 rounded-card p-6 md:p-8 mt-6 flex flex-col items-center text-center"
      >
        <div className="w-14 h-14 rounded-icon bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Your account is pending activation</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          You have view-only access right now. Contact your organization administrator to receive a role
          assignment and unlock your workspace.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <LinkCard onClick={() => navigate('/health-news')} icon={Newspaper} title="Health news" delay={0.05} ease={ease} />
        <LinkCard onClick={() => navigate('/settings')} icon={Settings} title="Settings" delay={0.1} ease={ease} />
        <LinkCard onClick={() => navigate('/support-tickets')} icon={LifeBuoy} title="Support" delay={0.15} ease={ease} />
      </div>
    </div>
  );
};

export default ViewerHome;
