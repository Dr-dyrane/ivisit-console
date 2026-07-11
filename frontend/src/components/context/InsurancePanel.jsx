import React from 'react';
import { BarChart3, CheckCircle, Clock, Download, Eye, Filter, Plus, ReceiptText, Shield } from 'lucide-react';
import { toast } from 'sonner';

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : 'No date';
const money = (value) => `$${number(value).toLocaleString()}`;
const statusTone = (status) => status === 'active' || status === 'paid'
  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  : status === 'expired' || status === 'rejected'
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200'
    : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';

const Metric = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-icon ${tone}`}><Icon className="h-4 w-4" /></span>
      <div><p className="text-sm font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
    </div>
  </div>
);

const Action = ({ icon: Icon, label, onClick, unavailable = false }) => (
  <button type="button" onClick={onClick} aria-disabled={unavailable} data-state={unavailable ? 'unavailable' : 'available'} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.97] dark:bg-white/[0.04]">
    <Icon className="h-4 w-4" /><span className="text-xs font-medium">{label}</span>
  </button>
);

export const InsurancePanel = ({ insuranceContext = null }) => {
  const stats = insuranceContext?.stats || {};
  const billing = insuranceContext?.billing || {};
  const policies = insuranceContext?.policies || [];
  const recentPolicies = insuranceContext?.recentPolicies || policies.slice(0, 3);
  const recentBilling = billing.recentBilling || billing.outcomes || [];
  const loading = (insuranceContext?.loading ?? !insuranceContext) && (billing.loading ?? !insuranceContext);
  const error = insuranceContext?.errorMessage || (insuranceContext?.denied ? 'Insurance context is unavailable for this role.' : null) || (insuranceContext?.failed ? 'Insurance summary could not load.' : null);
  const focused = insuranceContext?.focusedPolicy || recentPolicies[0] || null;

  if (loading) return <div className="space-y-3 py-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}</div>;

  return <div className="space-y-5">
    {error && <div className="rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">{error}</div>}

    <section>
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">Policy scope</h3><span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{number(stats.total)}</span></div>
      <div className="grid grid-cols-2 gap-2"><Metric icon={CheckCircle} label="Active" value={number(stats.active)} tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" /><Metric icon={Clock} label="Pending" value={number(stats.pending)} tone="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200" /></div>
    </section>

    {focused && <section className="rounded-modal bg-background/45 p-4 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-muted-foreground">Current policy</p><h3 className="mt-2 truncate text-base font-semibold">{focused.policy_holder_name || focused.policy_number || 'Unnamed policy'}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{focused.provider_name || 'Unknown provider'}</p></div><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(focused.status)}`}>{focused.status || 'pending'}</span></div>
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('openFocusedInsuranceRecord', { detail: focused }))} className="mt-4 flex h-10 w-full items-center justify-center rounded-button bg-foreground text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"><Eye className="mr-2 h-4 w-4" />Open details</button>
    </section>}

    <section><h3 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h3><div className="grid grid-cols-2 gap-2"><Action icon={Plus} label="Add" unavailable onClick={() => window.dispatchEvent(new CustomEvent('openInsuranceModal'))} /><Action icon={BarChart3} label="Analytics" onClick={() => window.dispatchEvent(new CustomEvent('openAnalyticsModal'))} /><Action icon={Filter} label="Filter" onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))} /><Action icon={Download} label="Export" unavailable onClick={() => toast.info('Insurance export is unavailable until report scope is verified.')} /></div></section>

    <section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">Billing outcomes</h3><span className="text-xs text-muted-foreground">{number(billing.count)} total</span></div><div className="space-y-2">{recentBilling.slice(0, 3).map((claim) => <div key={claim.id} className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${statusTone(claim.status)}`}><ReceiptText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{claim.claim_number || `Claim ${String(claim.id || '').slice(0, 8)}`}</p><p className="mt-1 truncate text-xs text-muted-foreground">{money(claim.insurance_amount)} · {date(claim.billing_date || claim.created_at)}</p></div><span className="text-xs capitalize text-muted-foreground">{claim.status || 'pending'}</span></div>)}{recentBilling.length === 0 && !billing.errorMessage && <p className="py-3 text-sm text-muted-foreground">No recent billing outcomes.</p>}</div></section>

    <section><h3 className="mb-3 text-sm font-semibold text-foreground">Recent policies</h3><div className="space-y-2">{recentPolicies.slice(0, 3).map((policy) => <div key={policy.id} className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${statusTone(policy.status)}`}><Shield className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{policy.policy_number || 'Policy record'}</p><p className="mt-1 truncate text-xs text-muted-foreground">{policy.provider_name || 'Unknown provider'} · {date(policy.created_at)}</p></div></div>)}{recentPolicies.length === 0 && <p className="py-3 text-sm text-muted-foreground">No recent policies.</p>}</div></section>
  </div>;
};
