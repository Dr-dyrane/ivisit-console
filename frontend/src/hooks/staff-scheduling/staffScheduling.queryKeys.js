export const staffSchedulingKeys = Object.freeze({
  root: ['staff-scheduling'],
  schedules: (filter = {}) => ['staff-scheduling', 'schedules', filter],
  facilities: () => ['staff-scheduling', 'facilities'],
  roster: (hospitalId) => ['staff-scheduling', 'roster', hospitalId || null],
  detail: (scheduleId) => ['staff-scheduling', 'detail', scheduleId || null],
});
