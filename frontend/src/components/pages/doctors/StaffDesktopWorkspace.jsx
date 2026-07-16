import React, { useRef } from 'react';
import {
  CalendarClock,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  History,
  Hospital,
  IdCard,
  Info,
  Mail,
  Phone,
  Plus,
  Star,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
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
  LoadErrorState,
  Shimmer,
  SkeletonRows,
  StatusPill,
} from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  formatJoinedDate,
  getInitials,
  getStaffKpiCount,
  getStaffProjection,
  getStaffSignal,
  PINNED_STAFF_KPI_IDS,
  STAFF_EMPTY_HEADINGS,
  STAFF_GRID_COLS,
  STAFF_GRID_COLS_SELECT,
  STAFF_KPI_IMPORTANCE,
  STAFF_KPI_OPTIONS,
  staffToneClass,
} from './staffPageModel';

export const StaffDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  canManage,
  focusedStaff,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  pagination,
  sortConfig,
  onSort,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onView,
  onEdit,
  onSchedule,
  scheduleEnabled,
  onCreate,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getStaffSignal({ stats, kpiFilter, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedStaff,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-staff-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/doctors"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <StaffDetailRail
          staff={focusedStaff}
          loading={loading}
          hasFilter={hasFilter}
          canManage={canManage}
          onView={onView}
          onEdit={onEdit}
          onSchedule={onSchedule}
          scheduleEnabled={scheduleEnabled}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={staffToneClass}>
        <KpiStrip
          options={STAFF_KPI_OPTIONS}
          getCount={(id) => getStaffKpiCount(id, stats)}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_STAFF_KPI_IDS}
          importance={STAFF_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-staff-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="staff"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search staff by name, facility, or specialization..."
            searchTestId="staff-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="staff"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          role="region"
          onKeyDown={handleListKeyDown}
          aria-label="Staff list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <StaffListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Staff did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Stethoscope}
              heading={hasFilter ? 'No matching staff' : (STAFF_EMPTY_HEADINGS[kpiFilter] || 'No staff yet')}
              body={hasFilter ? 'Change filters or search again.' : 'Staff you add will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setKpiFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all staff
                </Button>
              )}
              {!hasFilter && canManage && (
                <Button
                  onClick={onCreate}
                  className="rounded-pill bg-foreground px-5 font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
                  data-testid="add-first-doctor-btn"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add staff
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((doctor) => (
            <StaffRow
              key={doctor.id}
              doctor={doctor}
              selected={focusedStaff?.id === doctor.id}
              onFocus={() => setFocused(doctor.id)}
              onView={onView}
              onEdit={onEdit}
              canManage={canManage}
              selectable={selectable}
              checked={selectedIds.includes(doctor.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const StaffListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? STAFF_GRID_COLS_SELECT : STAFF_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all staff'}
        className="h-4 w-4"
      />
    )}
    <span>Name</span>
    <span>Status</span>
    <span>Specialization</span>
    <span>Facility</span>
    <SortableColumnHeader label="Added" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const StaffRow = ({
  doctor,
  selected,
  onFocus,
  onView,
  onEdit,
  canManage,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
}) => {
  const projection = getStaffProjection(doctor);
  const StatusIcon = projection.statusMeta.icon;

  return (
    <ListRowShell
      id={doctor.id}
      dataAttrName="data-staff-row"
      gridCols={selectable ? STAFF_GRID_COLS_SELECT : STAFF_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(doctor)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(doctor.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${projection.name}` : `Select ${projection.name}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-sm font-semibold text-sky-700 dark:text-sky-200">
          {getInitials(projection.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={projection.name}>{projection.name}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={projection.email || projection.phone}>{projection.email || projection.phone || 'No contact'}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={projection.statusMeta.label} icon={StatusIcon} className={projection.statusMeta.tone} compact />
        {projection.caseload && (
          <div className="mt-1 truncate text-xs text-muted-foreground" title={`Caseload ${projection.caseload}`}>
            Caseload {projection.caseload}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium capitalize" title={projection.specialization}>{projection.specialization}</div>
        {projection.ratingChip && (
          <span
            className="mt-1 inline-flex max-w-full items-center gap-1 rounded-pill bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-200"
            title={`Rating ${projection.ratingChip}`}
          >
            <Star className="h-3 w-3 shrink-0" />
            <span className="truncate">{projection.ratingChip}</span>
          </span>
        )}
      </div>
      <div className="min-w-0 truncate text-sm text-muted-foreground" title={projection.facility}>{projection.facility}</div>
      <div className="text-sm font-medium text-muted-foreground">{formatJoinedDate(projection.joined)}</div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(doctor); }}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${projection.name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onEdit(doctor); }}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Edit ${projection.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ListRowShell>
  );
};

const RailActionButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

export const StaffDetailRail = ({
  staff,
  loading,
  hasFilter,
  canManage,
  onView,
  onEdit,
  onSchedule,
  scheduleEnabled,
  embedded = false,
}) => {
  if (loading) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 flex items-center gap-4">
          <Shimmer className="h-14 w-14 shrink-0 rounded-pill" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-5 w-2/3 rounded-inner" />
            <Shimmer className="h-4 w-1/2 rounded-inner" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (<Shimmer key={index} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!staff) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <UserRound className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No staff member selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Staff that match your filters will appear here.' : 'Select a staff member to see their details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const projection = getStaffProjection(staff);
  const StatusIcon = projection.statusMeta.icon;

  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Staff details</h2>
            {projection.displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={projection.displayId}>{projection.displayId}</p>
                <CopyChip value={projection.displayId} label="Copy staff ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${projection.statusMeta.tone}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {projection.statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(staff)}
            aria-label="Open full staff details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-lg font-semibold text-sky-700 dark:text-sky-200">
            {getInitials(projection.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.name}>{projection.name}</h3>
            <p className="mt-1 truncate text-sm capitalize text-muted-foreground" title={projection.specialization}>{projection.specialization}</p>
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Stethoscope} label="Specialization" value={projection.specialization} />
        <DetailLine icon={Hospital} label="Facility" value={projection.facility} />
        <DetailLine icon={staff.phone ? Phone : Mail} label="Contact" value={projection.contact} />
        {projection.experience != null && (
          <DetailLine icon={IdCard} label="Experience" value={`${projection.experience} year${projection.experience === 1 ? '' : 's'}`} />
        )}
        {projection.caseload && (
          <DetailLine icon={Users} label="Caseload" value={projection.caseload} />
        )}
        {projection.ratingChip && (
          <DetailLine icon={Star} label="Rating" value={projection.ratingChip} />
        )}
        <DetailLine icon={Clock} label="Joined" value={formatJoinedDate(projection.joined)} />
        {projection.updatedAgo && (
          <DetailLine icon={History} label="Updated" value={projection.updatedAgo} />
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(staff)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {canManage && (
          <div className="grid grid-cols-2 gap-3">
            <RailActionButton icon={Edit} label="Edit" onClick={() => onEdit(staff)} />
            {scheduleEnabled ? (
              <RailActionButton icon={CalendarClock} label="Schedule" onClick={() => onSchedule(staff)} />
            ) : (
              <RailActionButton icon={Info} label="Open record" onClick={() => onView(staff)} />
            )}
          </div>
        )}

        {!canManage && (
          <div
            role="note"
            className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            <UserRound className="h-4 w-4 shrink-0" />
            Staff changes are not available for your account.
          </div>
        )}
      </div>
    </DetailRailShell>
  );
};
