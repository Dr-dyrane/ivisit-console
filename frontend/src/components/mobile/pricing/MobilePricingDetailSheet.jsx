import React from 'react';
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Globe,
  Layers,
} from 'lucide-react';
import { statusPill } from '../../../constants/vitalTracks';
import { MobileDetailSheet } from '../MobileDetailSheet';
import {
  formatMobilePricingMoney,
  formatPricingLabel,
  getMobilePricingFamily,
  getMobilePricingTitle,
  getMobilePricingUpdatedAt,
} from './mobilePricingModel';

export const MobilePricingDetailSheet = ({ activeItem, onClose }) => {
  if (!activeItem) return null;

  const pricingFamily = getMobilePricingFamily(activeItem);
  const updatedAt = getMobilePricingUpdatedAt(activeItem);
  const facilityName = activeItem.facilityName || activeItem.facility_name;

  return (
    <MobileDetailSheet
      isOpen
      onClose={onClose}
      icon={BadgeDollarSign}
      iconTone="hsl(var(--foreground))"
      eyebrow={formatPricingLabel(pricingFamily)}
      title={getMobilePricingTitle(activeItem)}
      statusPill={statusPill(
        activeItem.status || (activeItem.is_active ? 'active' : 'inactive'),
      )}
      islands={[
        {
          icon: BadgeDollarSign,
          label: 'Price',
          value: `${formatMobilePricingMoney(activeItem)} / ${pricingFamily === 'room' ? 'night' : 'unit'}`,
        },
        activeItem.unit
          ? { icon: Layers, label: 'Unit', value: activeItem.unit }
          : null,
        facilityName
          ? { icon: Building2, label: 'Facility', value: facilityName }
          : { icon: Globe, label: 'Scope', value: 'Platform fallback' },
        {
          icon: CalendarDays,
          label: 'Updated',
          value: updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Date unknown',
        },
      ]}
    />
  );
};
