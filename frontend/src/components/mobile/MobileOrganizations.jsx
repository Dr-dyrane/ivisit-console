import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Wallet,
  DollarSign,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Mail,
  CreditCard,
  CheckCircle2,
  Users,
  SlidersHorizontal,
  BarChart3
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

export const MobileOrganizations = ({
  organizations = [],
  searchTerm = '',
  setSearchTerm,
  kpiFilter = 'total',
  setKpiFilter,
  onCreate,
  onView,
  onEdit,
  onDelete,
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

  const totalWallet = useMemo(
    () => organizations.reduce((acc, curr) => acc + (Number(curr.wallet_balance) || 0), 0),
    [organizations]
  );
  const activeCount = useMemo(
    () => organizations.filter(o => o.is_active).length,
    [organizations]
  );
  const { displayItems: displayOrganizations, isBuffering } = useStableList(organizations, loading);
  const showTopSectionLoading = loading && displayOrganizations.length === 0;
  const avgFee = useMemo(() => {
    if (!organizations.length) return 0;
    return organizations.reduce((acc, o) => acc + (Number(o.ivisit_fee_percentage) || 0), 0) / organizations.length;
  }, [organizations]);

  const kpis = [
    {
      id: 'total',
      label: 'Organizations',
      value: organizations.length,
      color: 'hsl(var(--primary))',
      delta: 'LIVE',
      direction: 'flat'
    },
    {
      id: 'active',
      label: 'Active',
      value: activeCount,
      color: 'hsl(var(--success))',
      delta: 'LIVE',
      direction: 'flat'
    },
    {
      id: 'wallet',
      label: 'Float',
      value: `$${totalWallet.toLocaleString()}`,
      color: 'hsl(var(--info))',
      delta: 'LIVE',
      direction: 'flat'
    }
  ];

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.created_at || item.updated_at || 0).getTime();
    const currentWindow = organizations.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = organizations.filter((item) => {
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
    const currentActiveRatio = currentWindow.length > 0 ? currentWindow.filter((o) => o.is_active).length / currentWindow.length : 0;
    const previousActiveRatio = previousWindow.length > 0 ? previousWindow.filter((o) => o.is_active).length / previousWindow.length : 0;
    const currentFeeAvg = currentWindow.length > 0
      ? currentWindow.reduce((acc, o) => acc + (Number(o.ivisit_fee_percentage) || 0), 0) / currentWindow.length
      : 0;
    const previousFeeAvg = previousWindow.length > 0
      ? previousWindow.reduce((acc, o) => acc + (Number(o.ivisit_fee_percentage) || 0), 0) / previousWindow.length
      : 0;
    return {
      activeRatio: buildTrend(currentActiveRatio, previousActiveRatio),
      avgFee: buildTrend(currentFeeAvg, previousFeeAvg)
    };
  }, [organizations]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        kpiStrip={(
          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={kpis}
            activeKpi={kpiFilter}
            onKpiClick={(id) => setKpiFilter?.(id)}
          />
        )}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          loading={showTopSectionLoading}
          items={[
            {
              label: 'Average Fee',
              value: `${avgFee.toFixed(1)}%`,
              trend: periodTrends.avgFee.deltaText,
              icon: DollarSign,
              color: 'hsl(var(--warning))',
              chartData: [{ value: 32 }, { value: 45 }, { value: 41 }, { value: 54 }, { value: 57 }, { value: 60 }]
            },
            {
              label: 'Active Ratio',
              value: `${Math.round((activeCount / (organizations.length || 1)) * 100)}%`,
              trend: periodTrends.activeRatio.deltaText,
              icon: Building2,
              color: 'hsl(var(--primary))',
              chartData: [{ value: 20 }, { value: 35 }, { value: 30 }, { value: 42 }, { value: 48 }, { value: 55 }]
            },
            {
              label: 'Total Orgs',
              value: organizations.length,
              trend: 'LIVE',
              icon: Users,
              color: 'hsl(var(--info))',
              chartData: [{ value: 12 }, { value: 18 }, { value: 24 }, { value: 28 }, { value: 31 }, { value: 36 }]
            },
            {
              label: 'Paid Mix',
              value: `${Math.round(((activeCount || 0) / Math.max(organizations.length || 1, 1)) * 100)}%`,
              trend: 'LIVE',
              icon: CheckCircle2,
              color: 'hsl(var(--success))',
              chartData: [{ value: 28 }, { value: 40 }, { value: 44 }, { value: 52 }, { value: 60 }, { value: 66 }]
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Network Dynamics"
            count={organizations.length}
            color="hsl(var(--info))"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: Building2,
                title: 'Active Ratio',
                subtitle: 'Node health',
                value: `${Math.round((activeCount / (organizations.length || 1)) * 100)}%`,
                color: 'hsl(var(--primary))',
                trendDirection: periodTrends.activeRatio.direction,
                trendText: periodTrends.activeRatio.deltaText,
                onClick: onViewAnalytics
              },
              {
                icon: DollarSign,
                title: 'Avg Fee',
                subtitle: 'Revenue share',
                value: `${avgFee.toFixed(1)}%`,
                color: 'hsl(var(--primary))',
                trendDirection: periodTrends.avgFee.direction,
                trendText: periodTrends.avgFee.deltaText,
                onClick: onViewAnalytics
              },
              {
                icon: Users,
                title: 'Total Orgs',
                subtitle: 'Registered',
                value: organizations.length,
                color: 'hsl(var(--info))',
                trendDirection: 'flat',
                trendText: 'LIVE',
                onClick: onViewAnalytics
              },
              {
                icon: CheckCircle2,
                title: 'Active Count',
                subtitle: 'Live nodes',
                value: activeCount,
                color: 'hsl(var(--success))',
                trendDirection: 'up',
                trendText: 'LIVE',
                onClick: onViewAnalytics
              }
            ]}
          />
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative group">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] font-normal placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
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
          {canManage && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCreate}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.85)] hover:text-[hsl(var(--spark)/1)]"
              aria-label="Create organization"
            >
              <Plus size={18} />
            </motion.button>
          )}
        </div>

        <MobileSectionHeader
          label="Organization Registry"
          count={displayOrganizations.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== displayOrganizations.length) : null}
          isAllSelected={displayOrganizations.length > 0 && selectedIds.length === displayOrganizations.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayOrganizations.map((org) => {
              const isActive = !!org.is_active;
              return (
                <MobileMetricRow
                  key={org.id}
                  icon={Building2}
                  color={isActive ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'}
                  label={isActive ? 'ACTIVE' : 'INACTIVE'}
                  value={org.name || 'Unnamed Organization'}
                  rightBlade={{
                    badge: isActive ? 'ONLINE' : 'OFFLINE',
                    direction: isActive ? 'up' : 'flat',
                    label: 'Wallet',
                    value: `$${Number(org.wallet_balance || 0).toLocaleString()}`,
                    color: isActive ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'
                  }}
                  isExpanded={expandedId === org.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={org.id}
                  isSelected={selectedIds.includes(org.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Mail size={14} className="text-muted-foreground/40" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Contact</span>
                            <span className="text-xs font-semibold truncate">{org.contact_email || 'No contact email'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <CreditCard size={14} className="text-muted-foreground/40" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Stripe</span>
                            <span className="text-xs font-semibold truncate">{org.stripe_account_id || 'Not connected'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Wallet size={14} className="text-muted-foreground/40" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Wallet Float</span>
                            <span className="text-xs font-semibold">${Number(org.wallet_balance || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className={`border-0 ${isActive ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {isActive ? 'Active Node' : 'Inactive Node'}
                        </Badge>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="ghost"
                          className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2"
                          onClick={() => onView(org)}
                        >
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2"
                              onClick={() => onEdit(org)}
                            >
                              <Edit size={16} className="text-warning/60" />
                              <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => onDelete(org)}
                            >
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

          {displayOrganizations.length === 0 && (
            <MobileListEmpty icon={Building2} label="No organizations found" />
          )}

          <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
            {loading && <MobileListSkeletonRows />}
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
            {!loading && !hasMore && displayOrganizations.length > 0 && <MobileListEnd label="End of organization list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};


