import React from 'react';
import { AlertTriangle, MailX } from 'lucide-react';
import { Button } from '../../ui/button';
import { BulkActionBar } from '../../common/BulkActionBar';
import { FilterSheet } from '../../common/FilterSheet';
import { SEOHead } from '../../common/SEOHead';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { ConfirmationModal } from '../../modals/ConfirmationModal';
import { SubscriptionModal } from '../../modals/SubscriptionModal';
import { MobileSubscriptions } from '../../mobile/MobileSubscriptions';
import { TabletSubscriptions } from '../../tablet/TabletSubscriptions';
import {
  SubscriberDetailRail,
  SubscriptionsDesktopWorkspace,
} from './SubscriptionsDesktopWorkspace';

const ProjectionStatsNotice = () => (
  <p
    className="mx-4 mt-3 flex items-start gap-2 rounded-inner bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 lg:mx-auto lg:max-w-3xl"
    role="status"
    aria-live="polite"
  >
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>Subscriber statistics are unavailable. Counts use the loaded rows; the list remains current.</span>
  </p>
);

export const SubscriptionManagementPageView = ({ controller, isPhone, isTablet, isMobile }) => {
  const {
    role,
    data,
    state,
    setters,
    actions,
    selection,
    pagination,
    filterSchema,
    wayfinding,
  } = controller;

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Email Subscribers" description="Review subscriber lifecycle and welcome evidence." />
        <MobileSubscriptions
          subscribers={data.mobileVisibleSubscribers}
          stats={data.subscriptionDisplayStats}
          statsUnavailable={data.subscriptionStatsUnavailable}
          filters={state.filters}
          setFilters={setters.setFilters}
          onView={actions.handleView}
          onEdit={null}
          onDelete={null}
          onRefresh={data.fetchSubscribers}
          canManage={role.canManageSubscribers}
          loading={data.loading || (data.subscriptionIsFetching && data.mobileVisibleSubscribers.length === 0)}
          isFetching={data.subscriptionIsFetching}
          errorMessage={data.error ? String(data.error?.message || data.error) : null}
          onRetry={data.fetchSubscribers}
          onOpenFilters={actions.handleOpenFilters}
          onViewAnalytics={actions.handleViewAnalytics}
          filterSheetOpen={state.filterSheetOpen}
          analyticsOpen={state.analyticsModalOpen}
          actionNotice={state.subscriptionCommandNotice}
          selectionEnabled={role.canManageSubscribers}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        <SubscriptionModal
          isOpen={!!state.modalMode}
          onClose={() => setters.setModalMode(null)}
          subscriber={state.selectedSubscriber}
          mode={state.modalMode}
          onSave={actions.handleSave}
        />

        <AnalyticsModal
          open={state.analyticsModalOpen}
          onClose={() => setters.setAnalyticsModalOpen(false)}
          type="subscription"
          analytics={data.subscriptionAnalytics}
        />

        <FilterSheet
          isOpen={state.filterSheetOpen}
          onOpenChange={setters.setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setters.setFilters}
          initialValues={state.filters}
          viewToggle={null}
          isMobile={true}
        />

        <ConfirmationModal
          isOpen={state.confirmationModal.isOpen}
          onClose={() => setters.setConfirmationModal((previous) => ({ ...previous, isOpen: false }))}
          onConfirm={state.confirmationModal.onConfirm}
          title={state.confirmationModal.title}
          description={state.confirmationModal.description}
          variant={state.confirmationModal.variant}
          confirmLabel={state.confirmationModal.confirmLabel}
        />
      </div>
    );
  }

  if (isTablet) {
    return (
      <>
        <SEOHead title="Email Subscribers" description="Review subscriber lifecycle and welcome evidence." />
        <TabletSubscriptions
          subscribers={data.mobileVisibleSubscribers}
          stats={data.subscriptionDisplayStats}
          subscriberCount={data.subscriberCount}
          statsUnavailable={data.subscriptionStatsUnavailable}
          denied={data.subscriptionDenied}
          filters={state.filters}
          setFilters={setters.setFilters}
          loading={data.loading || (
            data.subscriptionIsFetching
            && data.mobileVisibleSubscribers.length === 0
          )}
          isFetching={data.subscriptionIsFetching}
          errorMessage={data.error ? String(data.error?.message || data.error) : null}
          onRetry={data.fetchSubscribers}
          onRefresh={data.fetchSubscribers}
          onOpenFilters={actions.handleOpenFilters}
          onViewAnalytics={actions.handleViewAnalytics}
          actionNotice={state.subscriptionCommandNotice}
          focusedSubscriber={state.focusedSubscriber}
          onFocusSubscriber={actions.setFocused}
          onView={actions.handleView}
          selectionEnabled={role.canManageSubscribers}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          detail={(
            <SubscriberDetailRail
              subscriber={state.focusedSubscriber}
              denied={data.subscriptionDenied}
              loading={data.loading || (
                data.subscriptionIsFetching
                && data.mobileVisibleSubscribers.length === 0
              )}
              hasFilter={state.hasSubscriberFilters}
              onView={actions.handleView}
              embedded
            />
          )}
        />

        {role.canManageSubscribers && (
          <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>
            <Button
              variant="ghost"
              size="icon"
              disabled
              data-state="unavailable"
              title="Bulk subscriber changes unavailable"
              aria-label="Bulk subscriber changes unavailable"
              className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-40"
            >
              <MailX className="h-5 w-5" />
            </Button>
          </BulkActionBar>
        )}

        <SubscriptionModal
          isOpen={!!state.modalMode}
          onClose={() => setters.setModalMode(null)}
          subscriber={state.selectedSubscriber}
          mode={state.modalMode}
          onSave={actions.handleSave}
        />

        <AnalyticsModal
          open={state.analyticsModalOpen}
          onClose={() => setters.setAnalyticsModalOpen(false)}
          type="subscription"
          analytics={data.subscriptionAnalytics}
        />

        <FilterSheet
          isOpen={state.filterSheetOpen}
          onOpenChange={setters.setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setters.setFilters}
          initialValues={state.filters}
          viewToggle={null}
          isMobile={isMobile}
        />

        <ConfirmationModal
          isOpen={state.confirmationModal.isOpen}
          onClose={() => setters.setConfirmationModal((previous) => ({ ...previous, isOpen: false }))}
          onConfirm={state.confirmationModal.onConfirm}
          title={state.confirmationModal.title}
          description={state.confirmationModal.description}
          variant={state.confirmationModal.variant}
          confirmLabel={state.confirmationModal.confirmLabel}
        />
      </>
    );
  }

  return (
    <>
      <SEOHead title="Email Subscribers" description="Review subscriber lifecycle and welcome evidence." />
      {data.subscriptionStatsUnavailable && <ProjectionStatsNotice />}
      <SubscriptionsDesktopWorkspace
        rows={data.desktopSubscribers}
        stats={data.subscriptionDisplayStats}
        denied={data.subscriptionDenied}
        loading={data.loading && data.desktopSubscribers.length === 0}
        isFetching={data.subscriptionIsFetching}
        error={data.error}
        filters={state.filters}
        setFilters={setters.setFilters}
        filterSheetOpen={state.filterSheetOpen}
        openFilters={actions.handleOpenFilters}
        retry={data.fetchSubscribers}
        clearFilters={actions.clearFilters}
        pagination={pagination}
        sortConfig={state.sortConfig}
        onSort={actions.handleSort}
        focusedSubscriber={state.focusedSubscriber}
        setFocused={actions.setFocused}
        onView={actions.handleView}
        selectable={role.canManageSubscribers}
        selectedIds={selection.selectedIds}
        allSelected={selection.allSelected}
        someSelected={selection.someSelected}
        onToggleSelect={selection.handleToggleSelect}
        onSelectClick={selection.handleSelectClick}
        onSelectAll={selection.handleSelectAll}
        moduleRailItems={wayfinding.moduleRailItems}
        routingPath={wayfinding.routingPath}
        onRailNavigate={wayfinding.handleRailNavigate}
      />
      {role.canManageSubscribers && (
        <BulkActionBar selectedCount={selection.selectedIds.length} onClear={selection.clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            disabled
            data-state="unavailable"
            title="Bulk subscriber changes unavailable"
            aria-label="Bulk subscriber changes unavailable"
            className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-40"
          >
            <MailX className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}
      <SubscriptionModal
        isOpen={!!state.modalMode}
        onClose={() => setters.setModalMode(null)}
        subscriber={state.selectedSubscriber}
        mode={state.modalMode}
        onSave={actions.handleSave}
      />
      <AnalyticsModal
        open={state.analyticsModalOpen}
        onClose={() => setters.setAnalyticsModalOpen(false)}
        type="subscription"
        analytics={data.subscriptionAnalytics}
      />
      <FilterSheet
        isOpen={state.filterSheetOpen}
        onOpenChange={setters.setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setters.setFilters}
        initialValues={state.filters}
        viewToggle={null}
        isMobile={false}
      />
    </>
  );
};
