import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import {
  Users2,
  Clock,
  Mail,
  Shield,
  Send,
  BarChart3,
  Plus
} from 'lucide-react';

export const SubscriptionsPanel = ({ subscribers = [], summary = null }) => {
  const handleOpenCreateSubscriber = () => {
    const event = new CustomEvent('openSubscriptionModal');
    window.dispatchEvent(event);
  };

  const handleOpenAnalytics = () => {
    const event = new CustomEvent('openAnalyticsModal');
    window.dispatchEvent(event);
  };

  const rows = Array.isArray(subscribers) ? subscribers : [];
  const hasSummary = Boolean(summary);
  const totalSubscribers = summary?.total ?? rows.length;
  const activeSubscribers = summary?.active ?? rows.filter(s => s.status === 'active').length;
  const pendingSubscribers = summary?.pending ?? rows.filter(s => s.status === 'pending').length;
  const freeSubscribers = summary?.free ?? rows.filter(s => s.type === 'free').length;
  const paidSubscribers = summary?.paid ?? rows.filter(s => s.type === 'paid').length;
  const isLoading = Boolean(summary?.loading);
  const hasError = Boolean(summary?.error);
  const countLabel = (value) => (hasSummary || rows.length > 0 ? value : '...');

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unknown';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="ml-1 text-[11px] font-semibold text-muted-foreground">Subscriber context</h3>

        <div className="bg-emerald-500/10 p-4 rounded-card flex items-center justify-between group transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-icon flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users2 className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Active</p>
              <p className="text-[11px] text-muted-foreground">From this page</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 rounded-pill">{countLabel(activeSubscribers)}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-500/10 p-4 rounded-card group transition-all shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-700 dark:text-amber-200 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-muted-foreground">Pending</span>
            </div>
            <p className="font-bold text-sm">{countLabel(pendingSubscribers)}</p>
          </div>

          <div className="bg-muted p-4 rounded-card group transition-all shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-muted-foreground">Total</span>
            </div>
            <p className="font-bold text-sm">
              {hasSummary ? totalSubscribers : 'Source pending'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-sky-500/10 p-4 rounded-card group shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-sky-600 dark:text-sky-200 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-semibold text-muted-foreground">Free type</span>
          </div>
          <p className="font-bold text-sm">{countLabel(freeSubscribers)}</p>
        </div>
        <div className="bg-violet-500/10 p-4 rounded-card group shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-violet-700 dark:text-violet-200 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-semibold text-muted-foreground">Paid type</span>
          </div>
          <p className="font-bold text-sm text-violet-700 dark:text-violet-200">{countLabel(paidSubscribers)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={handleOpenCreateSubscriber}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-card bg-muted hover:bg-muted/70 transition-all group"
        >
          <Plus className="h-5 w-5 text-muted-foreground group-hover:rotate-90 transition-transform" />
          <span className="text-[11px] font-semibold text-muted-foreground">Join</span>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={handleOpenAnalytics}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-card bg-sky-500/10 hover:bg-sky-500/15 transition-all group"
        >
          <BarChart3 className="h-5 w-5 text-sky-600 dark:text-sky-200 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-200">Data</span>
        </motion.button>
        <button
          type="button"
          disabled
          aria-label="Broadcast unavailable"
          title="Email send needs receiver proof"
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-card bg-muted dark:bg-white/5 opacity-55 cursor-not-allowed"
        >
          <Send className="h-5 w-5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">Email off</span>
        </button>
      </div>

      {(isLoading || hasError || !hasSummary) && (
        <p className={`ml-1 text-[11px] ${hasError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {hasError ? 'Summary needs retry.' : 'Waiting for page summary.'}
        </p>
      )}

      <div className="space-y-2">
        <h3 className="ml-1 text-[11px] font-semibold text-muted-foreground">Recent</h3>
        <div className="space-y-1">
          {rows.slice(0, 4).map((subscriber, idx) => (
            <div key={subscriber.id || idx} className="bg-white/5 p-3 rounded-inner flex items-center justify-between transition-colors hover:bg-white/10 group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-icon flex items-center justify-center flex-shrink-0 ${
                  subscriber.status === 'active' ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                } group-hover:scale-105 transition-transform`}>
                  <Users2 className={`h-4 w-4 ${subscriber.status === 'active' ? 'text-emerald-700 dark:text-emerald-200' : 'text-amber-700 dark:text-amber-200'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate max-w-[140px]">
                    {subscriber.full_name || subscriber.name || `Subscriber ${idx + 1}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {subscriber.type || 'Type unknown'} - {formatDate(subscriber.created_at)}
                  </p>
                </div>
              </div>
              <Badge variant="ghost" className="text-[10px] font-semibold p-0 h-auto opacity-60">
                {subscriber.status || 'unknown'}
              </Badge>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="bg-white/5 p-3 rounded-inner text-[11px] text-muted-foreground">
              No subscribers shown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
