import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SEOHead } from '../../common/SEOHead';
import { MobileAnalytics } from '../../mobile/MobileAnalytics';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { Button } from '../../ui/button';
import { AnalyticsDesktopWorkspace } from './AnalyticsDesktopWorkspace';
import { ANALYTICS_LOAD_ERROR_MESSAGE } from './analyticsPageModel';

const AnalyticsLoadErrorBanner = ({ onRetry }) => (
  <div
    data-testid="analytics-error-state"
    role="alert"
    className="mt-3 rounded-inner bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-e2"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{ANALYTICS_LOAD_ERROR_MESSAGE}</p>
        <p className="mt-1 text-xs text-destructive/75">Try again in a moment.</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRetry}
        className="self-start rounded-button bg-background/70 px-4 text-xs font-semibold text-destructive hover:bg-background/90 sm:self-auto"
      >
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  </div>
);

const AnalyticsSourceIssueBanner = ({ issueSummary, onRetry }) => {
  if (!issueSummary) return null;

  return (
    <div
      data-testid="analytics-source-state"
      role="status"
      aria-live="polite"
      className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 shadow-e2 dark:text-amber-200"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{issueSummary.title}</p>
          <p className="mt-1 text-xs text-amber-800/75 dark:text-amber-100/70">{issueSummary.detail}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="self-start rounded-button bg-background/70 px-4 text-xs font-semibold text-amber-900 hover:bg-background/90 dark:text-amber-100 sm:self-auto"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
};

const AnalyticsStatusBanners = ({ loadError, issueSummary, commandNotice, onRetry }) => (
  <>
    {loadError && <AnalyticsLoadErrorBanner onRetry={onRetry} />}
    <AnalyticsSourceIssueBanner issueSummary={issueSummary} onRetry={onRetry} />
    {commandNotice && (
      <div
        role="status"
        aria-live="polite"
        className="mt-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground shadow-e2"
      >
        {commandNotice}
      </div>
    )}
  </>
);

export const AnalyticsPageView = ({ controller }) => {
  const { isMobile, role, data, state, actions, wayfinding } = controller;
  const pageMetadata = (
    <SEOHead
      title="Statistics"
      description="Review request, response, network, and payment statistics in iVisit Console."
    />
  );
  const detailsModal = (
    <AnalyticsModal
      open={state.analyticsModalOpen}
      onClose={actions.handleCloseDetails}
      analytics={data.modalAnalytics}
      type="emergency"
    />
  );

  if (isMobile) {
    return (
      <>
        {pageMetadata}
        <MobileAnalytics
          stats={data.stats}
          requestSample={data.requestSample}
          subscriptionStats={data.resolvedSubscriptionStats}
          financeSummary={data.financeSummary}
          hospitalCapacity={data.resolvedHospitalCapacity}
          requestsByDay={data.requestsByDay}
          requestsByStatus={data.requestsByStatus}
          emergencyTypes={data.emergencyTypes}
          dominantType={data.dominantType}
          timeRange={state.timeRange}
          snapshotTimeRange={state.snapshotTimeRange}
          onTimeRangeChange={actions.handleTimeRangeChange}
          onRefresh={actions.fetchAnalytics}
          onRetry={actions.fetchAnalytics}
          onOpenDetails={actions.handleOpenDetails}
          loadError={state.analyticsLoadError}
          commandNotice={state.commandNotice}
          sourceIssueSummary={state.visibleAnalyticsSourceIssueSummary}
          sourceReadiness={data.sourceReadiness}
          canReadSubscriptionAnalytics={role.canReadSubscriptionAnalytics}
          canReadFinanceAnalytics={role.canReadFinanceAnalytics}
          roleContext={role.roleContext}
          snapshotReady={state.snapshotReady}
          isLoading={state.loading && !state.snapshotReady}
          isFetching={state.analyticsIsFetching}
        />
        {detailsModal}
      </>
    );
  }

  return (
    <>
      {pageMetadata}
      <AnalyticsDesktopWorkspace
        stats={data.stats}
        requestSample={data.requestSample}
        timeRange={state.timeRange}
        dataTimeRange={state.snapshotTimeRange}
        onTimeRangeChange={actions.handleTimeRangeChange}
        requestsByDay={data.requestsByDay}
        requestsByStatus={data.requestsByStatus}
        emergencyTypes={data.emergencyTypes}
        dominantType={data.dominantType}
        hospitalCapacity={data.resolvedHospitalCapacity}
        subscriptionStats={data.resolvedSubscriptionStats}
        financeSummary={data.financeSummary}
        roleContext={role.roleContext}
        sourceReadiness={data.sourceReadiness}
        canReadSubscriptionAnalytics={role.canReadSubscriptionAnalytics}
        canReadFinanceAnalytics={role.canReadFinanceAnalytics}
        isLoading={state.loading && !state.snapshotReady}
        isFetching={state.analyticsIsFetching}
        snapshotReady={state.snapshotReady}
        loadError={state.analyticsLoadError}
        moduleRailItems={wayfinding.visibleModuleRail}
        routingPath={wayfinding.routingPath}
        onRailNavigate={wayfinding.handleRailNavigate}
        statusBanners={(
          <AnalyticsStatusBanners
            loadError={state.analyticsLoadError}
            issueSummary={state.visibleAnalyticsSourceIssueSummary}
            commandNotice={state.commandNotice}
            onRetry={actions.fetchAnalytics}
          />
        )}
      />
      {detailsModal}
    </>
  );
};
