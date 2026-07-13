import React from 'react';
import { Hospital } from 'lucide-react';
import { MobileListRow } from '../canon';
import { statusPill } from '../../../constants/vitalTracks';
import { getMobileHospitalRowModel } from './mobileHospitalsModel';

export const MobileHospitalRow = ({
  hospital,
  onOpen,
  selectionEnabled,
  selected,
  selectionMode,
  onSelect,
}) => {
  const model = getMobileHospitalRowModel(hospital);

  return (
    <MobileListRow
      item={hospital}
      dataAttr="data-mobile-hospital-row"
      onOpen={onOpen}
      ariaLabel={`${model.title}, ${model.status}`}
      orbClass={model.orbClass}
      icon={Hospital}
      title={model.title}
      meta={model.meta}
      time={model.freshness}
      markerChip={model.markerChip}
      pill={statusPill(model.status)}
      selectable={selectionEnabled}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={(item) => onSelect?.(item.id, !selected)}
      onLongPress={(item) => onSelect?.(item.id, true)}
    />
  );
};
