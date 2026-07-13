import React from 'react';

import { DoctorModalView } from './doctor/DoctorModalView';
import { useDoctorModalController } from './doctor/useDoctorModalController';

export { buildStaffPayload, normalizeForm } from './doctor/doctorModalModel';

export const DoctorModal = (props) => {
  const controller = useDoctorModalController(props);
  return <DoctorModalView {...controller} />;
};

export default DoctorModal;
