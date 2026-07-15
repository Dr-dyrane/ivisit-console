import { canonicalizeEmergencyStatus } from '../../../utils/emergencyStatus';

export const STATUS_SHORT_LABELS = {
  pending_approval: 'new',
  in_progress: 'active',
  accepted: 'response',
  arrived: 'arrived',
  completed: 'done',
};

const SUPPORTED_SERVICE_TYPES = new Set(['ambulance', 'bed', 'booking']);

export const requestFieldClassName = 'h-11 rounded-inner bg-background/60 transition-[background,box-shadow] focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]';
export const requestSelectContentClassName = 'rounded-inner bg-background/95 shadow-2xl backdrop-blur-xl';

export const normalizeEmergencyStatus = (value, fallback = 'pending_approval') => (
  canonicalizeEmergencyStatus(value, fallback)
);

export const normalizeServiceType = (value, fallback = 'ambulance') => {
  const serviceType = String(value || '').trim().toLowerCase();
  return SUPPORTED_SERVICE_TYPES.has(serviceType) ? serviceType : fallback;
};

export const createEmergencyRequestDraft = (request) => ({
  user_id: '',
  service_type: 'ambulance',
  emergency_type: '',
  priority: 'medium',
  status: 'pending_approval',
  location: '',
  latitude: null,
  longitude: null,
  description: '',
  ...request,
});

export const mergeEmergencyRequestDraft = (previous, request) => ({
  ...previous,
  ...request,
  priority: request.priority || previous.priority || 'medium',
  status: normalizeEmergencyStatus(request.status || previous.status || 'pending_approval'),
  user_id: request.user_id || previous.user_id || '',
  service_type: normalizeServiceType(request.service_type || previous.service_type),
  emergency_type: request.patient_snapshot?.incident_type || request.emergency_type || previous.emergency_type || '',
});

export const getRequestCoordinates = (formData) => {
  const hasLatitude = formData.latitude !== null
    && formData.latitude !== undefined
    && formData.latitude !== '';
  const hasLongitude = formData.longitude !== null
    && formData.longitude !== undefined
    && formData.longitude !== '';
  const latitude = Number(formData.latitude);
  const longitude = Number(formData.longitude);
  const isValid = hasLatitude === hasLongitude && (!hasLatitude || (
    Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
  ));

  return {
    hasLatitude,
    hasLongitude,
    isValid,
    latitude,
    longitude,
  };
};

export const buildEmergencyRequestSubmission = (formData, isCreate, coordinates = getRequestCoordinates(formData)) => {
  const submitData = { ...formData };
  delete submitData.profiles;
  const { hasLatitude, latitude, longitude } = coordinates;
  const normalizedStatus = submitData.status
    ? normalizeEmergencyStatus(submitData.status)
    : undefined;
  const existingSnapshot = submitData.patient_snapshot && typeof submitData.patient_snapshot === 'object'
    ? submitData.patient_snapshot
    : {};

  return {
    submitData,
    normalizedStatus,
    payload: {
      user_id: submitData.user_id || undefined,
      service_type: normalizeServiceType(submitData.service_type),
      specialty: submitData.specialty || undefined,
      status: isCreate ? 'pending_approval' : normalizedStatus || undefined,
      hospital_id: submitData.hospital_id || undefined,
      hospital_name: submitData.hospital_name || undefined,
      ambulance_type: submitData.ambulance_type || undefined,
      bed_number: submitData.bed_number || undefined,
      total_cost: submitData.total_cost ?? undefined,
      payment_status: submitData.payment_status || undefined,
      patient_snapshot: {
        ...existingSnapshot,
        priority: submitData.priority || undefined,
        incident_type: submitData.emergency_type || undefined,
        location_text: submitData.location || undefined,
        description: submitData.description || undefined,
      },
      patient_location: hasLatitude ? { lat: latitude, lng: longitude } : undefined,
      description: submitData.description || undefined,
    },
  };
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-muted-foreground';
  }
};

export const getPriorityBg = (priority) => {
  switch (priority) {
    case 'critical': return 'bg-red-500/10';
    case 'high': return 'bg-orange-500/10';
    case 'medium': return 'bg-yellow-500/10';
    case 'low': return 'bg-blue-500/10';
    default: return 'bg-muted/10';
  }
};
