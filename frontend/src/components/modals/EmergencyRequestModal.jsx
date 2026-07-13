import React from 'react';
import { EmergencyRequestModalView } from './emergency-request/EmergencyRequestModalView';
import { useEmergencyRequestModalController } from './emergency-request/useEmergencyRequestModalController';

export const EmergencyRequestModal = ({ isOpen, onClose, request, mode }) => {
  const controller = useEmergencyRequestModalController({
    isOpen,
    onClose,
    request,
    mode,
  });

  return (
    <EmergencyRequestModalView
      isOpen={isOpen}
      onClose={onClose}
      controller={controller}
    />
  );
};
