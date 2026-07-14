import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
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
import { formatEmergencyLocation } from '../../../utils/locationUtils';
import {
  buildDriverDirectionsUrl,
  formatLocationSharedAt,
  formatOfferExpiry,
  getDriverDestination,
  getDriverNextAction,
  getDriverUnitLabel,
} from './driverAssignmentModel';
import { statusLabel } from './mapPresentation';

const trackingCopy = (tracking, locationRecorded) => {
  if (tracking.status === 'starting') return 'Starting live location';
  if (tracking.status === 'error') return tracking.error;
  if (tracking.isActive) return formatLocationSharedAt(tracking.lastSharedAt);
  if (tracking.telemetryState?.state === 'delayed') return 'Last signal is delayed';
  if (tracking.telemetryState?.state === 'lost') return 'Live signal is unavailable';
  return locationRecorded ? 'Last location recorded' : 'Keep this map open to share';
};

export function DriverAssignmentCard({
  assignedAmbulance,
  driverAction,
  driverAssignment,
  driverFeedError,
  driverFeedLoading,
  driverLocationRecorded,
  driverTracking,
  onAssignmentAction,
  hospitals,
}) {
  const [completionArmed, setCompletionArmed] = useState(false);
  const [declineArmed, setDeclineArmed] = useState(false);
  const nextAction = getDriverNextAction(driverAssignment?.assignment_status);
  const destination = getDriverDestination({ emergency: driverAssignment, hospitals });
  const directionsUrl = buildDriverDirectionsUrl(destination?.coordinates);
  const unitLabel = getDriverUnitLabel({ ambulance: assignedAmbulance, emergency: driverAssignment });
  const offerCopy = formatOfferExpiry(driverAssignment?.offer_expires_at);
  const isOffer = driverAssignment?.assignment_status === 'offered';

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

  const trackingControl = assignedAmbulance && (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-inner bg-muted/25 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold">{driverTracking.isActive ? 'Live location on' : 'Live location'}</p>
        <p className={`truncate text-[11px] ${driverTracking.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {trackingCopy(driverTracking, driverLocationRecorded)}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => (driverTracking.isActive ? driverTracking.stop() : driverTracking.start())}
        className="h-9 rounded-button bg-foreground/[0.07] px-3"
        aria-busy={driverTracking.status === 'starting'}
      >
        {driverTracking.status === 'starting'
          ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          : <LocateFixed className="mr-1.5 h-3.5 w-3.5" />}
        {driverTracking.isActive ? 'Stop' : 'Go live'}
      </Button>
    </div>
  );

  return (
    <section className="absolute left-24 top-6 z-[120] w-[21rem] overflow-hidden rounded-card bg-card/72 p-4 shadow-e3 backdrop-blur-2xl" aria-label="Driver assignment">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
          <Radio className="h-3.5 w-3.5" />
          {isOffer ? 'New offer' : 'Driver status'}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground">{unitLabel || 'Unit unavailable'}</div>
      </div>

      {driverFeedLoading && !driverAssignment ? (
        <div className="space-y-2" aria-label="Loading driver assignments">
          <div className="h-14 animate-pulse rounded-inner bg-muted/35" />
          <div className="h-10 animate-pulse rounded-button bg-muted/30" />
        </div>
      ) : driverFeedError && !driverAssignment ? (
        <div className="rounded-inner bg-amber-500/10 px-4 py-4 text-center">
          <AlertTriangle className="mx-auto h-5 w-5 text-amber-700 dark:text-amber-200" />
          <p className="mt-2 text-sm font-semibold">Assignments unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{driverFeedError}</p>
        </div>
      ) : driverAssignment ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">Emergency request</h2>
              <p className="text-xs text-muted-foreground">
                #{driverAssignment.display_id || driverAssignment.request_id?.slice(-6)} - {statusLabel(driverAssignment.assignment_status, 'Assigned')}
              </p>
              {isOffer && offerCopy && <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-200">{offerCopy}</p>}
            </div>
            <Button type="button" variant="ghost" onClick={handleNavigate} className="h-9 w-9 rounded-button bg-muted/35 p-0" aria-label="Open driving directions">
              <Navigation className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 space-y-2 rounded-inner bg-muted/28 p-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0"><p className="text-[10px] font-semibold text-muted-foreground">Pickup</p><p className="line-clamp-2 text-xs font-medium">{formatEmergencyLocation(driverAssignment.patient_location)}</p></div>
            </div>
            <div className="flex items-start gap-2">
              <Hospital className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
              <div className="min-w-0"><p className="text-[10px] font-semibold text-muted-foreground">Destination</p><p className="truncate text-xs font-medium">{destination?.label || 'Not assigned'}</p></div>
            </div>
          </div>

          {trackingControl}
          {nextAction && (
            <div className={`mt-2 grid gap-2 ${isOffer ? 'grid-cols-[0.8fr_1.2fr]' : 'grid-cols-1'}`}>
              {isOffer && (
                <Button type="button" variant="ghost" onClick={handleDecline} disabled={driverAction !== null} className="h-11 rounded-button bg-muted/35" aria-busy={driverAction === 'decline'}>
                  {driverAction === 'decline' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  {declineArmed ? 'Confirm' : 'Decline'}
                </Button>
              )}
              <Button type="button" onClick={handlePrimaryAction} disabled={driverAction !== null} className="h-11 rounded-button bg-foreground font-semibold text-background hover:bg-foreground/90" aria-busy={driverAction === nextAction.action}>
                {driverAction === nextAction.action ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : nextAction.action === 'complete' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Navigation className="mr-2 h-4 w-4" />}
                {driverAction === nextAction.action ? nextAction.busyLabel : completionArmed ? 'Confirm complete' : nextAction.label}
              </Button>
            </div>
          )}
        </>
      ) : assignedAmbulance ? (
        <div><div className="rounded-inner bg-muted/25 px-4 py-4 text-center"><CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-300" /><p className="mt-2 text-sm font-semibold">Ready for offers</p><p className="mt-1 text-xs text-muted-foreground">Keep location live while on duty</p></div>{trackingControl}</div>
      ) : (
        <div className="rounded-inner bg-amber-500/10 px-4 py-5 text-center"><AlertTriangle className="mx-auto h-5 w-5 text-amber-700 dark:text-amber-200" /><p className="mt-2 text-sm font-semibold">Unit link required</p><p className="mt-1 text-xs text-muted-foreground">Ask your organization admin to staff this account on an ambulance.</p></div>
      )}
    </section>
  );
}
