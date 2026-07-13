import React from 'react';
import {
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { statusLabel } from './mapPresentation';

export function DriverAssignmentCard({
  assignedAmbulance,
  driverAction,
  driverActiveEmergency,
  driverLocationRecorded,
  onPingLocation,
  onStatusUpdate,
}) {
  return (
    <div className="absolute left-6 top-6 z-[120] w-[20rem] rounded-card bg-card/68 p-4 shadow-e3 backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-medium text-muted-foreground">Current request</div>
        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Radio className="h-3.5 w-3.5" />
          Assigned
        </div>
      </div>

      {driverActiveEmergency ? (
        <>
          <div className="mb-3 space-y-2">
            <div className="text-sm font-semibold">
              Request #{driverActiveEmergency?.display_id || driverActiveEmergency?.id?.slice(-6)}
            </div>
            <div className="text-xs text-muted-foreground">
              Status: <span className="font-semibold text-foreground">{statusLabel(driverActiveEmergency?.status, 'Not recorded')}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Unit: <span className="font-semibold text-foreground">{assignedAmbulance?.call_sign || assignedAmbulance?.vehicle_number || 'Unassigned'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Location: <span className="font-semibold text-foreground">{driverLocationRecorded ? 'Recorded' : 'Not recorded'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPingLocation}
              disabled={driverAction !== null}
              className="rounded-button bg-muted/40 hover:bg-muted/60"
              aria-label={driverAction === 'ping' ? 'Sharing location' : 'Share location'}
              aria-busy={driverAction === 'ping'}
            >
              {driverAction === 'ping' ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="mr-1 h-3.5 w-3.5" />}
              {driverAction === 'ping' ? 'Sharing' : 'Share'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusUpdate('accepted')}
              disabled={driverAction !== null || driverActiveEmergency?.status === 'accepted'}
              className="rounded-button bg-sky-500/12 text-sky-700 hover:bg-sky-500/18 dark:text-sky-200"
              aria-label={driverAction === 'accepted' ? 'Saving on way' : 'Mark on way'}
              aria-busy={driverAction === 'accepted'}
            >
              {driverAction === 'accepted' ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-1 h-3.5 w-3.5" />}
              {driverAction === 'accepted' ? 'Saving' : 'On way'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusUpdate('arrived')}
              disabled={driverAction !== null || driverActiveEmergency?.status === 'arrived'}
              className="rounded-button bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:text-emerald-200"
              aria-label={driverAction === 'arrived' ? 'Saving arrived' : 'Mark arrived'}
              aria-busy={driverAction === 'arrived'}
            >
              {driverAction === 'arrived' ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Clock className="mr-1 h-3.5 w-3.5" />}
              {driverAction === 'arrived' ? 'Saving' : 'Arrived'}
            </Button>
            <Button
              size="sm"
              onClick={() => onStatusUpdate('completed')}
              disabled={driverAction !== null || !['arrived', 'accepted', 'in_progress'].includes(String(driverActiveEmergency?.status || '').toLowerCase())}
              className="rounded-button bg-foreground text-background hover:bg-foreground/90"
              aria-label={driverAction === 'completed' ? 'Closing request' : 'Close request'}
              aria-busy={driverAction === 'completed'}
            >
              {driverAction === 'completed' ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
              {driverAction === 'completed' ? 'Closing' : 'Done'}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground">
          No active assignment yet. Keep this map open for updates.
        </div>
      )}
    </div>
  );
}
