import {
  createInitialShifts,
  createInitialStaffList,
  createLocalShift,
  createShiftDraft,
  filterStaff,
  getDaysForView,
  getShiftsForDay,
  getShiftStatusColor,
  getShiftTypeColor,
  navigateSchedulerDate,
  STAFF_ROLE_SEPARATOR,
} from './staffSchedulerModel';

describe('staffSchedulerModel', () => {
  it('recreates the existing local-only staff, shifts, and draft state per mount', () => {
    const firstStaff = createInitialStaffList();
    const secondStaff = createInitialStaffList();
    const shifts = createInitialShifts();

    expect(firstStaff).toHaveLength(5);
    expect(firstStaff[0]).toEqual({
      id: 1,
      name: 'Dr. Sarah Johnson',
      role: 'Doctor',
      department: 'Emergency',
      avatar: 'SJ',
    });
    expect(firstStaff).not.toBe(secondStaff);
    expect(firstStaff[0]).not.toBe(secondStaff[0]);
    expect(shifts).toHaveLength(3);
    expect(shifts[2]).toMatchObject({ staffId: 4, type: 'night', status: 'on-duty' });
    expect(createShiftDraft()).toEqual({
      staffId: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'day',
      notes: '',
    });
    expect(STAFF_ROLE_SEPARATOR).toBe('\u2022');
  });

  it('preserves day, week, and month date projections', () => {
    const currentDate = new Date(2026, 6, 15, 12, 0, 0);
    const day = getDaysForView(currentDate, 'day');
    const week = getDaysForView(currentDate, 'week');
    const leapMonth = getDaysForView(new Date(2024, 1, 15, 12, 0, 0), 'month');

    expect(day).toHaveLength(1);
    expect(day[0]).not.toBe(currentDate);
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(0);
    expect(week.map((date) => date.getDate())).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(leapMonth).toHaveLength(29);
    expect(leapMonth[28].getDate()).toBe(29);
  });

  it('keeps the ISO day lookup and staff filters unchanged', () => {
    const staff = createInitialStaffList();
    const shifts = createInitialShifts();

    expect(getShiftsForDay(shifts, new Date('2026-01-26T12:00:00.000Z'))).toHaveLength(3);
    expect(filterStaff(staff, 'lisa', 'all').map((entry) => entry.id)).toEqual([5]);
    expect(filterStaff(staff, '', 'Ambulance').map((entry) => entry.id)).toEqual([4]);
    expect(filterStaff(staff, 'dr.', 'Emergency').map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('creates only complete local shifts with the existing payload and id rules', () => {
    const staffList = createInitialStaffList();
    const shifts = createInitialShifts();

    expect(createLocalShift({
      draft: createShiftDraft(),
      shifts,
      staffList,
    })).toBeNull();

    expect(createLocalShift({
      draft: {
        staffId: '5',
        date: '2026-07-13',
        startTime: '09:00',
        endTime: '17:00',
        type: 'evening',
        notes: 'Cover',
      },
      shifts,
      staffList,
    })).toEqual({
      id: 4,
      staffId: '5',
      date: '2026-07-13',
      startTime: '09:00',
      endTime: '17:00',
      type: 'evening',
      notes: 'Cover',
      status: 'scheduled',
      department: 'ICU',
    });
  });

  it('preserves navigation increments and status/type token mappings', () => {
    const currentDate = new Date(2026, 6, 15, 12, 0, 0);

    expect(navigateSchedulerDate(currentDate, 'day', 1).getDate()).toBe(16);
    expect(navigateSchedulerDate(currentDate, 'week', -1).getDate()).toBe(8);
    expect(navigateSchedulerDate(currentDate, 'month', 1).getMonth()).toBe(7);
    expect(getShiftStatusColor('scheduled')).toBe('bg-sky-500/15 text-sky-600');
    expect(getShiftStatusColor('on-duty')).toBe('bg-emerald-500/15 text-emerald-600');
    expect(getShiftStatusColor('unknown')).toBe('bg-muted/40 text-muted-foreground');
    expect(getShiftTypeColor('day')).toBe('bg-amber-500/15');
    expect(getShiftTypeColor('night')).toBe('bg-violet-500/15');
    expect(getShiftTypeColor('unknown')).toBe('bg-muted/40');
  });
});
