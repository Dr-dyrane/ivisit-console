import React, { useMemo } from 'react';
import {
  formatJoinedDate,
  getProviderTypeIcon,
  getUserInitials,
  getUsersKpiCount,
  getUsersProjection,
  hasActiveUserFilters,
  PINNED_USERS_KPI_IDS,
  USERS_KPI_IMPORTANCE,
  USERS_KPI_OPTIONS,
} from '../pages/users/usersPageModel';
import { TabletCollectionPage } from './TabletCollectionPage';
import { TabletPaginationFooter } from './TabletCollectionControls';

export const TabletUsers = ({
  users = [],
  statistics,
  statisticsError,
  loading = false,
  isFetching = false,
  errorMessage,
  filters = {},
  kpiFilter = 'all',
  setKpiFilter,
  focusedUser,
  onFocus,
  onView,
  onRefresh,
  onRetry,
  onSearchCommit,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen = false,
  selectable = false,
  selectedIds = [],
  allSelected = false,
  someSelected = false,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  pagination,
  detail,
}) => {
  const kpis = useMemo(() => USERS_KPI_OPTIONS.map((option) => {
    const exactCount = getUsersKpiCount(option.id, statistics);
    const visibleCount = option.id === 'all'
      ? users.length
      : users.filter((user) => user.role === option.id).length;
    return { ...option, value: exactCount ?? visibleCount };
  }), [statistics, users]);

  const records = useMemo(() => users.map((user) => {
    const projection = getUsersProjection(user);
    const TypeIcon = getProviderTypeIcon(projection.providerType);

    return {
      id: user.id,
      source: user,
      title: projection.name,
      subtitle: projection.email || projection.phone || 'No contact on file',
      meta: `${projection.verified ? 'Verified' : 'Unverified'} | ${projection.organization}`,
      trailing: formatJoinedDate(projection.joined),
      statusLabel: projection.roleMeta.label,
      statusClass: projection.roleMeta.tone,
      icon: TypeIcon,
      initials: getUserInitials(projection.name),
      iconClass: projection.roleMeta.tone,
    };
  }), [users]);

  const totalCount = Number(pagination?.totalCount);
  const hasFilter = hasActiveUserFilters(filters);

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      kpiPinnedIds={PINNED_USERS_KPI_IDS}
      kpiImportance={USERS_KPI_IMPORTANCE}
      loading={loading}
      isFetching={isFetching}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={onSearchCommit}
      searchPlaceholder="Search name, email, or role..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasFilter}
      filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedUser?.id}
      onFocus={onFocus}
      onOpen={onView}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll}
      scrollResetKey={pagination?.currentPage}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={hasFilter ? 'No matching users' : 'No users yet'}
      emptyBody={hasFilter
        ? 'Change the current filters or search again.'
        : 'Users in this scope will appear here.'}
      countLabel={`${Number.isFinite(totalCount) ? totalCount : users.length} users`}
      toolbarSlot={statisticsError ? (
        <p className="truncate text-xs font-medium text-amber-700 dark:text-amber-200">
          User totals are unavailable. Visible records remain available.
        </p>
      ) : null}
      footer={pagination?.totalPages > 1
        ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
        : null}
    />
  );
};

export default TabletUsers;
