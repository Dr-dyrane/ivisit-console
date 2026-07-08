import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeDollarSign,
  Search,
  Eye,
  Edit,
  Trash2,
  Building2,
  Globe,
  CalendarDays,
  Layers,
  BarChart3
} from 'lucide-react';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty } from './MobileListStates';
import { statusPill } from '../../constants/vitalTracks';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

const formatLabel = (value, fallback = 'Unknown') => {
  const text = String(value || fallback).replace(/_/g, ' ').trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : fallback;
};

export const MobilePricing = ({
  pricing = [],
  allPricing = [],
  loading = false,
  activeTab = 'services',
  setActiveTab,
  searchTerm = '',
  setSearchTerm,
  kpiFilter = 'all',
  setKpiFilter,
  onView,
  onEdit,
  onDelete,
  onRefresh,
  canEdit,
  onViewAnalytics,
  actionNotice = '',
  pricingProjection = null,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll
}) => {
  const [activeItem, setActiveItem] = useState(null);
  const selectionMode = selectionEnabled && selectedIds.length > 0;
  const { triggerFromEvent } = useFeedback();
  const projectionSummary = pricingProjection?.summary || null;
  const projectionTotalCount = Number(pricingProjection?.totalCount);
  const currentBasisLabel = pricingProjection?.readState?.basis === 'current_filter' ? 'Current' : 'Source';

  const computedAvgPrice = useMemo(() => {
    if (!allPricing.length) return 0;
    const total = allPricing.reduce((sum, item) => sum + getItemPrice(item), 0);
    return total / allPricing.length;
  }, [allPricing]);

  const avgPrice = projectionSummary?.averageAmount ?? computedAvgPrice;

  const counts = useMemo(() => {
    if (projectionSummary) {
      return {
        all: Number.isFinite(projectionTotalCount) ? projectionTotalCount : 0,
        global: projectionSummary.globalFallbackCount || 0,
        override: projectionSummary.facilityPriceCount || 0
      };
    }

    return {
      all: allPricing.length,
      global: allPricing.filter(item => !item.organization_id && !item.hospital_id).length,
      override: allPricing.filter(item => item.organization_id || item.hospital_id).length
    };
  }, [allPricing, projectionSummary, projectionTotalCount]);

  const kpis = [
    { id: 'all', label: 'Rules', value: counts.all, color: 'hsl(var(--foreground))', delta: currentBasisLabel, direction: 'flat' },
    { id: 'global', label: 'Platform', value: counts.global, color: 'hsl(var(--foreground))', delta: currentBasisLabel, direction: 'flat' },
    { id: 'override', label: 'Facility', value: counts.override, color: 'hsl(var(--foreground))', delta: currentBasisLabel, direction: 'flat' }
  ];

  function getItemPrice(item) {
    const value = item.amount ?? item.base_price ?? item.price_per_night ?? 0;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  }

  const getItemName = (item) => item.name || item.service_name || item.room_name || 'Unnamed price';
  const getItemType = (item) => item.type || item.service_type || item.room_type || 'general';
  const getItemFamily = (item) => item.family || item._pricingType || (item.price_per_night !== undefined ? 'room' : 'service');
  const getUpdatedAt = (item) => item.updatedAt || item.updated_at || item.created_at;
  const getSourceLabel = (item, globalRule) => item.sourceLabel || item.source_label || (globalRule ? 'platform fallback' : 'facility price');
  const getSectionLabel = () => {
    if (activeTab === 'services') return 'Service Pricing';
    if (activeTab === 'rooms') return 'Room Pricing';
    return 'Pricing';
  };
  const getAverageLabel = () => {
    if (activeTab === 'services') return 'Average Service Price';
    if (activeTab === 'rooms') return 'Average Room Price';
    return 'Average Price';
  };
  const isGlobal = (item) => !item.organization_id && !item.hospital_id;
  const hasActiveRecovery = Boolean(searchTerm) || kpiFilter !== 'all';
  const showTopSectionLoading = loading && pricing.length === 0 && allPricing.length === 0;

  const periodTrends = useMemo(() => ({
    globalRatio: { direction: 'flat', deltaText: currentBasisLabel },
    overrideLoad: { direction: 'flat', deltaText: currentBasisLabel }
  }), [currentBasisLabel]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        kpiStrip={(
          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={kpis}
            activeKpi={kpiFilter}
            onKpiClick={setKpiFilter}
          />
        )}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          loading={showTopSectionLoading}
          items={[
            {
              label: getAverageLabel(),
              value: `$${avgPrice.toFixed(2)}`,
              trend: currentBasisLabel,
              icon: BadgeDollarSign,
              color: 'hsl(var(--foreground))',
              chartData: [{ value: avgPrice }]
            },
            {
              label: 'Platform Ratio',
              value: `${Math.round((counts.global / (counts.all || 1)) * 100)}%`,
              trend: periodTrends.globalRatio.deltaText,
              icon: Globe,
              color: 'hsl(var(--foreground))',
              chartData: [{ value: counts.global }]
            },
            {
              label: 'Facility Prices',
              value: `${Math.round((counts.override / (counts.all || 1)) * 100)}%`,
              trend: periodTrends.overrideLoad.deltaText,
              icon: Building2,
              color: 'hsl(var(--foreground))',
              chartData: [{ value: counts.override }]
            },
            {
              label: 'Total Items',
              value: counts.all,
              trend: currentBasisLabel,
              icon: Layers,
              color: 'hsl(var(--foreground))',
              chartData: [{ value: counts.all }]
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Pricing basis"
            count={counts.all}
            color="hsl(var(--foreground))"
            labelTone="plain"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: Globe,
                title: 'Platform',
                subtitle: 'Fallback',
                value: `${Math.round((counts.global / (counts.all || 1)) * 100)}%`,
                color: 'hsl(var(--foreground))',
                trendDirection: periodTrends.globalRatio.direction,
                trendText: periodTrends.globalRatio.deltaText,
                onClick: onViewAnalytics
              },
              {
                icon: Building2,
                title: 'Facility',
                subtitle: 'Scoped',
                value: `${Math.round((counts.override / (counts.all || 1)) * 100)}%`,
                color: 'hsl(var(--foreground))',
                trendDirection: periodTrends.overrideLoad.direction,
                trendText: periodTrends.overrideLoad.deltaText,
                onClick: onViewAnalytics
              },
              {
                icon: BadgeDollarSign,
                title: 'Average',
                subtitle: 'Current mean',
                value: `$${avgPrice.toFixed(2)}`,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: currentBasisLabel,
                onClick: onViewAnalytics
              },
              {
                icon: Layers,
                title: 'Total',
                subtitle: 'Items',
                value: counts.all,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: currentBasisLabel,
                onClick: onViewAnalytics
              }
            ]}
          />
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="p-1 rounded-inner bg-muted/20 flex relative w-full">
            <motion.div
              className="absolute top-1 bottom-1 bg-[hsl(var(--spark)/0.10)] shadow-sm rounded-button"
              initial={false}
              animate={{
                left: activeTab === 'services' ? 'calc(33.333% + 2px)' : activeTab === 'rooms' ? 'calc(66.666% + 0px)' : '4px',
                width: 'calc(33.333% - 4px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 relative z-10 py-1.5 text-[11px] font-semibold text-center transition-colors duration-200 ${activeTab === 'all'
                ? 'text-[hsl(var(--spark)/0.92)]'
                : 'text-muted-foreground/50'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 relative z-10 py-1.5 text-[11px] font-semibold text-center transition-colors duration-200 ${activeTab === 'services'
                ? 'text-[hsl(var(--spark)/0.92)]'
                : 'text-muted-foreground/50'
                }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex-1 relative z-10 py-1.5 text-[11px] font-semibold text-center transition-colors duration-200 ${activeTab === 'rooms'
                ? 'text-[hsl(var(--spark)/0.92)]'
                : 'text-muted-foreground/50'
                }`}
            >
              Rooms
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search pricing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-inner apple-glass-heavy text-[12px] placeholder:text-muted-foreground/30 focus-visible:bg-white/[0.06]"
            />
          </div>
          {onViewAnalytics && (
            <Button
              variant="ghost"
              className="w-11 h-11 rounded-button apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
              onClick={(event) => {
                onViewAnalytics?.();
                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--spark))', haptic: true, sound: true });
              }}
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </Button>
          )}
        </div>

        <MobileSectionHeader
          label={getSectionLabel()}
          count={pricing.length}
          color="hsl(var(--foreground))"
          onSelectAll={selectionEnabled && onSelectAll ? () => onSelectAll(selectedIds.length !== pricing.length) : null}
          isAllSelected={selectionEnabled && pricing.length > 0 && selectedIds.length === pricing.length}
          selectionMode={selectionMode}
          selectedCount={selectedIds.length}
        />

        {actionNotice && (
          <p role="status" aria-live="polite" className="mb-3 rounded-inner bg-muted/15 px-4 py-3 text-xs leading-5 text-muted-foreground">
            {actionNotice}
          </p>
        )}

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {pricing.map((item) => {
              const globalRule = isGlobal(item);
              const price = getItemPrice(item);
              const sourceLabel = getSourceLabel(item, globalRule);
              const itemFamily = getItemFamily(item);
              // Price is the defining number of a config row: carry it (with its
              // per-unit basis) on the readable secondary line, not in a decorative blade.
              const rate = {
                label: itemFamily === 'room' ? 'Night' : 'Unit',
                value: new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(price)
              };
              // Tap opens the detail bottom sheet (MobileDetailSheet) - the approved mobile
              // design + desktop rail behaviour - not an inline dropdown.
              return (
                <MobileMetricRow
                  key={item.id}
                  icon={BadgeDollarSign}
                  color="hsl(var(--primary))"
                  label={formatLabel(getItemType(item))}
                  value={getItemName(item)}
                  secondary={`${rate.value} / ${rate.label} · ${formatLabel(sourceLabel)}`}
                  statusPill={statusPill(item.status || (item.is_active ? 'active' : 'inactive'))}
                  onClick={() => setActiveItem(item)}
                />
              );
            })}
          </AnimatePresence>

          {!loading && pricing.length === 0 && (
            <MobileListEmpty
              icon={BadgeDollarSign}
              label="No pricing rules found"
              reason={searchTerm ? 'search' : hasActiveRecovery ? 'filtered' : 'empty'}
              hint={searchTerm
                ? `No pricing matches "${searchTerm}".`
                : hasActiveRecovery
                  ? 'Try resetting filters to view all pricing rules.'
                  : 'Pricing rules will appear here once configured.'}
              onRecover={hasActiveRecovery ? () => {
                if (searchTerm) setSearchTerm('');
                if (kpiFilter !== 'all') setKpiFilter('all');
              } : undefined}
              recoverLabel={searchTerm ? 'Clear Search' : hasActiveRecovery ? 'Reset Filters' : undefined}
            />
          )}
        </div>

        {activeItem && (() => {
          const item = activeItem;
          const globalRule = isGlobal(item);
          const editable = canEdit?.(item);
          const price = getItemPrice(item);
          const sourceLabel = getSourceLabel(item, globalRule);
          const itemFamily = getItemFamily(item);
          const updatedAt = getUpdatedAt(item);
          const facilityLabel = item.facilityName || item.facility_name;
          const noteText = item.description || item.metadata?.description;
          // Price is the defining number of a config record: carry it (with its
          // per-unit basis) as the lead detail island, not in a decorative blade.
          const rate = {
            label: itemFamily === 'room' ? 'Night' : 'Unit',
            value: new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(price)
          };
          return (
            <MobileDetailSheet
              isOpen
              onClose={() => setActiveItem(null)}
              icon={BadgeDollarSign}
              iconTone="hsl(var(--primary))"
              eyebrow={formatLabel(getItemType(item))}
              title={getItemName(item)}
              statusPill={statusPill(item.status || (item.is_active ? 'active' : 'inactive'))}
              islands={[
                { icon: BadgeDollarSign, label: 'Price', value: `${rate.value} / ${rate.label}` },
                item.unit ? { icon: Layers, label: 'Unit', value: item.unit } : null,
                facilityLabel ? { icon: Building2, label: 'Facility', value: facilityLabel } : null,
                { icon: CalendarDays, label: 'Updated', value: updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Date unknown' }
              ]}
              primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveItem(null); onView(item); } }}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${globalRule ? 'bg-sky-500/15 text-sky-700 dark:text-sky-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'}`}>
                  {globalRule ? <Globe size={12} /> : <Building2 size={12} />}
                  {formatLabel(sourceLabel)}
                </span>
              </div>

              {noteText ? (
                <div className="rounded-inner bg-white/[0.03] p-3 text-xs leading-5 text-muted-foreground">
                  {noteText}
                </div>
              ) : null}

              {editable && (
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onEdit(item)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-muted/40 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    <Edit size={15} />
                    Edit
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onDelete(item)}
                    aria-label="Delete pricing rule"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 size={15} />
                  </motion.button>
                </div>
              )}
            </MobileDetailSheet>
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};

