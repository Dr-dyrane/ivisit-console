import React from 'react';
import { StaffSchedulerView } from './staff-scheduler/StaffSchedulerView';
import { useStaffSchedulerController } from './staff-scheduler/useStaffSchedulerController';

const StaffScheduler = () => {
  const controller = useStaffSchedulerController();

  return <StaffSchedulerView controller={controller} />;
};

export default StaffScheduler;
