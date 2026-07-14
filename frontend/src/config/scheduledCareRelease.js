const readPromotedGate = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '' ? true : normalized === 'true';
};

export const scheduledCareRelease = Object.freeze({
  scheduleReads: readPromotedGate(process.env.REACT_APP_ENABLE_CONSOLE_SCHEDULE_READS_V1),
  scheduleWrites: readPromotedGate(process.env.REACT_APP_ENABLE_CONSOLE_SCHEDULE_WRITES_V1),
  scheduledVisitReads: readPromotedGate(process.env.REACT_APP_ENABLE_CONSOLE_SCHEDULED_VISIT_READS_V1),
  scheduledVisitActions: readPromotedGate(process.env.REACT_APP_ENABLE_CONSOLE_SCHEDULED_VISIT_ACTIONS_V1),
});

export default scheduledCareRelease;
