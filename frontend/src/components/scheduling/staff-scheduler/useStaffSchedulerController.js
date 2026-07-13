import { useState } from 'react';
import {
  createInitialShifts,
  createInitialStaffList,
  createLocalShift,
  createShiftDraft,
  filterStaff,
  getDaysForView,
  navigateSchedulerDate,
} from './staffSchedulerModel';

export const useStaffSchedulerController = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('week');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [staffList] = useState(createInitialStaffList);
  const [shifts, setShifts] = useState(createInitialShifts);
  const [newShift, setNewShift] = useState(createShiftDraft);

  const handleAddShift = () => {
    const shift = createLocalShift({ draft: newShift, shifts, staffList });
    if (!shift) return;

    setShifts([...shifts, shift]);
    setNewShift(createShiftDraft());
    setShowAddModal(false);
  };

  const handleDeleteShift = (shiftId) => {
    setShifts(shifts.filter((shift) => shift.id !== shiftId));
  };

  const navigateDate = (direction) => {
    setCurrentDate(navigateSchedulerDate(currentDate, viewMode, direction));
  };

  return {
    currentDate,
    days: getDaysForView(currentDate, viewMode),
    filterDepartment,
    filteredStaff: filterStaff(staffList, searchTerm, filterDepartment),
    handleAddShift,
    handleDeleteShift,
    navigateDate,
    newShift,
    searchTerm,
    selectedStaff,
    setFilterDepartment,
    setNewShift,
    setSearchTerm,
    setSelectedStaff,
    setShowAddModal,
    setViewMode,
    shifts,
    showAddModal,
    staffList,
    viewMode,
  };
};
