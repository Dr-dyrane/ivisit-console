import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Ban,
  BarChart3,
  ClipboardCheck,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { MobileKPIStrip } from '../MobileKPIStrip';
import {
  MobileListEnd,
  MobileListEmpty,
  MobileListLoadMore,
  MobileListLoadingMore,
} from '../MobileListStates';
import { MobileSelectionBar } from '../MobileSelectionBar';
import { MobileListRow } from '../canon/GroupedList';
import { buildEmergencyRenderProjection } from '../../../utils/emergencyRequestMapper';
import { formatRequestDayTime, isUnsettledCashRequest } from '../../../utils/requestDisplay';
import { resolveVital } from '../../../constants/vitalTracks';
import {
  getMobileRequestAvatarClass,
  getMobileRequestCreatedDateLabel,
  getMobileRequestServiceLabel,
  getMobileRequestTypeIcon,
  hasMobileRequestFilters,
} from './mobileEmergencyModel';

export const MobileEmergencyList = ({
  controller,
  loading,
  isFetching,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  isAdmin,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen,
  analyticsOpen,
  selectionEnabled,
  onSelectAll,
  onBulkCancel,
  cancellableCount,
  loadError,
  onRetry,
  hasMore,
  heading,
  updatingPill,
  groupedList,
}) => {
  const {
    observerTarget,
    selectedIdSet,
    displayItems,
    armed,
    requestLoad,
    showSkeleton,
    filterTriggerState,
    analyticsTriggerState,
    searchDraft,
    setSearchDraft,
    clearSearch,
    triggerFilterFeedback,
    triggerAnalyticsFeedback,
    kpis,
    kpiEmptyCause,
    kpiEmptyLabel,
  } = controller;

  return (
    <>
      <MobileRequestsAtlasLayer />
      <div className="relative z-10 space-y-3">
        {heading}

        <MobileKPIStrip
          kpis={kpis}
          activeKpi={kpiFilter || 'pending'}
          onKpiClick={(id) => setKpiFilter?.(id)}
          loading={showSkeleton}
        />

        <section className="px-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                inputMode="search"
                placeholder="Search requests..."
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                className="h-9 w-full rounded-inner bg-background/60 pl-10 pr-10 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
              />
              {searchDraft && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-pill bg-foreground/10 text-muted-foreground transition-colors hover:bg-foreground/15 active:scale-95"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={(event) => {
                onOpenFilters?.();
                triggerFilterFeedback(event);
              }}
              data-state={filterTriggerState}
              className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
              aria-label="Filter requests"
              aria-haspopup="dialog"
              aria-expanded={filterSheetOpen}
            >
              <Filter size={18} />
            </motion.button>

            {isAdmin && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={(event) => {
                  onViewAnalytics?.();
                  triggerAnalyticsFeedback(event);
                }}
                data-state={analyticsTriggerState}
                className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                aria-label="Open request statistics"
                aria-haspopup="dialog"
                aria-expanded={analyticsOpen}
              >
                <BarChart3 size={18} />
              </motion.button>
            )}
          </div>

          {updatingPill}

          <div className="mt-3 space-y-2">
            {selectionEnabled && (
              <MobileSelectionBar
                count={selectedIdSet.size}
                onSelectAll={() => onSelectAll?.(true)}
                onClear={() => onSelectAll?.(false)}
              >
                <button
                  type="button"
                  onClick={() => onBulkCancel?.()}
                  disabled={cancellableCount === 0}
                  aria-label={cancellableCount === 0 ? 'No cancellable requests selected' : `Cancel ${cancellableCount} request${cancellableCount === 1 ? '' : 's'}`}
                  className="flex h-8 items-center gap-1.5 rounded-button bg-destructive/12 px-3 text-[12px] font-semibold text-destructive transition-transform active:scale-95 disabled:opacity-40"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel{cancellableCount > 0 ? ` ${cancellableCount}` : ''}
                </button>
              </MobileSelectionBar>
            )}

            {!loading && loadError && displayItems.length > 0 && (
              <div className="rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.10)]">
                <p className="font-semibold">Requests could not refresh</p>
                <p className="mt-1 text-xs text-destructive/75">Showing the last loaded requests. Try again.</p>
                <button
                  type="button"
                  onClick={() => onRetry?.()}
                  className="mt-3 h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-[0.96]"
                >
                  Retry
                </button>
              </div>
            )}

            {showSkeleton ? <MobileRequestsListSkeleton /> : groupedList}

            <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
              {isFetching && !showSkeleton && hasMore && displayItems.length > 0 && <MobileListLoadingMore />}
              {!loading && !isFetching && hasMore && (
                <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
              )}
              {!loading && !hasMore && displayItems.length > 0 && (
                <MobileListEnd label="End of requests" />
              )}
            </div>

            {displayItems.length === 0 && !loading && loadError && (
              <MobileListEmpty
                icon={AlertCircle}
                label="Requests did not load"
                hint="Something went wrong loading requests."
                onRecover={onRetry}
                recoverLabel="Retry"
                labelTone="plain"
              />
            )}

            {displayItems.length === 0 && !loading && !loadError && (
              <MobileListEmpty
                icon={ClipboardCheck}
                label="No requests found"
                reason={filters?.search ? 'search' : hasMobileRequestFilters(filters) ? 'filtered' : kpiEmptyCause ? 'filtered' : 'empty'}
                hint={kpiEmptyCause ? `No requests in the ${kpiEmptyLabel} scope.` : undefined}
                onRecover={
                  filters?.search
                    ? () => setFilters?.((previous) => ({ ...previous, search: '' }))
                    : hasMobileRequestFilters(filters)
                      ? () => onOpenFilters?.()
                      : kpiEmptyCause
                        ? () => setKpiFilter?.('all')
                        : undefined
                }
                recoverLabel={filters?.search ? 'Clear Search' : hasMobileRequestFilters(filters) ? 'Adjust Filters' : kpiEmptyCause ? 'Show all requests' : undefined}
                labelTone="plain"
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
};

const MobileRequestsAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--destructive) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 22% 34%, hsl(var(--destructive) / 0.11), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

const MobileRequestsListSkeleton = ({ groups = 2, rowsPerGroup = 3 }) => (
  <div className="space-y-[18px]" aria-hidden="true">
    {Array.from({ length: groups }).map((_, groupIndex) => (
      <div key={groupIndex}>
        <div className="flex items-center justify-between px-1 pb-2.5">
          <span className="h-[13px] w-24 rounded-pill bg-muted/25 shimmer" />
          <span className="h-[13px] w-5 rounded-pill bg-muted/20 shimmer" />
        </div>
        <div className="rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5">
          {Array.from({ length: rowsPerGroup }).map((__, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="flex items-center gap-3 px-2 py-3">
                <span className="h-10 w-10 shrink-0 rounded-pill bg-muted/25 shimmer" />
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="block h-[15px] w-2/5 rounded-pill bg-muted/25 shimmer" />
                  <span className="block h-3 w-3/5 rounded-pill bg-muted/15 shimmer" />
                </div>
                <span className="ml-2 h-6 w-14 shrink-0 rounded-pill bg-muted/20 shimmer" />
              </div>
              {rowIndex < rowsPerGroup - 1 && (
                <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const MobileRequestRow = ({
  request,
  onOpen,
  selectable,
  selected,
  selectionMode,
  onToggleSelect,
  onLongPress,
}) => {
  const projection = buildEmergencyRenderProjection(request);
  const vital = resolveVital('emergency', request.status);
  const name = projection.patientDisplay.name;
  const avatarClass = getMobileRequestAvatarClass(request);
  const TypeIcon = getMobileRequestTypeIcon(request);
  const showCashChip = isUnsettledCashRequest(request);

  return (
    <MobileListRow
      item={request}
      dataAttr="data-mobile-request-row"
      onOpen={() => onOpen(request)}
      ariaLabel={`Open ${name}`}
      orbClass={avatarClass}
      icon={TypeIcon}
      title={name}
      meta={`${getMobileRequestServiceLabel(request)} \u00b7 ${getMobileRequestCreatedDateLabel(request.created_at)}`}
      time={formatRequestDayTime(request.created_at)}
      markerChip={showCashChip ? 'Cash' : null}
      pill={vital?.pill}
      selectable={selectable}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
    />
  );
};
