import React from 'react';
import { StaffSchedulingModalView } from './staff-scheduling/StaffSchedulingModalView';
import { useStaffSchedulingModalController } from './staff-scheduling/useStaffSchedulingModalController';

const StaffSchedulingModal = ({
  isOpen,
  onClose,
  hospitalId,
  initialDoctor = null,
  scheduleId = null,
}) => {
  const controller = useStaffSchedulingModalController({
    hospitalId,
    initialDoctor,
    isOpen,
    scheduleId,
  });

  if (!isOpen) return null;

  return (
    <StaffSchedulingModalView
      controller={controller}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default StaffSchedulingModal;
