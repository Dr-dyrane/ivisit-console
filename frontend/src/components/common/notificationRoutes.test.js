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

  it.each([
    'acknowledge_responder_arrival',
    'approve_cash_payment',
    'respond_emergency_offer',
    'track_emergency',
    'view_emergency',
    'view_emergency_assignment',
    'view_emergency_request',
    'view_emergency_visit',
  ])('routes canonical emergency action %s to the Request surface', (actionType) => {
    expect(resolveNotificationDestination({
      type: 'emergency',
      action_type: actionType,
      action_data: { requestId: 'request-1' },
    })).toBe('/emergencies?id=request-1');
  });

  it('prefers canonical action routing and action_data identity over compatibility fields', () => {
    expect(resolveNotificationDestination({
      type: 'hospital',
      action_type: 'view_emergency',
      action_data: { requestId: 'REQ 10/2' },
      target_id: 'legacy-hospital-id',
      metadata: { targetId: 'metadata-hospital-id' },
    })).toBe('/emergencies?id=REQ%2010%2F2');
  });

  it('falls back to legacy target identity for a canonical emergency action', () => {
    expect(resolveNotificationDestination({
      type: 'emergency',
      action_type: 'view_emergency',
      target_id: 'legacy-request-id',
    })).toBe('/emergencies?id=legacy-request-id');
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
