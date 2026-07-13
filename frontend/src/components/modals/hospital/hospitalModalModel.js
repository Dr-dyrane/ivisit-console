export const DEFAULT_HOSPITAL_FORM = {
  name: '',
  address: '',
  phone: '',
  rating: 4.5,
  type: 'premium',
  image: '',
  specialties: [],
  service_types: [],
  features: [],
  emergency_level: 'Level 1',
  available_beds: 0,
  icu_beds_available: 0,
  total_beds: 0,
  ambulances_count: 0,
  emergency_wait_time_minutes: 0,
  wait_time: '',
  price_range: '',
  latitude: null,
  longitude: null,
  place_id: null,
  last_availability_update: null,
  verified: false,
  verification_status: 'pending',
  status: 'available',
};

const toTextArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toIntOrZero = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

export const formatHospitalDateTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export const buildInitialHospitalForm = (hospital) => {
  if (!hospital) return { ...DEFAULT_HOSPITAL_FORM };
  return {
    ...DEFAULT_HOSPITAL_FORM,
    ...hospital,
    specialties: toTextArray(hospital.specialties),
    service_types: toTextArray(hospital.service_types),
    features: toTextArray(hospital.features),
    rating: Number.isFinite(Number(hospital.rating))
      ? Number(hospital.rating)
      : DEFAULT_HOSPITAL_FORM.rating,
    available_beds: toIntOrZero(hospital.available_beds),
    icu_beds_available: toIntOrZero(hospital.icu_beds_available),
    total_beds: toIntOrZero(hospital.total_beds),
    ambulances_count: toIntOrZero(hospital.ambulances_count),
    emergency_wait_time_minutes: toIntOrZero(hospital.emergency_wait_time_minutes),
    latitude: toNumberOrNull(hospital.latitude),
    longitude: toNumberOrNull(hospital.longitude),
    place_id: hospital.place_id || null,
    last_availability_update: hospital.last_availability_update || null,
  };
};

export const buildHospitalSavePayload = (formData, canManageVerification) => {
  const payload = { ...formData };
  if (!canManageVerification) {
    delete payload.verified;
    delete payload.verification_status;
  }
  return payload;
};

export const HOSPITAL_FIELD_CLASS = 'rounded-inner bg-background/60 transition-[background,box-shadow] focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60';
export const HOSPITAL_SELECT_CONTENT_CLASS = 'rounded-inner bg-background/95 shadow-xl backdrop-blur-xl';
export const HOSPITAL_FORM_ID = 'hospital-modal-form';
