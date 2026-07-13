import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { SUPPORTED_CONSOLE_SERVICE_TYPES } from './constants';

// Full parity with the database emergency_requests writable field inventory.
export const EMERGENCY_REQUEST_WRITABLE_FIELDS = new Set([
  'user_id',
  'service_type',
  'specialty',
  'status',
  'hospital_id',
  'hospital_name',
  'ambulance_type',
  'bed_number',
  'total_cost',
  'payment_status',
  'patient_snapshot',
  'patient_location',
  'pickup_location',
  'destination_location',
  'base_cost',
  'distance_surcharge',
  'urgency_surcharge',
  'cost_breakdown',
  'confirmed_cost',
  'bed_count',
  'patient_heading',
  'shared_data_snapshot',
  'payment_method_id',
  'payment_id',
]);

const CONSOLE_CREATE_EMERGENCY_PAYLOAD_FIELDS = [
  'user_id',
  'hospital_id',
  'service_type',
  'status',
  'total_cost',
  'payment_status',
  'patient_snapshot',
  'patient_location',
  'latitude',
  'longitude',
  'description',
  'transition_reason',
  'reason',
  'hospital_name',
  'specialty',
  'ambulance_type',
  'bed_number',
];

const CONSOLE_UPDATE_EMERGENCY_PAYLOAD_FIELDS = [
  'status',
  'transition_reason',
  'reason',
  'hospital_id',
  'hospital_name',
  'service_type',
  'specialty',
  'ambulance_type',
  'bed_number',
  'responder_id',
  'responder_name',
  'responder_phone',
  'responder_vehicle_type',
  'responder_vehicle_plate',
  'responder_heading',
  'responder_location',
  'patient_snapshot',
  'patient_location',
  'total_cost',
  'payment_status',
];

function normalizePoint(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function parsePointInput(input) {
  if (!input) return null;

  if (typeof input === 'object') {
    const directPoint = normalizePoint(
      input.lat ?? input.latitude,
      input.lng ?? input.longitude
    );
    if (directPoint) return directPoint;
    if (
      input.type === 'Point' &&
      Array.isArray(input.coordinates) &&
      input.coordinates.length >= 2
    ) {
      const [lng, lat] = input.coordinates;
      return normalizePoint(lat, lng);
    }
    return null;
  }

  if (typeof input === 'string') {
    const match = input.match(/POINT\s*\(\s*([-.\d]+)\s+([-.\d]+)\s*\)/i);
    if (match) {
      return normalizePoint(match[2], match[1]);
    }
  }

  return null;
}

export function buildLegacyEmergencyPayload(input) {
  const payload = {
    user_id: input.user_id,
    service_type: input.service_type,
    specialty: input.specialty,
    pickup_location: input.pickup_location,
    destination_location: input.destination_location,
    patient_snapshot: input.patient_snapshot,
    patient_location: input.patient_location,
    hospital_id: input.hospital_id,
    hospital_name: input.hospital_name,
    ambulance_type: input.ambulance_type,
    payment_status: input.payment_status,
    total_cost: input.total_cost,
    status: canonicalizeEmergencyStatus(input.status, 'in_progress'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function pickDefinedPayloadFields(input, allowedFields) {
  const payload = {};
  for (const field of allowedFields) {
    if (input?.[field] !== undefined) {
      payload[field] = input[field];
    }
  }
  return payload;
}

export function buildConsoleCreatePayload(input, fallbackPayload) {
  const normalizedPatientLocation =
    parsePointInput(input?.patient_location) ||
    parsePointInput(input?.pickup_location) ||
    normalizePoint(input?.latitude, input?.longitude);
  const payload = pickDefinedPayloadFields(
    {
      ...fallbackPayload,
      user_id: input?.user_id ?? fallbackPayload?.user_id ?? null,
      service_type: input?.service_type ?? fallbackPayload?.service_type ?? 'ambulance',
      status: fallbackPayload?.status ?? canonicalizeEmergencyStatus(input?.status, 'in_progress'),
      patient_location: normalizedPatientLocation || fallbackPayload?.patient_location,
      latitude:
        input?.latitude ??
        normalizedPatientLocation?.lat ??
        input?.pickup_location?.latitude ??
        input?.pickup_location?.lat ??
        undefined,
      longitude:
        input?.longitude ??
        normalizedPatientLocation?.lng ??
        input?.pickup_location?.longitude ??
        input?.pickup_location?.lng ??
        undefined,
      description: input?.description ?? null,
    },
    CONSOLE_CREATE_EMERGENCY_PAYLOAD_FIELDS
  );

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

export function normalizeConsoleServiceType(value) {
  const normalized = String(value || 'ambulance').trim().toLowerCase();
  if (!SUPPORTED_CONSOLE_SERVICE_TYPES.has(normalized)) {
    throw new Error('Select Ambulance, Bed, or Booking as the request service.');
  }
  return normalized;
}

export function buildConsoleUpdatePayload(input, normalizedStatus) {
  const payload = pickDefinedPayloadFields(
    {
      ...input,
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
    },
    CONSOLE_UPDATE_EMERGENCY_PAYLOAD_FIELDS
  );

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

export function calculateResponseTime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  return Math.round(diffMs / 60000);
}
