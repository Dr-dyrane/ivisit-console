import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shield, Search, Eye, CheckCircle, Ban, Building2, User, Users, SlidersHorizontal, BarChart3 } from 'lucide-react';
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
import { useStableList } from './useStableList';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileSpring } from './mobileMotion';

// Sentence-case a raw status/role token ('org_admin' -> 'Org admin').
const tokenLabel = (value, fallback = '') => {
  const text = String(value || fallback).replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const MobileVerification = ({
  queueType = 'providers',
  setQueueType,
  providers = [],
  organizations = [],
  loading = false,
  stats,
  orgStats,
  filters,
  setFilters,
  onViewProvider,
  onVerifyProvider,
  onVerifyOrganization,
  canApprove = false,
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
  const sourceItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const { displayItems } = useStableList(sourceItems, loading);

  // Raw vitalTracks accents (amber/emerald/slate) — the light 300/400 tones were
  // light-on-light in light mode.
  const kpis = useMemo(() => [
    { id: 'pending', label: 'Pending', value: activeStats?.pending || 0, color: 'hsl(26 90% 37%)' },
    { id: 'approved', label: 'Approved', value: queueType === 'providers' ? (activeStats?.approved || 0) : (activeStats?.verified || 0), color: 'hsl(162 94% 24%)' },
    { id: 'rejected', label: 'Rejected', value: activeStats?.rejected || 0, color: 'hsl(var(--destructive))' },
    { id: 'all', label: 'Total', value: activeStats?.total || sourceItems.length, color: 'hsl(var(--muted-foreground))' }
  ], [activeStats, sourceItems.length, queueType]);

  const showTopSectionLoading = loading && displayItems.length === 0;
  const hasActiveRecovery = Boolean(filters?.search) || String(filters?.status || 'all') !== 'all';

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        kpiStrip={<MobileKPIStrip loading={showTopSectionLoading} kpis={kpis} activeKpi={filters?.status || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, status: id }))} />}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          loading={showTopSectionLoading}
          items={[
            {
              label: queueType === 'providers' ? 'Provider approvals' : 'Facility approvals',
              value: displayItems.length,
              trend: null,
              icon: Shield,
              color: 'hsl(var(--muted-foreground))'
            },
            {
              label: 'Approval rate',
              value: `${Math.round((((queueType === 'providers' ? activeStats?.approved : activeStats?.verified) || 0) / ((activeStats?.total || 1))) * 100)}%`,
              trend: null,
              icon: CheckCircle,
              color: 'hsl(162 94% 24%)'
            },
            {
              label: 'Pending load',
              value: activeStats?.pending || 0,
              trend: null,
              icon: Shield,
              color: 'hsl(26 90% 37%)'
            },
            {
              label: 'Total',
              value: activeStats?.total || sourceItems.length,
              trend: null,
              icon: Users,
              color: 'hsl(var(--muted-foreground))'
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Review Summary"
            count={activeStats?.total || sourceItems.length}
            color="hsl(var(--muted-foreground))"
            labelTone="plain"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: CheckCircle,
                title: 'Approval rate',
                subtitle: 'Review share',
                value: `${Math.round((((queueType === 'providers' ? activeStats?.approved : activeStats?.verified) || 0) / ((activeStats?.total || 1))) * 100)}%`,
                color: 'hsl(162 94% 24%)',
                trendDirection: 'flat',
                trendText: null,
                onClick: onViewAnalytics
              },
              {
                icon: Shield,
                title: 'Pending load',
                subtitle: 'Needs review',
                value: activeStats?.pending || 0,
                color: 'hsl(26 90% 37%)',
                trendDirection: 'flat',
                trendText: null,
                onClick: onViewAnalytics
              },
              {
                icon: Users,
                title: 'Total',
                subtitle: 'Current page',
                value: activeStats?.total || sourceItems.length,
                color: 'hsl(var(--muted-foreground))',
                trendDirection: 'flat',
                trendText: null,
                onClick: onViewAnalytics
              },
              {
                icon: Shield,
                title: 'Filtered',
                subtitle: 'Shown now',
                value: displayItems.length,
                color: 'hsl(26 90% 37%)',
                trendDirection: 'flat',
                trendText: null,
                onClick: onViewAnalytics
              }
            ]}
          />
        </section>

        <div className="p-1 rounded-button surface-card flex relative mb-3 mx-1">
          <motion.div
            className="absolute top-1 bottom-1 bg-background shadow-sm rounded-icon dark:bg-white/[0.10]"
            initial={false}
            animate={{
              left: queueType === 'providers' ? '4px' : '50%',
              width: 'calc(50% - 4px)',
            }}
            transition={mobileSpring}
          />
          <button
            onClick={() => setQueueType('providers')}
            className={`flex-1 relative z-10 py-1.5 text-[12px] font-semibold text-center transition-colors active:scale-[0.96] ${queueType === 'providers' ? 'text-foreground' : 'text-muted-foreground'
              }`}
          >
            Providers
          </button>
          <button
            onClick={() => setQueueType('organizations')}
            className={`flex-1 relative z-10 py-1.5 text-[12px] font-semibold text-center transition-colors active:scale-[0.96] ${queueType === 'organizations' ? 'text-foreground' : 'text-muted-foreground'
              }`}
          >
            Facilities
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder={`Search ${queueType === 'providers' ? 'providers' : 'facilities'}...`}
              value={filters?.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-11 pl-10 pr-4 rounded-inner bg-background/60 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
            />
          </div>
          {onOpenFilters && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={(event) => {
                onOpenFilters?.();
                triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true });
              }}
              className="w-11 h-11 rounded-button bg-background/60 flex items-center justify-center text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground dark:bg-white/[0.06]"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
            </motion.button>
          )}
          {onViewAnalytics && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={(event) => {
                onViewAnalytics?.();
                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--foreground))', haptic: true, sound: true });
              }}
              className="w-11 h-11 rounded-button bg-background/60 flex items-center justify-center text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground dark:bg-white/[0.06]"
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </motion.button>
          )}
        </div>

        <MobileSectionHeader
          label="Approvals"
          count={displayItems.length}
          color="hsl(26 90% 37%)"
          labelTone="plain"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== displayItems.length) : null}
          isAllSelected={displayItems.length > 0 && selectedIds.length === displayItems.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayItems.map((item) => {
              const pending = queueType === 'providers'
                ? !item.bvn_verified
                : String(item.verification_status || '').toLowerCase() === 'pending';
              const color = pending ? 'hsl(26 90% 37%)' : 'hsl(162 94% 24%)';
              return (
                <MobileMetricRow
                  key={item.id}
                  icon={queueType === 'providers' ? User : Building2}
                  color={color}
                  label={pending ? 'Pending' : 'Verified'}
                  value={queueType === 'providers' ? (item.username || item.email || 'Unknown') : (item.name || 'Unknown')}
                  rightBlade={{
                    badge: pending ? 'Review' : 'Approved',
                    direction: pending ? 'flat' : 'up',
                    label: queueType === 'providers' ? 'Role' : 'Type',
                    value: queueType === 'providers' ? tokenLabel(item.role, 'provider') : tokenLabel(item.type, 'org'),
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
                            <Button variant="ghost" className="flex-1 h-12 rounded-button surface-card" onClick={() => onViewProvider(item)}>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            {pending && canApprove && onVerifyProvider && (
                              <>
                                <Button variant="ghost" className="flex-1 h-12 rounded-button surface-card" onClick={() => onVerifyProvider(item.id, true)}>
                                  <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                                </Button>
                                <Button variant="ghost" className="flex-1 h-12 rounded-button surface-card hover:bg-destructive/10 hover:text-destructive" onClick={() => onVerifyProvider(item.id, false)}>
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge className="flex-1 h-12 rounded-button flex items-center justify-center surface-card text-muted-foreground">
                              {tokenLabel(item.verification_status, 'pending')}
                            </Badge>
                            {pending && canApprove && onVerifyOrganization && (
                              <>
                                <Button variant="ghost" className="h-12 rounded-button surface-card px-3" onClick={() => onVerifyOrganization(item.id, true)}>
                                  <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                                </Button>
                                <Button variant="ghost" className="h-12 rounded-button surface-card px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onVerifyOrganization(item.id, false)}>
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            {pending && (!canApprove || !onVerifyOrganization) && (
                              <Badge className="h-12 rounded-button flex items-center justify-center bg-amber-500/10 text-amber-700 dark:text-amber-200 px-3">
                                ADMIN REVIEW
                              </Badge>
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

          {displayItems.length === 0 && (
            <MobileListEmpty
              icon={Shield}
              label={canApprove ? 'No verification items found' : 'No visible approval items'}
              reason={filters?.search ? 'search' : hasActiveRecovery ? 'filtered' : 'empty'}
              hint={filters?.search
                ? `No ${queueType} matches "${filters.search}".`
                : hasActiveRecovery
                  ? 'Try clearing status filters to recover queue visibility.'
                  : canApprove
                    ? 'New verification items will appear here as they arrive.'
                    : 'Approval items are not visible for this role.'}
              onRecover={hasActiveRecovery ? () => setFilters(prev => ({ ...prev, search: '', status: 'all' })) : undefined}
              recoverLabel={filters?.search ? 'Clear Search' : hasActiveRecovery ? 'Reset Filters' : undefined}
              labelTone="plain"
            />
          )}
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};

