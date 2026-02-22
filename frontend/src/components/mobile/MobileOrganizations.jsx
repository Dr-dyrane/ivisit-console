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
  SlidersHorizontal,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListLoadingMore, MobileListEnd, MobileListEmpty } from './MobileListStates';

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

  const totalWallet = useMemo(
    () => organizations.reduce((acc, curr) => acc + (Number(curr.wallet_balance) || 0), 0),
    [organizations]
  );
  const activeCount = useMemo(
    () => organizations.filter(o => o.is_active).length,
    [organizations]
  );
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
        kpiStrip={(
          <MobileKPIStrip
            kpis={kpis}
            activeKpi={kpiFilter}
            onKpiClick={(id) => setKpiFilter?.(id)}
          />
        )}
        contentClassName="px-2 pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          label="Average Fee"
          value={`${avgFee.toFixed(1)}%`}
          trend="LIVE"
          icon={DollarSign}
          color="hsl(var(--warning))"
          chartData={[{ value: 32 }, { value: 45 }, { value: 41 }, { value: 54 }, { value: 57 }, { value: 60 }]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Network Dynamics"
            count={organizations.length}
            color="hsl(var(--info))"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Building2 className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Active Ratio</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Node health</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round((activeCount / (organizations.length || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.activeRatio.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.activeRatio.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.activeRatio.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.activeRatio.deltaText}
                </span>
              </div>
            </div>
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <DollarSign className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Avg Fee</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Revenue share</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {avgFee.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.avgFee.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.avgFee.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.avgFee.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.avgFee.deltaText}
                </span>
              </div>
            </div>
          </div>
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
          count={organizations.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== organizations.length) : null}
          isAllSelected={organizations.length > 0 && selectedIds.length === organizations.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {organizations.map((org) => {
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

          {organizations.length === 0 && (
            <MobileListEmpty icon={Building2} label="No organizations found" />
          )}

          <div ref={observerTarget} className="h-20 flex items-center justify-center">
            {hasMore && <MobileListLoadingMore label="Loading more organizations" />}
            {!hasMore && organizations.length > 0 && <MobileListEnd label="End of organization list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
