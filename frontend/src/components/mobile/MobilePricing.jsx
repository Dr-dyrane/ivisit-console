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
import { MobileListEmpty } from './MobileListStates';

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
  selectedIds = [],
  onSelect,
  onSelectAll
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const selectionMode = selectedIds.length > 0;

  const avgPrice = useMemo(() => {
    if (!allPricing.length) return 0;
    const total = allPricing.reduce((sum, item) => sum + (item.base_price || item.price_per_night || 0), 0);
    return total / allPricing.length;
  }, [allPricing]);

  const counts = useMemo(() => ({
    all: allPricing.length,
    global: allPricing.filter(item => !item.organization_id && !item.hospital_id).length,
    override: allPricing.filter(item => item.organization_id || item.hospital_id).length
  }), [allPricing]);

  const kpis = [
    { id: 'all', label: 'Rules', value: counts.all, color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' },
    { id: 'global', label: 'Global', value: counts.global, color: 'hsl(var(--info))', delta: 'LIVE', direction: 'flat' },
    { id: 'override', label: 'Overrides', value: counts.override, color: 'hsl(var(--success))', delta: 'LIVE', direction: 'flat' }
  ];

  const getItemName = (item) => item.service_name || item.room_name || 'Unnamed Rule';
  const getItemType = (item) => item.service_type || item.room_type || 'general';
  const getItemPrice = (item) => Number(item.base_price || item.price_per_night || 0);
  const isGlobal = (item) => !item.organization_id && !item.hospital_id;

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.updated_at || item.created_at || 0).getTime();
    const currentWindow = allPricing.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = allPricing.filter((item) => {
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
    const currentGlobalRatio = currentWindow.length > 0 ? currentWindow.filter((item) => !item.organization_id && !item.hospital_id).length / currentWindow.length : 0;
    const previousGlobalRatio = previousWindow.length > 0 ? previousWindow.filter((item) => !item.organization_id && !item.hospital_id).length / previousWindow.length : 0;
    const currentOverrideRatio = currentWindow.length > 0 ? currentWindow.filter((item) => item.organization_id || item.hospital_id).length / currentWindow.length : 0;
    const previousOverrideRatio = previousWindow.length > 0 ? previousWindow.filter((item) => item.organization_id || item.hospital_id).length / previousWindow.length : 0;
    return {
      globalRatio: buildTrend(currentGlobalRatio, previousGlobalRatio),
      overrideLoad: buildTrend(currentOverrideRatio, previousOverrideRatio)
    };
  }, [allPricing]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={(
          <MobileKPIStrip
            kpis={kpis}
            activeKpi={kpiFilter}
            onKpiClick={setKpiFilter}
          />
        )}
        contentClassName="px-2 pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          label={activeTab === 'services' ? 'Average Service Price' : 'Average Room Price'}
          value={`$${avgPrice.toFixed(2)}`}
          trend="LIVE"
          icon={BadgeDollarSign}
          color="hsl(var(--primary))"
          chartData={[{ value: 20 }, { value: 24 }, { value: 21 }, { value: 31 }, { value: 28 }, { value: 35 }]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Pricing Dynamics"
            count={counts.all}
            color="hsl(var(--info))"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Globe className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Global Ratio</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">System baseline</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round((counts.global / (counts.all || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.globalRatio.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.globalRatio.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.globalRatio.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.globalRatio.deltaText}
                </span>
              </div>
            </div>
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Building2 className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Override Load</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Local adjustments</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round((counts.override / (counts.all || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.overrideLoad.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.overrideLoad.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.overrideLoad.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.overrideLoad.deltaText}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="p-1 rounded-xl bg-muted/20 backdrop-blur-md flex relative w-full">
            <motion.div
              className="absolute top-1 bottom-1 bg-[hsl(var(--spark)/0.10)] shadow-sm rounded-lg"
              initial={false}
              animate={{
                left: activeTab === 'services' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${activeTab === 'services'
                ? 'text-[hsl(var(--spark)/0.92)]'
                : 'text-muted-foreground/50'
                }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${activeTab === 'rooms'
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
              className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none"
            />
          </div>
          {onViewAnalytics && (
            <Button
              variant="ghost"
              className="w-11 h-11 rounded-2xl apple-glass-heavy border-0 flex items-center justify-center text-[hsl(var(--spark)/0.78)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
              onClick={onViewAnalytics}
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </Button>
          )}
        </div>

        <MobileSectionHeader
          label={activeTab === 'services' ? 'Service Pricing' : 'Room Pricing'}
          count={pricing.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== pricing.length) : null}
          isAllSelected={pricing.length > 0 && selectedIds.length === pricing.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {pricing.map((item) => {
              const globalRule = isGlobal(item);
              const editable = canEdit?.(item);
              const price = getItemPrice(item);
              return (
                <MobileMetricRow
                  key={item.id}
                  icon={BadgeDollarSign}
                  color={globalRule ? 'hsl(var(--info))' : 'hsl(var(--success))'}
                  label={getItemType(item).toUpperCase()}
                  value={getItemName(item)}
                  rightBlade={{
                    badge: globalRule ? 'GLOBAL' : 'LOCAL',
                    direction: globalRule ? 'flat' : 'up',
                    label: activeTab === 'services' ? 'Price / Unit' : 'Price / Night',
                    value: `$${price.toFixed(2)}`,
                    color: globalRule ? 'hsl(var(--info))' : 'hsl(var(--success))'
                  }}
                  isExpanded={expandedId === item.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={item.id}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Layers size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal opacity-80">Unit: {item.unit || (activeTab === 'rooms' ? 'Night' : 'Unit')}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          {globalRule ? <Globe size={14} className="text-muted-foreground/40" /> : <Building2 size={14} className="text-muted-foreground/40" />}
                          <span className="text-xs font-normal opacity-80">{globalRule ? 'Global rule' : 'Organization override'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <CalendarDays size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal opacity-80">
                            Updated: {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        {item.description || item.metadata?.description ? (
                          <div className="p-3 bg-white/[0.02] rounded-2xl border-0">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Notes</p>
                            <p className="text-xs opacity-80">{item.description || item.metadata?.description}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`border-0 ${globalRule ? 'bg-info/20 text-info' : 'bg-success/20 text-success'} text-[9px] uppercase`}>
                          {globalRule ? 'GLOBAL' : 'OVERRIDE'}
                        </Badge>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2" onClick={() => onView(item)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                        {editable && (
                          <>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onEdit(item)}>
                              <Edit size={16} className="text-warning/60" />
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(item)}>
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

          {!loading && pricing.length === 0 && (
            <MobileListEmpty icon={BadgeDollarSign} label="No pricing rules found" />
          )}
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
