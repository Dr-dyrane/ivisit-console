import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Eye, CheckCircle, FileCheck, Calendar, DollarSign, User, Building2, Hash, Tag } from 'lucide-react';
// Canon kit migration (Wave 2, 2026-07-09): SearchRow bakes in the 300ms debounce
// this page lacked + clear-x; useSkeletonWarmup covers cached bottom-nav mounts;
// UpdatingPillRow is the background-refetch signal (list never re-skeletons).
import { SearchRow, useSkeletonWarmup, UpdatingPillRow } from './canon';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { resolveVital } from '../../constants/vitalTracks';

const formatPlanType = (policy) => {
  const raw = policy?.policy_type || policy?.coverage_type || policy?.plan_type;
  if (!raw) return '';
  const text = String(raw).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

export const MobileInsurance = ({
  policies = [],
  filters,
  setFilters,
  onView,
  onRefresh,
  loading = false,
  error = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  stats,
  hasMore = false,
  onLoadMore
}) => {
  const [activePolicy, setActivePolicy] = useState(null);
  const observerTarget = useRef(null);

  // NOTE: no dock-FAB filter listener — /insurance is read-only, so it owns no dock FAB
  // (FAB_EXEMPT_ROUTES). The SearchRow below owns the in-page filter trigger via onOpenFilters.

  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const counts = useMemo(() => {
    const loaded = {
      total: policies.length,
      active: policies.filter(p => p.status === 'active').length,
      pending: policies.filter(p => p.status === 'pending').length,
      expired: policies.filter(p => p.status === 'expired').length,
      verified: policies.filter(p => p.verified).length,
      unverified: policies.filter(p => !p.verified).length
    };

    const readStat = (key) => {
      const value = Number(stats?.[key]);
      return Number.isFinite(value) ? value : loaded[key];
    };

    return {
      total: readStat('total'),
      active: readStat('active'),
      pending: readStat('pending'),
      expired: readStat('expired'),
      verified: readStat('verified'),
      unverified: readStat('unverified')
    };
  }, [policies, stats]);

  const verificationRate = counts.total > 0 ? Math.round((counts.verified / counts.total) * 100) : 0;
  const activeRatio = counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 0;
  const currentLabel = loading ? 'Loading' : 'Current';

  const kpis = [
    { id: 'all', label: 'Policies', value: counts.total, color: 'hsl(var(--foreground))', delta: currentLabel, direction: 'flat' },
    { id: 'active', label: 'Active', value: counts.active, color: 'hsl(var(--foreground))', delta: currentLabel, direction: 'flat' },
    { id: 'pending', label: 'Pending', value: counts.pending, color: 'hsl(var(--foreground))', delta: currentLabel, direction: 'flat' },
    { id: 'expired', label: 'Expired', value: counts.expired, color: 'hsl(var(--destructive))', delta: currentLabel, direction: 'flat' }
  ];

  const { displayItems: displayPolicies, isBuffering } = useStableList(policies, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayPolicies.length === 0);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={<MobileKPIStrip
            loading={showTopSectionLoading} kpis={kpis} activeKpi={filters?.kpiFilter || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))} />}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          loading={showTopSectionLoading}
          items={[
            {
              label: 'Active Coverage',
              value: counts.active,
              trend: currentLabel,
              icon: Shield,
              color: 'hsl(var(--foreground))'
            },
            {
              label: 'Verification Rate',
              value: `${verificationRate}%`,
              trend: currentLabel,
              icon: CheckCircle,
              color: 'hsl(var(--foreground))'
            },
            {
              label: 'Total policies',
              value: counts.total,
              trend: currentLabel,
              icon: FileCheck,
              color: 'hsl(var(--foreground))'
            },
            {
              label: 'Active Ratio',
              value: `${activeRatio}%`,
              trend: currentLabel,
              icon: ShieldCheck,
              color: 'hsl(var(--foreground))'
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Coverage Dynamics"
            count={counts.total}
            color="hsl(var(--foreground))"
            labelTone="plain"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: CheckCircle,
                title: 'Verification Rate',
                subtitle: 'Current scope',
                value: `${verificationRate}%`,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: currentLabel
              },
              {
                icon: Shield,
                title: 'Active Load',
                subtitle: 'Current scope',
                value: `${activeRatio}%`,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: currentLabel
              },
              {
                icon: FileCheck,
                title: 'Total policies',
                subtitle: 'Current scope',
                value: counts.total,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: currentLabel
              },
              {
                icon: ShieldCheck,
                title: 'Active',
                subtitle: 'Current scope',
                value: counts.active,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: currentLabel
              }
            ]}
          />
        </section>

        <div className="mb-3 px-1">
          <SearchRow
            placeholder="Search policies..."
            search={filters?.search || ''}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            entityLabel="policies"
            onOpenFilters={onOpenFilters}
            onOpenStats={onViewAnalytics}
            statsLabel="Open analytics"
          />
        </div>

        <MobileSectionHeader
          label="Insurance policies"
          count={displayPolicies.length}
          color="hsl(var(--foreground))"
          labelTone="plain"
        />

        {error && displayPolicies.length > 0 && (
          <div
            className="mb-3 rounded-card bg-destructive/10 p-4 text-destructive"
            data-testid="mobile-insurance-degraded-state"
          >
            <p className="text-sm font-semibold">Insurance did not refresh</p>
            <p className="mt-1 text-xs text-destructive/75">
              Showing the last loaded policy rows.
            </p>
            {onRetry && (
              <Button
                type="button"
                variant="ghost"
                className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        )}

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayPolicies.map((policy) => {
              const v = resolveVital('insurance', policy.status);
              const planType = formatPlanType(policy);
              const providerLabel = policy.provider_name || 'Unknown provider';
              return (
                <MobileMetricRow
                  key={policy.id}
                  icon={Shield}
                  color={v?.accent || 'hsl(var(--foreground))'}
                  label="Insurance policy"
                  value={policy.policy_holder_name || policy.policy_number || 'Unnamed policy'}
                  secondary={planType ? `${providerLabel} · ${planType}` : providerLabel}
                  statusPill={v?.pill}
                  statusIndicators={policy.verified ? [{ icon: ShieldCheck, color: 'hsl(162 94% 24%)', label: 'Verified' }] : []}
                  onClick={() => setActivePolicy(policy)}
                />
              );
            })}
          </AnimatePresence>

          {displayPolicies.length === 0 && !showTopSectionLoading && <MobileListEmpty icon={Shield} label="No policies found" labelTone="plain" />}

          <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
            {showTopSectionLoading && <MobileListSkeletonRows />}
            <UpdatingPillRow show={isBuffering && !showTopSectionLoading} />
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
            {!loading && !hasMore && displayPolicies.length > 0 && <MobileListEnd label="End of policy list" />}
          </div>
        </div>

        {activePolicy && (() => {
          const v = resolveVital('insurance', activePolicy.status);
          const planType = formatPlanType(activePolicy);
          const coverageValue = activePolicy.coverage_amount != null
            ? `$${Number(activePolicy.coverage_amount).toLocaleString()}`
            : null;
          const expiresValue = activePolicy.end_date
            ? new Date(activePolicy.end_date).toLocaleDateString()
            : null;
          return (
            <MobileDetailSheet
              isOpen={!!activePolicy}
              onClose={() => setActivePolicy(null)}
              icon={Shield}
              iconTone={v?.tone}
              eyebrow="Insurance policy"
              title={activePolicy.policy_holder_name || activePolicy.policy_number || 'Unnamed policy'}
              statusPill={v?.pill}
              vital={v ? { ...v, label: 'Policy status' } : null}
              islands={[
                { icon: User, label: 'Holder', value: activePolicy.policy_holder_name },
                { icon: Building2, label: 'Provider', value: activePolicy.provider_name },
                { icon: Hash, label: 'Policy number', value: activePolicy.policy_number },
                { icon: Tag, label: 'Plan type', value: planType },
                { icon: DollarSign, label: 'Coverage', value: coverageValue },
                { icon: Calendar, label: 'Expires', value: expiresValue },
                { icon: ShieldCheck, label: 'Verification', value: activePolicy.verified ? 'Verified' : 'Not verified' },
              ]}
              primary={{ label: 'Details', icon: Eye, onClick: () => { setActivePolicy(null); onView?.(activePolicy); }, tone: v?.accent }}
            />
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};


