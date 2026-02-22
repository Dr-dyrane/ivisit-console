import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shield, Search, Eye, CheckCircle, Ban, Building2, User, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

export const MobileVerification = ({
  queueType = 'providers',
  setQueueType,
  providers = [],
  organizations = [],
  stats,
  orgStats,
  filters,
  setFilters,
  onViewProvider,
  onVerifyProvider,
  onVerifyOrganization,
  onRefresh,
  onOpenFilters,
  onViewAnalytics,
  selectedIds = [],
  onSelect,
  onSelectAll
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const selectionMode = selectedIds.length > 0;
  const { triggerFromEvent } = useFeedback();

  const activeStats = queueType === 'providers' ? stats : orgStats;
  const items = queueType === 'providers' ? providers : organizations;

  const kpis = useMemo(() => [
    { id: 'pending', label: 'Pending', value: activeStats?.pending || 0, color: 'hsl(var(--warning))', delta: 'LIVE', direction: 'flat' },
    { id: 'approved', label: 'Approved', value: queueType === 'providers' ? (activeStats?.approved || 0) : (activeStats?.verified || 0), color: 'hsl(var(--success))', delta: 'LIVE', direction: 'flat' },
    { id: 'rejected', label: 'Rejected', value: activeStats?.rejected || 0, color: 'hsl(var(--destructive))', delta: 'LIVE', direction: 'flat' },
    { id: 'all', label: 'Total', value: activeStats?.total || items.length, color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' }
  ], [activeStats, items.length, queueType]);

  const filteredItems = useMemo(() => {
    const search = String(filters?.search || '').toLowerCase();
    const status = String(filters?.status || 'all');
    let result = [...items];
    if (search) {
      result = result.filter(item =>
        String(item.username || item.name || '').toLowerCase().includes(search) ||
        String(item.email || item.address || '').toLowerCase().includes(search)
      );
    }
    if (status !== 'all') {
      if (queueType === 'providers') result = result.filter(p => (p.bvn_verified ? 'approved' : 'pending') === status || p.verification_status === status);
      else result = result.filter(o => String(o.verification_status || '').toLowerCase() === status);
    }
    return result;
  }, [filters, items, queueType]);
  const hasActiveRecovery = Boolean(filters?.search) || String(filters?.status || 'all') !== 'all';

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.created_at || item.updated_at || 0).getTime();
    const currentWindow = items.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = items.filter((item) => {
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
    const isApproved = (item) => (queueType === 'providers'
      ? item.bvn_verified || String(item.verification_status || '').toLowerCase() === 'approved'
      : String(item.verification_status || '').toLowerCase() === 'verified');
    const currentApprovalRate = currentWindow.length > 0 ? currentWindow.filter(isApproved).length / currentWindow.length : 0;
    const previousApprovalRate = previousWindow.length > 0 ? previousWindow.filter(isApproved).length / previousWindow.length : 0;
    const isPending = (item) => queueType === 'providers'
      ? !item.bvn_verified && String(item.verification_status || 'pending').toLowerCase() !== 'approved'
      : String(item.verification_status || '').toLowerCase() === 'pending';
    const currentPending = currentWindow.filter(isPending).length;
    const previousPending = previousWindow.filter(isPending).length;
    return {
      approvalRate: buildTrend(currentApprovalRate, previousApprovalRate),
      pendingLoad: buildTrend(currentPending, previousPending)
    };
  }, [items, queueType]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={<MobileKPIStrip kpis={kpis} activeKpi={filters?.status || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, status: id }))} />}
        contentClassName="px-2 pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          label={queueType === 'providers' ? 'Provider Queue' : 'Organization Queue'}
          value={filteredItems.length}
          trend="LIVE"
          icon={Shield}
          color="hsl(var(--primary))"
          chartData={[{ value: 60 }, { value: 55 }, { value: 52 }, { value: 49 }, { value: 47 }, { value: 45 }]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Trust Dynamics"
            count={activeStats?.total || items.length}
            color="hsl(var(--info))"
          />
          <MobileSecondaryMetricRail
            items={[
              {
                icon: CheckCircle,
                title: 'Approval Rate',
                subtitle: 'Trust score',
                value: `${Math.round((((queueType === 'providers' ? activeStats?.approved : activeStats?.verified) || 0) / ((activeStats?.total || 1))) * 100)}%`,
                color: 'hsl(var(--primary))',
                trendDirection: periodTrends.approvalRate.direction,
                trendText: periodTrends.approvalRate.deltaText,
                onClick: onViewAnalytics
              },
              {
                icon: Shield,
                title: 'Pending Load',
                subtitle: 'Review queue',
                value: activeStats?.pending || 0,
                color: 'hsl(var(--primary))',
                trendDirection: periodTrends.pendingLoad.direction,
                trendText: periodTrends.pendingLoad.deltaText,
                trendUpClass: 'text-warning',
                trendDownClass: 'text-success',
                onClick: onViewAnalytics
              }
            ]}
          />
        </section>

        <div className="p-1 rounded-xl bg-muted/20 backdrop-blur-md flex relative mb-3 mx-1">
          <motion.div
            className="absolute top-1 bottom-1 bg-[hsl(var(--spark)/0.10)] shadow-sm rounded-lg"
            initial={false}
            animate={{
              left: queueType === 'providers' ? '4px' : '50%',
              width: 'calc(50% - 4px)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => setQueueType('providers')}
            className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${queueType === 'providers' ? 'text-[hsl(var(--spark)/0.92)]' : 'text-muted-foreground/50'
              }`}
          >
            Providers
          </button>
          <button
            onClick={() => setQueueType('organizations')}
            className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${queueType === 'organizations' ? 'text-[hsl(var(--spark)/0.92)]' : 'text-muted-foreground/50'
              }`}
          >
            Organizations
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder={`Search ${queueType}...`}
              value={filters?.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none"
            />
          </div>
          {onOpenFilters && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(event) => {
                onOpenFilters?.();
                triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
              }}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 border-0"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
            </motion.button>
          )}
          {onViewAnalytics && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(event) => {
                onViewAnalytics?.();
                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--spark))', haptic: true, sound: true });
              }}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 border-0 shadow-sm"
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </motion.button>
          )}
        </div>

        <MobileSectionHeader
          label="Verification Queue"
          count={filteredItems.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== filteredItems.length) : null}
          isAllSelected={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const pending = queueType === 'providers'
                ? !item.bvn_verified
                : String(item.verification_status || '').toLowerCase() === 'pending';
              const color = pending ? 'hsl(var(--warning))' : 'hsl(var(--success))';
              return (
                <MobileMetricRow
                  key={item.id}
                  icon={queueType === 'providers' ? User : Building2}
                  color={color}
                  label={pending ? 'PENDING' : 'VERIFIED'}
                  value={queueType === 'providers' ? (item.username || item.email || 'Unknown') : (item.name || 'Unknown')}
                  rightBlade={{
                    badge: pending ? 'REVIEW' : 'APPROVED',
                    direction: pending ? 'flat' : 'up',
                    label: queueType === 'providers' ? 'Role' : 'Type',
                    value: queueType === 'providers' ? String(item.role || 'provider').toUpperCase() : String(item.type || 'org').toUpperCase(),
                    color
                  }}
                  isExpanded={expandedId === item.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={item.id}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-3 py-3">
                      <div className="text-xs text-muted-foreground">
                        {queueType === 'providers' ? item.email : item.address}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {queueType === 'providers' ? (
                          <>
                            <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0" onClick={() => onViewProvider(item)}>
                              <Eye className="h-4 w-4 text-primary/70" />
                            </Button>
                            {pending && (
                              <>
                                <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0" onClick={() => onVerifyProvider(item.id, true)}>
                                  <CheckCircle className="h-4 w-4 text-success/70" />
                                </Button>
                                <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => onVerifyProvider(item.id, false)}>
                                  <Ban className="h-4 w-4 text-destructive/70" />
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge className="flex-1 h-12 rounded-2xl border-0 flex items-center justify-center bg-muted/20 text-muted-foreground">
                              {String(item.verification_status || 'pending').toUpperCase()}
                            </Badge>
                            {pending && (
                              <>
                                <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onVerifyOrganization(item.id, true)}>
                                  <CheckCircle className="h-4 w-4 text-success/70" />
                                </Button>
                                <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onVerifyOrganization(item.id, false)}>
                                  <Ban className="h-4 w-4 text-destructive/70" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <MobileListEmpty
              icon={Shield}
              label="No verification items found"
              reason={filters?.search ? 'search' : hasActiveRecovery ? 'filtered' : 'empty'}
              hint={filters?.search
                ? `No ${queueType} matches "${filters.search}".`
                : hasActiveRecovery
                  ? 'Try clearing status filters to recover queue visibility.'
                  : 'New verification items will appear here as they arrive.'}
              onRecover={hasActiveRecovery ? () => setFilters(prev => ({ ...prev, search: '', status: 'all' })) : undefined}
              recoverLabel={filters?.search ? 'Clear Search' : hasActiveRecovery ? 'Reset Filters' : undefined}
            />
          )}
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
