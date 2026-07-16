import { formatRelativeTime } from './activityUtils';
import { canonicalizeEmergencyStatus } from './emergencyStatus';
import { decodePostGISGeometry, formatEmergencyLocation } from './locationUtils';
import { getPatientInitials } from './patientUtils';
import { buildRequestVisitIdentityProjection } from './requestVisitIdentityProjection';

const CASH_METHODS = new Set(['cash', 'cash_payment']);

const toCleanString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    return value;
  }
  return null;
};

const isFiniteCoordinate = (lat, lng) => (
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180
);

export const extractCoordinatePair = (...values) => {
  for (const value of values) {
    if (!value) continue;

    if (typeof value === 'object') {
      const lat = Number(value.lat ?? value.latitude);
      const lng = Number(value.lng ?? value.longitude);
      if (isFiniteCoordinate(lat, lng)) {
        return { lat, lng, source: 'object' };
      }

      const decoded = decodePostGISGeometry(value);
      if (decoded && isFiniteCoordinate(decoded.lat, decoded.lng)) {
        return { ...decoded, source: 'geometry' };
      }
    }

    if (typeof value === 'string') {
      const pointMatch = value.match(/POINT\s*\(\s*([-.\d]+)\s+([-.\d]+)\s*\)/i);
      if (pointMatch) {
        const lng = Number(pointMatch[1]);
        const lat = Number(pointMatch[2]);
        if (isFiniteCoordinate(lat, lng)) {
          return { lat, lng, source: 'wkt' };
        }
      }

      const decoded = decodePostGISGeometry(value);
      if (decoded && isFiniteCoordinate(decoded.lat, decoded.lng)) {
        return { ...decoded, source: 'postgis' };
      }
    }
  }

  return null;
};

const formatMoneyLabel = (value, currency = 'USD') => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Unavailable';
  return `${amount.toFixed(2)} ${currency || 'USD'}`;
};

export const normalizePaymentMethod = (value) => {
  const normalized = toCleanString(value).toLowerCase();
  return normalized || null;
};

export const isCashPaymentMethod = (value) => CASH_METHODS.has(normalizePaymentMethod(value));

export const formatEmergencyServiceToken = (value, fallback = 'Standard') => {
  if (!value) return fallback;

  if (typeof value === 'object') {
    return value.title || value.name || value.type || fallback;
  }

  if (typeof value !== 'string') return fallback;

  const trimmedValue = value.trim();
  if (!trimmedValue) return fallback;

  if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      return parsedValue?.title || parsedValue?.name || parsedValue?.type || trimmedValue;
    } catch {
      return trimmedValue;
    }
  }

  return trimmedValue
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ADOPT-04 read surfacing: cost components live on emergency_requests
// (base_cost / distance_surcharge / urgency_surcharge) and payments
// (ivisit_fee_amount). Null columns stay absent -- no fabricated zeros.
const COST_BREAKDOWN_COMPONENTS = [
  ['base_cost', 'Base cost'],
  ['distance_surcharge', 'Distance surcharge'],
  ['urgency_surcharge', 'Urgency surcharge'],
];

const buildCostBreakdownLines = (row, paymentRecord, currency) => {
  const lines = [];
  for (const [key, label] of COST_BREAKDOWN_COMPONENTS) {
    const value = row?.[key];
    if (value === null || value === undefined) continue;
    const amount = Number(value);
    if (!Number.isFinite(amount)) continue;
    lines.push({ key, label, amountLabel: formatMoneyLabel(amount, currency) });
  }
  const feeAmount = Number(paymentRecord?.ivisit_fee_amount ?? null);
  if (paymentRecord?.ivisit_fee_amount !== null
    && paymentRecord?.ivisit_fee_amount !== undefined
    && Number.isFinite(feeAmount)) {
    lines.push({
      key: 'ivisit_fee_amount',
      label: 'iVisit fee',
      amountLabel: formatMoneyLabel(feeAmount, currency),
    });
  }
  return lines;
};

// ADOPT-05 read surfacing: responder_location_observed_at /
// responder_location_accuracy_meters are backend telemetry truth.
// Missing or unparseable telemetry returns null -- never fake freshness.
const buildResponderLocationFreshness = (row) => {
  const observedAt = row?.responder_location_observed_at;
  if (!observedAt) return null;
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return null;
  const accuracyMeters = Number(row?.responder_location_accuracy_meters);
  const accuracyLabel = Number.isFinite(accuracyMeters) && accuracyMeters > 0
    ? `\u00b1${Math.round(accuracyMeters)} m`
    : null;
  const agoLabel = formatRelativeTime(observedAt);
  return {
    observedAt,
    agoLabel,
    accuracyLabel,
    label: accuracyLabel ? `${agoLabel} \u00b7 ${accuracyLabel}` : agoLabel,
  };
};

// ADOPT-32 read surfacing: destination_location is the recorded transport
// destination on emergency_requests. Only real destination truth renders --
// an address string when the column carries one, otherwise decoded
// coordinates. Facility identity already lives in facilityDisplay, so a null
// destination stays absent instead of echoing the hospital name.
const buildDestinationDisplay = (row) => {
  const destination = row?.destination_location;
  const address = destination && typeof destination === 'object' && !Array.isArray(destination)
    ? toCleanString(destination.address) || null
    : null;
  const pair = destination ? extractCoordinatePair(destination) : null;
  const coordinates = pair ? { lat: pair.lat, lng: pair.lng } : null;
  const label = address
    || (coordinates ? `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : null);
  return {
    label,
    coordinates,
    hasDestination: Boolean(label),
  };
};

export const buildLatestPaymentMap = (paymentRows = []) => {
  const paymentByRequestId = new Map();
  for (const payment of paymentRows) {
    const requestId = payment?.emergency_request_id;
    if (!requestId || paymentByRequestId.has(requestId)) {
      continue;
    }
    paymentByRequestId.set(requestId, payment);
  }
  return paymentByRequestId;
};

export const normalizeEmergencyRequestRow = (row, paymentRecord = null) => {
  const paymentMethod = normalizePaymentMethod(
    pickFirstNonEmpty(row?.payment_method, row?.payment_method_id, paymentRecord?.payment_method)
  );
  const paymentStatus = pickFirstNonEmpty(row?.payment_status, paymentRecord?.status);
  const etaDisplay = pickFirstNonEmpty(
    row?.eta_display,
    row?.next_estimated_arrival,
    row?.estimated_arrival
  );
  const bedCategory = pickFirstNonEmpty(row?.bed_category, row?.bed_type);

  return {
    ...row,
    status: canonicalizeEmergencyStatus(row?.status, row?.status),
    payment_method: paymentMethod,
    payment_method_id: row?.payment_method_id ?? paymentMethod,
    payment_status: paymentStatus ?? null,
    eta_display: etaDisplay ?? null,
    bed_category: bedCategory ?? null,
    bed_type: row?.bed_type ?? bedCategory ?? null,
  };
};

export const buildEmergencyRenderProjection = (row, options = {}) => {
  const paymentRecord = options.latestPayment || options.paymentRecord || null;
  const visitOutcome = options.visitOutcome || null;
  const canonicalStatus = canonicalizeEmergencyStatus(row?.status, row?.status);
  const identityProjection = options.identityProjection
    || buildRequestVisitIdentityProjection({ request: row, visit: visitOutcome });
  const patient = identityProjection.patient;
  const coordinatePair = extractCoordinatePair(
    { lat: row?.latitude, lng: row?.longitude },
    row?.patient_location,
    row?.pickup_location,
    row?.destination_location
  );
  const paymentMethod = normalizePaymentMethod(
    pickFirstNonEmpty(row?.payment_method, row?.payment_method_id, paymentRecord?.payment_method)
  );
  const paymentStatus = pickFirstNonEmpty(row?.payment_status, paymentRecord?.status);
  const amount = pickFirstNonEmpty(
    paymentRecord?.amount,
    paymentRecord?.total_amount,
    row?.total_cost,
    row?.confirmed_cost
  );
  const currency = pickFirstNonEmpty(paymentRecord?.currency, row?.currency, 'USD');
  const terminal = canonicalStatus === 'completed' || canonicalStatus === 'cancelled';

  // PULLBACK NOTE: First Pass 1 render projection boundary.
  // OLD: emergency JSX read mixed raw row/payment fields directly.
  // NEW: UI-facing labels and capability flags are normalized before render.
  return {
    identity: {
      id: row?.id || null,
      displayId: row?.display_id || row?.request_id || row?.id?.slice?.(0, 8) || null,
      createdAt: row?.created_at || null,
    },
    patientDisplay: {
      name: patient.name,
      username: patient.username,
      phone: patient.phone,
      email: patient.email,
      initials: getPatientInitials(patient.name),
      avatar: patient.avatar,
      profileId: patient.profileId,
    },
    serviceDisplay: {
      type: row?.service_type || null,
      label: formatEmergencyServiceToken(row?.service_type, 'Emergency Request'),
      ambulanceTypeLabel: formatEmergencyServiceToken(row?.ambulance_type, 'Standard'),
      hasAmbulanceType: Boolean(row?.ambulance_type),
      bedCategoryLabel: formatEmergencyServiceToken(row?.bed_category || row?.bed_type, 'N/A'),
      specialtyLabel: formatEmergencyServiceToken(row?.specialty || row?.bed_category || row?.bed_type, 'N/A'),
      // ADOPT-32: bed_count is a raw text column; an empty string stays
      // absent (never Number('') === 0 fabrication).
      bedCount: toCleanString(row?.bed_count) || null,
    },
    statusDisplay: {
      status: canonicalStatus,
      label: formatEmergencyServiceToken(canonicalStatus, 'Unknown'),
      terminal,
    },
    locationDisplay: {
      label: formatEmergencyLocation(row?.patient_location, row?.pickup_location),
      coordinates: coordinatePair ? { lat: coordinatePair.lat, lng: coordinatePair.lng } : null,
      coordinateSource: coordinatePair?.source || 'unavailable',
      canOpenExternalMap: Boolean(coordinatePair),
    },
    destinationDisplay: buildDestinationDisplay(row),
    facilityDisplay: {
      hospitalId: row?.hospital_id || null,
      organizationId: row?.organization_id || null,
      name: row?.hospital_name || row?.hospital?.name || 'Not assigned',
      assignmentState: row?.hospital_id ? 'assigned' : 'unassigned',
    },
    paymentDisplay: {
      id: paymentRecord?.id || row?.payment_id || null,
      method: paymentMethod,
      methodLabel: paymentMethod ? paymentMethod.toUpperCase() : 'UNSET',
      status: paymentStatus || null,
      amountLabel: formatMoneyLabel(amount, currency),
      breakdown: buildCostBreakdownLines(row, paymentRecord, currency),
      visibilityState: options.paymentVisibilityState || (paymentRecord ? 'visible' : 'not_created'),
    },
    doctorDisplay: {
      id: identityProjection.doctor.doctorId,
      label: identityProjection.doctor.name,
      specialty: identityProjection.doctor.specialty,
      phone: identityProjection.doctor.phone,
      avatar: identityProjection.doctor.avatar,
      hasDoctor: identityProjection.doctor.hasDoctor,
    },
    responderDisplay: {
      id: identityProjection.responder.profileId,
      profileId: identityProjection.responder.profileId,
      ambulanceId: identityProjection.responder.ambulanceId,
      label: identityProjection.responder.name,
      phone: identityProjection.responder.phone,
      avatar: identityProjection.responder.avatar,
      vehicleType: identityProjection.responder.vehicleType,
      vehiclePlate: identityProjection.responder.vehiclePlate,
      etaLabel: pickFirstNonEmpty(row?.eta_display, row?.eta, row?.estimated_arrival) || 'ETA pending',
      locationFreshness: buildResponderLocationFreshness(row),
      hasResponder: identityProjection.responder.hasResponder,
    },
    clinicalOutcome: {
      visitId: visitOutcome?.id || null,
      canOpen: Boolean(visitOutcome?.id),
      visibilityState: options.visitVisibilityState || (terminal ? 'missing_terminal' : 'not_expected_yet'),
    },
  };
};
