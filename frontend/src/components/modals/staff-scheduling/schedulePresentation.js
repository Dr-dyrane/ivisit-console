export const createScheduleDraft = (hospitalId) => ({
  profile_id: '',
  hospital_id: hospitalId || '',
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '17:00',
  shift_type: 'day',
  notes: '',
  schedule_type: 'doctor_shift',
});

export const createEditScheduleDraft = (schedule, hospitalId) => ({
  profile_id: schedule.profile_id?.toString() || '',
  hospital_id: hospitalId || '',
  date: schedule.date || new Date().toISOString().split('T')[0],
  start_time: schedule.start_time || '09:00',
  end_time: schedule.end_time || '17:00',
  shift_type: schedule.shift_type || 'day',
  notes: schedule.notes || '',
  schedule_type: schedule.schedule_type || 'doctor_shift',
  doctor_id: schedule.doctor_id,
});

export const getScheduleStatusColor = (status) => {
  switch (status) {
    case 'scheduled': return 'bg-sky-500/20 text-sky-600';
    case 'on-duty': return 'bg-emerald-500/20 text-emerald-600';
    case 'completed': return 'bg-muted/50 text-muted-foreground';
    default: return 'bg-muted/50 text-muted-foreground';
  }
};

export const getShiftTypeColor = (type) => {
  switch (type) {
    case 'day': return 'bg-amber-500/20 text-amber-600';
    case 'evening': return 'bg-orange-500/20 text-orange-600';
    case 'night': return 'bg-violet-500/20 text-violet-600';
    default: return 'bg-muted/50 text-muted-foreground';
  }
};

export const getStaffInitials = (schedule) => (
  schedule.profiles?.full_name?.split(' ').map((name) => name[0]).join('')
  || schedule.profile_name?.split(' ').map((name) => name[0]).join('')
  || '??'
);

export const getStaffDisplayName = (schedule) => (
  schedule.profiles?.full_name || schedule.profile_name || 'Unknown Staff'
);
