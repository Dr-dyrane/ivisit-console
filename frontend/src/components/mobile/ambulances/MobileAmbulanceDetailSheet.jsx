import React from 'react';
import {
  Activity,
  Ambulance,
  Car,
  Clock,
  Edit,
  Eye,
  Hash,
  MapPin,
  Radio,
} from 'lucide-react';
import { MobileDetailSheet } from '../MobileDetailSheet';
import { useFeedback } from '../../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import { statusPill } from '../../../constants/vitalTracks';
import { getMobileAmbulanceDetailModel } from './mobileAmbulancesModel';

export const MobileAmbulanceDetailSheet = ({
  ambulance,
  canManage,
  onClose,
  onView,
  onEdit,
}) => {
  const { triggerFromEvent } = useFeedback();
  const model = getMobileAmbulanceDetailModel(ambulance);
  if (!model) return null;

  return (
    <MobileDetailSheet
      isOpen={!!ambulance}
      onClose={onClose}
      icon={Ambulance}
      iconTone={model.color}
      eyebrow={model.typeLabel}
      title={ambulance.call_sign || 'Unknown Unit'}
      statusPill={statusPill(model.status, model.availabilityLabel)}
      islands={[
        { icon: MapPin, label: 'Station', value: model.station },
        model.activeRun && { icon: Clock, label: 'ETA', value: ambulance.eta || 'Unknown' },
        model.vehicleLabel && { icon: Car, label: 'Vehicle', value: model.vehicleLabel },
        ambulance.current_call && {
          icon: Radio,
          label: 'Active call',
          value: `Request ${String(ambulance.current_call).slice(0, 8).toUpperCase()}`,
        },
        { icon: Activity, label: 'Status', value: model.availabilityLabel },
        {
          icon: Hash,
          label: 'Unit ID',
          value: model.unitId,
          onPress: (event) => {
            navigator.clipboard?.writeText(model.unitId)?.catch(() => {});
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
          onClose();
          onView(ambulance);
        },
      }}
      secondary={canManage ? {
        icon: Edit,
        onClick: () => {
          onClose();
          onEdit(ambulance);
        },
        'aria-label': `Edit ${ambulance.call_sign || 'unit'}`,
      } : undefined}
    />
  );
};
