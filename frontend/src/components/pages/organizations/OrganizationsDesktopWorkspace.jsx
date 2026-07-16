import React, { useRef } from 'react';
import { Building2, Eye } from 'lucide-react';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
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
  LoadErrorState,
  SkeletonRows,
  StatusPill,
} from '../../console/primitives';
import {
  formatOrganizationDate,
  formatOrganizationWallet,
  getOrganizationStateCount,
  getOrganizationVerificationMeta,
} from './organizationPageModel';
import {
  getOrganizationSignal,
  ORGANIZATION_GRID_COLS,
  ORGANIZATION_GRID_COLS_SELECT,
  ORGANIZATION_KPI_IMPORTANCE,
  ORGANIZATION_KPI_OPTIONS,
  organizationToneClass,
  PINNED_ORGANIZATION_KPI_IDS,
} from './organizationPresentation';
import { OrganizationDetailRail } from './OrganizationDetailRail';

const OrganizationsListHeader = ({
  selectable = false,
  allSelected = false,
  someSelected = false,
  onSelectAll,
  sortConfig,
  onSort,
}) => (
  <div className={`grid ${selectable ? ORGANIZATION_GRID_COLS_SELECT : ORGANIZATION_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all organizations'}
        className="h-4 w-4"
      />
    )}
    <span>Name</span>
    <span>Verification</span>
    <span>Wallet</span>
    <SortableColumnHeader
      label="Added"
      sortKey="created_at"
      sortConfig={sortConfig}
      onSort={onSort}
    />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const OrganizationRow = ({
  organization,
  selected,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
  onFocus,
  onView,
  activeActionFeedback,
}) => {
  // ADOPT-26: row status is the live organizations.verification_status gate
  // (dispatch requires 'verified'), not the degenerate is_active flag.
  const verificationMeta = getOrganizationVerificationMeta(organization);
  const name = organization.name || 'Unnamed organization';

  return (
    <ListRowShell
      id={organization.id}
      dataAttrName="data-organization-row"
      gridCols={selectable ? ORGANIZATION_GRID_COLS_SELECT : ORGANIZATION_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(organization)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(organization.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${name}` : `Select ${name}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${verificationMeta.tone}`}>
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={name}>
            {name}
          </div>
          <div
            className="mt-1 truncate text-xs text-muted-foreground"
            title={organization.contact_email || undefined}
          >
            {organization.contact_email || 'No contact email'}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={verificationMeta.label} className={verificationMeta.tone} compact />
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatOrganizationWallet(organization.wallet_balance, organization.wallet_currency)}
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatOrganizationDate(organization.created_at)}
      </div>

      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onView(organization);
          }}
          data-state={activeActionFeedback === `view-${organization.id}` ? 'opening' : 'idle'}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </ListRowShell>
  );
};

export const OrganizationsDesktopWorkspace = ({
  items,
  stats,
  loading,
  isFetching,
  loadError,
  focusedOrg,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  onClearFilters,
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
  activeActionFeedback,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getOrganizationSignal({
    stats,
    organizations: items,
    kpiFilter,
    loadError,
    hasAny,
  });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedOrg,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-organization-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/organizations"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <OrganizationDetailRail
          organization={focusedOrg}
          loading={loading}
          hasFilter={hasFilter}
          onView={onView}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={organizationToneClass}>
        <KpiStrip
          options={ORGANIZATION_KPI_OPTIONS}
          getCount={(id) => getOrganizationStateCount({ id, stats, organizations: items })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_ORGANIZATION_KPI_IDS}
          importance={ORGANIZATION_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-organization-state"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="organizations"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search registry by name, email, or Stripe ID..."
            searchTestId="organizations-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="organizations"
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
          aria-label="Organizations list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
          data-testid="organizations-list"
        >
          <OrganizationsListHeader
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Organizations did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Building2}
              heading={hasFilter ? 'No matching organizations' : 'No organizations'}
              body={hasFilter
                ? 'Change filters or search again.'
                : 'Organizations will appear here when available.'}
            >
              {hasFilter ? (
                <Button
                  variant="ghost"
                  onClick={onClearFilters}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all organizations
                </Button>
              ) : null}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((organization) => (
            <OrganizationRow
              key={organization.id}
              organization={organization}
              selected={focusedOrg?.id === organization.id}
              selectable={selectable}
              checked={selectedIds.includes(organization.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
              onFocus={() => setFocused(organization.id)}
              onView={onView}
              activeActionFeedback={activeActionFeedback}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};
