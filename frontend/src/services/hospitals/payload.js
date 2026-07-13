import {
  HOSPITAL_CREATE_FIELDS,
  HOSPITAL_STATUS_VALUES,
  HOSPITAL_UPDATE_FIELDS,
} from './constants';

const toTrimmedOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toFiniteOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toNonNegativeIntOrNull = (value, fieldName) => {
  const numberValue = toFiniteOrNull(value);
  if (numberValue === null) return null;
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} must be a whole number of zero or more`);
  }
  return numberValue;
};

const toTextArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
};

export function buildHospitalPayload(input = {}, { isCreate = false } = {}) {
  const payload = {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(input, key);

  const name = toTrimmedOrNull(input.name);
  const address = toTrimmedOrNull(input.address);
  if (isCreate) {
    payload.name = name || 'Unnamed Facility';
    payload.address = address || 'Address unavailable';
  } else {
    if (hasOwn('name') && name === null) throw new Error('Facility name is required');
    if (hasOwn('address') && address === null) throw new Error('Facility address is required');
    if (name !== null) payload.name = name;
    if (address !== null) payload.address = address;
  }

  const phone = toTrimmedOrNull(input.phone);
  if (isCreate || hasOwn('phone')) payload.phone = phone ?? '';

  const rating = toFiniteOrNull(input.rating);
  if (rating !== null || isCreate) payload.rating = rating ?? 0;

  const type = toTrimmedOrNull(input.type);
  if (!isCreate && hasOwn('type') && type === null) throw new Error('Facility tier is required');
  if (type !== null || isCreate) payload.type = type ?? 'standard';

  const image = toTrimmedOrNull(input.image);
  if (isCreate || hasOwn('image')) payload.image = image ?? '';

  if (isCreate || hasOwn('specialties')) payload.specialties = toTextArray(input.specialties);
  if (isCreate || hasOwn('service_types')) payload.service_types = toTextArray(input.service_types);
  if (isCreate || hasOwn('features')) payload.features = toTextArray(input.features);

  const emergencyLevel = toTrimmedOrNull(input.emergency_level);
  if (isCreate || hasOwn('emergency_level')) payload.emergency_level = emergencyLevel ?? '';

  const availableBeds = toNonNegativeIntOrNull(input.available_beds, 'Available beds');
  if (availableBeds !== null || isCreate) payload.available_beds = availableBeds ?? 0;

  const icuBedsAvailable = toNonNegativeIntOrNull(input.icu_beds_available, 'ICU beds');
  if (icuBedsAvailable !== null || isCreate) payload.icu_beds_available = icuBedsAvailable ?? 0;

  const totalBeds = toNonNegativeIntOrNull(input.total_beds, 'Total beds');
  if (totalBeds !== null || isCreate) payload.total_beds = totalBeds ?? 0;

  const ambulancesCount = toNonNegativeIntOrNull(input.ambulances_count, 'Ambulances');
  if (ambulancesCount !== null || isCreate) payload.ambulances_count = ambulancesCount ?? 0;

  const emergencyWaitMinutes = toNonNegativeIntOrNull(input.emergency_wait_time_minutes, 'Emergency wait time');
  if (emergencyWaitMinutes !== null || isCreate) {
    payload.emergency_wait_time_minutes = emergencyWaitMinutes ?? 0;
  }

  const waitTime = toTrimmedOrNull(input.wait_time);
  if (isCreate || hasOwn('wait_time')) payload.wait_time = waitTime ?? '';

  const priceRange = toTrimmedOrNull(input.price_range);
  if (isCreate || hasOwn('price_range')) payload.price_range = priceRange ?? '';

  const latitude = toFiniteOrNull(input.latitude);
  const longitude = toFiniteOrNull(input.longitude);
  if (latitude !== null || isCreate) payload.latitude = latitude;
  if (longitude !== null || isCreate) payload.longitude = longitude;

  const verified = typeof input.verified === 'boolean' ? input.verified : null;
  if (verified !== null || isCreate) payload.verified = verified ?? false;

  const verificationStatus = toTrimmedOrNull(input.verification_status);
  if (verificationStatus !== null || isCreate) payload.verification_status = verificationStatus ?? 'pending';

  const status = toTrimmedOrNull(input.status);
  if (status !== null && !HOSPITAL_STATUS_VALUES.has(status)) {
    throw new Error('Operational status is not recognized');
  }
  if (status !== null || isCreate) payload.status = status ?? 'available';

  const placeId = toTrimmedOrNull(input.place_id);
  if (isCreate || hasOwn('place_id')) payload.place_id = placeId ?? '';

  if (availableBeds !== null && totalBeds !== null && availableBeds > totalBeds) {
    throw new Error('Available beds cannot exceed total beds');
  }
  if (icuBedsAvailable !== null && availableBeds !== null && icuBedsAvailable > availableBeds) {
    throw new Error('ICU beds cannot exceed available beds');
  }
  if (status === 'available' && availableBeds === 0) {
    throw new Error('Available facilities must report at least one available bed');
  }
  if (status === 'full' && availableBeds !== null && availableBeds > 0) {
    throw new Error('Full facilities cannot report available beds');
  }

  const nowIso = new Date().toISOString();
  payload.updated_at = nowIso;
  if (isCreate) payload.created_at = nowIso;

  const allowedFields = new Set(isCreate ? HOSPITAL_CREATE_FIELDS : HOSPITAL_UPDATE_FIELDS);
  return Object.fromEntries(
    Object.entries(payload).filter(([field, value]) => allowedFields.has(field) && value !== undefined)
  );
}
