import { ADMIN_RPC_EMPTY_CLEAR_FIELDS } from './constants';

const PROFILE_UPDATE_FIELDS = [
  'phone',
  'username',
  'first_name',
  'last_name',
  'full_name',
  'image_uri',
  'avatar_url',
  'role',
  'organization_id',
  'provider_type',
  'bvn_verified',
  'address',
  'gender',
  'date_of_birth',
];

const NULLABLE_STRING_FIELDS = new Set([
  'phone',
  'username',
  'first_name',
  'last_name',
  'address',
  'gender',
  'date_of_birth',
]);

const ENUM_FIELDS = new Set(['role', 'provider_type']);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : value);

export function normalizeAuthProfile(user) {
  return {
    ...user,
    role: user.profile_role || user.role,
    username: user.profile_username || user.username,
    first_name: user.profile_first_name || user.first_name,
    last_name: user.profile_last_name || user.last_name,
    full_name: user.profile_full_name || user.full_name,
    provider_type: user.profile_provider_type || user.provider_type,
    bvn_verified: user.profile_bvn_verified || user.bvn_verified,
    organization_id: user.profile_organization_id || user.organization_id,
    organization_name: user.organization_name || user.profile_organization_name || 'Independent',
    display_id: user.profile_display_id || user.display_id,
    image_uri: user.profile_image_uri || user.image_uri,
    avatar_url: user.profile_avatar_url || user.avatar_url,
  };
}

export function buildProfileCreatePayload(input) {
  const payload = {
    id: input.id,
    email: normalizeString(input.email),
    phone: normalizeString(input.phone) || null,
    username: normalizeString(input.username) || null,
    first_name: normalizeString(input.first_name) || null,
    last_name: normalizeString(input.last_name) || null,
    full_name: normalizeString(input.full_name),
    image_uri: input.image_uri || input.avatar_url,
    role: normalizeString(input.role) || 'patient',
    organization_id: input.organization_id === '' ? null : input.organization_id || null,
    provider_type: normalizeString(input.provider_type) || null,
    bvn_verified: input.bvn_verified || false,
    address: normalizeString(input.address) || null,
    gender: normalizeString(input.gender) || null,
    date_of_birth: normalizeString(input.date_of_birth) || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

export function buildProfileUpdatePayload(input) {
  const payload = {};

  PROFILE_UPDATE_FIELDS.forEach((field) => {
    if (input[field] === undefined) return;

    if (field === 'avatar_url' && !payload.image_uri) {
      payload.image_uri = input[field];
    } else if (field === 'organization_id') {
      payload[field] = input[field] === '' ? null : input[field];
    } else if (typeof input[field] === 'string') {
      const normalized = normalizeString(input[field]);

      if (ENUM_FIELDS.has(field) && normalized === '') return;

      if (NULLABLE_STRING_FIELDS.has(field) && normalized === '') {
        payload[field] = null;
        return;
      }

      payload[field] = normalized;
    } else {
      payload[field] = input[field];
    }
  });

  if (payload.role && payload.role !== 'provider') {
    payload.provider_type = null;
  } else if (payload.provider_type && !payload.role) {
    payload.role = 'provider';
  }

  return payload;
}

export function toAdminProfilePayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).map(([field, value]) => [
      field,
      value === null && ADMIN_RPC_EMPTY_CLEAR_FIELDS.has(field) ? '' : value,
    ])
  );
}

export function normalizeRestrictedProfileField(field, value) {
  if (field === 'bvn_verified') return Boolean(value);
  if (field === 'organization_id' || field === 'provider_type') return value || null;
  return value;
}
