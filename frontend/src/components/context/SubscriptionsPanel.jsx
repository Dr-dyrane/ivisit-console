import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Users2,
  Clock,
  Mail,
  UserPlus,
  Shield,
  Send,
  BarChart3,
  Plus
} from 'lucide-react';

export const SubscriptionsPanel = ({ subscribers }) => {
  const handleOpenEmailActions = () => {
    const event = new CustomEvent('openEmailActionsModal');
    window.dispatchEvent(event);
  };

  const handleOpenCreateSubscriber = () => {
    const event = new CustomEvent('openSubscriptionModal');
    window.dispatchEvent(event);
  };

  const handleOpenAnalytics = () => {
    const event = new CustomEvent('openAnalyticsModal');
    window.dispatchEvent(event);
  };

  const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
  const pendingSubscribers = subscribers.filter(s => s.status === 'pending').length;
  const freeSubscribers = subscribers.filter(s => s.type === 'free').length;
  const paidSubscribers = subscribers.filter(s => s.type === 'paid').length;

  return (
    <div className="space-y-4">
      {/* Subscriber Stats */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Pulse Overview</h3>

        <div className="bg-success/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users2 className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight">Active Reach</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Growth active</p>
            </div>
          </div>
          <Badge className="bg-success/20 text-success border-0 rounded-full">{activeSubscribers}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-warning/5 p-4 rounded-3xl group transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending</span>
            </div>
            <p className="font-bold text-sm tracking-tight">{pendingSubscribers} Awaiting</p>
          </div>

          <div className="bg-primary/5 p-4 rounded-3xl group transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</span>
            </div>
            <p className="font-bold text-sm tracking-tight">{subscribers.length} Global</p>
          </div>
        </div>
      </motion.div>

      {/* Tiers */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-info/5 p-4 rounded-3xl group">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-info group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Free Tier</span>
          </div>
          <p className="font-bold text-sm tracking-tight">{freeSubscribers}</p>
        </div>
        <div className="bg-purple-500/5 p-4 rounded-3xl group">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Premium</span>
          </div>
          <p className="font-bold text-sm tracking-tight text-purple-500">{paidSubscribers}</p>
        </div>
      </div>

      {/* Operations */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleOpenCreateSubscriber}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0 group"
        >
          <Plus className="h-5 w-5 text-primary group-hover:rotate-90 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Join</span>
        </button>
        <button
          onClick={handleOpenAnalytics}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-info/10 hover:bg-info/20 transition-all border-0 group"
        >
          <BarChart3 className="h-5 w-5 text-info group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-info">Data</span>
        </button>
        <button
          onClick={handleOpenEmailActions}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-secondary/30 dark:bg-white/5 hover:bg-secondary/40 transition-all border-0 group"
        >
          <Send className="h-5 w-5 text-muted-foreground group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Broadcast</span>
        </button>
      </div>

      {/* Live Roster */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Live Feed</h3>
        <div className="space-y-1">
          {subscribers.slice(0, 4).map((subscriber, idx) => (
            <div key={subscriber.id || idx} className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border-0 transition-colors hover:bg-white/10 group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${subscriber.status === 'active' ? 'bg-success/20' :
                  'bg-warning/20'
                  } group-hover:scale-105 transition-transform`}>
                  <Users2 className={`h-4 w-4 ${subscriber.status === 'active' ? 'text-success' : 'text-warning'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate max-w-[140px] tracking-tight">{subscriber.email}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    {subscriber.type} • {new Date(subscriber.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <Badge variant="ghost" className="text-[8px] font-bold uppercase tracking-widest p-0 h-auto opacity-60">
                {subscriber.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
