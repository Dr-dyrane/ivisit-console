import { getNotifications } from '../../../services/notificationService';

export const NOTIFICATION_CACHE_MS = 60000;
export const notificationCacheByUserId = new Map();

export function invalidateNotificationsForUser(userId) {
  if (userId) notificationCacheByUserId.delete(userId);
}

export function reduceNotificationRealtimeEvent(notifications, payload) {
  const previous = Array.isArray(notifications) ? notifications : [];
  const eventType = String(payload?.eventType || '').toUpperCase();
  const next = payload?.new || null;
  const id = next?.id || payload?.old?.id || null;

  if (!id) return previous;
  if (eventType === 'DELETE' || next?.dismissed_at) {
    return previous.filter((notification) => notification.id !== id);
  }
  if (!next) return previous;

  const withoutCurrent = previous.filter((notification) => notification.id !== id);
  if (eventType === 'INSERT') return [next, ...withoutCurrent];

  const currentIndex = previous.findIndex((notification) => notification.id === id);
  if (currentIndex < 0) return [next, ...withoutCurrent];

  const updated = [...previous];
  updated[currentIndex] = { ...previous[currentIndex], ...next };
  return updated;
}

export async function readNotificationsForUser(userId, options = {}) {
  const cached = notificationCacheByUserId.get(userId);
  const now = Date.now();

  if (!options.force && cached?.data && cached.expiresAt > now) {
    return cached.data;
  }

  if (!options.force && cached?.promise) {
    return cached.promise;
  }

  const promise = getNotifications(userId, 30, null, { quiet: true })
    .then((data) => {
      notificationCacheByUserId.set(userId, {
        data,
        expiresAt: Date.now() + NOTIFICATION_CACHE_MS,
        promise: null,
      });
      return data;
    })
    .catch((error) => {
      if (notificationCacheByUserId.get(userId)?.promise === promise) {
        notificationCacheByUserId.delete(userId);
      }
      throw error;
    });

  notificationCacheByUserId.set(userId, {
    data: cached?.data || null,
    expiresAt: cached?.expiresAt || 0,
    promise,
  });

  return promise;
}
