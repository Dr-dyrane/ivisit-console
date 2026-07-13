import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Ambulance, ClipboardCheck } from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { ActivitySheet, SheetToolbar, SortableColumnHeader } from '../../console/ActivitySheet';
import { EmptyState, SkeletonRows } from '../../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
import { canonicalizeEmergencyStatus } from '../../../utils/emergencyStatus';
import { formatRequestDayTime, isUnsettledCashRequest } from '../../../utils/requestDisplay';
import {
  getRequestAvatarClass,
  getRequestInitials,
  getRequestProjection,
  getRequestServiceLabel,
  getRequestStatusMeta,
  hasActiveRequestFilters,
  REQUEST_EMPTY_HEADINGS,
  REQUEST_SERVICE_ICON_MAP,
} from './requestPageModel';

const REQUEST_GRID_COLS = 'grid-cols-[minmax(140px,1.25fr)_minmax(96px,auto)_minmax(88px,0.62fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';
const REQUEST_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(140px,1.25fr)_minmax(96px,auto)_minmax(88px,0.62fr)_minmax(120px,1fr)_minmax(96px,auto)_72px]';

export const RequestsDesktopList = ({
  requests,
  loading,
  isFetching,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedRequest,
  setFocusedRequestId,
  onView,
  pagination,
  openFilters,
  filterSheetOpen,
  filterTriggerState,
  loadError,
  onRetry,
  selectable,
  selectedIds,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  sortConfig,
  onSort,
}) => {
  const hasFilter = hasActiveRequestFilters(filters);
  const failedEmpty = Boolean(loadError) && requests.length === 0;
  const allSelected = selectable && requests.length > 0
    && requests.every((row) => selectedIds.includes(row.id));
  const someSelected = selectable && !allSelected && selectedIds.length > 0;
  const listScrollRef = useRef(null);

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: requests,
    focusedItem: focusedRequest,
    setFocusedId: setFocusedRequestId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-request-row',
  });

  return (
    <ActivitySheet
      loading={loading}
      isFetching={isFetching}
      failedEmpty={failedEmpty}
      pagination={pagination}
      itemNoun="requests"
      toolbar={(
        <SheetToolbar
          searchValue={filters.search}
          onSearchCommit={(value) => setFilters((previous) => ({ ...previous, search: value }))}
          searchPlaceholder="Search by request ID, facility, responder, or type..."
          searchTestId="requests-sheet-search"
          onRefresh={onRetry}
          refreshing={isFetching}
          refreshNoun="requests"
          onOpenFilters={openFilters}
          filterSheetOpen={filterSheetOpen}
          filtersActive={hasFilter}
        />
      )}
    >
      <div
        ref={listScrollRef}
        role="region"
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        aria-label="Requests list"
        style={{ outline: 'none' }}
        className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
      >
        <RequestListHeader
          selectable={selectable}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={onSelectAll}
          sortConfig={sortConfig}
          onSort={onSort}
        />

        {loading && <SkeletonRows />}
        {!loading && loadError && requests.length === 0 && (
          <RequestLoadErrorState message={loadError} onRetry={onRetry} />
        )}
        {!loading && loadError && requests.length > 0 && (
          <RequestLoadNotice message={loadError} onRetry={onRetry} />
        )}
        {!loading && !loadError && Number(pagination.totalCount) === 0 && (
          <EmptyState
            icon={ClipboardCheck}
            heading={hasFilter ? 'No matching requests' : (REQUEST_EMPTY_HEADINGS[kpiFilter] || 'No requests yet')}
            body={hasFilter ? 'Change filters or search again.' : 'New requests will appear here.'}
          >
            {hasFilter && (
              <Button
                variant="ghost"
                onClick={openFilters}
                data-state={filterTriggerState}
                className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                aria-haspopup="dialog"
                aria-expanded={filterSheetOpen}
              >
                Change filters
              </Button>
            )}
            {!hasFilter && kpiFilter && kpiFilter !== 'all' && (
              <Button
                variant="ghost"
                onClick={() => setKpiFilter('all')}
                className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
              >
                Show all requests
              </Button>
            )}
          </EmptyState>
        )}
        {!loading && requests.length > 0 && requests.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            selected={focusedRequest?.id === request.id}
            onFocus={() => setFocusedRequestId(request.id)}
            onView={onView}
            selectable={selectable}
            checked={selectedIds.includes(request.id)}
            onToggleSelect={onToggleSelect}
            onSelectClick={onSelectClick}
          />
        ))}
      </div>
    </ActivitySheet>
  );
};

const RequestLoadErrorState = ({ message, onRetry }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-destructive/10 p-10 text-center shadow-e2">
    <AlertCircle className="mb-4 h-12 w-12 text-destructive/75" />
    <h3 className="text-xl font-semibold">Requests did not load</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">
      {message || 'Try again to refresh this list.'}
    </p>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="mt-5 rounded-pill bg-destructive/10 px-5 font-semibold text-destructive transition-all hover:bg-destructive/15 active:scale-95"
    >
      Retry
    </Button>
  </div>
);

const RequestLoadNotice = ({ message, onRetry }) => (
  <div className="mb-3 flex flex-col gap-3 rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-e2 sm:flex-row sm:items-center sm:justify-between">
    <span className="font-medium">{message || 'Requests could not refresh.'}</span>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/15"
    >
      Retry
    </Button>
  </div>
);

const RequestListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? REQUEST_GRID_COLS_SELECT : REQUEST_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all requests'}
        className="h-4 w-4"
      />
    )}
    <span>Person</span>
    <span>Status</span>
    <span>Service</span>
    <span>Facility</span>
    <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const RequestRow = ({
  request,
  selected,
  onFocus,
  onView,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
}) => {
  const projection = getRequestProjection(request);
  const status = getRequestStatusMeta(request);
  const ServiceIcon = REQUEST_SERVICE_ICON_MAP[request?.service_type] || ClipboardCheck;
  const patientName = projection.patientDisplay.name;
  const patientPhone = projection.patientDisplay.phone;
  const facilityName = projection.facilityDisplay.name;
  const serviceLabel = getRequestServiceLabel(request);
  const rowAvatarClass = getRequestAvatarClass(request);
  const canonicalStatus = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  const showResponderHint = (
    (canonicalStatus === 'accepted' || canonicalStatus === 'arrived' || canonicalStatus === 'in_progress') &&
    projection.responderDisplay.hasResponder
  );
  const showCashChip = isUnsettledCashRequest(request);

  return (
    <motion.div
      layout="position"
      className={`group mb-2 grid min-h-[80px] ${selectable ? REQUEST_GRID_COLS_SELECT : REQUEST_GRID_COLS} items-center gap-2 rounded-card px-4 py-3.5 transition-[background,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'bg-card/88 shadow-e2-strong dark:bg-white/[0.08]' : 'bg-card/50 hover:-translate-y-0.5 hover:bg-card/72 hover:shadow-e2 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]'}`}
      data-request-row={request.id}
      data-state={selected ? 'selected' : 'idle'}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onView(request);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onFocus();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      aria-pressed={selected}
      aria-label={`${selected ? 'Selected' : 'Open'} ${patientName}`}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(request.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect request from ${patientName}` : `Select request from ${patientName}`}
          className="h-4 w-4"
        />
      )}
      <div className="flex min-w-0 items-center gap-3">
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-pill text-sm font-semibold ${rowAvatarClass}`}>
          <span aria-hidden="true">{getRequestInitials(patientName)}</span>
          {projection.patientDisplay.avatar && (
            <img
              src={projection.patientDisplay.avatar}
              alt=""
              className="absolute inset-0 h-full w-full rounded-pill object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={patientName}>{patientName}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={patientPhone}>{patientPhone}</div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <div className={`inline-flex max-w-full items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
          <span className="truncate" title={status.label}>{status.label}</span>
          {showResponderHint && (
            <Ambulance className="h-3 w-3 shrink-0 opacity-70" aria-label="Responder assigned" />
          )}
        </div>
        {showCashChip && (
          <span className="rounded-pill bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Cash</span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
          <ServiceIcon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium" title={serviceLabel}>{serviceLabel}</span>
      </div>

      <div className="min-w-0 truncate text-sm text-muted-foreground" title={facilityName}>{facilityName}</div>
      <div className="text-sm font-medium text-muted-foreground">{formatRequestDayTime(request.created_at)}</div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(request);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
      >
        Details
      </Button>
    </motion.div>
  );
};
