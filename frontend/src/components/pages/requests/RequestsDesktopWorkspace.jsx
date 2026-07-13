import React from 'react';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import {
  getRequestKpiCount,
  getRequestSignal,
  hasActiveRequestFilters,
  REQUEST_KPI_IMPORTANCE,
  REQUEST_KPI_OPTIONS,
  REQUEST_PINNED_KPI_IDS,
  REQUEST_TONE_CLASS,
  resolveRequestKpiActive,
} from './requestPageModel';
import { RequestDetailRail } from './RequestDetailRail';
import { RequestsDesktopList } from './RequestsDesktopList';

export const RequestsDesktopWorkspace = ({
  requests,
  loading,
  isFetching = false,
  includeMine = false,
  dispatchPending = false,
  completePending = false,
  stats,
  filters,
  setFilters,
  kpiFilter,
  setKpiFilter,
  focusedRequest,
  setFocusedRequestId,
  currentUser,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  onProcessCash,
  pagination,
  openFilters,
  filterSheetOpen,
  filterTriggerState,
  loadError,
  onRetry,
  moduleRailItems,
  routingPath,
  onRailNavigate,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  sortConfig,
  onSort,
}) => {
  const signal = getRequestSignal({ stats, requests, kpiFilter, loadError });
  const hasFilter = hasActiveRequestFilters(filters);
  const kpiPool = includeMine
    ? REQUEST_KPI_OPTIONS
    : REQUEST_KPI_OPTIONS.filter((option) => option.id !== 'mine');

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/emergencies"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <RequestDetailRail
          request={focusedRequest}
          currentUser={currentUser}
          loading={loading}
          hasFilter={hasFilter}
          dispatchPending={dispatchPending}
          completePending={completePending}
          onView={onView}
          onDelete={onDelete}
          onDispatch={onDispatch}
          onComplete={onComplete}
          onProcessCash={onProcessCash}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={REQUEST_TONE_CLASS}>
        <KpiStrip
          options={kpiPool}
          getCount={(id) => getRequestKpiCount({ id, stats, requests })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={REQUEST_PINNED_KPI_IDS}
          importance={REQUEST_KPI_IMPORTANCE}
          defaultId="pending"
          dataAttr="data-request-kpi"
          resolveActive={resolveRequestKpiActive}
        />
      </SignalPanel>

      <RequestsDesktopList
        requests={requests}
        loading={loading}
        isFetching={isFetching}
        filters={filters}
        setFilters={setFilters}
        kpiFilter={kpiFilter}
        setKpiFilter={setKpiFilter}
        focusedRequest={focusedRequest}
        setFocusedRequestId={setFocusedRequestId}
        onView={onView}
        pagination={pagination}
        openFilters={openFilters}
        filterSheetOpen={filterSheetOpen}
        filterTriggerState={filterTriggerState}
        loadError={loadError}
        onRetry={onRetry}
        selectable={selectable}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onSelectClick={onSelectClick}
        onSelectAll={onSelectAll}
        sortConfig={sortConfig}
        onSort={onSort}
      />
    </WorkspaceStage>
  );
};
