import React from 'react';

import { DoctorModal } from '../../modals/DoctorModal';
import { ProfileEditModal } from '../../modals/ProfileEditModal';
import { SecurityModal } from '../../modals/SecurityModal';

export const SettingsModalStack = ({
  isProfileModalOpen,
  isSecurityModalOpen,
  isDoctorModalOpen,
  providerAccount,
  doctorProfile,
  onCloseProfile,
  onCloseSecurity,
  onCloseDoctor,
}) => (
  <>
    <ProfileEditModal
      isOpen={isProfileModalOpen}
      onClose={onCloseProfile}
    />
    <SecurityModal
      isOpen={isSecurityModalOpen}
      onClose={onCloseSecurity}
    />
    {providerAccount && doctorProfile && (
      <DoctorModal
        isOpen={isDoctorModalOpen}
        onClose={onCloseDoctor}
        doctor={doctorProfile}
        mode="view"
      />
    )}
  </>
);
