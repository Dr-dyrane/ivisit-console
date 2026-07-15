import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import {
  getOrganizationStateCount,
  getOrganizationStatusMeta,
  hasActiveOrganizationFilters,
  formatOrganizationWallet,
} from '../pages/organizations/organizationPageModel';
import {
  ORGANIZATION_KPI_IMPORTANCE,
  ORGANIZATION_KPI_OPTIONS,
  PINNED_ORGANIZATION_KPI_IDS,
} from '../pages/organizations/organizationPresentation';
import { TabletCollectionPage } from './TabletCollectionPage';
import { TabletPaginationFooter } from './TabletCollectionControls';
import { formatTabletDateTime } from './tabletFormatters';

export const TabletOrganizations = ({
  organizations = [], loading, isFetching, stats, filters = {}, setFilters,
  kpiFilter = 'all', setKpiFilter, focusedOrganization, onFocus, onView,
  onRefresh, onRetry, loadError, onOpenFilters, filterSheetOpen = false, onViewAnalytics,
  selectable, selectedIds, onToggleSelect, onSelectClick, onSelectAll, allSelected, someSelected,
  pagination, detail,
}) => {
  const kpis = useMemo(() => ORGANIZATION_KPI_OPTIONS.map((option) => ({
    ...option,
    value: getOrganizationStateCount({ id: option.id, stats, organizations }),
  })), [organizations, stats]);
  const records = useMemo(() => organizations.map((organization) => {
    const status = getOrganizationStatusMeta(Boolean(organization.is_active));
    return {
      id: organization.id,
      source: organization,
      title: organization.name || 'Unnamed organization',
      subtitle: organization.email || organization.contact_email || 'No contact email',
      meta: formatOrganizationWallet(organization.wallet_balance),
      trailing: formatTabletDateTime(organization.created_at),
      statusLabel: status.label,
      statusClass: status.tone,
      icon: Building2,
      iconClass: status.tone,
    };
  }), [organizations]);

  return (
    <TabletCollectionPage
      detail={detail} records={records} kpis={kpis} activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      kpiPinnedIds={PINNED_ORGANIZATION_KPI_IDS} kpiImportance={ORGANIZATION_KPI_IMPORTANCE}
      loading={loading} isFetching={isFetching}
      error={loadError} onRetry={onRetry} onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.({ ...filters, search: value })}
      searchPlaceholder="Search organization, email, Stripe ID..." onOpenFilters={onOpenFilters}
      filtersActive={hasActiveOrganizationFilters(filters, kpiFilter)} filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedOrganization?.id} onFocus={onFocus} onOpen={onView}
      selectable={selectable} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll} allSelected={allSelected} someSelected={someSelected}
      emptyTitle="No organizations found" emptyBody="Organizations in this scope will appear here."
      countLabel={`${stats?.total ?? organizations.length} organizations`}
      scrollResetKey={pagination?.currentPage}
      footer={pagination?.totalPages > 1
        ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
        : null}
    />
  );
};

export default TabletOrganizations;
