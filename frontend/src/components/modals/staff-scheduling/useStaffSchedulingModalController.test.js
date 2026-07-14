import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import {
  useConsoleDoctorSchedulesQuery,
  useScheduleDetailQuery,
  useScheduleFacilitiesQuery,
  useScheduleRosterQuery,
} from '../../../hooks/staff-scheduling/useConsoleDoctorSchedulesQuery';
import { useConsoleDoctorScheduleMutations } from '../../../hooks/staff-scheduling/useConsoleDoctorScheduleMutations';
import {
  checkScheduleConflicts,
  subscribeToScheduleUpdates,
} from '../../../services/staffSchedulingService';
import { useStaffSchedulingModalController } from './useStaffSchedulingModalController';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('../../../config/scheduledCareRelease', () => ({
  scheduledCareRelease: {
    scheduleReads: true,
    scheduleWrites: true,
    scheduledVisitReads: false,
    scheduledVisitActions: false,
  },
}));

jest.mock('../../../hooks/staff-scheduling/useConsoleDoctorSchedulesQuery', () => ({
  useConsoleDoctorSchedulesQuery: jest.fn(),
  useScheduleDetailQuery: jest.fn(),
  useScheduleFacilitiesQuery: jest.fn(),
  useScheduleRosterQuery: jest.fn(),
}));

jest.mock('../../../hooks/staff-scheduling/useConsoleDoctorScheduleMutations', () => ({
  useConsoleDoctorScheduleMutations: jest.fn(),
}));

jest.mock('../../../services/staffSchedulingService', () => ({
  checkScheduleConflicts: jest.fn(),
  subscribeToScheduleUpdates: jest.fn(),
}));

const HOSPITAL_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const SCHEDULE_ID = '33333333-3333-4333-8333-333333333333';

const unconfirmedFacility = {
  id: HOSPITAL_ID,
  name: 'North Clinic',
  timezone: 'UTC',
  timezone_confirmed_at: null,
  timezone_confirmation_source: null,
};

const confirmedFacility = {
  ...unconfirmedFacility,
  timezone: 'America/Los_Angeles',
  timezone_confirmed_at: '2026-07-13T12:00:00.000Z',
  timezone_confirmation_source: 'console',
};

const facilityWithoutTimezone = {
  ...unconfirmedFacility,
  timezone: null,
};

describe('useStaffSchedulingModalController', () => {
  let container;
  let latest;
  let root;
  let facilitiesRefetch;
  let schedulesRefetch;
  let mutations;

  const Harness = (props) => {
    latest = useStaffSchedulingModalController(props);
    return null;
  };

  const renderHarness = async (props = {}) => {
    await act(async () => {
      root.render(<Harness isOpen hospitalId={HOSPITAL_ID} {...props} />);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T01:00:00.000Z'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    facilitiesRefetch = jest.fn().mockResolvedValue({ data: [confirmedFacility] });
    schedulesRefetch = jest.fn().mockResolvedValue({ data: { schedules: [] } });
    mutations = {
      create: { isPending: false, mutateAsync: jest.fn() },
      update: { isPending: false, mutateAsync: jest.fn() },
      remove: { isPending: false, mutateAsync: jest.fn() },
      confirmTimezone: { isPending: false, mutateAsync: jest.fn() },
    };
    useScheduleFacilitiesQuery.mockReturnValue({
      data: [unconfirmedFacility], error: null, isFetching: false, isLoading: false, refetch: facilitiesRefetch,
    });
    useConsoleDoctorSchedulesQuery.mockReturnValue({
      data: { schedules: [] }, error: null, isFetching: false, isLoading: false, refetch: schedulesRefetch,
    });
    useScheduleRosterQuery.mockReturnValue({
      data: [{ id: DOCTOR_ID, doctor_id: DOCTOR_ID, hospital_id: HOSPITAL_ID }],
      error: null,
      isFetching: false,
      refetch: jest.fn(),
    });
    useScheduleDetailQuery.mockReturnValue({
      data: null,
      error: null,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
    });
    useConsoleDoctorScheduleMutations.mockReturnValue(mutations);
    checkScheduleConflicts.mockResolvedValue({ has_conflicts: false, conflicts: [] });
    subscribeToScheduleUpdates.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('replaces the initial facility prompt once the schedule window resolves', async () => {
    await renderHarness();

    expect(latest.notice).toBe('0 shifts in this window.');
  });

  it('keeps stored UTC unconfirmed and requires explicit valid IANA input', async () => {
    await renderHarness();

    expect(latest.timezoneConfirmed).toBe(false);
    expect(latest.timezoneInput).toBe('');
    expect(latest.canMutate).toBe(false);

    await act(async () => latest.confirmTimezone());
    expect(mutations.confirmTimezone.mutateAsync).not.toHaveBeenCalled();
    expect(latest.timezoneInputError).toContain('valid IANA timezone');

    act(() => latest.changeTimezoneInput('UTC+8'));
    expect(latest.timezoneInputValid).toBe(false);
    expect(latest.timezoneInputError).toContain('America/Los_Angeles');
  });

  it('confirms only the entered timezone and requires matching reread proof', async () => {
    await renderHarness();
    act(() => latest.changeTimezoneInput('America/Los_Angeles'));

    await act(async () => latest.confirmTimezone());

    expect(mutations.confirmTimezone.mutateAsync).toHaveBeenCalledWith({
      hospitalId: HOSPITAL_ID,
      timezone: 'America/Los_Angeles',
    });
    expect(facilitiesRefetch).toHaveBeenCalledTimes(1);
    expect(schedulesRefetch).toHaveBeenCalledTimes(1);
    expect(latest.notice).toBe('Timezone confirmed as America/Los_Angeles.');
    expect(toast.success).toHaveBeenCalledWith('Facility timezone confirmed');
  });

  it('derives the read window and add draft from the selected facility timezone', async () => {
    useScheduleFacilitiesQuery.mockReturnValue({
      data: [confirmedFacility], error: null, isFetching: false, isLoading: false, refetch: facilitiesRefetch,
    });

    await renderHarness();

    expect(useConsoleDoctorSchedulesQuery).toHaveBeenLastCalledWith({
      hospitalId: HOSPITAL_ID,
      dateFrom: '2026-07-13',
      dateTo: '2026-07-26',
      enabled: true,
    });
    act(() => latest.openAdd());
    expect(latest.draft.date).toBe('2026-07-13');
  });

  it('does not accept confirmation evidence for a different timezone', async () => {
    facilitiesRefetch.mockResolvedValueOnce({
      data: [{ ...confirmedFacility, timezone: 'America/New_York' }],
    });
    await renderHarness();
    act(() => latest.changeTimezoneInput('America/Los_Angeles'));

    await act(async () => latest.confirmTimezone());

    expect(schedulesRefetch).not.toHaveBeenCalled();
    expect(latest.timezoneInputError).toBe('The confirmed timezone could not be verified. Refresh and try again.');
    expect(toast.error).toHaveBeenCalledWith('Timezone confirmation failed', {
      description: 'The confirmed timezone could not be verified. Refresh and try again.',
    });
  });

  it('lets a newly confirmed facility open its next timezone-derived query instead of refetching an empty window', async () => {
    useScheduleFacilitiesQuery.mockReturnValue({
      data: [facilityWithoutTimezone], error: null, isFetching: false, isLoading: false, refetch: facilitiesRefetch,
    });
    await renderHarness();
    act(() => latest.changeTimezoneInput('America/Los_Angeles'));

    await act(async () => latest.confirmTimezone());

    expect(schedulesRefetch).not.toHaveBeenCalled();
    expect(latest.notice).toBe('Timezone confirmed as America/Los_Angeles.');
  });

  it('scopes realtime to doctor IDs from the selected facility roster', async () => {
    await renderHarness();

    expect(subscribeToScheduleUpdates).toHaveBeenCalledWith(
      HOSPITAL_ID,
      [DOCTOR_ID],
      expect.any(Function),
    );
  });

  it('submits canonical schedule fields after confirmation', async () => {
    useScheduleFacilitiesQuery.mockReturnValue({
      data: [confirmedFacility], error: null, isFetching: false, isLoading: false, refetch: facilitiesRefetch,
    });
    await renderHarness();

    act(() => latest.openAdd());
    act(() => latest.setDraft({
      doctor_id: DOCTOR_ID,
      hospital_id: HOSPITAL_ID,
      date: '2026-07-15',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      is_available: true,
    }));
    await act(async () => latest.submit());

    expect(checkScheduleConflicts).toHaveBeenCalledWith(
      DOCTOR_ID,
      '2026-07-15',
      '09:00',
      '17:00',
      undefined,
      HOSPITAL_ID,
    );
    expect(mutations.create.mutateAsync).toHaveBeenCalledWith({
      doctor_id: DOCTOR_ID,
      hospital_id: HOSPITAL_ID,
      date: '2026-07-15',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      is_available: true,
    });
    expect(toast.success).toHaveBeenCalledWith('Shift added');
  });

  it('does not subscribe or fetch while closed', async () => {
    await renderHarness({ isOpen: false });

    expect(useScheduleFacilitiesQuery).toHaveBeenCalledWith(false);
    expect(subscribeToScheduleUpdates).not.toHaveBeenCalled();
  });

  it('opens RPC-owned deep-link detail in edit mode when confirmation is available', async () => {
    const schedule = {
      id: SCHEDULE_ID,
      doctor_id: DOCTOR_ID,
      hospital_id: HOSPITAL_ID,
      date: '2026-07-15',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      is_available: true,
    };
    useScheduleFacilitiesQuery.mockReturnValue({
      data: [confirmedFacility], error: null, isFetching: false, isLoading: false, refetch: facilitiesRefetch,
    });
    useScheduleDetailQuery.mockReturnValue({
      data: schedule,
      error: null,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
    });

    await renderHarness({ scheduleId: SCHEDULE_ID });

    expect(latest.selectedSchedule).toEqual(schedule);
    expect(latest.activeTab).toBe('edit');
    expect(latest.notice).toBe('Opened linked shift.');
    expect(latest.notice).not.toContain(SCHEDULE_ID);
  });

  it('keeps a linked shift read-only when its resolved facility is not confirmation-ready', async () => {
    const schedule = {
      id: SCHEDULE_ID,
      doctor_id: DOCTOR_ID,
      hospital_id: HOSPITAL_ID,
      date: '2026-07-15',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'day',
      is_available: true,
    };
    useScheduleDetailQuery.mockReturnValue({
      data: schedule,
      error: null,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
    });

    await renderHarness({ scheduleId: SCHEDULE_ID });

    expect(latest.selectedSchedule).toEqual(schedule);
    expect(latest.activeTab).toBe('overview');
    expect(latest.canMutate).toBe(false);
  });

  it('keeps a linked shift in a structural loading state until lookup settles', async () => {
    useScheduleDetailQuery.mockReturnValue({
      data: null,
      error: null,
      isFetching: true,
      isLoading: true,
      isSuccess: false,
    });

    await renderHarness({ scheduleId: SCHEDULE_ID });

    expect(latest.detailLoading).toBe(true);
    expect(latest.initialLoading).toBe(true);
    expect(latest.notice).toBe('Loading linked shift...');
  });

  it('surfaces linked-shift lookup errors instead of collapsing them to null', async () => {
    useScheduleDetailQuery.mockReturnValue({
      data: null,
      error: { code: '42501' },
      isFetching: false,
      isLoading: false,
      isSuccess: false,
    });

    await renderHarness({ scheduleId: SCHEDULE_ID });

    expect(latest.detailError).toBe('The linked shift could not be loaded.');
    expect(latest.loadError).toBe('Schedule data could not be loaded.');
    expect(latest.notice).toBe('The linked shift could not be loaded. Review the error and try again.');
  });

  it('reports an authorized linked-shift miss as not found or outside scope', async () => {
    useScheduleDetailQuery.mockReturnValue({
      data: null,
      error: null,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
    });

    await renderHarness({ scheduleId: SCHEDULE_ID });

    expect(latest.detailNotFound).toBe(true);
    expect(latest.selectedSchedule).toBeNull();
    expect(latest.activeTab).toBe('overview');
    expect(latest.notice).toBe('The linked shift was not found or is outside your schedule scope.');
  });
});
