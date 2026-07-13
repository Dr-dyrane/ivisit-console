import React from 'react';

import { AmbulanceModalView } from './ambulance/AmbulanceModalView';
import { useAmbulanceModalController } from './ambulance/useAmbulanceModalController';

export { buildAmbulancePayload } from './ambulance/ambulanceModalModel';

export const AmbulanceModal = ({ isOpen, onClose, ambulance, mode, listFilter }) => {
  const controller = useAmbulanceModalController({
    isOpen,
    onClose,
    ambulance,
    mode,
    listFilter,
  });

  return <AmbulanceModalView {...controller} />;
};
