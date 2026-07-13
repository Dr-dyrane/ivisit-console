import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createShiftDraft, navigateSchedulerDate } from './staffSchedulerModel';
import { useStaffSchedulerController } from './useStaffSchedulerController';

describe('useStaffSchedulerController', () => {
  let container;
  let latest;
  let root;

  const Harness = () => {
    latest = useStaffSchedulerController();
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<Harness />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('starts with the existing local week projection and mock rows', () => {
    expect(latest.viewMode).toBe('week');
    expect(latest.days).toHaveLength(7);
    expect(latest.staffList).toHaveLength(5);
    expect(latest.filteredStaff).toHaveLength(5);
    expect(latest.shifts).toHaveLength(3);
    expect(latest.selectedStaff).toBeNull();
    expect(latest.showAddModal).toBe(false);
    expect(latest.newShift).toEqual(createShiftDraft());
  });

  it('preserves search, department filtering, and staff selection', () => {
    act(() => latest.setSearchTerm('dr.'));
    expect(latest.filteredStaff.map((staff) => staff.id)).toEqual([1, 2, 5]);

    act(() => latest.setFilterDepartment('Emergency'));
    expect(latest.filteredStaff.map((staff) => staff.id)).toEqual([1, 2]);

    act(() => latest.setSelectedStaff(latest.filteredStaff[0]));
    expect(latest.selectedStaff.id).toBe(1);
  });

  it('keeps incomplete drafts open and closes only after a complete local add', () => {
    act(() => latest.setShowAddModal(true));
    act(() => latest.handleAddShift());

    expect(latest.showAddModal).toBe(true);
    expect(latest.shifts).toHaveLength(3);

    act(() => latest.setNewShift({
      staffId: '5',
      date: '2026-07-13',
      startTime: '09:00',
      endTime: '17:00',
      type: 'evening',
      notes: 'Cover',
    }));
    act(() => latest.handleAddShift());

    expect(latest.shifts).toHaveLength(4);
    expect(latest.shifts[3]).toMatchObject({
      id: 4,
      staffId: '5',
      status: 'scheduled',
      department: 'ICU',
    });
    expect(latest.newShift).toEqual(createShiftDraft());
    expect(latest.showAddModal).toBe(false);
  });

  it('preserves local delete behavior and explicit modal dismissal', () => {
    act(() => latest.handleDeleteShift(2));
    expect(latest.shifts.map((shift) => shift.id)).toEqual([1, 3]);

    act(() => latest.setShowAddModal(true));
    expect(latest.showAddModal).toBe(true);
    act(() => latest.setShowAddModal(false));
    expect(latest.showAddModal).toBe(false);
  });

  it('navigates by the active day, week, and month increments', () => {
    const initialDate = latest.currentDate;
    const expectedWeek = navigateSchedulerDate(initialDate, 'week', 1);

    act(() => latest.navigateDate(1));
    expect(latest.currentDate.getTime()).toBe(expectedWeek.getTime());

    act(() => latest.setViewMode('day'));
    const dayStart = latest.currentDate;
    act(() => latest.navigateDate(-1));
    expect(latest.currentDate.getTime()).toBe(
      navigateSchedulerDate(dayStart, 'day', -1).getTime(),
    );

    act(() => latest.setViewMode('month'));
    const monthStart = latest.currentDate;
    act(() => latest.navigateDate(1));
    expect(latest.currentDate.getTime()).toBe(
      navigateSchedulerDate(monthStart, 'month', 1).getTime(),
    );
  });
});
