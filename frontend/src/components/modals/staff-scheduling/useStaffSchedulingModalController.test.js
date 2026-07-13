import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
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
import { useStaffSchedulingModalController } from './useStaffSchedulingModalController';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(),
}));

jest.mock('../../../services/staffSchedulingService', () => ({
  checkScheduleConflicts: jest.fn(),
  createStaffSchedule: jest.fn(),
  deleteStaffSchedule: jest.fn(),
  getAvailableStaff: jest.fn(),
  getScheduleStats: jest.fn(),
  getStaffSchedules: jest.fn(),
  updateStaffSchedule: jest.fn(),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const doctor = {
  id: 'profile-1',
  name: 'Ada Lovelace',
  profile_type: 'doctor',
  doctor_id: 'doctor-1',
};

const schedule = {
  id: 'doctor_doctor-1',
  profile_id: 'profile-1',
  profile_name: 'Ada Lovelace',
  doctor_id: 'doctor-1',
  date: '2026-07-15',
  start_time: '08:00',
  end_time: '16:00',
  shift_type: 'day',
  status: 'off_duty',
  notes: 'Ward cover',
  schedule_type: 'doctor_shift',
};

describe('useStaffSchedulingModalController', () => {
  let bottomBar;
  let consoleError;
  let container;
  let latest;
  let root;

  const Harness = ({ hospitalId = 'hospital-1', isOpen = true }) => {
    latest = useStaffSchedulingModalController({ hospitalId, isOpen });
    return null;
  };

  const renderHarness = async (props = {}) => {
    await act(async () => {
      root.render(<Harness {...props} />);
      await flush();
      await flush();
    });
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    bottomBar = document.createElement('div');
    bottomBar.id = 'dynamic-bottom-bar';
    bottomBar.style.display = 'flex';
    document.body.append(container, bottomBar);
    root = createRoot(container);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    getStaffSchedules.mockResolvedValue({ schedules: [schedule] });
    getAvailableStaff.mockResolvedValue([doctor]);
    getScheduleStats.mockResolvedValue({ scheduled_today: 1, this_week: 3 });
    checkScheduleConflicts.mockResolvedValue({ has_conflicts: false });
    createStaffSchedule.mockResolvedValue({ id: 'doctor-1' });
    updateStaffSchedule.mockResolvedValue({ id: 'doctor-1' });
    deleteStaffSchedule.mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    bottomBar.remove();
    consoleError.mockRestore();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    jest.clearAllMocks();
  });

  it('loads only while open and restores the prior mobile bottom-bar display', async () => {
    await renderHarness({ isOpen: false });

    expect(getStaffSchedules).not.toHaveBeenCalled();
    expect(bottomBar.style.display).toBe('flex');

    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    await renderHarness({ isOpen: true });

    expect(getStaffSchedules).toHaveBeenCalledWith({ hospital_id: 'hospital-1' });
    expect(getAvailableStaff).toHaveBeenCalledWith('hospital-1');
    expect(getScheduleStats).toHaveBeenCalledWith(
      'hospital-1',
      today,
      weekEnd.toISOString().split('T')[0],
    );
    expect(latest.schedules).toEqual([schedule]);
    expect(latest.staffList).toEqual([doctor]);
    expect(latest.stats).toEqual({ scheduled_today: 1, this_week: 3 });
    expect(latest.loading).toBe(false);
    expect(bottomBar.style.display).toBe('none');

    await renderHarness({ isOpen: false });
    expect(bottomBar.style.display).toBe('flex');
  });

  it('keeps conflict checks and the doctor create payload unchanged', async () => {
    await renderHarness();

    act(() => {
      latest.setActiveTab('add');
      latest.setNewSchedule({
        ...latest.newSchedule,
        profile_id: 'profile-1',
        date: '2026-07-15',
        start_time: '08:00',
        end_time: '16:00',
        shift_type: 'evening',
        notes: 'Ward cover',
      });
    });

    await act(async () => {
      await latest.handleAddSchedule();
    });

    expect(checkScheduleConflicts).toHaveBeenCalledWith(
      'profile-1',
      '2026-07-15',
      '08:00',
      '16:00',
    );
    expect(createStaffSchedule).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      hospital_id: 'hospital-1',
      date: '2026-07-15',
      start_time: '08:00',
      end_time: '16:00',
      shift_type: 'evening',
      notes: 'Ward cover',
      schedule_type: 'doctor_shift',
      status: 'on_duty',
      doctor_id: 'doctor-1',
    });
    expect(getStaffSchedules).toHaveBeenCalledTimes(2);
    expect(latest.activeTab).toBe('overview');
    expect(latest.newSchedule.profile_id).toBe('');
    expect(toast.success).toHaveBeenCalledWith('Staff member scheduled successfully');
  });

  it('fails closed on a reported conflict without sending a create command', async () => {
    checkScheduleConflicts.mockResolvedValueOnce({ has_conflicts: true });
    await renderHarness();

    act(() => {
      latest.setNewSchedule({
        ...latest.newSchedule,
        profile_id: 'profile-1',
        date: '2026-07-15',
      });
    });

    await act(async () => {
      await latest.handleAddSchedule();
    });

    expect(createStaffSchedule).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      'Scheduling conflict detected! This staff member is not available.',
    );
    expect(latest.loading).toBe(false);
  });

  it('preserves the edit, update, and delete receiver payloads', async () => {
    await renderHarness();

    act(() => latest.handleEditSchedule(schedule));
    expect(latest.activeTab).toBe('edit');
    expect(latest.selectedStaff).toEqual(schedule);

    await act(async () => {
      await latest.handleUpdateSchedule();
    });

    expect(checkScheduleConflicts).toHaveBeenCalledWith(
      'profile-1',
      '2026-07-15',
      '08:00',
      '16:00',
      'doctor_doctor-1',
    );
    expect(updateStaffSchedule).toHaveBeenCalledWith('doctor_doctor-1', {
      status: 'on_duty',
    });
    expect(toast.success).toHaveBeenCalledWith('Schedule updated successfully');

    await act(async () => {
      await latest.handleDeleteSchedule('doctor_doctor-1');
    });

    expect(deleteStaffSchedule).toHaveBeenCalledWith('doctor_doctor-1');
    expect(getStaffSchedules).toHaveBeenCalledTimes(3);
    expect(toast.success).toHaveBeenCalledWith('Shift deleted successfully');
  });

  it('preserves load-error feedback and does not continue the read chain', async () => {
    const error = new Error('offline');
    getStaffSchedules.mockRejectedValueOnce(error);

    await renderHarness();

    expect(consoleError).toHaveBeenCalledWith('Error loading scheduling data:', error);
    expect(handleApiError).toHaveBeenCalledWith(error, 'fetch');
    expect(getAvailableStaff).not.toHaveBeenCalled();
    expect(getScheduleStats).not.toHaveBeenCalled();
    expect(latest.loading).toBe(false);
    expect(latest.fetchingStaff).toBe(false);
  });
});
