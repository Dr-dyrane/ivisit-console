import React from 'react';
import {
  Activity,
  Ambulance,
  CalendarDays,
  Clock,
  Edit,
  Eye,
  MapPin,
  Navigation,
  Tag,
  Truck,
  Wrench,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { CopyChip, DetailLine, Shimmer, StatusPill } from '../../console/primitives';
import {
  getAmbulanceStatusIcon,
  getAmbulanceStatusLabel,
  getAmbulanceStatusToneClass,
} from '../../../constants/ambulanceStatus';
import { getAmbulanceRailModel } from './ambulancePageModel';
import { AmbulanceAvatar } from './AmbulanceList';

export const AmbulanceDetailRail = ({
  ambulance,
  loading,
  hasFilter,
  canEdit,
  onView,
  onEdit,
  activeActionFeedback,
  embedded = false,
}) => {
  if (loading) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="mb-4 h-5 w-28 rounded-pill bg-muted/40" />
        <Shimmer className="h-28 rounded-card" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
        </div>
      </DetailRailShell>
    );
  }

  if (!ambulance) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Ambulance className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No unit selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Units that match your filters will appear here.'
              : 'Fleet units will appear here when the list has results.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const model = getAmbulanceRailModel(ambulance, activeActionFeedback);
  const StatusIcon = getAmbulanceStatusIcon(model.status);

  return (
    <DetailRailShell embedded={embedded}>
      <div data-testid="ambulances-detail-rail">
        <RailInsetHero>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">Unit details</h2>
              {model.displayId && (
                <div className="mt-1 flex min-w-0 items-center gap-1">
                  <p
                    className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground"
                    title={model.displayId}
                  >
                    {model.displayId}
                  </p>
                  <CopyChip value={model.displayId} label="Copy unit ID" />
                </div>
              )}
              <div className="mt-4">
                <StatusPill
                  icon={StatusIcon}
                  label={getAmbulanceStatusLabel(model.status)}
                  className={getAmbulanceStatusToneClass(model.status)}
                />
              </div>
            </div>
            <span className="shrink-0 rounded-pill bg-muted/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Fleet
            </span>
          </div>

          <div className="flex items-center gap-4">
            <AmbulanceAvatar size="h-14 w-14" iconSize="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight" title={model.callSign}>
                {model.callSign}
              </p>
              <p className="mt-0.5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{model.station}</span>
              </p>
            </div>
          </div>
        </RailInsetHero>

        <div className="space-y-3">
          <DetailLine icon={Truck} label="Vehicle" value={model.vehicle} />
          <DetailLine icon={Clock} label="ETA" value={ambulance.eta || 'Not set'} />
          <DetailLine icon={Wrench} label="Type" value={ambulance.type || 'Standard'} />
          <DetailLine
            icon={Ambulance}
            label="Plate"
            value={ambulance.vehicle_number || ambulance.license_plate || 'Not set'}
          />
          <DetailLine icon={Activity} label="Crew" value={model.crewLabel} />
          <DetailLine icon={Tag} label="Base price" value={model.basePriceLabel} />
          <DetailLine icon={Navigation} label="Position" value={model.positionLabel} />
          <DetailLine icon={CalendarDays} label="Commissioned" value={model.commissionedLabel} />
          <DetailLine
            icon={Clock}
            label="Updated"
            value={ambulance.updated_at ? new Date(ambulance.updated_at).toLocaleString() : 'Unknown'}
          />
        </div>

        <div className="mt-5 rounded-inner bg-cyan-500/10 p-4 text-cyan-800 dark:text-cyan-200">
          <p className="text-sm font-semibold">Dispatch changes stay in Requests</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            This panel is read-only fleet evidence. Trip status and location commands need a linked request owner.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(ambulance)}
            className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95 ${model.viewOpening ? 'scale-95' : ''}`}
            aria-busy={model.viewOpening}
          >
            <Eye className="mr-2 h-4 w-4" />
            {model.viewOpening ? 'Opening...' : 'Details'}
          </Button>

          {canEdit && (
            <Button
              variant="ghost"
              onClick={() => onEdit(ambulance)}
              className={`h-12 w-full rounded-card bg-muted/26 text-sm font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${model.editOpening ? 'scale-95 bg-foreground/10' : ''}`}
              aria-busy={model.editOpening}
            >
              <Edit className="mr-2 h-4 w-4" />
              {model.editOpening ? 'Opening...' : 'Edit'}
            </Button>
          )}
        </div>
      </div>
    </DetailRailShell>
  );
};
