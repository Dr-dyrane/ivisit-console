import React from 'react';
import { LocateFixed, MapPin } from 'lucide-react';

const getLensLabel = (locationStatus, focusSource, radiusKm) => {
  if (locationStatus === 'locating') return 'Finding your area';
  if (focusSource === 'user') return `Within ${radiusKm} km`;
  if (focusSource === 'default') return `Default area - ${radiusKm} km`;
  return `Operational area - ${radiusKm} km`;
};

export const MapViewportSummary = ({
  lens,
  locationStatus,
  focusSource,
  compact = false,
  routeCount = 0,
}) => {
  const label = getLensLabel(locationStatus, focusSource, lens.radiusKm);
  const LocationIcon = focusSource === 'user' ? LocateFixed : MapPin;

  if (compact) {
    return (
      <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-2 pt-2 text-[11px] font-medium text-muted-foreground" aria-label="Map area summary">
        <div className="flex min-w-0 items-center gap-2">
          <LocationIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-foreground/75">
          <span>{lens.requests} requests</span>
          <span>{lens.hospitals} hospitals</span>
        </div>
        {routeCount > 0 && (
          <span className="col-span-2 text-right text-foreground/75">Route preview</span>
        )}
      </div>
    );
  }

  const metrics = [
    { label: 'Requests shown', value: lens.requests },
    { label: 'Hospitals shown', value: lens.hospitals },
    { label: 'Units shown', value: lens.ambulances },
  ];

  return (
    <section className="absolute left-6 top-6 z-[120] w-[19rem] rounded-card bg-card/72 p-4 shadow-e3 backdrop-blur-2xl" aria-label="Map area summary">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <LocationIcon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-inner bg-muted/40 p-2">
            <div className="text-[10px] leading-tight text-muted-foreground">{metric.label}</div>
            <div className="mt-1 text-sm font-semibold">{metric.value}</div>
          </div>
        ))}
      </div>
      {routeCount > 0 && (
        <div className="mt-2 text-[10px] font-medium text-muted-foreground">Route preview for the selected request</div>
      )}
    </section>
  );
};
