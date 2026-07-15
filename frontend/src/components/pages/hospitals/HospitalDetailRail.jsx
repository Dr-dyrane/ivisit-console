import React from 'react';
import {
  Activity,
  Ambulance,
  BadgeCheck,
  Bed,
  Building2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Hospital,
  MapPin,
  Phone,
  Star,
  Tag,
  Timer,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { CopyChip, DetailLine, Shimmer, StageStrip, StatusPill } from '../../console/primitives';
import { getHospitalRailModel } from './hospitalPageModel';
import { HospitalAvatar } from './HospitalAvatar';
import {
  HOSPITAL_VERIFICATION_FILL,
  HOSPITAL_VERIFICATION_ORDER,
  hospitalStatusIcon,
  hospitalStatusLabel,
  hospitalStatusPillClass,
} from './hospitalPresentation';

export const HospitalDetailRail = ({
  hospital,
  loading,
  hasFilter = false,
  canEdit,
  onView,
  onEdit,
  activeActionFeedback,
  embedded = false,
}) => {
  if (loading) {
    return (
      <DetailRailShell embedded={embedded}>
        <Shimmer className="h-5 w-28 rounded-pill" />
        <Shimmer className="mt-6 h-24 rounded-card" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
          <Shimmer className="h-14 rounded-card" />
        </div>
      </DetailRailShell>
    );
  }

  if (!hospital) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Hospital className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No facility selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Facilities that match your filters will appear here.'
              : 'Facilities will appear here when the list has results.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const model = getHospitalRailModel(hospital, activeActionFeedback);
  const StatusIcon = hospitalStatusIcon[model.statusKey] || Hospital;
  const railStageIndex = Math.max(0, HOSPITAL_VERIFICATION_ORDER.indexOf(model.verificationKey));
  const railStageFill = HOSPITAL_VERIFICATION_FILL[model.verificationKey] || 'bg-foreground/60';

  return (
    <DetailRailShell embedded={embedded}>
      <div data-testid="hospitals-detail-rail">
        <RailInsetHero>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">Hospital details</h2>
              {model.displayId && (
                <div className="mt-1 flex min-w-0 items-center gap-1">
                  <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={model.displayId}>{model.displayId}</p>
                  <CopyChip value={model.displayId} label="Copy record ID" />
                </div>
              )}
              <div className="mt-4">
                <StatusPill
                  icon={StatusIcon}
                  label={hospitalStatusLabel[model.statusKey] || model.statusKey.replace(/_/g, ' ')}
                  className={hospitalStatusPillClass[model.statusKey] || 'bg-muted/40 text-muted-foreground'}
                />
              </div>
              <StageStrip
                order={HOSPITAL_VERIFICATION_ORDER}
                fillClass={railStageFill}
                activeIndex={railStageIndex}
                muted={model.rejected}
              />
            </div>
            {hospital.verified && (
              <span className="shrink-0 rounded-pill bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <HospitalAvatar hospital={hospital} size="h-14 w-14" iconSize="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight" title={model.facilityName}>{model.facilityName}</p>
              <p className="mt-0.5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{hospital.address || 'No address provided'}</span>
              </p>
            </div>
          </div>
        </RailInsetHero>

        <div className="space-y-3">
          <DetailLine icon={Bed} label="Beds" value={model.bedsValue} />
          <DetailLine icon={Timer} label="ER wait" value={model.erWaitValue} />
          <DetailLine icon={BadgeCheck} label="Eligibility" value={model.eligibility} />
          <DetailLine icon={Ambulance} label="Fleet" value={model.fleet} />
          <DetailLine icon={Star} label="Rating" value={model.rating} />
          <DetailLine icon={Activity} label="Care" value={hospital.emergency_level || 'Not set'} />
          <DetailLine
            icon={Phone}
            label="Phone"
            value={hospital.phone ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <span className="truncate">{hospital.phone}</span>
                <CopyChip value={hospital.phone} label="Copy phone number" />
              </span>
            ) : 'No phone'}
          />
          <DetailLine icon={Building2} label="Tier" value={hospital.type || 'Not set'} />
          <DetailLine icon={Tag} label="Price" value={hospital.price_range || 'Not set'} />
          <DetailLine icon={Clock} label="Updated" value={hospital.last_availability_update ? new Date(hospital.last_availability_update).toLocaleString() : 'Unknown'} />
          <DetailLine
            icon={MapPin}
            label="Location"
            value={model.hasCoordinates ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${model.latitude},${model.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-sky-700 transition-colors hover:text-sky-600 dark:text-sky-300"
              >
                Open in Google Maps
              </a>
            ) : 'Not set'}
          />
        </div>

        <div className="mt-5 rounded-inner bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
          <p className="text-sm font-semibold">Capacity changes need review</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Use Requests for reservation changes. This panel is read-only evidence until an approved action opens.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(hospital)}
            className={`h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95 ${model.viewOpening ? 'scale-95' : ''}`}
            aria-busy={model.viewOpening}
            data-state={model.viewOpening ? 'opening' : 'idle'}
          >
            <Eye className="mr-2 h-4 w-4" />
            {model.viewOpening ? 'Opening...' : 'Details'}
            <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              onClick={() => onEdit(hospital)}
              className={`h-12 w-full rounded-card bg-muted/26 text-sm font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${model.editOpening ? 'bg-foreground/10 scale-95' : ''}`}
              aria-busy={model.editOpening}
              data-state={model.editOpening ? 'opening' : 'idle'}
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
