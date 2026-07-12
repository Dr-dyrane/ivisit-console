import React from 'react';
import { BarChart3, CheckCircle, Clock, Mail, Plus, Send, Users2 } from 'lucide-react';

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : 'No date';
const tone = (status) => status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' : ['unsubscribed', 'bounced', 'inactive'].includes(status) ? 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';

const Metric = ({ icon: Icon, label, value, className }) => <div className="rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-icon ${className}`}><Icon className="h-4 w-4" /></span><div><p className="text-sm font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div></div>;
const Action = ({ icon: Icon, label, unavailable, onClick }) => <button type="button" onClick={onClick} aria-disabled={unavailable} data-state={unavailable ? 'unavailable' : 'available'} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.97] dark:bg-white/[0.04]"><Icon className="h-4 w-4" /><span className="text-xs font-medium">{label}</span></button>;

export const SubscriptionsPanel = ({ subscriptionsContext = null }) => {
  const rows = subscriptionsContext?.subscribers || [];
  const summary = subscriptionsContext?.summary || {};
  const focused = subscriptionsContext?.focusedSubscriber || rows[0] || null;
  const loading = Boolean(summary.loading);
  const error = summary.error;
  if (loading && rows.length === 0) return <div className="space-y-3 py-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}</div>;

  return <div className="space-y-5">
    {error && <div className="rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">{error}</div>}
    <section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Subscriber scope</h3><span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{number(summary.total)}</span></div><div className="grid grid-cols-2 gap-2"><Metric icon={CheckCircle} label="Active" value={number(summary.active)} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" /><Metric icon={Clock} label="Pending" value={number(summary.pending)} className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200" /></div></section>
    {focused && <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-muted-foreground">Current subscriber</p><h3 className="mt-2 truncate text-base font-semibold">{focused.email || 'Unknown subscriber'}</h3><p className="mt-1 text-xs capitalize text-muted-foreground">{focused.type || 'free'} plan · {date(focused.subscription_date || focused.created_at)}</p></div><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${tone(focused.status)}`}>{focused.status || 'pending'}</span></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('openFocusedSubscriptionRecord', { detail: focused }))} className="mt-4 flex h-10 w-full items-center justify-center rounded-button bg-foreground text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"><Mail className="mr-2 h-4 w-4" />Open details</button></section>}
    <section><h3 className="mb-3 text-sm font-semibold">Quick actions</h3><div className="grid grid-cols-3 gap-2"><Action icon={Plus} label="Join" unavailable onClick={() => window.dispatchEvent(new CustomEvent('openSubscriptionModal'))} /><Action icon={BarChart3} label="Analytics" onClick={() => window.dispatchEvent(new CustomEvent('openAnalyticsModal'))} /><Action icon={Send} label="Email" unavailable onClick={() => window.dispatchEvent(new CustomEvent('openSubscriptionModal'))} /></div></section>
    <section><h3 className="mb-3 text-sm font-semibold">Recent subscribers</h3><div className="space-y-2">{rows.slice(0, 4).map((subscriber) => <div key={subscriber.id} className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${tone(subscriber.status)}`}><Users2 className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{subscriber.email || 'Unknown subscriber'}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{subscriber.type || 'free'} · {date(subscriber.created_at)}</p></div></div>)}{rows.length === 0 && <p className="py-3 text-sm text-muted-foreground">No subscribers in this scope.</p>}</div></section>
  </div>;
};
