import {
  invalidateNotificationsForUser,
  notificationCacheByUserId,
  reduceNotificationRealtimeEvent,
} from './notificationData';

describe('notification realtime projection', () => {
  const first = {
    id: 'notification-1',
    read: false,
    dismissed_at: null,
    title: 'Responder assigned',
  };

  beforeEach(() => notificationCacheByUserId.clear());

  it('prepends new rows without duplicating an existing identity', () => {
    expect(reduceNotificationRealtimeEvent([first], {
      eventType: 'INSERT',
      new: { ...first, title: 'Updated copy' },
    })).toEqual([{ ...first, title: 'Updated copy' }]);
  });

  it('reflects read state written by another signed-in session', () => {
    expect(reduceNotificationRealtimeEvent([first], {
      eventType: 'UPDATE',
      new: { ...first, read: true },
    })).toEqual([{ ...first, read: true }]);
  });

  it('removes a notification dismissed by another signed-in session', () => {
    expect(reduceNotificationRealtimeEvent([first], {
      eventType: 'UPDATE',
      new: { ...first, dismissed_at: '2026-07-14T12:00:00.000Z' },
    })).toEqual([]);
  });

  it('invalidates only the current user cache', () => {
    notificationCacheByUserId.set('user-1', { data: [first] });
    notificationCacheByUserId.set('user-2', { data: [] });

    invalidateNotificationsForUser('user-1');

    expect(notificationCacheByUserId.has('user-1')).toBe(false);
    expect(notificationCacheByUserId.has('user-2')).toBe(true);
  });
});
