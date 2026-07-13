export const TABLE_NAME = 'hospitals';

export const HOSPITAL_CREATE_FIELDS = [
  'name',
  'address',
  'phone',
  'rating',
  'type',
  'image',
  'specialties',
  'service_types',
  'features',
  'emergency_level',
  'available_beds',
  'icu_beds_available',
  'total_beds',
  'ambulances_count',
  'emergency_wait_time_minutes',
  'wait_time',
  'price_range',
  'latitude',
  'longitude',
  'verified',
  'verification_status',
  'status',
  'place_id',
  'updated_at',
  'created_at',
];

export const HOSPITAL_UPDATE_FIELDS = [
  'name',
  'address',
  'phone',
  'rating',
  'type',
  'image',
  'specialties',
  'service_types',
  'features',
  'emergency_level',
  'available_beds',
  'icu_beds_available',
  'total_beds',
  'ambulances_count',
  'emergency_wait_time_minutes',
  'wait_time',
  'price_range',
  'latitude',
  'longitude',
  'verified',
  'verification_status',
  'status',
  'place_id',
  'updated_at',
];

export const HOSPITAL_STATUS_VALUES = new Set(['available', 'busy', 'closed', 'full']);

// The Hospitals route exposes only its created-time sort. Unknown keys retain
// the established created_at fallback instead of reaching Supabase .order().
export const HOSPITAL_SORT_FIELDS = new Set(['created_at']);
