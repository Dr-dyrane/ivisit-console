export const DEFAULT_AMBULANCE_FORM = {
  call_sign: '',
  type: 'BLS',
  status: 'available',
  vehicle_number: '',
  license_plate: '',
  hospital_id: '',
  eta: '',
  crew: '',
  current_call: '',
  base_price: '',
  organization_id: '',
};

export const TRIP_OWNED_STATUSES = new Set([
  'dispatched',
  'on_trip',
  'en_route',
  'on_scene',
  'returning',
]);

export const UNIT_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
  { value: 'pending_approval', label: 'Pending review' },
];

export const TYPE_OPTIONS = [
  { value: 'BLS', label: 'Basic life support' },
  { value: 'ALS', label: 'Advanced life support' },
  { value: 'basic', label: 'Basic' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'critical', label: 'Critical care' },
];

export const formId = 'ambulance-modal-form';

// Crew is a Json list column. Keep the text conversion at the form boundary so
// the service payload always receives the array shape consumed by the fleet rail.
export const crewToText = (value) => (
  Array.isArray(value) ? value.filter(Boolean).join(', ') : (value || '')
);

export const crewToArray = (text) => String(text || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

export const normalizeAmbulanceForm = (ambulance, orgId, isCreate, isOrgAdmin) => {
  const base = {
    ...DEFAULT_AMBULANCE_FORM,
    ...(ambulance || {}),
  };

  return {
    ...base,
    call_sign: base.call_sign || '',
    type: base.type || 'BLS',
    status: base.status || 'available',
    vehicle_number: base.vehicle_number || base.vehicle_label || '',
    license_plate: base.license_plate || '',
    hospital_id: base.hospital_id || '',
    eta: base.eta && base.eta !== 'N/A' ? base.eta : '',
    crew: crewToText(base.crew),
    current_call: base.current_call || '',
    base_price: base.base_price ?? '',
    organization_id: base.organization_id || (isCreate && isOrgAdmin && orgId ? orgId : ''),
  };
};

export const formatAmbulanceLabel = (value, fallback = 'Not set') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatAmbulanceDateTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export const getAmbulanceStatusTone = (status) => {
  if (status === 'available') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
  if (status === 'maintenance' || status === 'offline') return 'bg-muted/50 text-muted-foreground';
  if (status === 'pending_approval') return 'bg-amber-500/12 text-amber-700 dark:text-amber-200';
  if (TRIP_OWNED_STATUSES.has(status)) return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-200';
  return 'bg-muted/40 text-muted-foreground';
};

export const getAmbulanceStationName = (ambulance, hospitals, hospitalId) => {
  const selected = hospitals.find((hospital) => hospital.id === hospitalId);
  return selected?.name
    || ambulance?.station_name
    || ambulance?.hospital
    || (hospitalId ? 'Linked station' : 'No station');
};

export const buildAmbulancePayload = (formData, { isCreate, isOrgAdmin, orgId }) => {
  const payload = {
    call_sign: formData.call_sign?.trim(),
    type: formData.type,
    vehicle_number: formData.vehicle_number?.trim(),
    license_plate: formData.license_plate?.trim(),
    hospital_id: formData.hospital_id || '',
    eta: formData.eta?.trim(),
    crew: crewToArray(formData.crew),
    // Dispatch owns current_call, so ordinary fleet metadata never writes it.
    base_price: formData.base_price === '' ? undefined : Number(formData.base_price),
  };

  // Existing status may change through dispatch after this modal opens. Generic
  // edits omit it; only creation establishes the unit's initial state.
  if (isCreate) payload.status = formData.status || 'available';

  if (formData.organization_id) {
    payload.organization_id = formData.organization_id;
  } else if (isCreate && isOrgAdmin && orgId) {
    payload.organization_id = orgId;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};
