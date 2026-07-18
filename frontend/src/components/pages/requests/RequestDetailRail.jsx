import React from 'react';
import {
  AlertCircle,
  Ambulance,
  BedDouble,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  Hospital,
  Info,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { CopyChip, DetailLine, Shimmer, StageStrip } from '../../console/primitives';
import { useReverseGeocode } from '../../../hooks/useReverseGeocode';
import { formatEmergencyServiceToken } from '../../../utils/emergencyRequestMapper';
import { formatRequestDayTime } from '../../../utils/requestDisplay';
import { buildEmergencyLifecyclePresentation } from './emergencyLifecyclePresentation';
import {
  CopilotActionButton,
  createEmergencyNextActionRequest,
} from '../../../features/copilot';
import {
  formatRequestTime,
  getRequestAvatarClass,
  getRequestInitials,
  getRequestProjection,
  getRequestServiceLabel,
  getRequestStatusMeta,
  REQUEST_RAIL_PRIMARY_ACTION_CLASS,
  REQUEST_STAGE_FILL,
} from './requestPageModel';

const REQUEST_ACTION_ICON = {
  review: ClipboardCheck,
  dispatch: Send,
  complete: CheckCheck,
  retry: RefreshCw,
  details: Info,
};

const RequestRailShell = ({ children, embedded = false, scroll = false }) => {
  if (embedded) {
    return <DetailRailShell embedded>{children}</DetailRailShell>;
  }

  return (
    <aside className={`relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-e3 backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px] ${scroll ? 'overflow-y-auto no-scrollbar' : ''}`}>
      <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      {children}
    </aside>
  );
};

export const RequestDetailRail = ({
  request,
  currentUser,
  loading,
  hasFilter = false,
  dispatchPending = false,
  completePending = false,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  onProcessCash,
  embedded = false,
}) => {
  const railProjection = request ? getRequestProjection(request) : null;
  const { place: railPlace } = useReverseGeocode(
    railProjection?.locationDisplay?.canOpenExternalMap
      ? railProjection.locationDisplay.coordinates
      : null
  );

  if (loading) return <RequestDetailRailSkeleton embedded={embedded} />;

  if (!request) {
    return (
      <RequestRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Info className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No request selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Requests that match your filters will appear here.'
              : 'Select a request to see its details here.'}
          </p>
        </div>
      </RequestRailShell>
    );
  }

  const projection = railProjection;
  const canManage = currentUser.canOperateDispatch();
  const canCompleteRequest = currentUser.canCompleteRequest(request);
  const lifecycle = buildEmergencyLifecyclePresentation(request, {
    canManage,
    canComplete: canCompleteRequest,
    receivers: {
      details: typeof onView === 'function',
      dispatch: typeof onDispatch === 'function',
      complete: typeof onComplete === 'function',
      cancel: typeof onDelete === 'function',
      retryPayment: false,
    },
  });
  const actionState = lifecycle.actionState;
  const status = getRequestStatusMeta(request, lifecycle);
  const avatarClass = getRequestAvatarClass(request);
  const railStatus = lifecycle.status.key;
  const railCancelled = lifecycle.progress.cancelled;
  const railStageIndex = lifecycle.progress.activeIndex;
  const railStageFill = REQUEST_STAGE_FILL[lifecycle.status.styleKey] || 'bg-foreground/60';
  const displayId = projection.identity.displayId;
  const patientEmail = projection.patientDisplay.email;
  const hasEmail = Boolean(patientEmail) && patientEmail !== 'No email';
  const railPhone = projection.patientDisplay.phone;
  const canCopyPhone = Boolean(railPhone) && !/^no\s/i.test(String(railPhone));
  const location = projection.locationDisplay;
  const destination = projection.destinationDisplay;
  const bedCount = projection.serviceDisplay.bedCount;
  const responder = projection.responderDisplay;
  const payment = projection.paymentDisplay;
  const paymentAmount = payment.amountLabel && payment.amountLabel !== 'Unavailable' ? payment.amountLabel : '';
  const hasPaymentInfo = Boolean(payment.method || payment.status || paymentAmount);
  const paymentValue = [payment.methodLabel, paymentAmount, payment.status].filter(Boolean).join(' \u00b7 ');
  const arrivalConfirmation = lifecycle.arrival.acknowledged
    ? `Confirmed ${formatRequestDayTime(lifecycle.arrival.patientAcknowledgedAt)}`
    : railStatus === 'arrived'
      ? 'Awaiting patient confirmation'
      : null;
  const railCost = request?.confirmed_cost ?? request?.total_cost;
  const showAmount = railStatus === 'completed' && railCost !== null && railCost !== undefined && Boolean(paymentAmount);
  const bedDetail = request?.service_type === 'bed'
    ? [
        request?.bed_number ? `Bed ${request.bed_number}` : null,
        (request?.bed_type || request?.bed_category)
          ? formatEmergencyServiceToken(request.bed_type || request.bed_category, '')
          : null,
        request?.specialty ? formatEmergencyServiceToken(request.specialty, '') : null,
      ].filter(Boolean).join(' \u00b7 ')
    : '';
  const primaryAction = lifecycle.actions.primary;
  const actionHandlers = {
    review: onView,
    details: onView,
    dispatch: onDispatch,
    complete: onComplete,
  };
  const primaryHandler = actionHandlers[primaryAction.kind];
  const PrimaryIcon = REQUEST_ACTION_ICON[primaryAction.kind] || Info;
  const StatusIcon = status.icon || AlertCircle;
  const primaryClass = REQUEST_RAIL_PRIMARY_ACTION_CLASS[primaryAction.kind]
    || REQUEST_RAIL_PRIMARY_ACTION_CLASS.details;
  const primaryPending = (
    (primaryAction.kind === 'dispatch' && dispatchPending) ||
    (primaryAction.kind === 'complete' && completePending)
  );
  const responderValue = responder.hasResponder
    ? `${responder.label}${responder.etaLabel ? ` \u00b7 ${responder.etaLabel}` : ''}`
    : null;
  const copilotRequest = createEmergencyNextActionRequest({
    heading: displayId ? `Request ${displayId}` : 'Emergency request',
    statusLabel: status.label,
    primaryAction,
    arrivalConfirmation,
    paymentValue: hasPaymentInfo ? paymentValue : null,
    responderValue,
    destinationValue: destination.hasDestination ? destination.label : null,
  });

  return (
    <RequestRailShell embedded={embedded} scroll>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Request details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={displayId} label="Copy case ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </div>
            <StageStrip
              order={lifecycle.progress.keys}
              fillClass={railStageFill}
              activeIndex={railStageIndex}
              muted={railCancelled}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView?.(request)}
            disabled={!lifecycle.actions.details.available}
            title={lifecycle.actions.details.available ? undefined : lifecycle.actions.details.reason}
            aria-label="Open full request details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-pill text-lg font-semibold ${avatarClass}`}>
            <span aria-hidden="true">{getRequestInitials(projection.patientDisplay.name)}</span>
            {projection.patientDisplay.avatar && (
              <img
                src={projection.patientDisplay.avatar}
                alt=""
                className="absolute inset-0 h-full w-full rounded-pill object-cover"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.patientDisplay.name}>{projection.patientDisplay.name}</h3>
            <div className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              <span className="truncate" title={`${formatRequestTime(request.created_at)} - ${railPhone}${displayId ? ` \u00b7 ${displayId}` : ''}`}>
                {formatRequestTime(request.created_at)} - {railPhone}{displayId ? ` \u00b7 ${displayId}` : ''}
              </span>
              {canCopyPhone && <CopyChip value={railPhone} label="Copy phone number" />}
            </div>
            {hasEmail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{patientEmail}</p>}
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Hospital} label="Facility" value={projection.facilityDisplay.name} />
        <DetailLine
          icon={MapPin}
          label="Location"
          value={location.canOpenExternalMap && location.coordinates ? (
            <a
              href={`https://maps.google.com/?q=${location.coordinates.lat},${location.coordinates.lng}`}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
              title={railPlace?.formattedAddress || location.label}
            >
              {railPlace?.shortLabel || location.label}
            </a>
          ) : location.label}
        />
        {/* ADOPT-32: transport destination renders only from recorded destination_location truth. */}
        {destination.hasDestination && (
          <DetailLine
            icon={Navigation}
            label="Destination"
            value={destination.coordinates ? (
              <a
                href={`https://maps.google.com/?q=${destination.coordinates.lat},${destination.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
                title={destination.label}
              >
                {destination.label}
              </a>
            ) : destination.label}
          />
        )}
        <DetailLine icon={ClipboardCheck} label="Service" value={getRequestServiceLabel(request)} />
        {bedDetail && <DetailLine icon={BedDouble} label="Bed" value={bedDetail} />}
        {/* ADOPT-32: bed_count is raw text; an empty column stays absent. */}
        {bedCount && <DetailLine icon={BedDouble} label="Bed count" value={bedCount} />}
        {responder.hasResponder && (
          <DetailLine
            icon={Ambulance}
            label="Responder"
            value={`${responder.label}${responder.etaLabel ? ` \u00b7 ${responder.etaLabel}` : ''}`}
          />
        )}
        {/* ADOPT-05: freshness renders only from real telemetry; null stays absent. */}
        {responder.hasResponder && responder.locationFreshness && (
          <DetailLine icon={MapPin} label="Responder location" value={responder.locationFreshness.label} />
        )}
        {arrivalConfirmation && (
          <DetailLine icon={CheckCheck} label="Patient arrival" value={arrivalConfirmation} />
        )}
        {hasPaymentInfo && <DetailLine icon={Wallet} label="Payment" value={paymentValue} />}
        {showAmount && <DetailLine icon={CreditCard} label="Amount" value={paymentAmount} />}
        <DetailLine icon={Clock} label="Requested" value={formatRequestDayTime(request.created_at)} />
        {request?.completed_at && (
          <DetailLine icon={CheckCheck} label="Completed" value={formatRequestDayTime(request.completed_at)} />
        )}
        {request?.cancelled_at && (
          <DetailLine icon={Clock} label="Cancelled" value={formatRequestDayTime(request.cancelled_at)} />
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className={`h-12 w-full rounded-button text-base font-semibold transition-all active:scale-[0.99] ${primaryClass}`}
          onClick={() => primaryHandler?.(request)}
          disabled={!primaryAction.available || primaryPending}
          title={primaryAction.available ? undefined : primaryAction.reason}
        >
          {primaryPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <PrimaryIcon className="mr-2 h-5 w-5" />
          )}
          {primaryAction.label}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        <CopilotActionButton
          label="Explain next action"
          request={copilotRequest}
        />

        <div className="grid grid-cols-2 gap-3">
          {lifecycle.actions.secondary.map((action) => {
            const SecondaryIcon = REQUEST_ACTION_ICON[action.kind] || Info;
            const handler = actionHandlers[action.kind];
            const pending = (
              (action.kind === 'dispatch' && dispatchPending) ||
              (action.kind === 'complete' && completePending)
            );
            return (
              <RailActionButton
                key={action.kind}
                icon={SecondaryIcon}
                label={action.label}
                onClick={() => handler?.(request)}
                pending={pending}
              />
            );
          })}
        </div>

        {actionState.canProcessCash && typeof onProcessCash === 'function' && (
          <Button
            variant="ghost"
            className="h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.99]"
            onClick={() => onProcessCash(request)}
          >
            Cash settlement handled in Finance
          </Button>
        )}

        {lifecycle.actions.cancel.available && (
          <Button
            variant="ghost"
            className="h-10 w-full rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.99]"
            onClick={() => onDelete(request)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {lifecycle.actions.cancel.label}
          </Button>
        )}
      </div>
    </RequestRailShell>
  );
};

const RequestDetailRailSkeleton = ({ embedded = false }) => (
  <RequestRailShell embedded={embedded}>
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
      {[0, 1, 2, 3].map((index) => (
        <Shimmer key={index} className="h-[52px] w-full rounded-inner" />
      ))}
    </div>
    <div className="mt-5 space-y-2.5">
      <Shimmer className="h-12 w-full rounded-button" />
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-11 rounded-button" />
        <Shimmer className="h-11 rounded-button" />
      </div>
    </div>
  </RequestRailShell>
);

const RailActionButton = ({ icon: Icon, label, onClick, pending = false }) => (
  <Button
    variant="ghost"
    className="h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98] disabled:opacity-50"
    onClick={onClick}
    disabled={pending}
  >
    {pending ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
    ) : (
      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    )}
    {label}
  </Button>
);
