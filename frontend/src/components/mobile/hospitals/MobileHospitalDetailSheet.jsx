import React from 'react';
import {
  Ambulance,
  BadgeCheck,
  BadgeX,
  Bed,
  CalendarDays,
  Clock,
  Edit,
  Eye,
  Hash,
  History,
  Hospital,
  MapPin,
  Phone,
  Star,
  Trash2,
  Zap,
} from 'lucide-react';
import { MobileDetailSheet } from '../MobileDetailSheet';
import { statusPill } from '../../../constants/vitalTracks';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import {
  facilityTypeLabel,
  getMobileHospitalDetailModel,
  mapsHref,
} from './mobileHospitalsModel';

export const MobileHospitalDetailSheet = ({
  activeHospital,
  setActiveHospital,
  onView,
  onEdit,
  onDelete,
  onSchedule,
  canDelete,
  canManage,
  triggerFromEvent,
}) => {
  if (!activeHospital) return null;

  const model = getMobileHospitalDetailModel(activeHospital);

  return (
    <MobileDetailSheet
      isOpen={!!activeHospital}
      onClose={() => setActiveHospital(null)}
      icon={Hospital}
      iconTone={model.statusColor}
      eyebrow={facilityTypeLabel(activeHospital)}
      title={activeHospital.name || 'Unnamed Hospital'}
      statusPill={statusPill(model.status)}
      islands={[
        {
          icon: MapPin,
          label: 'Address',
          value: activeHospital.address || 'No address provided',
          href: mapsHref(activeHospital),
        },
        model.phone && {
          icon: Phone,
          label: 'Phone',
          value: model.phone,
          href: `tel:${String(model.phone).replace(/[\s-]/g, '')}`,
        },
        {
          icon: Bed,
          label: 'Beds',
          value: model.totalBeds > 0
            ? `${model.beds} of ${model.totalBeds} available`
            : `${model.beds} available`,
        },
        model.icuBeds != null && Number.isFinite(model.icuBeds) && {
          icon: Bed,
          label: 'ICU beds',
          value: `${model.icuBeds}`,
        },
        {
          icon: Ambulance,
          label: 'Fleet',
          value: `${model.fleet} ambulance${model.fleet === 1 ? '' : 's'}`,
        },
        model.waitValue && {
          icon: Clock,
          label: 'Wait time',
          value: model.waitValue,
        },
        model.eligibility && {
          icon: Zap,
          label: 'Eligibility',
          value: model.eligibility,
        },
        model.availabilityUpdated && {
          icon: History,
          label: 'Availability updated',
          value: model.availabilityUpdated,
        },
        {
          icon: Star,
          label: 'Rating',
          value: model.rating > 0 ? model.rating.toFixed(1) : 'Not rated',
        },
        {
          icon: activeHospital.verified ? BadgeCheck : BadgeX,
          label: 'Verification',
          value: activeHospital.verified ? 'Verified' : 'Not verified',
        },
        {
          icon: Hash,
          label: 'Facility ID',
          value: model.facilityId,
          onPress: (event) => {
            navigator.clipboard?.writeText(model.facilityId)?.catch(() => {});
            triggerFromEvent(event, {
              variant: FEEDBACK_TYPES.SUCCESS,
              color: 'hsl(var(--spark))',
              haptic: true,
              sound: true,
            });
          },
        },
      ]}
      primary={{
        label: 'Details',
        icon: Eye,
        onClick: () => {
          setActiveHospital(null);
          onView(activeHospital);
        },
      }}
      secondary={canManage ? {
        icon: Edit,
        onClick: () => {
          setActiveHospital(null);
          onEdit(activeHospital);
        },
        'aria-label': `Edit ${activeHospital.name || 'facility'}`,
      } : undefined}
    >
      {model.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {model.specialties.slice(0, 4).map((specialty) => (
            <span
              key={specialty}
              className="inline-flex items-center rounded-pill bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/[0.08]"
            >
              {specialty}
            </span>
          ))}
          {model.specialties.length > 4 && (
            <span className="inline-flex items-center rounded-pill px-2 py-1 text-[11px] font-semibold text-muted-foreground/60">
              +{model.specialties.length - 4} more
            </span>
          )}
        </div>
      )}

      {canManage && (onSchedule || (canDelete && onDelete)) && (
        <div className="flex gap-2 pt-1">
          {onSchedule && (
            <button
              type="button"
              onClick={() => {
                setActiveHospital(null);
                onSchedule(activeHospital);
              }}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-foreground/[0.06] text-sm font-semibold text-foreground transition-all active:scale-[0.96] hover:bg-foreground/10 dark:bg-white/[0.08]"
            >
              <CalendarDays className="h-4 w-4" />
              Schedule
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => {
                setActiveHospital(null);
                onDelete(activeHospital);
              }}
              aria-label={`Delete ${activeHospital.name || 'facility'}`}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-transform active:scale-[0.96] hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </MobileDetailSheet>
  );
};
