import React, { useCallback, useState } from 'react';
import { Activity, Ambulance, BarChart3, Clock, FileText, Hospital, TrendingUp, Users } from 'lucide-react';

const ANALYTICS_UNAVAILABLE_MESSAGE = 'Reports unavailable until analytics scope is verified.';
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const minutes = (value) => Number(value) > 0 ? `${Number(value).toFixed(1)}m` : 'Source pending';

const Metric = ({ icon: Icon, label, value, tone = 'muted' }) => {
  const tones = {
    clear: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  };
  return <div className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${tones[tone]}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p></div></div>;
};

export const AnalyticsPanel = ({ analyticsContext = null }) => {
  const [panelNotice, setPanelNotice] = useState('Analytics scope pending.');
  const unavailable = useCallback(() => setPanelNotice(ANALYTICS_UNAVAILABLE_MESSAGE), []);
  const stats = analyticsContext?.stats || {};
  const role = analyticsContext?.roleContext || {};
  const scopeLabel = role.isProvider ? 'Provider scope' : role.isSponsor ? 'Sponsor scope' : role.isOrgAdmin ? 'Organization scope' : role.isAdmin ? 'Admin scope' : 'Scoped view';

  if (analyticsContext?.loading && !analyticsContext?.stats) return <div className="space-y-3 py-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}</div>;

  return <div className="space-y-5">
    {(analyticsContext?.error || analyticsContext?.sourceIssueSummary) && <div role="status" className={`rounded-inner px-4 py-3 text-sm ${analyticsContext?.error ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}>{analyticsContext?.error || analyticsContext.sourceIssueSummary.title}</div>}
    <section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Statistics overview</h3><span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{analyticsContext?.timeRange || '7d'}</span></div><div className="rounded-modal bg-background/45 p-4 dark:bg-white/[0.04]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200"><Activity className="h-5 w-5" /></span><div><p className="text-base font-semibold">{scopeLabel}</p><p className="mt-1 text-xs text-muted-foreground">Measured route projection</p></div></div></div></section>
    <section><h3 className="mb-3 text-sm font-semibold">Current scope</h3><div className="grid grid-cols-2 gap-2"><Metric icon={BarChart3} label="Requests" value={number(stats.totalEmergencies)} tone="warning" /><Metric icon={TrendingUp} label="Completion" value={number(stats.totalEmergencies) ? `${number(stats.successRate)}%` : 'Source pending'} tone="clear" /><Metric icon={Clock} label="Avg response" value={minutes(stats.avgResponseTime)} tone="info" /><Metric icon={Users} label="Users" value={number(stats.totalUsers)} /><Metric icon={Hospital} label="Hospitals" value={number(stats.totalHospitals)} /><Metric icon={Ambulance} label="Fleet" value={number(stats.totalAmbulances)} /></div></section>
    <section><h3 className="mb-3 text-sm font-semibold">Reporting</h3><div className="grid grid-cols-2 gap-2"><button type="button" onClick={unavailable} aria-disabled="true" data-state="unavailable" title={ANALYTICS_UNAVAILABLE_MESSAGE} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-muted-foreground transition-all hover:bg-foreground/10 active:scale-[0.97] dark:bg-white/[0.04]"><FileText className="h-4 w-4" /><span className="text-xs font-medium">Reports</span></button><button type="button" onClick={unavailable} aria-disabled="true" data-state="unavailable" title={ANALYTICS_UNAVAILABLE_MESSAGE} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-muted-foreground transition-all hover:bg-foreground/10 active:scale-[0.97] dark:bg-white/[0.04]"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium">Export</span></button></div><p role="status" aria-live="polite" className="mt-2 px-1 text-xs text-muted-foreground">{panelNotice}</p></section>
  </div>;
};
