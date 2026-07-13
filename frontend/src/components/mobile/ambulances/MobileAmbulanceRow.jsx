import React from 'react';
import { Ambulance } from 'lucide-react';
import { MobileListRow } from '../canon';
import { statusPill } from '../../../constants/vitalTracks';
import { getMobileAmbulanceRowModel } from './mobileAmbulancesModel';

export const MobileAmbulanceRow = ({
  ambulance,
  onOpen,
  selectionEnabled,
  selectedIdSet,
  selectionMode,
  onSelect,
}) => {
  const model = getMobileAmbulanceRowModel(ambulance);
  const selected = selectedIdSet.has(ambulance.id);

  return (
    <MobileListRow
      item={ambulance}
      dataAttr="data-mobile-ambulance-row"
      onOpen={onOpen}
      ariaLabel={`${model.title}, ${model.availabilityLabel}`}
      orbClass={model.orbClass}
      icon={Ambulance}
      title={model.title}
      meta={model.meta}
      time={model.time}
      pill={statusPill(model.status, model.availabilityLabel)}
      selectable={selectionEnabled}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={(item) => onSelect?.(item.id, !selectedIdSet.has(item.id))}
      onLongPress={(item) => onSelect?.(item.id, true)}
    />
  );
};
