import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmHospitalTimezone,
  createStaffSchedule,
  deleteStaffSchedule,
  updateStaffSchedule,
} from '../../services/staffSchedulingService';
import { staffSchedulingKeys } from './staffScheduling.queryKeys';

export const useConsoleDoctorScheduleMutations = () => {
  const queryClient = useQueryClient();
  const converge = async () => {
    await queryClient.invalidateQueries({ queryKey: staffSchedulingKeys.root });
    await queryClient.invalidateQueries({ queryKey: ['hospitals'] });
  };

  const create = useMutation({
    mutationFn: createStaffSchedule,
    onSuccess: converge,
  });
  const update = useMutation({
    mutationFn: ({ scheduleId, schedule }) => updateStaffSchedule(scheduleId, schedule),
    onSuccess: converge,
  });
  const remove = useMutation({
    mutationFn: deleteStaffSchedule,
    onSuccess: converge,
  });
  const confirmTimezone = useMutation({
    mutationFn: ({ hospitalId, timezone }) => confirmHospitalTimezone(hospitalId, timezone),
    onSuccess: converge,
  });

  return { create, update, remove, confirmTimezone };
};

export default useConsoleDoctorScheduleMutations;
