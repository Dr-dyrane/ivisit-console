import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Search, Eye, Edit, Trash2, CheckCircle, FileCheck, Calendar, DollarSign, SlidersHorizontal, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

export const MobileInsurance = ({
  policies = [],
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
  onVerify,
  onRefresh,
  canManage = false,
  loading = false,
  onOpenFilters,
  onViewAnalytics,
  selectedIds = [],
  onSelect,
  onSelectAll,
  hasMore = false,
  onLoadMore
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const observerTarget = useRef(null);
  const selectionMode = selectedIds.length > 0;

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

  const counts = useMemo(() => ({
    total: policies.length,
    active: policies.filter(p => p.status === 'active').length,
    pending: policies.filter(p => p.status === 'pending').length,
    expired: policies.filter(p => p.status === 'expired').length
  }), [policies]);

  const kpis = [
    { id: 'all', label: 'Policies', value: counts.total, color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' },
    { id: 'active', label: 'Active', value: counts.active, color: 'hsl(var(--success))', delta: 'LIVE', direction: 'flat' },
    { id: 'pending', label: 'Pending', value: counts.pending, color: 'hsl(var(--warning))', delta: 'LIVE', direction: 'flat' },
    { id: 'expired', label: 'Expired', value: counts.expired, color: 'hsl(var(--destructive))', delta: 'LIVE', direction: 'flat' }
  ];

  const filteredPolicies = useMemo(() => {
    let result = [...policies];
    const search = String(filters?.search || '').toLowerCase();
    const kpi = String(filters?.kpiFilter || 'all');

    if (search) {
      result = result.filter(p =>
        String(p.policy_number || '').toLowerCase().includes(search) ||
        String(p.policy_holder_name || '').toLowerCase().includes(search) ||
        String(p.provider_name || '').toLowerCase().includes(search)
      );
    }
    if (kpi !== 'all') {
      if (kpi === 'unverified') result = result.filter(p => !p.verified);
      else result = result.filter(p => p.status === kpi);
    }

    return result;
  }, [policies, filters]);
  const { displayItems: displayPolicies, isBuffering } = useStableList(filteredPolicies, loading);

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.created_at || item.updated_at || item.start_date || 0).getTime();
    const currentWindow = policies.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = policies.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts < now - periodMs && ts >= now - (2 * periodMs);
    });
    const buildTrend = (currentValue, previousValue) => {
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || currentValue === 0 || previousValue === 0) {
        return { direction: 'flat', deltaText: 'N/A' };
      }
      const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      return { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', deltaText: `${delta > 0 ? '+' : ''}${delta.toFixed(Math.abs(delta) >= 10 ? 0 : 1)}%` };
    };
    const currentVerificationRatio = currentWindow.length > 0 ? currentWindow.filter((p) => p.verified).length / currentWindow.length : 0;
    const previousVerificationRatio = previousWindow.length > 0 ? previousWindow.filter((p) => p.verified).length / previousWindow.length : 0;
    const currentActiveRatio = currentWindow.length > 0 ? currentWindow.filter((p) => p.status === 'active').length / currentWindow.length : 0;
    const previousActiveRatio = previousWindow.length > 0 ? previousWindow.filter((p) => p.status === 'active').length / previousWindow.length : 0;
    return {
      verificationRate: buildTrend(currentVerificationRatio, previousVerificationRatio),
      activeLoad: buildTrend(currentActiveRatio, previousActiveRatio)
    };
  }, [policies]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={<MobileKPIStrip kpis={kpis} activeKpi={filters?.kpiFilter || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))} />}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          items={[
            {
              label: 'Active Coverage',
              value: counts.active,
              trend: periodTrends.activeLoad.deltaText,
              icon: Shield,
              color: 'hsl(var(--success))',
              chartData: [{ value: 28 }, { value: 35 }, { value: 40 }, { value: 44 }, { value: 52 }, { value: 57 }]
            },
            {
              label: 'Verification Rate',
              value: `${Math.round(((policies.filter(p => p.verified).length || 0) / (counts.total || 1)) * 100)}%`,
              trend: periodTrends.verificationRate.deltaText,
              icon: CheckCircle,
              color: 'hsl(var(--info))',
              chartData: [{ value: 32 }, { value: 38 }, { value: 44 }, { value: 49 }, { value: 54 }, { value: 60 }]
            },
            {
              label: 'Total Policies',
              value: counts.total,
              trend: 'LIVE',
              icon: FileCheck,
              color: 'hsl(var(--primary))',
              chartData: [{ value: 18 }, { value: 24 }, { value: 29 }, { value: 34 }, { value: 38 }, { value: 42 }]
            },
            {
              label: 'Active Ratio',
              value: `${Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%`,
              trend: periodTrends.activeLoad.deltaText,
              icon: ShieldCheck,
              color: 'hsl(var(--warning))',
              chartData: [{ value: 22 }, { value: 28 }, { value: 32 }, { value: 37 }, { value: 41 }, { value: 45 }]
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Coverage Dynamics"
            count={counts.total}
            color="hsl(var(--info))"
          />
          <MobileSecondaryMetricRail
            items={[
              {
                icon: CheckCircle,
                title: 'Verification Rate',
                subtitle: 'Trust score',
                value: `${Math.round(((policies.filter(p => p.verified).length || 0) / (counts.total || 1)) * 100)}%`,
                color: 'hsl(var(--info))',
                trendDirection: periodTrends.verificationRate.direction,
                trendText: periodTrends.verificationRate.deltaText
              },
              {
                icon: Shield,
                title: 'Active Load',
                subtitle: 'Portfolio',
                value: `${Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%`,
                color: 'hsl(var(--success))',
                trendDirection: periodTrends.activeLoad.direction,
                trendText: periodTrends.activeLoad.deltaText
              },
              {
                icon: FileCheck,
                title: 'Total Policies',
                subtitle: 'Registry',
                value: counts.total,
                color: 'hsl(var(--primary))',
                trendDirection: 'flat',
                trendText: 'LIVE'
              },
              {
                icon: ShieldCheck,
                title: 'Active',
                subtitle: 'Verified',
                value: counts.active,
                color: 'hsl(var(--warning))',
                trendDirection: 'flat',
                trendText: 'LIVE'
              }
            ]}
          />
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search policies..."
              value={filters?.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none"
            />
          </div>
          {onOpenFilters && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onOpenFilters()}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 border-0"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
            </motion.button>
          )}
          {onViewAnalytics && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewAnalytics()}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 border-0 shadow-sm"
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </motion.button>
          )}
        </div>

        <MobileSectionHeader
          label="Insurance Policies"
          count={displayPolicies.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== displayPolicies.length) : null}
          isAllSelected={displayPolicies.length > 0 && selectedIds.length === displayPolicies.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayPolicies.map((policy) => {
              const isActive = policy.status === 'active';
              const isPending = policy.status === 'pending';
              const color = isActive ? 'hsl(var(--success))' : isPending ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
              return (
                <MobileMetricRow
                  key={policy.id}
                  icon={Shield}
                  color={color}
                  label={String(policy.status || 'unknown').toUpperCase()}
                  value={policy.policy_holder_name || policy.policy_number || 'Unnamed Policy'}
                  rightBlade={{
                    badge: policy.verified ? 'VERIFIED' : 'UNVERIFIED',
                    direction: policy.verified ? 'up' : 'flat',
                    label: 'Provider',
                    value: policy.provider_name || 'N/A',
                    color
                  }}
                  isExpanded={expandedId === policy.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={policy.id}
                  isSelected={selectedIds.includes(policy.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <DollarSign size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Coverage: ${Number(policy.coverage_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Calendar size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Expires: {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2" onClick={() => onView(policy)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                        {canManage && (
                          <>
                            {!policy.verified && (
                              <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onVerify(policy)}>
                                <CheckCircle className="h-4 w-4 text-success/70" />
                              </Button>
                            )}
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onEdit(policy)}>
                              <Edit size={16} className="text-warning/60" />
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(policy)}>
                              <Trash2 size={16} className="text-destructive/60" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {displayPolicies.length === 0 && <MobileListEmpty icon={Shield} label="No policies found" />}

          <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
            {loading && <MobileListSkeletonRows />}
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
            {!loading && !hasMore && displayPolicies.length > 0 && <MobileListEnd label="End of policy list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};


