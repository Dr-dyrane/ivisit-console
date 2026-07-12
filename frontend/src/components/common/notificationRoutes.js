const notificationRouteByType = {
  ambulance: '/ambulances',
  doctor: '/doctors',
  hospital: '/hospitals',
  visit: '/visits',
  emergency_request: '/emergencies',
};

const readTargetId = (notification) => {
  const candidates = [
    notification?.target_id,
    notification?.metadata?.targetId,
    notification?.metadata?.target_id,
    notification?.action_data?.targetId,
    notification?.action_data?.target_id,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || null;
};

export const resolveNotificationDestination = (notification) => {
  if (!notification || notification.action_type === 'deleted') return null;

  const basePath = notificationRouteByType[notification.type];
  const targetId = readTargetId(notification);
  if (!basePath || !targetId) return null;

  return `${basePath}?id=${encodeURIComponent(targetId)}`;
};
