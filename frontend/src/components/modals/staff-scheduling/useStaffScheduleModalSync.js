import { useEffect } from 'react';
import { subscribeToScheduleUpdates } from '../../../services/staffSchedulingService';

const INITIAL_NOTICES = [
  'Choose a facility to review its shifts.',
  'Loading shifts for this facility.',
];

export const useStaffScheduleModalSync = ({
  isOpen,
  readsEnabled,
  refetchSchedules,
  scheduleWindowReady,
  schedules,
  schedulesQuery,
  selectedFacility,
  selectedHospitalId,
  setNotice,
  staffList,
}) => {
  useEffect(() => {
    if (!isOpen || !selectedFacility || scheduleWindowReady) return;
    setNotice('Set a valid IANA timezone before loading this facility schedule.');
  }, [isOpen, scheduleWindowReady, selectedFacility, setNotice]);

  useEffect(() => {
    if (!isOpen || !selectedHospitalId || !scheduleWindowReady
      || schedulesQuery.isLoading || schedulesQuery.isFetching || schedulesQuery.error) return;
    setNotice((current) => {
      if (!INITIAL_NOTICES.includes(current)) return current;
      return schedules.length === 1
        ? '1 shift in this window.'
        : `${schedules.length} shifts in this window.`;
    });
  }, [isOpen, scheduleWindowReady, schedules.length, schedulesQuery.error,
    schedulesQuery.isFetching, schedulesQuery.isLoading, selectedHospitalId, setNotice]);

  useEffect(() => {
    if (!isOpen || !readsEnabled || !selectedHospitalId || staffList.length === 0) return undefined;
    let refreshTimer = null;
    const doctorIds = staffList.map((staff) => staff.doctor_id || staff.id).filter(Boolean);
    const unsubscribe = subscribeToScheduleUpdates(selectedHospitalId, doctorIds, () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => refetchSchedules(), 250);
    });
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [isOpen, readsEnabled, refetchSchedules, selectedHospitalId, staffList]);
};
