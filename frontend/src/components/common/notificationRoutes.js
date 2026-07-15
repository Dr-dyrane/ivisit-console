const EMERGENCY_ROUTE = '/emergencies';

const notificationRouteByActionType = {
  acknowledge_responder_arrival: EMERGENCY_ROUTE,
  approve_cash_payment: EMERGENCY_ROUTE,
  respond_emergency_offer: EMERGENCY_ROUTE,
  track_emergency: EMERGENCY_ROUTE,
  view_emergency: EMERGENCY_ROUTE,
  view_emergency_assignment: EMERGENCY_ROUTE,
  view_emergency_request: EMERGENCY_ROUTE,
  view_emergency_visit: EMERGENCY_ROUTE,
};

const notificationRouteByType = {
  ambulance: '/ambulances',
  doctor: '/doctors',
  hospital: '/hospitals',
  visit: '/visits',
  emergency: EMERGENCY_ROUTE,
  emergency_request: '/emergencies',
};

const readFirstString = (candidates) => (
  candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || null
);

const readActionTargetId = (notification) => readFirstString([
  notification?.action_data?.requestId,
  notification?.action_data?.request_id,
  notification?.action_data?.id,
  notification?.action_data?.targetId,
  notification?.action_data?.target_id,
]);

const readCompatibilityTargetId = (notification) => {
  const candidates = [
    notification?.target_id,
    notification?.metadata?.targetId,
    notification?.metadata?.target_id,
    notification?.action_data?.targetId,
    notification?.action_data?.target_id,
  ];

  return readFirstString(candidates);
};

export const resolveNotificationDestination = (notification) => {
  if (!notification || notification.action_type === 'deleted') return null;

  const actionPath = notificationRouteByActionType[notification.action_type];
  const basePath = actionPath || notificationRouteByType[notification.type];
  const prefersActionData = Boolean(actionPath) || notification.type === 'emergency';
  const targetId = prefersActionData
    ? readActionTargetId(notification) || readCompatibilityTargetId(notification)
    : readCompatibilityTargetId(notification);
  if (!basePath || !targetId) return null;

  return `${basePath}?id=${encodeURIComponent(targetId)}`;
};
