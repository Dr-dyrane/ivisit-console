import React, { useRef } from 'react';
import {
  Edit,
  Eye,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
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
  SkeletonRows,
  StatusPill,
} from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  formatJoinedDate,
  getProviderTypeIcon,
  getUserInitials,
  getUsersKpiCount,
  getUsersProjection,
  getUsersSignal,
  PINNED_USERS_KPI_IDS,
  USERS_EMPTY_HEADINGS,
  USERS_GRID_COLS,
  USERS_GRID_COLS_SELECT,
  USERS_KPI_IMPORTANCE,
  USERS_KPI_OPTIONS,
  usersToneClass,
} from './usersPageModel';
import { UsersDetailRail } from './UsersDetailRail';

const UsersStatsUnavailable = ({ message, onRetry, retrying }) => (
  <div
    role="status"
    className="mt-5 flex max-w-2xl items-center justify-between gap-4 rounded-inner bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100"
    data-testid="users-statistics-degraded-state"
  >
    <div className="flex min-w-0 items-center gap-3">
      <ShieldAlert className="h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Exact totals unavailable</p>
        <p className="mt-0.5 text-xs opacity-75">{message}</p>
      </div>
    </div>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      disabled={retrying}
      aria-busy={retrying}
      className="h-9 shrink-0 rounded-button bg-background/55 px-3 text-xs font-semibold text-foreground hover:bg-background/80"
    >
      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
      {retrying ? 'Retrying' : 'Retry'}
    </Button>
  </div>
);

export const UsersDesktopWorkspace = ({
  items,
  stats,
  statisticsError,
  loading,
  isFetching,
  loadError,
  canManage,
  focusedUser,
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
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getUsersSignal({ stats, kpiFilter, loadError, statisticsError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedUser,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-user-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/users"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <UsersDetailRail
          user={focusedUser}
          loading={loading}
          hasFilter={hasFilter}
          canManage={canManage}
          onView={onView}
          onEdit={onEdit}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={usersToneClass}>
        {loadError ? null : statisticsError ? (
          <UsersStatsUnavailable
            message={statisticsError}
            onRetry={onRetry}
            retrying={isFetching}
          />
        ) : (
          <KpiStrip
            options={USERS_KPI_OPTIONS}
            getCount={(id) => getUsersKpiCount(id, stats)}
            kpiFilter={kpiFilter}
            setKpiFilter={setKpiFilter}
            loading={loading}
            isFetching={isFetching}
            pinnedIds={PINNED_USERS_KPI_IDS}
            importance={USERS_KPI_IMPORTANCE}
            defaultId="all"
            dataAttr="data-users-state"
          />
        )}
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="users"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search users by name, email, or phone..."
            searchTestId="users-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="users"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          role="list"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Users list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <UsersListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Users did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Users}
              heading={hasFilter ? 'No matching users' : (USERS_EMPTY_HEADINGS[kpiFilter] || 'No users yet')}
              body={hasFilter ? 'Change filters or search again.' : 'User records for this scope will appear here.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setKpiFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all users
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              selected={focusedUser?.id === user.id}
              onFocus={() => setFocused(user.id)}
              onView={onView}
              onEdit={onEdit}
              canManage={canManage}
              selectable={selectable}
              checked={selectedIds.includes(user.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const UsersListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? USERS_GRID_COLS_SELECT : USERS_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all users'}
        className="h-4 w-4"
      />
    )}
    <span>Name</span>
    <span>Role</span>
    <span>Verified</span>
    <span>Organization</span>
    <SortableColumnHeader label="Joined" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const UserRow = ({
  user,
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
  const projection = getUsersProjection(user);
  const isProvider = projection.role === 'provider';
  const TypeIcon = getProviderTypeIcon(projection.providerType);

  return (
    <ListRowShell
      id={user.id}
      dataAttrName="data-user-row"
      gridCols={selectable ? USERS_GRID_COLS_SELECT : USERS_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(user)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(user.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${projection.name}` : `Select ${projection.name}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-muted/40 text-sm font-semibold text-foreground">
          {getUserInitials(projection.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={projection.name}>{projection.name}</div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate" title={projection.email || projection.phone}>{projection.email || projection.phone || 'No contact'}</span>
            {isProvider && projection.providerType && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] capitalize text-muted-foreground/80">
                <TypeIcon className="h-3 w-3" />
                {projection.providerType}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={projection.roleMeta.label} icon={Shield} className={projection.roleMeta.tone} compact />
      </div>

      <div className="min-w-0">
        {projection.verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-foreground/[0.055] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/[0.06]">
            <Shield className="h-3.5 w-3.5" />
            Unverified
          </span>
        )}
      </div>

      <div className="min-w-0 truncate text-sm text-muted-foreground" title={projection.organization}>{projection.organization}</div>
      <div className="text-sm font-medium text-muted-foreground">{formatJoinedDate(projection.joined)}</div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(user); }}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${projection.name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onEdit(user); }}
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
