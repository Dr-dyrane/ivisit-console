import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  checkScheduleConflicts,
  createStaffSchedule,
  deleteStaffSchedule,
  getAvailableStaff,
  getScheduleStats,
  getStaffSchedules,
  updateStaffSchedule,
} from '../../../services/staffSchedulingService';
import { handleApiError } from '../../../utils/errorHandler';
import {
  createEditScheduleDraft,
  createScheduleDraft,
} from './schedulePresentation';

export const useStaffSchedulingModalController = ({ isOpen, hospitalId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(false);
  const [newSchedule, setNewSchedule] = useState(() => createScheduleDraft(hospitalId));

  const loadSchedulingData = useCallback(async () => {
    try {
      setLoading(true);

      const { schedules: scheduleData } = await getStaffSchedules({
        hospital_id: hospitalId,
      });
      setSchedules(scheduleData);

      setFetchingStaff(true);
      const staff = await getAvailableStaff(hospitalId);
      setStaffList(staff);

      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const statsData = await getScheduleStats(
        hospitalId,
        today,
        weekEnd.toISOString().split('T')[0],
      );
      setStats(statsData);
    } catch (error) {
      console.error('Error loading scheduling data:', error);
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
      setFetchingStaff(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    if (isOpen) {
      loadSchedulingData();
    }
  }, [isOpen, loadSchedulingData]);

  useEffect(() => {
    const bottomBar = document.getElementById('dynamic-bottom-bar');
    if (!bottomBar) return undefined;

    const previousDisplay = bottomBar.style.display;
    if (isOpen) {
      bottomBar.style.display = 'none';
    }

    return () => {
      bottomBar.style.display = previousDisplay;
    };
  }, [isOpen]);

  const handleAddSchedule = async () => {
    if (!newSchedule.profile_id || !newSchedule.date) {
      toast.error('Please select a staff member and date');
      return;
    }

    try {
      setLoading(true);
      const conflicts = await checkScheduleConflicts(
        newSchedule.profile_id,
        newSchedule.date,
        newSchedule.start_time,
        newSchedule.end_time,
      );

      if (conflicts.has_conflicts) {
        toast.error('Scheduling conflict detected! This staff member is not available.');
        return;
      }

      const staffMember = staffList.find((staff) => staff.id === newSchedule.profile_id);
      if (!staffMember) {
        toast.error('Staff member not found');
        return;
      }

      const scheduleData = {
        ...newSchedule,
        hospital_id: hospitalId,
        status: 'on_duty',
      };

      if (staffMember.profile_type === 'doctor' && staffMember.doctor_id) {
        scheduleData.schedule_type = 'doctor_shift';
        scheduleData.doctor_id = staffMember.doctor_id;
      } else {
        toast.error('Only doctor scheduling is currently supported');
        return;
      }

      await createStaffSchedule(scheduleData);
      await loadSchedulingData();

      setNewSchedule(createScheduleDraft(hospitalId));
      setActiveTab('overview');
      toast.success('Staff member scheduled successfully');
    } catch (error) {
      console.error('Error adding schedule:', error);
      handleApiError(error, 'create');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      setLoading(true);
      await deleteStaffSchedule(scheduleId);
      await loadSchedulingData();
      toast.success('Shift deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      handleApiError(error, 'delete');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (schedule) => {
    setSelectedStaff(schedule);
    setNewSchedule(createEditScheduleDraft(schedule, hospitalId));
    setActiveTab('edit');
  };

  const handleUpdateSchedule = async () => {
    if (!selectedStaff || !newSchedule.profile_id || !newSchedule.date) {
      toast.error('Please select a staff member and date');
      return;
    }

    try {
      setLoading(true);
      const conflicts = await checkScheduleConflicts(
        newSchedule.profile_id,
        newSchedule.date,
        newSchedule.start_time,
        newSchedule.end_time,
        selectedStaff.id,
      );

      if (conflicts.has_conflicts) {
        toast.error('Scheduling conflict detected! This staff member is not available.');
        return;
      }

      await updateStaffSchedule(selectedStaff.id, {
        status: newSchedule.status || 'on_duty',
      });
      await loadSchedulingData();

      setNewSchedule(createScheduleDraft(hospitalId));
      setSelectedStaff(null);
      setActiveTab('overview');
      toast.success('Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = () => {
    setActiveTab('overview');
    setNewSchedule(createScheduleDraft(hospitalId));
    setSelectedStaff(null);
  };

  return {
    activeTab,
    fetchingStaff,
    handleAddSchedule,
    handleCancelSchedule,
    handleDeleteSchedule,
    handleEditSchedule,
    handleUpdateSchedule,
    loading,
    loadSchedulingData,
    newSchedule,
    schedules,
    selectedStaff,
    setActiveTab,
    setNewSchedule,
    staffList,
    stats,
  };
};
