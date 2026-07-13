export const TABLE_NAME = 'ambulances';

export const ACTIVE_AMBULANCE_STATUSES = [
  'dispatched',
  'on_trip',
  'en_route',
  'on_scene',
];

export const VALID_AMBULANCE_STATUSES = [
  'available',
  'dispatched',
  'on_trip',
  'en_route',
  'on_scene',
  'returning',
  'maintenance',
  'offline',
  'pending_approval',
];

export const AMBULANCE_PAGE_SORT_COLUMNS = new Set([
  'call_sign',
  'vehicle_number',
  'license_plate',
  'type',
  'status',
  'eta',
  'created_at',
  'updated_at',
  'hospital_id',
]);
