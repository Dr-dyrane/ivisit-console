import React from 'react';
import { Building2, CheckCircle, Loader2, Shield, X } from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  MobileListRow,
  SearchRow,
  SkeletonGroupPanel,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty } from './MobileListStates';
import { resolveVital } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import {
  facilityOrbClass,
  isPendingItem,
  itemStatusKey,
  providerPersonaLabel,
  providerPersonaOrb,
  tokenLabel,
} from './verification/mobileVerificationModel';
import { useMobileVerificationController } from './verification/useMobileVerificationController';
import {
  getMobileProviderPersonaIcon,
  MobileVerificationDetailSheet,
} from './verification/MobileVerificationDetailSheet';

export { approveProvidersSequentially } from './verification/mobileVerificationModel';

const MobileVerificationAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
      style={{
        backgroundImage:
          'linear-gradient(118deg, transparent 0 46%, hsl(var(--foreground) / 0.055) 46% 49%, transparent 49%), linear-gradient(32deg, transparent 0 42%, hsl(var(--foreground) / 0.045) 42% 45%, transparent 45%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '250px 178px, 330px 236px, 410px 276px',
        backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 20% 32%, hsl(var(--primary) / 0.10), transparent 28%), radial-gradient(circle at 82% 62%, hsl(var(--foreground) / 0.055), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

export const MobileVerification = ({
  queueType = 'providers',
  setQueueType,
  providers = [],
  organizations = [],
  loading = false,
  stats,
  orgStats,
  filters,
  setFilters,
  onViewProvider,
  onVerifyProvider,
  onVerifyOrganization,
  canApprove = false,
  onRefresh,
  onOpenFilters,
  filterSheetOpen = false,
  analyticsOpen = false,
  onViewAnalytics,
  isFetching = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileVerificationController({
    queueType,
    providers,
    organizations,
    loading,
    stats,
    orgStats,
    filters,
    setFilters,
    canApprove,
    isFetching,
    selectedIds,
    onSelect,
    onSelectAll,
    onVerifyProvider,
    warmingUp,
  });

  const {
    activeItem,
    setActiveItem,
    activeStatus,
    bulkApprove,
    bulkApproving,
    bulkProgress,
    displayItems,
    groups,
    hasFilter,
    isBuffering,
    kpis,
    refetching,
    scopeCount,
    selectedIdSet,
    selectionEnabled,
    selectionMode,
    showTopSectionLoading,
  } = controller;

  const renderRow = (item) => {
    const statusKey = itemStatusKey(item, queueType);
    const pending = isPendingItem(item, queueType);
    const isProviders = queueType === 'providers';
    const title = isProviders ? (item.username || item.email || 'Unknown') : (item.name || 'Unknown');
    const facet = isProviders ? providerPersonaLabel(item.provider_type) : tokenLabel(item.type, 'facility');
    const detail = isProviders ? (item.email || 'No email') : (item.address || 'No address');

    return (
      <MobileListRow
        item={item}
        dataAttr="data-mobile-approval-row"
        onOpen={setActiveItem}
        ariaLabel={`${title}, ${pending ? 'pending' : statusKey}`}
        orbClass={isProviders ? providerPersonaOrb(item.provider_type) : facilityOrbClass(statusKey)}
        icon={isProviders ? getMobileProviderPersonaIcon(item.provider_type) : Building2}
        title={title}
        meta={`${facet} - ${detail}`}
        time={formatRelativeTime(item.created_at)}
        markerChip={!canApprove && pending ? 'Admin' : null}
        pill={resolveVital('verification', statusKey).pill}
        selectable={selectionEnabled}
        selected={selectedIdSet.has(item.id)}
        selectionMode={selectionMode}
        onToggleSelect={(selectedItem) => {
          if (!bulkApproving) onSelect?.(selectedItem.id, !selectedIdSet.has(selectedItem.id));
        }}
        onLongPress={(selectedItem) => {
          if (!bulkApproving) onSelect?.(selectedItem.id, true);
        }}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileVerificationAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Approvals"
            noun={queueType === 'providers' ? 'application' : 'facility'}
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={false}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={kpis}
            activeKpi={activeStatus}
            onKpiClick={(id) => setFilters((current) => ({ ...current, status: id }))}
          />

          <div className="px-4">
            <div className="flex rounded-inner bg-foreground/[0.05] p-1 dark:bg-white/[0.06]">
              {[
                { id: 'providers', label: 'Providers' },
                { id: 'organizations', label: 'Facilities' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (queueType !== tab.id) onSelectAll?.(false);
                    setQueueType(tab.id);
                  }}
                  aria-pressed={queueType === tab.id}
                  className={`flex-1 rounded-button py-2 text-[13px] font-semibold transition-all active:scale-[0.97] ${queueType === tab.id ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.10]' : 'text-muted-foreground'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <section className="px-4">
            <SearchRow
              placeholder={`Search ${queueType === 'providers' ? 'providers' : 'facilities'}...`}
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((current) => ({ ...current, search: value }))}
              entityLabel={queueType === 'providers' ? 'providers' : 'facilities'}
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open approval analytics"
            />

            <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

            <div className="mt-3 space-y-2">
              {selectionMode && (
                <div
                  className="sticky top-2 z-30 flex items-center gap-2 rounded-inner bg-background/85 px-3 py-2 shadow-sm backdrop-blur-xl"
                  aria-busy={bulkApproving}
                >
                  <span className="text-[13px] font-semibold text-foreground tabular-nums">{selectedIdSet.size} selected</span>
                  <button
                    type="button"
                    onClick={() => onSelectAll?.(true)}
                    disabled={bulkApproving}
                    className="text-[12px] font-semibold text-muted-foreground transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={bulkApprove}
                      disabled={bulkApproving}
                      aria-busy={bulkApproving}
                      className="flex h-8 min-w-[7.75rem] items-center justify-center gap-1.5 rounded-button bg-emerald-500/12 px-3 text-[12px] font-semibold text-emerald-700 transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70 dark:text-emerald-300"
                    >
                      {bulkApproving
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <CheckCircle className="h-3.5 w-3.5" />}
                      <span aria-live="polite">
                        {bulkApproving
                          ? `Approving ${bulkProgress.completed}/${bulkProgress.total}`
                          : `Approve ${selectedIdSet.size}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectAll?.(false)}
                      disabled={bulkApproving}
                      aria-label="Clear selection"
                      className="flex h-8 w-8 items-center justify-center rounded-button bg-foreground/[0.05] text-muted-foreground transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-50 dark:bg-white/[0.06]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {groups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          {renderRow(item)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              {displayItems.length === 0 && !showTopSectionLoading && !loading && (
                <MobileListEmpty
                  icon={Shield}
                  label={canApprove ? 'No verification items found' : 'No visible approval items'}
                  reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={filters?.search
                    ? `No ${queueType === 'providers' ? 'providers' : 'facilities'} match "${filters.search}".`
                    : hasFilter
                      ? 'Try clearing status filters to recover queue visibility.'
                      : canApprove
                        ? 'New verification items will appear here as they arrive.'
                        : 'Approval items are not visible for this role.'}
                  onRecover={hasFilter
                    ? () => setFilters((current) => ({ ...current, search: '', status: 'all' }))
                    : undefined}
                  recoverLabel={filters?.search ? 'Clear Search' : hasFilter ? 'Reset Filters' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        <MobileVerificationDetailSheet
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          queueType={queueType}
          canApprove={canApprove}
          onViewProvider={onViewProvider}
          onVerifyProvider={onVerifyProvider}
          onVerifyOrganization={onVerifyOrganization}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
