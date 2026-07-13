export const PROFILE_TABLE_NAME = 'profiles';
export const PROFILE_AVATAR_BUCKET = 'images';
export const EMERGENCY_PATIENT_OPTION_LIMIT = 100;

export const SELF_EDITABLE_FIELDS = new Set([
  'phone',
  'username',
  'first_name',
  'last_name',
  'full_name',
  'image_uri',
  'avatar_url',
  'address',
  'gender',
  'date_of_birth',
  'updated_at',
]);

export const ADMIN_RPC_EMPTY_CLEAR_FIELDS = new Set([
  'phone',
  'username',
  'address',
  'gender',
  'date_of_birth',
  'provider_type',
]);
