import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Plus,
  ReceiptText,
  Shield,
  TrendingUp,
} from 'lucide-react';

const EMPTY_STATS = {
  total: 0,
  active: 0,
  expired: 0,
  pending: 0,
  verified: 0,
  unverified: 0,
  verificationRate: 0,
};

const EMPTY_BILLING_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
};

const toPanelStats = (stats = {}) => {
  const total = Number(stats.total || 0);
  const verified = Number(stats.verified || 0);

  return {
    ...EMPTY_STATS,
    total,
    active: Number(stats.active || 0),
    expired: Number(stats.expired || 0),
    pending: Number(stats.pending || 0),
    verified,
    unverified: Number(stats.unverified || 0),
    verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
};

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString();
};

export const InsurancePanel = ({ insuranceContext = null }) => {
  const stats = toPanelStats(insuranceContext?.stats);
  const recentPolicies = insuranceContext?.recentPolicies || insuranceContext?.policies?.slice(0, 3) || [];
  const billingContext = insuranceContext?.billing || {};
  const billingStats = {
    ...EMPTY_BILLING_STATS,
    ...(billingContext.stats || {}),
  };
  const recentBilling = billingContext.recentBilling || billingContext.outcomes || [];
  const policyLoading = insuranceContext?.loading ?? !insuranceContext;
  const policyError = insuranceContext?.errorMessage
    || (insuranceContext?.denied ? 'Insurance context is unavailable for this role.' : null)
    || (insuranceContext?.failed ? 'Insurance summary could not load.' : null);
  const billingLoading = billingContext.loading ?? !insuranceContext;
  const billingError = billingContext.errorMessage
    || (billingContext.denied ? 'Billing outcomes are unavailable for this role.' : null)
    || (billingContext.failed ? 'Billing outcomes could not load.' : null);
  const loading = policyLoading && billingLoading;

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('openInsuranceModal'));
  };

  const handleAnalytics = () => {
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  const handleFilters = () => {
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const handleExport = () => {
    toast.info('Insurance export is unavailable until report scope is verified.');
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-pulse rounded-pill bg-muted/40" />
        </div>
      ) : (
        <>
          {policyError && (
            <Card className="bg-background/50 backdrop-blur-xs rounded-card p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{policyError}</p>
            </Card>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-muted-foreground">Policy overview</h3>

            <Card className="bg-background/50 backdrop-blur-xs rounded-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-icon flex h-10 w-10 items-center justify-center bg-sky-500/15">
                    <Shield className="h-5 w-5 text-sky-600 dark:text-sky-200" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Policy Registry</span>
                    <p className="text-xs text-muted-foreground">Current admin scope</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-sky-500/15 text-sky-700 dark:text-sky-200">{stats.total}</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <MetricCard icon={CheckCircle} label="Active" value={stats.active} tone="success" />
              <MetricCard icon={Clock} label="Pending" value={stats.pending} tone="warning" />
            </div>

            <Card className="bg-background/50 backdrop-blur-xs rounded-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-icon flex h-10 w-10 items-center justify-center bg-sky-500/15">
                    <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-200" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Verification Rate</span>
                    <p className="text-xs text-muted-foreground">Verified in scope</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-sky-500/15 text-sky-700 dark:text-sky-200">{stats.verificationRate}%</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-muted-foreground">Billing outcomes</h3>

            <Card className="bg-background/50 backdrop-blur-xs rounded-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-icon flex h-10 w-10 items-center justify-center bg-emerald-500/15">
                    <ReceiptText className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Claim Results</span>
                    <p className="text-xs text-muted-foreground">Trigger-created rows</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">{billingStats.total}</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <MetricCard icon={Clock} label="Pending" value={billingLoading ? '...' : billingStats.pending} tone="warning" />
              <MetricCard icon={CheckCircle} label="Paid" value={billingLoading ? '...' : billingStats.paid} tone="success" />
            </div>

            {billingError && (
              <Card className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
                <p className="text-sm text-muted-foreground">{billingError}</p>
              </Card>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-muted-foreground">Quick actions</h3>

            <div className="grid grid-cols-2 gap-2">
              <PanelAction
                icon={Plus}
                label="Add"
                tone="muted"
                unavailable
                onClick={handleCreate}
                title="Add unavailable until policy authority is verified"
              />
              <PanelAction icon={BarChart3} label="Analytics" tone="info" onClick={handleAnalytics} title="View analytics" />
              <PanelAction icon={Filter} label="Filter" tone="muted" onClick={handleFilters} title="Filter policies" />
              <PanelAction
                icon={Download}
                label="Export"
                tone="muted"
                unavailable
                onClick={handleExport}
                title="Export unavailable until report scope is verified"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-muted-foreground">Recent claims</h3>

            <div className="space-y-2">
              {recentBilling.map((claim) => (
                <Card key={claim.id} className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="max-w-[140px] truncate text-sm font-normal">
                        {claim.claim_number || `Claim ${String(claim.id || '').slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(claim.insurance_amount)} insurance - {formatDate(claim.billing_date || claim.created_at)}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-muted/30 capitalize text-muted-foreground">
                      {claim.status || 'pending'}
                    </span>
                  </div>
                </Card>
              ))}

              {recentBilling.length === 0 && !billingError && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No recent claims found
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-muted-foreground">Recent policies</h3>

            <div className="space-y-2">
              {recentPolicies.map((policy) => (
                <Card key={policy.id} className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`rounded-pill h-2 w-2 shrink-0 ${statusDotClass(policy.status)}`} />
                      <div className="min-w-0">
                        <p className="max-w-[140px] truncate text-sm font-normal">
                          {policy.policy_number || `Policy ${String(policy.id || '').slice(0, 8)}`}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {policy.provider_name || 'Unknown provider'} - {formatDate(policy.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-muted/30 capitalize text-muted-foreground">
                      {policy.status || 'unknown'}
                    </span>
                  </div>
                </Card>
              ))}

              {recentPolicies.length === 0 && !policyError && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No recent policies found
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

const formatMoney = (value) => {
  const number = Number(value || 0);
  return number > 0 ? `$${number.toLocaleString()}` : '$0';
};

const MetricCard = ({ icon: Icon, label, value, tone }) => {
  const classes = {
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  }[tone] || 'bg-muted/30 text-muted-foreground';

  return (
    <Card className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-icon flex h-8 w-8 items-center justify-center ${classes}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
};

const PanelAction = ({ icon: Icon, label, tone, onClick, title, unavailable = false }) => {
  const classes = {
    info: 'bg-sky-500/15 text-sky-700 dark:text-sky-200 hover:bg-sky-500/20',
    muted: 'bg-muted/20 text-muted-foreground hover:bg-muted/35',
  }[tone] || 'bg-muted/20 text-muted-foreground hover:bg-muted/35';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-disabled={unavailable}
      data-state={unavailable ? 'unavailable' : 'available'}
      className={`${classes} flex flex-col items-center gap-2 rounded-inner p-3 transition-colors active:scale-[0.98]`}
      title={title}
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs font-normal">{label}</span>
    </motion.button>
  );
};

const statusDotClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'active':
      return 'bg-emerald-500';
    case 'expired':
      return 'bg-destructive';
    case 'pending':
      return 'bg-amber-500';
    default:
      return 'bg-muted-foreground/45';
  }
};
