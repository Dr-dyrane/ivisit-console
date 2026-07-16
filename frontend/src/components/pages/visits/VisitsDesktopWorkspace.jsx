import React, { useRef } from 'react';
import {
  Calendar,
  CalendarClock,
  ChevronRight,
  Clock,
  Edit,
  GraduationCap,
  History,
  Hospital,
  Info,
  MapPin,
  Phone,
  Plus,
  Siren,
  Stethoscope,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  DetailRailShell,
  RailInsetHero,
  WorkspaceStage,
} from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import {
  ActivitySheet,
  ListRowShell,
  SheetToolbar,
  SortableColumnHeader,
} from '../../console/ActivitySheet';
import {
  CopyChip,
  DetailLine,
  EmptyState,
  ErrorBanner,
  LoadErrorState,
  Shimmer,
  SkeletonRows,
  StageStrip,
  StatusPill,
  TonedAvatar,
} from '../../console/primitives';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
import { formatDayTime } from '../../../utils/dayTime';
import { formatVisitInFacilityTimezone } from '../../../services/visits/normalization';
import {
  formatVisitType,
  getVisitCareTeamDisplay,
  getVisitFacilityLabel,
  getVisitPatientLabel,
} from '../../../utils/visitRowProjection';
import {
  getScheduledClinicalWindow,
  getScheduledLifecycleChip,
  getVisitCareTeamMeta,
  getVisitPatientContact,
  getVisitRecordUpdatedRelative,
} from './visitEvidencePresentation';
import {
  PINNED_VISIT_STATE_IDS,
  VISIT_EMPTY_HEADINGS,
  VISIT_KPI_IMPORTANCE,
  VISIT_STAGE_FILL,
  VISIT_STAGE_ORDER,
  getVisitAvatarClass,
  getVisitSignal,
  getVisitStateCount,
  hasActiveVisitFilters,
  visitStateOptions,
  visitStatusIcon,
  visitStatusLabel,
  visitStatusPillClass,
  visitToneClass,
} from './visitPageModel';

export const VisitsDesktopWorkspace = ({
  visits,
  loading,
  isFetching = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedVisit,
  setFocusedVisitId,
  canEdit,
  canCreate,
  onView,
  onEdit,
  onManageScheduledVisit,
  canManageScheduledVisit,
  viewMode = 'all',
  onViewModeChange,
  scheduledViewEnabled = false,
  onCreate,
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
  const signal = getVisitSignal({ stats, visits, kpiFilter, loadError });
  const hasFilter = hasActiveVisitFilters(filters);
  const failedEmpty = Boolean(loadError) && visits.length === 0;
  const listScrollRef = useRef(null);

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items: visits,
    focusedItem: focusedVisit,
    setFocusedId: setFocusedVisitId,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-visit-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/visits"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <VisitsDetailRail
          visit={focusedVisit}
          loading={loading}
          canEdit={canEdit}
          onView={onView}
          onEdit={onEdit}
          onManageScheduledVisit={onManageScheduledVisit}
          canManageScheduledVisit={canManageScheduledVisit}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={visitToneClass}>
        <KpiStrip
          options={visitStateOptions}
          getCount={(id) => getVisitStateCount({ id, stats, visits })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_VISIT_STATE_IDS}
          importance={VISIT_KPI_IMPORTANCE}
          dataAttr="data-visit-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="visits"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            searchPlaceholder={viewMode === 'scheduled'
              ? 'Search by ID, facility, clinician, or type...'
              : 'Search by ID, type, facility, practitioner, or room...'}
            searchTestId="visits-sheet-search"
            onRefresh={onRefresh}
            refreshing={isFetching}
            refreshNoun="visits"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
            primarySlot={scheduledViewEnabled ? (
              <VisitLaneToggle viewMode={viewMode} onChange={onViewModeChange} />
            ) : null}
          />
        )}
        errorBanner={loadError && !failedEmpty ? (
          <ErrorBanner
            title="Visits could not load"
            message={loadError}
            onRetry={onRetry}
            testId="visits-error-state"
          />
        ) : null}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          role="region"
          onKeyDown={handleListKeyDown}
          aria-label="Visits list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          {loading && <SkeletonRows />}

          {!loading && failedEmpty && (
            <LoadErrorState title="Visits did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !failedEmpty && (
            <>
              <VisitListHeader
                sortConfig={sortConfig}
                onSort={onSort}
                selectable={selectable}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={onSelectAll}
                viewMode={viewMode}
              />

              {visits.length === 0 && !loadError && (
                <EmptyState
                  icon={Calendar}
                  heading={hasFilter ? 'No matching visits' : (VISIT_EMPTY_HEADINGS[kpiFilter] || 'No visits yet')}
                  body={hasFilter ? 'Change filters or search again.' : 'No visit records are available in this scope.'}
                >
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      onClick={() => setFilters({})}
                      className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
                    >
                      Show all visits
                    </Button>
                  )}
                  {canCreate && !hasFilter && (
                    <Button
                      onClick={onCreate}
                      data-testid="add-first-visit-btn"
                      aria-label="Schedule your first visit"
                      className="h-10 rounded-button bg-foreground px-4 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule first visit
                    </Button>
                  )}
                </EmptyState>
              )}

              {visits.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  selected={focusedVisit?.id === visit.id}
                  onFocus={() => setFocusedVisitId(visit.id)}
                  onView={onView}
                  selectable={selectable}
                  checked={selectedIds.includes(visit.id)}
                  onToggleSelect={onToggleSelect}
                  onSelectClick={onSelectClick}
                  viewMode={viewMode}
                />
              ))}
            </>
          )}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const VISIT_GRID_COLS = 'grid-cols-[minmax(130px,1.1fr)_minmax(86px,auto)_minmax(92px,0.7fr)_minmax(110px,0.9fr)_minmax(105px,0.9fr)_minmax(105px,auto)_72px]';
const VISIT_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(130px,1.1fr)_minmax(86px,auto)_minmax(92px,0.7fr)_minmax(110px,0.9fr)_minmax(105px,0.9fr)_minmax(105px,auto)_72px]';

const VisitLaneToggle = ({ viewMode, onChange }) => (
  <div className="flex h-12 items-center gap-1 rounded-button bg-muted/30 p-1" role="group" aria-label="Visit source view">
    <button type="button" onClick={() => onChange('all')} aria-pressed={viewMode === 'all'} className={`h-10 rounded-inner px-3 text-xs font-semibold transition-colors ${viewMode === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>All</button>
    <button type="button" onClick={() => onChange('scheduled')} aria-pressed={viewMode === 'scheduled'} className={`flex h-10 items-center rounded-inner px-3 text-xs font-semibold transition-colors ${viewMode === 'scheduled' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
      <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Scheduled
    </button>
  </div>
);

const VisitListHeader = ({
  sortConfig,
  onSort,
  selectable = false,
  allSelected = false,
  someSelected = false,
  onSelectAll,
  viewMode = 'all',
}) => (
  <div className={`grid ${selectable ? VISIT_GRID_COLS_SELECT : VISIT_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all visits'}
        className="h-4 w-4"
      />
    )}
    <span>Patient</span>
    <span>Status</span>
    <span>{viewMode === 'scheduled' ? 'Care mode' : 'Type'}</span>
    <span>Facility</span>
    <span>Clinician</span>
    <SortableColumnHeader label="Time" sortKey={viewMode === 'scheduled' ? 'scheduled_start_at' : 'date'} sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const VisitRow = ({
  visit,
  selected,
  onFocus,
  onView,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
  viewMode = 'all',
}) => {
  const patientName = getVisitPatientLabel(visit);
  const patientEmail = visit?.patient?.email || null;
  const facilityName = visit?.hospital_name
    || (visit?.hospital_id ? getVisitFacilityLabel(visit) : 'Unknown facility');
  const statusKey = visit?.status || 'scheduled';

  return (
    <ListRowShell
      id={visit.id}
      dataAttrName="data-visit-row"
      gridCols={selectable ? VISIT_GRID_COLS_SELECT : VISIT_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(visit)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(visit.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect visit for ${patientName}` : `Select visit for ${patientName}`}
          className="h-4 w-4"
        />
      )}
      <span className="flex min-w-0 items-center gap-3">
        <TonedAvatar name={patientName} className={getVisitAvatarClass(visit)} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{patientName}</span>
          {patientEmail && (
            <span className="block truncate text-xs text-muted-foreground">{patientEmail}</span>
          )}
        </span>
      </span>

      <span>
        <StatusPill
          compact
          label={visitStatusLabel[statusKey] || statusKey}
          className={visitStatusPillClass[statusKey] || visitStatusPillClass.scheduled}
        />
      </span>

      <span className="truncate text-sm text-foreground/85">{visit.sourceKind === 'scheduled_visit' ? visit.careModeLabel : formatVisitType(visit)}</span>
      <span className="truncate text-sm text-muted-foreground">{facilityName}</span>
      <span className="truncate text-sm text-muted-foreground">{getVisitDoctorLabel(visit)}</span>
      <span className="text-sm tabular-nums text-muted-foreground">
        {viewMode === 'scheduled' || visit.sourceKind === 'scheduled_visit'
          ? formatVisitInFacilityTimezone(visit)
          : formatDayTime(visit.date || visit.created_at)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onView(visit);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
        aria-label={`View visit for ${patientName}`}
      >
        Details
      </Button>
    </ListRowShell>
  );
};

const getVisitDoctorLabel = (visit) => (
  visit?.assignedDoctor?.name
  || visit?.doctor?.name
  || visit?.doctor
  || visit?.doctor_name
  || 'Unassigned'
);

export const VisitsDetailRail = ({
  visit,
  loading,
  canEdit,
  onView,
  onEdit,
  onManageScheduledVisit,
  canManageScheduledVisit,
  activeActionFeedback,
  embedded = false,
}) => {
  if (loading) {
    return (
      <DetailRailShell embedded={embedded}>
        <Shimmer className="h-5 w-28 rounded-pill" />
        <Shimmer className="mt-6 h-24 rounded-card" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
        </div>
      </DetailRailShell>
    );
  }

  if (!visit) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Info className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No visit selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visits will appear here when the list has results.</p>
        </div>
      </DetailRailShell>
    );
  }

  const statusKey = visit.status || 'scheduled';
  const StatusIcon = visitStatusIcon[statusKey] || Clock;
  const railCancelled = statusKey === 'cancelled';
  const railStageIndex = Math.max(0, VISIT_STAGE_ORDER.indexOf(statusKey));
  const railStageFill = VISIT_STAGE_FILL[statusKey] || 'bg-foreground/60';
  const displayId = visit.display_id || null;
  const patientName = getVisitPatientLabel(visit);
  const patientEmail = visit?.patient?.email || null;
  const roomLabel = visit.sourceKind === 'scheduled_visit'
    ? visit.careModeLabel
    : visit.room_number ? `Room ${visit.room_number}` : 'No room';
  const dateLabel = visit.sourceKind === 'scheduled_visit'
    ? formatVisitInFacilityTimezone(visit)
    : formatDayTime(visit.date || visit.created_at);
  const careTeam = getVisitCareTeamDisplay(visit);
  // ADOPT-33/34 read-surfacing: already-fetched lifecycle, window, and
  // contact/specialty truth; each renders only when the join data arrived.
  const lifecycleChip = getScheduledLifecycleChip(visit);
  const clinicalWindow = getScheduledClinicalWindow(visit);
  const patientContact = getVisitPatientContact(visit);
  const careTeamMeta = getVisitCareTeamMeta(visit);
  // ADOPT-65: display-only last-updated line; the sortable Time header stays
  // date/scheduled_start_at (one sortable Time header per page, estate law).
  const recordUpdated = getVisitRecordUpdatedRelative(visit);
  const viewOpening = activeActionFeedback === `view-${visit.id}`;
  const editOpening = activeActionFeedback === `edit-${visit.id}`;

  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Visit details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={displayId} label="Copy record ID" />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill
                icon={StatusIcon}
                label={visitStatusLabel[statusKey] || statusKey}
                className={visitStatusPillClass[statusKey] || visitStatusPillClass.scheduled}
              />
              {lifecycleChip && (
                <span data-testid="visit-lifecycle-chip">
                  <StatusPill
                    compact
                    label={lifecycleChip.chipLabel}
                    className={lifecycleChip.className}
                  />
                </span>
              )}
            </div>
            <StageStrip
              order={VISIT_STAGE_ORDER}
              fillClass={railStageFill}
              activeIndex={railStageIndex}
              muted={railCancelled}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(visit)}
            aria-label="Open full visit details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <TonedAvatar name={patientName} className={getVisitAvatarClass(visit)} size="h-14 w-14" textSize="text-lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">{patientName}</p>
            <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              {dateLabel}
            </p>
            {patientEmail && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{patientEmail}</p>
            )}
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-3">
        <DetailLine icon={Calendar} label={visit.sourceKind === 'scheduled_visit' ? 'Care mode' : 'Type'} value={visit.sourceKind === 'scheduled_visit' ? visit.careModeLabel : formatVisitType(visit)} />
        <DetailLine icon={careTeam.kind === 'responder' ? Siren : Stethoscope} label={careTeam.detailLabel} value={careTeam.name} />
        {careTeamMeta.specialty && (
          <DetailLine icon={GraduationCap} label="Specialty" value={careTeamMeta.specialty} />
        )}
        {careTeamMeta.contact && (
          <DetailLine icon={Phone} label="Responder contact" value={careTeamMeta.contact} />
        )}
        {patientContact && (
          <DetailLine icon={Phone} label="Patient contact" value={patientContact} />
        )}
        <DetailLine icon={Hospital} label="Facility" value={getVisitFacilityLabel(visit)} />
        <DetailLine icon={MapPin} label="Location" value={roomLabel} />
        <DetailLine icon={Clock} label="Scheduled" value={dateLabel} />
        {clinicalWindow && (
          <DetailLine icon={CalendarClock} label="Clinical window" value={clinicalWindow} />
        )}
        {visit.asyncConsultAvailability && (
          <DetailLine icon={CalendarClock} label="Async consult" value={visit.asyncConsultAvailability} />
        )}
        {recordUpdated && (
          <DetailLine icon={History} label="Updated" value={recordUpdated} />
        )}
      </div>

      <div className="mt-5 space-y-2">
        <Button
          onClick={() => onView(visit)}
          className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
          aria-busy={viewOpening}
          data-state={viewOpening ? 'opening' : 'idle'}
        >
          <Info className="mr-2 h-4 w-4" />
          {viewOpening ? 'Opening...' : 'Details'}
          <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            onClick={() => onEdit(visit)}
            className={`h-12 w-full rounded-card bg-muted/26 text-sm font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${editOpening ? 'bg-foreground/10 scale-95' : ''}`}
            aria-busy={editOpening}
            data-state={editOpening ? 'opening' : 'idle'}
          >
            <Edit className="mr-2 h-4 w-4" />
            {editOpening ? 'Opening...' : 'Edit'}
          </Button>
        )}
        {canManageScheduledVisit?.(visit) && (
          <Button
            variant="ghost"
            onClick={() => onManageScheduledVisit(visit)}
            className="h-12 w-full rounded-card bg-cyan-500/10 text-sm font-semibold text-cyan-800 transition-all hover:bg-cyan-500/15 active:scale-95 dark:text-cyan-100"
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Manage scheduled visit
          </Button>
        )}
        <p className="px-2 pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          Outcome and delete actions are locked for now.
        </p>
      </div>
    </DetailRailShell>
  );
};
