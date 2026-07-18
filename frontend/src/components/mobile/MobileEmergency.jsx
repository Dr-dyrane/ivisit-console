import React from 'react';
import {
  Ambulance,
  BedDouble,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  Clock,
  CreditCard,
  Eye,
  Hash,
  Hospital,
  Mail,
  MapPin,
  Phone,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { GroupedList, MobileListRow } from './canon/GroupedList';
import { UpdatingPillRow, useSkeletonWarmup } from './canon/Loading';
import { MobileHeading } from './canon/MobileHero';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { buildEmergencyRenderProjection } from '../../utils/emergencyRequestMapper';
import { formatRequestDayTime, isUnsettledCashRequest } from '../../utils/requestDisplay';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { buildEmergencyLifecyclePresentation } from '../pages/requests/emergencyLifecyclePresentation';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileEmergencyList } from './requests/MobileEmergencyList';
import {
  buildMobileRequestDetailModel,
  getMobileRequestAvatarClass,
  getMobileRequestCreatedDateLabel,
  getMobileRequestServiceLabel,
  getMobileRequestTypeIcon,
} from './requests/mobileEmergencyModel';
import { useMobileEmergencyController } from './requests/useMobileEmergencyController';
import {
  CopilotActionButton,
  createEmergencyNextActionRequest,
} from '../../features/copilot';

const MOBILE_ACTION_META = {
  review: { icon: ClipboardCheck, tone: 'hsl(var(--destructive))' },
  dispatch: { icon: Send, tone: 'hsl(200 98% 39%)' },
  complete: { icon: CheckCheck, tone: 'hsl(162 94% 24%)' },
  details: { icon: Eye },
};

const LifecycleRequestRow = ({
  request,
  onOpen,
  selectable,
  selected,
  selectionMode,
  onToggleSelect,
  onLongPress,
}) => {
  const projection = buildEmergencyRenderProjection(request);
  const lifecycle = buildEmergencyLifecyclePresentation(request);
  const name = projection.patientDisplay.name;
  const TypeIcon = getMobileRequestTypeIcon(request);

  return (
    <MobileListRow
      item={request}
      dataAttr="data-mobile-request-row"
      onOpen={() => onOpen(request)}
      ariaLabel={`Open ${name}`}
      orbClass={getMobileRequestAvatarClass(request)}
      icon={TypeIcon}
      title={name}
      meta={`${getMobileRequestServiceLabel(request)} \u00b7 ${getMobileRequestCreatedDateLabel(request.created_at)}`}
      time={formatRequestDayTime(request.created_at)}
      markerChip={isUnsettledCashRequest(request) ? 'Cash' : null}
      pill={lifecycle.status.pill}
      selectable={selectable}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
    />
  );
};

const LifecycleRequestDetailSheet = ({
  controller,
  canManageRequests,
  canOpenFinance,
  canCompleteRequest,
  onView,
  onDispatch,
  onComplete,
  onProcessCash,
  onCancel,
}) => {
  const {
    activeRequest,
    setActiveRequestId,
    activePlace,
    triggerFromEvent,
  } = controller;

  if (!activeRequest) return null;

  const detail = buildMobileRequestDetailModel(activeRequest);
  const lifecycle = buildEmergencyLifecyclePresentation(activeRequest, {
    canManage: Boolean(canManageRequests),
    canComplete: Boolean(canCompleteRequest?.(activeRequest)),
    receivers: {
      details: typeof onView === 'function',
      dispatch: typeof onDispatch === 'function',
      complete: typeof onComplete === 'function',
      retryPayment: false,
      cancel: typeof onCancel === 'function',
    },
  });
  const {
    projection,
    name,
    facility,
    location,
    responder,
    phone,
    patientEmail,
    coordinates,
    displayId,
    isAmbulanceService,
    paymentParts,
    hasPayment,
    vehicleParts,
    bedParts,
  } = detail;
  const callbacks = {
    review: onView,
    details: onView,
    dispatch: onDispatch,
    complete: onComplete,
  };
  const closeThen = (callback) => () => {
    setActiveRequestId(null);
    callback?.(activeRequest);
  };
  const toMobileAction = (action) => {
    const callback = callbacks[action?.kind];
    if (!action?.available || typeof callback !== 'function') return undefined;
    const meta = MOBILE_ACTION_META[action.kind] || {};
    return {
      label: action.label,
      icon: meta.icon,
      tone: meta.tone,
      onClick: closeThen(callback),
    };
  };
  const primaryAction = toMobileAction(lifecycle.actions.primary);
  const secondaryAction = toMobileAction(lifecycle.actions.secondary[0]);
  const arrivalConfirmation = lifecycle.arrival.acknowledged
    ? `Confirmed ${formatRequestDayTime(lifecycle.arrival.patientAcknowledgedAt)}`
    : lifecycle.status.key === 'arrived' ? 'Awaiting patient confirmation' : null;
  const copilotRequest = createEmergencyNextActionRequest({
    heading: displayId ? `Request ${displayId}` : 'Emergency request',
    statusLabel: lifecycle.status.label,
    primaryAction: lifecycle.actions.primary,
    arrivalConfirmation,
    paymentValue: hasPayment ? paymentParts.join(' \u00b7 ') : null,
    responderValue: responder,
    destinationValue: projection.destinationDisplay.hasDestination
      ? projection.destinationDisplay.label
      : null,
    canOpenFinance,
  });

  return (
    <MobileDetailSheet
      isOpen
      onClose={() => setActiveRequestId(null)}
      icon={ClipboardCheck}
      iconTone={lifecycle.progress.tone}
      avatarUrl={projection.patientDisplay.avatar}
      avatarInitials={projection.patientDisplay.initials}
      eyebrow={getMobileRequestServiceLabel(activeRequest)}
      title={name}
      statusPill={lifecycle.status.pill}
      vital={{ ...lifecycle.progress, label: 'Request status' }}
      islands={[
        { icon: User, label: 'Patient', value: name },
        phone && { icon: Phone, label: 'Phone', value: phone, href: `tel:${String(phone).replace(/[\s-]/g, '')}` },
        patientEmail && { icon: Mail, label: 'Email', value: patientEmail, href: `mailto:${patientEmail}` },
        { icon: ClipboardCheck, label: 'Service type', value: getMobileRequestServiceLabel(activeRequest) },
        { icon: Hospital, label: 'Facility', value: facility },
        { icon: Ambulance, label: 'Responder', value: responder },
        (lifecycle.status.key === 'arrived' || lifecycle.arrival.acknowledged) && {
          icon: CheckCheck,
          label: 'Patient arrival',
          value: lifecycle.arrival.acknowledged
            ? `Confirmed ${formatRequestDayTime(lifecycle.arrival.patientAcknowledgedAt)}`
            : 'Awaiting patient confirmation',
        },
        !lifecycle.status.terminal && projection.responderDisplay.hasResponder && {
          icon: Clock,
          label: 'ETA',
          value: projection.responderDisplay.etaLabel,
        },
        isAmbulanceService && projection.serviceDisplay.hasAmbulanceType && {
          icon: Ambulance,
          label: 'Ambulance type',
          value: projection.serviceDisplay.ambulanceTypeLabel,
        },
        isAmbulanceService && vehicleParts.length > 0 && {
          icon: Ambulance,
          label: 'Vehicle',
          value: vehicleParts.join(' \u00b7 '),
        },
        lifecycle.service.isBed && bedParts.length > 0 && {
          icon: BedDouble,
          label: 'Bed',
          value: bedParts.join(' \u00b7 '),
        },
        {
          icon: MapPin,
          label: 'Location',
          value: activePlace?.shortLabel || location,
          href: projection.locationDisplay.canOpenExternalMap && coordinates
            ? `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
            : undefined,
        },
        hasPayment && { icon: CreditCard, label: 'Payment', value: paymentParts.join(' \u00b7 ') },
        displayId && {
          icon: Hash,
          label: 'Reference',
          value: displayId,
          onPress: (event) => {
            navigator.clipboard?.writeText(String(displayId))?.catch(() => {});
            triggerFromEvent(event, {
              variant: FEEDBACK_TYPES.SUCCESS,
              color: 'hsl(var(--spark))',
              haptic: true,
              sound: true,
            });
          },
        },
        { icon: Calendar, label: 'Created', value: formatRequestDayTime(activeRequest.created_at) },
        lifecycle.status.terminal && activeRequest.completed_at && {
          icon: CheckCheck,
          label: 'Completed',
          value: formatRequestDayTime(activeRequest.completed_at),
        },
        lifecycle.status.terminal && activeRequest.cancelled_at && {
          icon: X,
          label: 'Cancelled',
          value: formatRequestDayTime(activeRequest.cancelled_at),
        },
      ]}
      primary={primaryAction}
      secondary={secondaryAction}
    >
      <CopilotActionButton
        label="Explain next action"
        request={copilotRequest}
        onBeforeOpen={() => setActiveRequestId(null)}
      />
      {lifecycle.actionState.canProcessCash && typeof onProcessCash === 'function' && (
        <button
          type="button"
          onClick={() => onProcessCash(activeRequest)}
          className="h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.96]"
        >
          Cash settlement handled in Finance
        </button>
      )}
      {lifecycle.actions.cancel.available && (
        <button
          type="button"
          onClick={closeThen(onCancel)}
          className="flex h-12 w-full items-center justify-center rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.96]"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {lifecycle.actions.cancel.label}
        </button>
      )}
    </MobileDetailSheet>
  );
};

// Compatibility facade for existing imports. Requests-only state and presentation
// live under ./requests so this entry retains the public component contract.
// grammar:search=inline-request-search-row-in-MobileEmergencyList
// grammar:skeleton=request-group-shaped-skeleton-in-MobileEmergencyList
// grammar:loadmore-append=useMobileEmergencyController-accumulatorRef
export const MobileEmergency = ({
  emergencies,
  loading,
  isFetching = false,
  statistics,
  filters,
  setFilters,
  onView,
  onDispatch,
  onComplete,
  onProcessCash,
  onCancel,
  onRefresh,
  onViewAnalytics,
  canManageRequests,
  canOpenFinance = false,
  canCompleteRequest,
  onOpenFilters,
  filterSheetOpen = false,
  analyticsOpen = false,
  hasMore,
  onLoadMore,
  currentPage = 1,
  loadError,
  onRetry,
  kpiFilter,
  setKpiFilter,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onBulkCancel,
  cancellableCount = 0,
}) => {
  const warmingUp = useSkeletonWarmup();
  const controller = useMobileEmergencyController({
    emergencies,
    loading,
    statistics,
    filters,
    setFilters,
    filterSheetOpen,
    analyticsOpen,
    hasMore,
    onLoadMore,
    currentPage,
    kpiFilter,
    selectionEnabled,
    selectedIds,
    warmingUp,
  });

  const {
    displayItems,
    selectedIdSet,
    selectionMode,
    setActiveRequestId,
    showSkeleton,
    totalRequests,
  } = controller;
  const handleOpenRequest = (request) => setActiveRequestId(request.id);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileEmergencyList
          controller={controller}
          loading={loading}
          isFetching={isFetching}
          filters={filters}
          setFilters={setFilters}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          canManageRequests={canManageRequests}
          canCompleteRequest={canCompleteRequest}
          onOpenFilters={onOpenFilters}
          onViewAnalytics={onViewAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsOpen}
          selectionEnabled={selectionEnabled}
          onSelectAll={onSelectAll}
          onBulkCancel={onBulkCancel}
          cancellableCount={cancellableCount}
          loadError={loadError}
          onRetry={onRetry}
          hasMore={hasMore}
          heading={(
            <MobileHeading
              title="Requests"
              noun="request"
              count={totalRequests}
              showSkeleton={showSkeleton}
              failedEmpty={Boolean(loadError) && displayItems.length === 0}
            />
          )}
          updatingPill={<UpdatingPillRow show={isFetching && !showSkeleton} />}
          groupedList={(
            <GroupedList
              items={displayItems}
              getDate={(request) => request.created_at}
              getStatus={(request) => canonicalizeEmergencyStatus(request.status, null)}
              renderRow={(request) => (
                <LifecycleRequestRow
                  request={request}
                  onOpen={handleOpenRequest}
                  selectable={selectionEnabled}
                  selected={selectedIdSet.has(request.id)}
                  selectionMode={selectionMode}
                  onToggleSelect={(item) => onSelect?.(item.id, !selectedIdSet.has(item.id))}
                  onLongPress={(item) => onSelect?.(item.id, true)}
                />
              )}
            />
          )}
        />
        <LifecycleRequestDetailSheet
          controller={controller}
          canManageRequests={canManageRequests}
          canOpenFinance={canOpenFinance}
          canCompleteRequest={canCompleteRequest}
          onView={onView}
          onDispatch={onDispatch}
          onComplete={onComplete}
          onProcessCash={onProcessCash}
          onCancel={onCancel}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
