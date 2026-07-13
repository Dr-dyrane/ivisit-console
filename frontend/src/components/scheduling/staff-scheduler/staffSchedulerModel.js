const INITIAL_STAFF = [
  { id: 1, name: 'Dr. Sarah Johnson', role: 'Doctor', department: 'Emergency', avatar: 'SJ' },
  { id: 2, name: 'Dr. Michael Chen', role: 'Doctor', department: 'Emergency', avatar: 'MC' },
  { id: 3, name: 'Nurse Emily Davis', role: 'Nurse', department: 'Emergency', avatar: 'ED' },
  { id: 4, name: 'Driver James Wilson', role: 'Driver', department: 'Ambulance', avatar: 'JW' },
  { id: 5, name: 'Dr. Lisa Anderson', role: 'Doctor', department: 'ICU', avatar: 'LA' },
];

const INITIAL_SHIFTS = [
  {
    id: 1,
    staffId: 1,
    date: '2026-01-26',
    startTime: '08:00',
    endTime: '16:00',
    type: 'day',
    status: 'scheduled',
    department: 'Emergency',
  },
  {
    id: 2,
    staffId: 2,
    date: '2026-01-26',
    startTime: '16:00',
    endTime: '00:00',
    type: 'evening',
    status: 'scheduled',
    department: 'Emergency',
  },
  {
    id: 3,
    staffId: 4,
    date: '2026-01-26',
    startTime: '00:00',
    endTime: '08:00',
    type: 'night',
    status: 'on-duty',
    department: 'Ambulance',
  },
];

export const STAFF_ROLE_SEPARATOR = '\u2022';

export const createInitialStaffList = () => INITIAL_STAFF.map((staff) => ({ ...staff }));

export const createInitialShifts = () => INITIAL_SHIFTS.map((shift) => ({ ...shift }));

export const createShiftDraft = () => ({
  staffId: '',
  date: '',
  startTime: '',
  endTime: '',
  type: 'day',
  notes: '',
});

export const getDaysForView = (currentDate, viewMode) => {
  const days = [];
  const start = new Date(currentDate);

  if (viewMode === 'week') {
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    for (let index = 0; index < 7; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      days.push(day);
    }
  } else if (viewMode === 'month') {
    const year = start.getFullYear();
    const month = start.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    for (let date = 1; date <= lastDay.getDate(); date += 1) {
      days.push(new Date(year, month, date));
    }
  } else {
    days.push(new Date(start));
  }

  return days;
};

export const getShiftsForDay = (shifts, date) => {
  const dateString = date.toISOString().split('T')[0];
  return shifts.filter((shift) => shift.date === dateString);
};

export const getShiftStatusColor = (status) => {
  switch (status) {
    case 'scheduled': return 'bg-sky-500/15 text-sky-600';
    case 'on-duty': return 'bg-emerald-500/15 text-emerald-600';
    case 'completed': return 'bg-muted/40 text-muted-foreground';
    case 'absent': return 'bg-destructive/15 text-destructive';
    default: return 'bg-muted/40 text-muted-foreground';
  }
};

export const getShiftTypeColor = (type) => {
  switch (type) {
    case 'day': return 'bg-amber-500/15';
    case 'evening': return 'bg-orange-500/15';
    case 'night': return 'bg-violet-500/15';
    default: return 'bg-muted/40';
  }
};

export const filterStaff = (staffList, searchTerm, department) => (
  staffList.filter((staff) => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = department === 'all' || staff.department === department;
    return matchesSearch && matchesDepartment;
  })
);

export const createLocalShift = ({ draft, shifts, staffList }) => {
  if (!draft.staffId || !draft.date || !draft.startTime || !draft.endTime) {
    return null;
  }

  return {
    id: shifts.length + 1,
    ...draft,
    status: 'scheduled',
    department: staffList.find((staff) => staff.id === parseInt(draft.staffId))?.department || 'General',
  };
};

export const navigateSchedulerDate = (currentDate, viewMode, direction) => {
  const nextDate = new Date(currentDate);

  if (viewMode === 'week') {
    nextDate.setDate(nextDate.getDate() + (direction * 7));
  } else if (viewMode === 'month') {
    nextDate.setMonth(nextDate.getMonth() + direction);
  } else {
    nextDate.setDate(nextDate.getDate() + direction);
  }

  return nextDate;
};
