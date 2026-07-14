import { useMemo, useState } from 'react';
import { transitionScheduledVisit, zonedLocalDateTimeToUtc } from '../../../services/visitsService';

const isAssignedClinician = (visit, profileId) => Boolean(
  profileId && visit?.assignedDoctor?.profile_id === profileId
);

const timingState = (visit, now = new Date()) => {
  const start = new Date(visit?.scheduled_start_at || visit?.scheduledStartAt || 0).getTime();
  const end = new Date(visit?.scheduled_end_at || visit?.scheduledEndAt || 0).getTime();
  const current = now.getTime();
  return {
    canStart: Number.isFinite(start) && Number.isFinite(end)
      && current >= start - (30 * 60 * 1000)
      && current <= end + (30 * 60 * 1000),
    canNoShow: Number.isFinite(start) && current >= start + (15 * 60 * 1000),
  };
};

export const getScheduledVisitActionCapabilities = ({
  visit,
  roleKind,
  profileId,
  actionsEnabled,
  now,
}) => {
  if (!actionsEnabled || visit?.sourceKind !== 'scheduled_visit') return [];
  const administrator = roleKind === 'admin' || roleKind === 'org_admin';
  const clinician = roleKind === 'provider' && isAssignedClinician(visit, profileId);
  if (!administrator && !clinician) return [];

  const status = visit.status;
  const timing = timingState(visit, now);
  const actions = [];
  if (administrator && status === 'scheduled') {
    actions.push({ id: 'reschedule', label: 'Reschedule', tone: 'default', enabled: true });
    actions.push({ id: 'cancel', label: 'Cancel visit', tone: 'destructive', enabled: true });
  }
  if ((administrator || clinician) && status === 'scheduled') {
    actions.push({
      id: 'start',
      label: 'Start visit',
      tone: 'default',
      enabled: timing.canStart,
      reason: timing.canStart ? null : 'Start is available within 30 minutes of the clinical window.',
    });
    actions.push({
      id: 'no_show',
      label: 'Mark no-show',
      tone: 'warning',
      enabled: timing.canNoShow,
      reason: timing.canNoShow ? null : 'No-show is available 15 minutes after the scheduled start.',
    });
  }
  if ((administrator || clinician) && status === 'in_progress') {
    actions.push({ id: 'complete', label: 'Complete visit', tone: 'default', enabled: true });
  }
  return actions;
};

export const canOpenScheduledVisitActions = (params) => (
  getScheduledVisitActionCapabilities(params).length > 0
);

export const useScheduledVisitActions = ({
  visit,
  roleKind,
  profileId,
  actionsEnabled,
  onSuccess,
}) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [reason, setReason] = useState('');
  const [localStart, setLocalStart] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const capabilities = useMemo(() => getScheduledVisitActionCapabilities({
    visit, roleKind, profileId, actionsEnabled,
  }), [actionsEnabled, profileId, roleKind, visit]);

  const chooseAction = (action) => {
    if (!action?.enabled) return;
    setSelectedAction(action.id);
    setError(null);
  };

  const submit = async () => {
    if (!selectedAction || pendingAction) return;
    const capability = capabilities.find((action) => action.id === selectedAction);
    if (!capability?.enabled) return;
    try {
      setPendingAction(selectedAction);
      setError(null);
      const scheduledStartAt = selectedAction === 'reschedule'
        ? zonedLocalDateTimeToUtc(localStart, visit.scheduledTimezone || visit.facility?.timezone)
        : undefined;
      const result = await transitionScheduledVisit({
        visitId: visit.id,
        action: selectedAction,
        scheduledStartAt,
        reason,
      });
      await onSuccess?.(result, selectedAction);
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    } finally {
      setPendingAction(null);
    }
  };

  return {
    capabilities,
    chooseAction,
    error,
    localStart,
    pendingAction,
    reason,
    selectedAction,
    setLocalStart,
    setReason,
    submit,
  };
};
