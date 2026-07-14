import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAvailableStaff,
  getScheduleFacilities,
  getStaffScheduleById,
  getStaffSchedules,
} from '../../services/staffSchedulingService';
import { staffSchedulingKeys } from './staffScheduling.queryKeys';

export const useConsoleDoctorSchedulesQuery = ({
  hospitalId,
  dateFrom,
  dateTo,
  enabled = false,
} = {}) => {
  const filter = { hospital_id: hospitalId || null, date_from: dateFrom, date_to: dateTo };
  return useQuery({
    queryKey: staffSchedulingKeys.schedules(filter),
    queryFn: () => getStaffSchedules(filter),
    enabled: enabled && Boolean(dateFrom && dateTo),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
};

export const useScheduleFacilitiesQuery = (enabled = false) => useQuery({
  queryKey: staffSchedulingKeys.facilities(),
  queryFn: getScheduleFacilities,
  enabled,
  staleTime: 60_000,
});

export const useScheduleRosterQuery = (hospitalId, enabled = false) => useQuery({
  queryKey: staffSchedulingKeys.roster(hospitalId),
  queryFn: () => getAvailableStaff(hospitalId),
  enabled: enabled && Boolean(hospitalId),
  staleTime: 30_000,
});

export const useScheduleDetailQuery = (scheduleId, enabled = false) => useQuery({
  queryKey: staffSchedulingKeys.detail(scheduleId),
  queryFn: () => getStaffScheduleById(scheduleId),
  enabled: enabled && Boolean(scheduleId),
});

export const useInvalidateStaffScheduling = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: staffSchedulingKeys.root });
};
