import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  Hospital,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import {
  buildDriverDirectionsUrl,
  formatLocationSharedAt,
  formatOfferExpiry,
  getDriverDestination,
  getDriverNextAction,
  getDriverUnitLabel,
} from '../../map/god-mode/driverAssignmentModel';
import { statusLabel } from '../../map/god-mode/mapPresentation';
import { formatEmergencyLocation } from '../../../utils/locationUtils';

export function MobileDriverAssignmentSheet({
  assignedAmbulance,
  driverAction,
  driverAssignment,
  driverFeedError,
  driverFeedLoading,
  driverLocationRecorded,
  driverTracking,
  notificationPermission,
  onAssignmentAction,
  onEnableAlerts,
  hospitals,
}) {
  const [completionArmed, setCompletionArmed] = useState(false);
  const [declineArmed, setDeclineArmed] = useState(false);
  const nextAction = getDriverNextAction(driverAssignment?.assignment_status, {
    guarded: true,
    locationActive: driverTracking.isActive,
    locationStatus: driverTracking.status,
    patientAcknowledgementState: driverAssignment?.patient_acknowledgement_state,
    telemetryState: driverTracking.telemetryState?.state,
  });
  const destination = getDriverDestination({ emergency: driverAssignment, hospitals });
  const directionsUrl = buildDriverDirectionsUrl(destination?.coordinates);
  const pickupLabel = driverAssignment
    ? formatEmergencyLocation(driverAssignment.patient_location)
    : null;
  const requestLabel = driverAssignment?.display_id
    || driverAssignment?.request_id?.slice(-6)
    || 'Current';
  const unitLabel = getDriverUnitLabel({ ambulance: assignedAmbulance, emergency: driverAssignment });
  const isOffer = driverAssignment?.assignment_status === 'offered';
  const isExpiredOffer = driverAssignment?.assignment_status === 'expired';
  const primaryPending = Boolean(
    nextAction?.action
    && (
      driverAction === nextAction.action
      || (nextAction.action === 'restore_location' && driverTracking.status === 'starting')
    )
  );
  const offerCopy = formatOfferExpiry(driverAssignment?.offer_expires_at);

  useEffect(() => {
    setCompletionArmed(false);
    setDeclineArmed(false);
  }, [driverAssignment?.assignment_id, driverAssignment?.assignment_status]);

  const handleNavigate = () => {
    if (!directionsUrl) {
      toast.info('Route coordinates are not available yet');
      return;
    }
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrimaryAction = () => {
    if (!nextAction) return;
    if (nextAction.action === 'restore_location') {
      driverTracking.start();
      return;
    }
    if (!nextAction.action || nextAction.disabled) return;
    if (nextAction.requiresConfirmation && !completionArmed) {
      setCompletionArmed(true);
      return;
    }
    onAssignmentAction(nextAction.action);
  };

  const handleDecline = () => {
    if (!declineArmed) {
      setDeclineArmed(true);
      return;
    }
    onAssignmentAction('decline', 'Responder declined the offer');
  };

  const trackingCopy = driverTracking.status === 'starting'
    ? 'Starting live location'
    : driverTracking.status === 'error'
      ? driverTracking.error
      : driverTracking.isActive
        ? formatLocationSharedAt(driverTracking.lastSharedAt)
        : driverTracking.telemetryState?.state === 'delayed'
          ? 'Last signal is delayed'
          : driverTracking.telemetryState?.state === 'lost'
            ? 'Live signal is unavailable'
            : driverLocationRecorded
              ? 'Last location recorded'
              : 'Keep this map open to share';

  const trackingControl = assignedAmbulance && (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-inner bg-muted/25 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold">{driverTracking.isActive ? 'Live location on' : 'Live location'}</p>
        <p className={`truncate text-[11px] ${driverTracking.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{trackingCopy}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => (driverTracking.isActive ? driverTracking.stop() : driverTracking.start())}
        className={`h-9 shrink-0 rounded-button px-3 ${driverTracking.isActive ? 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-200' : 'bg-foreground/[0.07]'}`}
        aria-busy={driverTracking.status === 'starting'}
      >
        {driverTracking.status === 'starting'
          ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          : driverTracking.isActive
            ? <Radio className="mr-1.5 h-3.5 w-3.5" />
            : <LocateFixed className="mr-1.5 h-3.5 w-3.5" />}
        {driverTracking.isActive ? 'Stop' : 'Go live'}
      </Button>
    </div>
  );

  const alertButton = (
    <Button
      type="button"
      variant="ghost"
      onClick={onEnableAlerts}
      disabled={notificationPermission === 'unsupported'}
      className="h-11 w-11 rounded-button bg-foreground/[0.07] p-0"
      aria-label={notificationPermission === 'granted' ? 'Assignment alerts enabled' : 'Enable assignment alerts'}
    >
      {notificationPermission === 'granted' ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    </Button>
  );

  return (
    <section
      className="fixed left-3 right-3 z-[110] mx-auto max-w-xl"
      style={{
        bottom: 'var(--total-bottom-clearance)',
        maxHeight: 'calc(100dvh - var(--total-bottom-clearance) - 4.5rem)',
      }}
      aria-label="Driver assignment"
    >
      <div className="chrome-glass-strong max-h-full overflow-y-auto rounded-sheet shadow-e4 no-scrollbar">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-pill bg-foreground/20" />

        {driverFeedLoading && !driverAssignment ? (
          <div className="space-y-3 px-5 pb-5 pt-4" aria-label="Loading driver assignments">
            <div className="h-5 w-40 animate-pulse rounded-button bg-muted/55" />
            <div className="h-16 animate-pulse rounded-inner bg-muted/35" />
            <div className="h-11 animate-pulse rounded-button bg-muted/45" />
          </div>
        ) : driverFeedError && !driverAssignment ? (
          <div className="px-5 pb-5 pt-4"><h2 className="text-base font-semibold">Assignments unavailable</h2><p className="mt-1 text-xs text-muted-foreground">{driverFeedError}</p></div>
        ) : driverAssignment ? (
          <div className="px-4 pb-4 pt-3">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-destructive"><Radio className="h-3.5 w-3.5" />{isOffer ? 'New offer' : isExpiredOffer ? 'Offer closed' : 'Active call'}</div>
                <h2 className="truncate text-lg font-semibold">{isExpiredOffer ? 'Offer expired' : 'Emergency request'}</h2>
                <p className="text-xs font-medium text-muted-foreground">#{requestLabel} - {statusLabel(driverAssignment.assignment_status, 'Assigned')}</p>
                {isOffer && offerCopy && <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-200">{offerCopy}</p>}
                {isExpiredOffer && <p className="mt-1 text-[11px] text-muted-foreground">This offer has closed. Wait for the next assignment.</p>}
              </div>
              <div className="rounded-inner bg-foreground/[0.06] px-3 py-2 text-right"><p className="text-[10px] font-medium text-muted-foreground">Unit</p><p className="max-w-28 truncate text-xs font-semibold">{unitLabel || 'Unavailable'}</p></div>
            </header>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <div className="min-w-0 space-y-2 rounded-inner bg-muted/35 p-3">
                <div className="flex min-w-0 items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><div className="min-w-0"><p className="text-[10px] font-semibold text-muted-foreground">Pickup</p><p className="line-clamp-2 text-xs font-medium">{pickupLabel}</p></div></div>
                <div className="flex min-w-0 items-start gap-2.5"><Hospital className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" /><div className="min-w-0"><p className="text-[10px] font-semibold text-muted-foreground">Destination</p><p className="truncate text-xs font-medium">{destination?.label || 'Not assigned'}</p></div></div>
              </div>
              <Button type="button" variant="ghost" onClick={handleNavigate} className="h-11 w-11 rounded-button bg-foreground/[0.07] p-0" aria-label={destination?.kind === 'hospital' ? 'Navigate to hospital' : 'Navigate to pickup'}><Navigation className="h-4 w-4" /></Button>
            </div>

            {trackingControl}
            {nextAction && (
              <>
                {nextAction.supportCopy && <p className="mt-2 text-[11px] text-muted-foreground">{nextAction.supportCopy}</p>}
                <div className={`mt-2 grid gap-2 ${isOffer ? 'grid-cols-[0.8fr_1.2fr]' : 'grid-cols-1'}`}>
                {isOffer && (
                  <Button type="button" variant="ghost" onClick={handleDecline} disabled={driverAction !== null} aria-busy={driverAction === 'decline'} className="h-12 rounded-button bg-muted/35 font-semibold">
                    {driverAction === 'decline' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}{declineArmed ? 'Confirm' : 'Decline'}
                  </Button>
                )}
                <Button type="button" onClick={handlePrimaryAction} disabled={driverAction !== null || nextAction.disabled} aria-busy={primaryPending} className="h-12 rounded-button bg-foreground font-semibold text-background hover:bg-foreground/90">
                  {primaryPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : nextAction.action === 'complete' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Navigation className="mr-2 h-4 w-4" />}
                  {primaryPending ? nextAction.busyLabel : completionArmed ? 'Confirm complete' : nextAction.label}
                </Button>
                </div>
              </>
            )}
          </div>
        ) : assignedAmbulance ? (
          <div className="px-5 pb-5 pt-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-icon bg-emerald-500/12 text-emerald-700 dark:text-emerald-200"><CheckCircle2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Ready for offers</h2><p className="truncate text-xs text-muted-foreground">{unitLabel} - Keep location live while on duty</p></div>{alertButton}</div>{trackingControl}</div>
        ) : (
          <div className="px-5 pb-5 pt-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-icon bg-amber-500/12 text-amber-700 dark:text-amber-200"><AlertTriangle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Unit link required</h2><p className="text-xs text-muted-foreground">Ask your organization admin to staff this account on an ambulance.</p></div>{alertButton}</div></div>
        )}
      </div>
    </section>
  );
}
