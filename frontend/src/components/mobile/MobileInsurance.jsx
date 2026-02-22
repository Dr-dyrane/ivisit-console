import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shield, Search, Eye, Edit, Trash2, CheckCircle, Calendar, DollarSign, SlidersHorizontal, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListLoadingMore, MobileListEnd, MobileListEmpty } from './MobileListStates';

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

  useEffect(() => {
    if (!hasMore || loading || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

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
        contentClassName="px-2 pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          label="Active Coverage"
          value={counts.active}
          trend="LIVE"
          icon={Shield}
          color="hsl(var(--success))"
          chartData={[{ value: 28 }, { value: 35 }, { value: 40 }, { value: 44 }, { value: 52 }, { value: 57 }]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Coverage Dynamics"
            count={counts.total}
            color="hsl(var(--info))"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Verification Rate</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Trust score</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round(((policies.filter(p => p.verified).length || 0) / (counts.total || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.verificationRate.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.verificationRate.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.verificationRate.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.verificationRate.deltaText}
                </span>
              </div>
            </div>
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Shield className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Active Load</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Portfolio</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.activeLoad.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.activeLoad.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.activeLoad.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.activeLoad.deltaText}
                </span>
              </div>
            </div>
          </div>
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
          count={filteredPolicies.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== filteredPolicies.length) : null}
          isAllSelected={filteredPolicies.length > 0 && selectedIds.length === filteredPolicies.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredPolicies.map((policy) => {
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

          {filteredPolicies.length === 0 && <MobileListEmpty icon={Shield} label="No policies found" />}

          <div ref={observerTarget} className="h-20 flex items-center justify-center">
            {hasMore && <MobileListLoadingMore label="Loading more policies" />}
            {!hasMore && filteredPolicies.length > 0 && <MobileListEnd label="End of policy list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
