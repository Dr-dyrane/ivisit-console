import React, { useRef } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  Building2,
  Globe,
  Info,
} from 'lucide-react';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import {
  ActivitySheet,
  ListRowShell,
  SheetToolbar,
  SortableColumnHeader,
} from '../../console/ActivitySheet';
import {
  EmptyState,
  LoadErrorState,
  Shimmer,
  StatusPill,
} from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  useListKeyboardNav,
  useScrollResetOnPage,
} from '../../../hooks/useListKeyboardNav';
import { PricingDetailRail } from './PricingDetailRail';
import {
  formatPricingDate,
  getPricingKpiCount,
  getPricingRowMetaLine,
  getPricingRuleName,
  getPricingScopeTone,
  getPricingWorkspaceState,
  isGlobalPricingRule,
  PRICING_KPI_DEFINITIONS,
  PRICING_SIGNAL_TONES,
} from './pricingPageModel';

const PRICING_ICONS = {
  all: BadgeDollarSign,
  override: Building2,
  global: Globe,
};

const OPTIONS = PRICING_KPI_DEFINITIONS.map((option) => ({
  ...option,
  icon: PRICING_ICONS[option.id],
}));

const GRID = 'grid-cols-[minmax(220px,1.8fr)_minmax(120px,1fr)_minmax(105px,auto)_minmax(110px,auto)_96px]';
const GRID_SELECT = 'grid-cols-[28px_minmax(220px,1.8fr)_minmax(120px,1fr)_minmax(105px,auto)_minmax(110px,auto)_96px]';

export const PricingDesktopWorkspace = ({
  rows,
  summary,
  totalCount,
  loading,
  isFetching,
  error,
  filters,
  setFilters,
  retry,
  pagination,
  sortConfig,
  onSort,
  focusedPrice,
  setFocused,
  selectable = false,
  selectedIds = [],
  allSelected = false,
  someSelected = false,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listRef = useRef(null);
  const active = filters.kpiFilter || 'all';
  const { failedEmpty, signal: signalState } = getPricingWorkspaceState({
    summary,
    totalCount,
    active,
    error,
    rowCount: rows.length,
  });
  const hasFilter = Boolean(
    filters.search || active !== 'all' || filters.family !== 'all',
  );
  const signal = {
    ...signalState,
    icon: signalState.iconId === 'error'
      ? AlertTriangle
      : PRICING_ICONS[signalState.iconId],
  };
  const grid = selectable ? GRID_SELECT : GRID;

  useScrollResetOnPage(listRef, pagination.currentPage);
  const onKeyDown = useListKeyboardNav({
    items: rows,
    focusedItem: focusedPrice,
    setFocusedId: setFocused,
    onOpen: (row) => setFocused(row.id),
    scrollRef: listRef,
    rowAttr: 'data-pricing-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/pricing"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <PricingDetailRail
          price={focusedPrice}
          loading={loading}
          hasFilter={hasFilter}
        />
      )}
    >
      <SignalPanel
        signal={signal}
        loading={loading}
        toneClassMap={PRICING_SIGNAL_TONES}
      >
        <KpiStrip
          options={OPTIONS}
          getCount={(id) => getPricingKpiCount(summary, totalCount, id)}
          kpiFilter={active}
          setKpiFilter={(id) => setFilters((previous) => ({
            ...previous,
            kpiFilter: id,
          }))}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={['override', 'global']}
          importance={{ all: 0, override: 1, global: 2 }}
          defaultId="all"
          dataAttr="data-pricing-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="pricing rules"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(search) => setFilters((previous) => ({
              ...previous,
              search,
            }))}
            searchPlaceholder="Search pricing rules..."
            searchTestId="pricing-sheet-search"
            onRefresh={retry}
            refreshing={isFetching}
            refreshNoun="pricing rules"
          />
        )}
        errorBanner={error && rows.length ? (
          <div className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Pricing did not refresh. Showing the previous results.
          </div>
        ) : null}
      >
        <div className="mt-3 flex gap-1 rounded-inner bg-muted/20 p-1">
          {['all', 'services', 'rooms'].map((family) => (
            <button
              key={family}
              type="button"
              onClick={() => setFilters((previous) => ({ ...previous, family }))}
              className={`h-9 rounded-button px-4 text-sm font-semibold capitalize transition-colors ${filters.family === family ? 'bg-background shadow-e1 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {family}
            </button>
          ))}
        </div>

        <div
          ref={listRef}
          role="listbox"
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Pricing rules list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <div className={`grid ${grid} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
            {selectable && (
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={onSelectAll}
                onClick={(event) => event.stopPropagation()}
                aria-label={allSelected ? 'Clear pricing selection' : 'Select all pricing rules'}
                className="h-4 w-4"
              />
            )}
            <span>Rule</span>
            <span>Family</span>
            <span>Applies to</span>
            <SortableColumnHeader
              label="Updated"
              sortKey="updated_at"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <span className="justify-self-end">Action</span>
          </div>

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, index) => (
                <Shimmer key={index} className="h-[80px] rounded-card" />
              ))}
            </div>
          )}

          {!loading && failedEmpty && (
            <LoadErrorState title="Pricing did not load" message={error} onRetry={retry} />
          )}

          {!loading && !error && totalCount === 0 && (
            <EmptyState
              icon={BadgeDollarSign}
              heading={hasFilter ? 'No matching pricing rules' : 'No pricing rules'}
              body={hasFilter
                ? 'Change the family, price source, or search.'
                : 'Pricing rules will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setFilters((previous) => ({
                    ...previous,
                    search: '',
                    family: 'all',
                    kpiFilter: 'all',
                  }))}
                  className="rounded-pill bg-muted/30 px-5 font-semibold active:scale-95"
                >
                  Show all pricing rules
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && rows.map((row) => {
            const checked = selectedIds.includes(row.id);
            const ruleName = getPricingRuleName(row);
            const globalRule = isGlobalPricingRule(row);
            const metaLine = getPricingRowMetaLine(row);

            return (
              <ListRowShell
                key={`${row.family || row._pricingType}-${row.id}`}
                id={row.id}
                dataAttrName="data-pricing-row"
                gridCols={grid}
                selected={focusedPrice?.id === row.id}
                onFocus={() => setFocused(row.id)}
                onOpen={() => setFocused(row.id)}
              >
                {selectable && (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => onToggleSelect?.(row.id, value)}
                    onClick={(event) => {
                      onSelectClick?.(event);
                      event.stopPropagation();
                    }}
                    aria-label={checked ? `Deselect ${ruleName}` : `Select ${ruleName}`}
                    className="h-4 w-4"
                  />
                )}
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${getPricingScopeTone(row)}`}>
                    {globalRule
                      ? <Globe className="h-4 w-4" />
                      : <Building2 className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{ruleName}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground" title={metaLine}>
                      {metaLine}
                    </div>
                  </div>
                </div>
                <span className="text-sm capitalize text-muted-foreground">
                  {row.family || row._pricingType || 'service'}
                </span>
                <StatusPill
                  label={globalRule ? 'Platform' : 'Facility'}
                  className={getPricingScopeTone(row)}
                  compact
                />
                <span className="text-sm text-muted-foreground">
                  {formatPricingDate(row.updated_at)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFocused(row.id);
                  }}
                  className="h-8 w-8 justify-self-end rounded-pill bg-background/45 text-muted-foreground hover:bg-foreground hover:text-background"
                  aria-label="Inspect pricing rule"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </ListRowShell>
            );
          })}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};
