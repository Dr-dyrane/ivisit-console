import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  LockKeyhole,
  Plus,
  ReceiptText,
  Shield,
} from 'lucide-react';
import { resolveVital } from '../../constants/vitalTracks';

const POLICY_CHANGE_UNAVAILABLE_MESSAGE = 'Adding policies is not available yet.';
const POLICY_EXPORT_UNAVAILABLE_MESSAGE = 'Downloadable insurance reports are not available yet.';

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Date(value).toLocaleDateString()
  : 'No date';
const money = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(number(value));
const normalizedStatus = (value) => String(value || '').trim().toLowerCase() || 'unknown';
const policyPill = (status) => resolveVital('insurance', normalizedStatus(status))?.pill || {
  label: 'Unknown',
  className: 'bg-muted/40 text-muted-foreground',
};
const billingStatusTone = (status) => {
  switch (normalizedStatus(status)) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
    case 'approved':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
    case 'rejected':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  }
};
const statusLabel = (value) => normalizedStatus(value)
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const Metric = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-icon ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </div>
);

const Action = ({ icon: Icon, label, onClick, unavailable = false, reason = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-disabled={unavailable}
    data-state={unavailable ? 'unavailable' : 'available'}
    title={reason || undefined}
    className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.97] dark:bg-white/[0.04]"
  >
    <Icon className="h-4 w-4" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export const InsurancePanel = ({ insuranceContext = null }) => {
  const [actionNotice, setActionNotice] = useState('Select a policy to view more details.');
  const stats = insuranceContext?.stats || {};
  const billing = insuranceContext?.billing || {};
  const policies = insuranceContext?.policies || [];
  const loadedPolicies = insuranceContext?.recentPolicies || policies.slice(0, 3);
  const billingRows = billing.recentBilling || billing.outcomes || [];
  const policyLoading = insuranceContext?.loading ?? !insuranceContext;
  const policyError = insuranceContext?.errorMessage
    || (insuranceContext?.denied ? 'Insurance information is unavailable for this account.' : null)
    || (insuranceContext?.failed ? 'Insurance summary could not load.' : null);
  const policyUnavailable = Boolean((insuranceContext?.denied || insuranceContext?.failed) && policies.length === 0);
  const billingLoading = Boolean(billing.loading);
  const billingError = billing.errorMessage
    || (billing.denied ? 'Billing outcomes are unavailable for this account.' : null)
    || (billing.failed ? 'Billing outcomes could not load.' : null);
  const billingUnavailable = Boolean((billing.denied || billing.failed) && billingRows.length === 0);
  const focused = insuranceContext?.focusedPolicy || loadedPolicies[0] || null;
  const metric = (value) => policyUnavailable ? 'Unavailable' : number(value);

  if (policyLoading && policies.length === 0) {
    return <div className="space-y-3 py-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}</div>;
  }

  return (
    <div className="space-y-5">
      {policyError && (
        <div className="flex items-start gap-2 rounded-inner bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{policyError}</span>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Policy overview</h3>
          <span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
            {policyLoading ? 'Updating' : metric(stats.total)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric icon={CheckCircle} label="Active" value={metric(stats.active)} tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" />
          <Metric icon={Clock} label="Pending" value={metric(stats.pending)} tone="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200" />
        </div>
      </section>

      {focused && (() => {
        const pill = policyPill(focused.status);
        return (
          <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Current policy</p>
                <h3 className="mt-2 truncate text-base font-semibold">{focused.policy_holder_name || focused.policy_number || 'Unnamed policy'}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">{focused.provider_name || 'Unknown provider'}</p>
              </div>
              <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openFocusedInsuranceRecord', { detail: focused }))}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-button bg-foreground text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
            >
              <Eye className="mr-2 h-4 w-4" />
              Open details
            </button>
          </section>
        );
      })()}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <Action icon={BarChart3} label="View stats" onClick={() => { setActionNotice('Opening policy stats...'); window.dispatchEvent(new CustomEvent('openInsuranceAnalytics')); }} />
          <Action icon={Filter} label="Filter" onClick={() => { setActionNotice('Opening policy filters...'); window.dispatchEvent(new CustomEvent('openInsuranceFilters')); }} />
          <Action icon={Plus} label="Add" unavailable reason={POLICY_CHANGE_UNAVAILABLE_MESSAGE} onClick={() => setActionNotice(POLICY_CHANGE_UNAVAILABLE_MESSAGE)} />
          <Action icon={Download} label="Export" unavailable reason={POLICY_EXPORT_UNAVAILABLE_MESSAGE} onClick={() => setActionNotice(POLICY_EXPORT_UNAVAILABLE_MESSAGE)} />
        </div>
        <p role="status" aria-live="polite" className="mt-2 px-1 text-xs text-muted-foreground">{actionNotice}</p>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          You can view policy and billing details here. Adding policies and exporting reports are not available yet.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Billing outcomes</h3>
          <span className="text-xs text-muted-foreground">
            {billingLoading && billingRows.length === 0
              ? 'Loading'
              : billingUnavailable
                ? 'Unavailable'
                : `${number(billing.count)} total`}
          </span>
        </div>

        <div className="space-y-2">
          {billingLoading && billingRows.length === 0 && [0, 1].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-inner bg-muted/30" />
          ))}

          {billingError && (
            <div className="rounded-inner bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
              {billingRows.length > 0 ? 'Billing outcomes did not refresh. Showing the previous results.' : billingError}
            </div>
          )}

          {billingRows.slice(0, 3).map((claim) => (
            <div key={claim.id} className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${billingStatusTone(claim.status)}`}>
                <ReceiptText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{claim.claim_number || `Claim ${String(claim.id || '').slice(0, 8)}`}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{money(claim.insurance_amount)} / {date(claim.billing_date || claim.created_at)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{statusLabel(claim.status)}</span>
            </div>
          ))}

          {!billingLoading && !billingError && billingRows.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No recent billing outcomes.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Recent policies</h3>
        <div className="space-y-2">
          {loadedPolicies.slice(0, 3).map((policy) => {
            const pill = policyPill(policy.status);
            return (
              <div key={policy.id} className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${pill.className}`}>
                  <Shield className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{policy.policy_number || 'Policy record'}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{policy.provider_name || 'Unknown provider'} / {date(policy.created_at)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{pill.label}</span>
              </div>
            );
          })}
          {!policyError && loadedPolicies.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No recent policies.</p>
          )}
        </div>
      </section>
    </div>
  );
};
