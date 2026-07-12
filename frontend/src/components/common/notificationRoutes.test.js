import { resolveNotificationDestination } from './notificationRoutes';

describe('notification route resolution', () => {
  it.each([
    ['ambulance', '/ambulances?id=record-1'],
    ['doctor', '/doctors?id=record-1'],
    ['hospital', '/hospitals?id=record-1'],
    ['visit', '/visits?id=record-1'],
    ['emergency_request', '/emergencies?id=record-1'],
  ])('routes %s notifications to their canonical detail surface', (type, destination) => {
    expect(resolveNotificationDestination({ type, target_id: 'record-1', action_type: 'updated' }))
      .toBe(destination);
  });

  it('uses the compatibility metadata target and safely encodes it', () => {
    expect(resolveNotificationDestination({
      type: 'hospital',
      metadata: { targetId: 'HSP 10/2' },
      action_type: 'updated',
    })).toBe('/hospitals?id=HSP%2010%2F2');
  });

  it.each([
    { type: 'news', target_id: 'article-1', action_type: 'published' },
    { type: 'user', target_id: 'user-1', action_type: 'updated' },
    { type: 'hospital', target_id: 'hospital-1', action_type: 'deleted' },
    { type: 'hospital', action_type: 'updated' },
  ])('leaves notifications without a proven live-record destination inert', (notification) => {
    expect(resolveNotificationDestination(notification)).toBeNull();
  });
});
