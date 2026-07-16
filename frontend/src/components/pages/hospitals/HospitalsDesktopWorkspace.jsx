import React, { useRef } from 'react';
import { Ambulance, BadgeCheck, Bed, Hospital } from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
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
  ErrorBanner,
  LoadErrorState,
  Shimmer,
  SkeletonRows,
  StatusPill,
} from '../../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
import { formatDayTime } from '../../../utils/dayTime';
import {
  formatHospitalWait,
  getHospitalRowMarker,
  getHospitalSignal,
  getHospitalStateCount,
  hasActiveHospitalFilters,
  HOSPITAL_EMPTY_HEADINGS,
  HOSPITAL_KPI_IMPORTANCE,
  normalizeHospitalCount,
  PINNED_HOSPITAL_STATE_IDS,
} from './hospitalPageModel';
import {
  HOSPITAL_GRID_COLS,
  HOSPITAL_GRID_COLS_SELECT,
  HOSPITAL_PROVIDER_KIND_LABEL,
  HOSPITAL_ROW_MARKER_CLASS,
  HOSPITAL_ROW_MARKER_LABEL,
  hospitalSignalIcon,
  hospitalStateOptions,
  hospitalStatusLabel,
  hospitalStatusPillClass,
  hospitalToneClass,
} from './hospitalPresentation';
import { HospitalAvatar } from './HospitalAvatar';
import { HospitalDetailRail } from './HospitalDetailRail';

export const HospitalsDesktopWorkspace = ({
  hospitals,
  loading,
  isFetching = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedHospital,
  setFocused,
  isFocused,
  setKeyboardFocusedId,
  canEditFocused,
  onView,
  onEdit,
  onClearFilters,
  pagination,
  openFilters,
  filterSheetOpen,
  loadError,
  onRetry,
  onRefresh,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  sortConfig,
  onSort,
  activeActionFeedback,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  allSelected = false,
  someSelected = false,
}) => {
  const signalModel = getHospitalSignal({ stats, hospitals, kpiFilter, loadError });
  const signal = {
    ...signalModel,
    icon: hospitalSignalIcon[signalModel.iconKey] || Hospital,
  };
  const hasFilter = hasActiveHospitalFilters(filters);
  const failedEmpty = Boolean(loadError) && hospitals.length === 0;
  const listScrollRef = useRef(null);

  const visibleBeds = normalizeHospitalCount(
    stats?.visibleBeds,
    hospitals.reduce((sum, hospital) => sum + (Number(hospital.available_beds) || 0), 0)
  );
  const visibleFleet = normalizeHospitalCount(
    stats?.visibleAmbulances,
    hospitals.reduce((sum, hospital) => sum + (Number(hospital.ambulances_count) || 0), 0)
  );

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: hospitals,
    focusedItem: focusedHospital,
    setFocusedId: setKeyboardFocusedId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-hospital-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/hospitals"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <HospitalDetailRail
          hospital={focusedHospital}
          loading={loading}
          hasFilter={hasFilter}
          canEdit={canEditFocused}
          onView={onView}
          onEdit={onEdit}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={hospitalToneClass}>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
          {loading ? (
            <>
              <Shimmer className="h-8 w-36 rounded-pill" />
              <Shimmer className="h-8 w-36 rounded-pill" />
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <Bed className="h-4 w-4 text-amber-600 dark:text-amber-200" />
                Visible beds
                <strong className="text-foreground">{visibleBeds}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
                <Ambulance className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
                Visible fleet
                <strong className="text-foreground">{visibleFleet}</strong>
              </span>
            </>
          )}
        </div>

        <KpiStrip
          options={hospitalStateOptions}
          getCount={(id) => getHospitalStateCount({ id, stats, hospitals })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_HOSPITAL_STATE_IDS}
          importance={HOSPITAL_KPI_IMPORTANCE}
          dataAttr="data-hospital-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="hospitals"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            searchPlaceholder="Search by name, address, ID, or phone..."
            searchTestId="hospitals-sheet-search"
            onRefresh={onRefresh}
            refreshing={isFetching}
            refreshNoun="hospitals"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
        errorBanner={loadError && !failedEmpty ? (
          <ErrorBanner
            title="Hospitals could not load"
            message={loadError}
            onRetry={onRetry}
            testId="hospitals-error-state"
          />
        ) : null}
      >
        <div
          ref={listScrollRef}
          role="region"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Hospitals list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          {loading && <SkeletonRows />}

          {!loading && failedEmpty && (
            <LoadErrorState title="Hospitals did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !failedEmpty && (
            <>
              <HospitalListHeader
                sortConfig={sortConfig}
                onSort={onSort}
                selectable={selectable}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={onSelectAll}
              />

              {hospitals.length === 0 && !loadError && (
                <EmptyState
                  icon={Hospital}
                  heading={hasFilter ? 'No matching hospitals' : (HOSPITAL_EMPTY_HEADINGS[kpiFilter] || 'No hospitals found')}
                  body={hasFilter ? 'Try a different search or clear the current filters.' : 'Try a different filter or refresh the facility list.'}
                >
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      onClick={onClearFilters}
                      className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
                    >
                      Clear filters
                    </Button>
                  )}
                </EmptyState>
              )}

              {hospitals.map((hospital) => (
                <HospitalRow
                  key={hospital.id}
                  hospital={hospital}
                  selected={isFocused(hospital.id)}
                  onFocus={() => setFocused(hospital.id)}
                  onView={onView}
                  selectable={selectable}
                  checked={selectedIds.includes(hospital.id)}
                  onToggleSelect={onToggleSelect}
                  onSelectClick={onSelectClick}
                />
              ))}
            </>
          )}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const HospitalListHeader = ({
  sortConfig,
  onSort,
  selectable = false,
  allSelected = false,
  someSelected = false,
  onSelectAll,
}) => (
  <div className={`grid ${selectable ? HOSPITAL_GRID_COLS_SELECT : HOSPITAL_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all facilities'}
        className="h-4 w-4"
      />
    )}
    <span>Facility</span>
    <span>Status</span>
    <span>Beds</span>
    <span>Wait</span>
    <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const HospitalRow = ({
  hospital,
  selected,
  onFocus,
  onView,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
}) => {
  const statusKey = String(hospital?.status || 'available').toLowerCase();
  const statusLabel = hospitalStatusLabel[statusKey] || statusKey.replace(/_/g, ' ');
  const facilityName = hospital.name || 'Unnamed hospital';
  // Provenance chip only when it carries dispatch signal (demo, non-hospital
  // kind, unreviewed import); unknown provenance renders nothing.
  const rowMarker = getHospitalRowMarker(hospital);
  const rowMarkerLabel = rowMarker
    ? (rowMarker.key === 'kind'
      ? (HOSPITAL_PROVIDER_KIND_LABEL[rowMarker.kindKey] || rowMarker.kindKey.replace(/_/g, ' '))
      : HOSPITAL_ROW_MARKER_LABEL[rowMarker.key])
    : null;

  return (
    <ListRowShell
      id={hospital.id}
      dataAttrName="data-hospital-row"
      gridCols={selectable ? HOSPITAL_GRID_COLS_SELECT : HOSPITAL_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(hospital)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(hospital.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${facilityName}` : `Select ${facilityName}`}
          className="h-4 w-4"
        />
      )}
      <span className="flex min-w-0 items-center gap-3">
        <HospitalAvatar hospital={hospital} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground" title={facilityName}>{facilityName}</span>
            {hospital.verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-300" aria-label="Verified facility" />
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{hospital.address || 'No address provided'}</span>
        </span>
      </span>

      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <StatusPill
          compact
          label={statusLabel}
          className={hospitalStatusPillClass[statusKey] || 'bg-muted/40 text-muted-foreground'}
        />
        {rowMarker && (
          <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${HOSPITAL_ROW_MARKER_CLASS[rowMarker.key]}`}>
            {rowMarkerLabel}
          </span>
        )}
      </span>

      <span className="text-sm tabular-nums text-foreground/85">
        {normalizeHospitalCount(hospital.available_beds, 0)}
      </span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {formatHospitalWait(hospital.emergency_wait_time_minutes)}
      </span>

      <span className="text-sm tabular-nums text-muted-foreground">
        {formatDayTime(hospital.created_at)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(hospital);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
        aria-label={`View details for ${facilityName}`}
      >
        Details
      </Button>
    </ListRowShell>
  );
};
