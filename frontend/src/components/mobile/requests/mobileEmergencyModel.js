import { AlertCircle, Ambulance, BedDouble, Calendar, Clock, Hospital } from 'lucide-react';
import { canonicalizeEmergencyStatus } from '../../../utils/emergencyStatus';
import { buildEmergencyRenderProjection, formatEmergencyServiceToken } from '../../../utils/emergencyRequestMapper';
import { isUnsettledCashRequest } from '../../../utils/requestDisplay';

export const MOBILE_REQUEST_KPIS = [
  { id: 'all', label: 'All', color: 'hsl(var(--muted-foreground))' },
  { id: 'pending', label: 'Needs attention', icon: AlertCircle, color: 'hsl(var(--destructive))' },
  { id: 'active', label: 'Active', icon: Clock, color: '#f59e0b' },
  { id: 'bed', label: 'Beds', icon: BedDouble, color: '#06b6d4' },
  { id: 'ambulance', label: 'Ambulance', icon: Ambulance, color: '#0ea5e9' },
];

export const countMobileRequestValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getMobileRequestServiceLabel = (request) => {
  const raw = String(request?.service_type || 'request').replace(/_/g, ' ');
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getMobileRequestCreatedDateLabel = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getMobileRequestAvatarClass = (request) => {
  const key = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
  if (key === 'pending_approval' || key === 'payment_declined') {
    return 'bg-destructive/14 text-destructive';
  }
  if (key === 'completed') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  }
  if (key === 'cancelled') {
    return 'bg-muted/34 text-muted-foreground';
  }
  if (key === 'in_progress') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  }
  if (key === 'accepted') {
    return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  }
  if (key === 'arrived') {
    return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
  }
  return 'bg-muted/34 text-muted-foreground';
};

export const getMobileRequestTypeIcon = (request) => {
  const type = String(request?.service_type || '').toLowerCase();
  if (type === 'ambulance') return Ambulance;
  if (type === 'bed') return BedDouble;
  if (type === 'booking') return Calendar;
  return Hospital;
};

export const hasMobileRequestFilters = (filters = {}) => Boolean(
  filters.search ||
  (Array.isArray(filters.status) && filters.status.length > 0) ||
  filters.created_at?.start ||
  filters.created_at?.end
);

export const getMobileRequestKpiValue = ({ id, statistics, emergencies = [] }) => {
  if (id === 'all') {
    return countMobileRequestValue(statistics?.total, emergencies.length);
  }
  if (id === 'pending') {
    const rowCount = emergencies.filter((item) => item.status === 'pending_approval').length;
    return countMobileRequestValue(statistics?.pending, rowCount);
  }
  if (id === 'active') {
    const rowCount = emergencies.filter((item) => {
      const status = canonicalizeEmergencyStatus(item?.status, null);
      return status === 'pending_approval' || status === 'in_progress' || status === 'accepted' || status === 'arrived';
    }).length;
    return countMobileRequestValue(statistics?.active, rowCount);
  }
  if (id === 'booking') {
    const rowCount = emergencies.filter((item) => item.service_type === 'booking').length;
    return countMobileRequestValue(statistics?.booking, rowCount);
  }
  if (id === 'bed') {
    const rowCount = emergencies.filter((item) => item.service_type === 'bed').length;
    return countMobileRequestValue(statistics?.bed, rowCount);
  }
  if (id === 'ambulance') {
    const rowCount = emergencies.filter((item) => item.service_type === 'ambulance').length;
    return countMobileRequestValue(statistics?.ambulance, rowCount);
  }
  return countMobileRequestValue(statistics?.total, emergencies.length);
};

export const buildMobileRequestDetailModel = (request) => {
  const projection = buildEmergencyRenderProjection(request || {});
  const unsettledCash = isUnsettledCashRequest(request);
  const paymentParts = [
    unsettledCash ? 'Cash owed' : null,
    projection.paymentDisplay.amountLabel !== 'Unavailable' ? projection.paymentDisplay.amountLabel : null,
    !unsettledCash && projection.paymentDisplay.method ? projection.paymentDisplay.methodLabel : null,
    projection.paymentDisplay.status ? formatEmergencyServiceToken(projection.paymentDisplay.status) : null,
  ].filter(Boolean);
  const vehicleParts = [
    request?.responder_vehicle_plate || null,
    request?.responder_vehicle_type ? formatEmergencyServiceToken(request.responder_vehicle_type, '') : null,
  ].filter(Boolean);
  const bedParts = [
    projection.serviceDisplay.specialtyLabel !== 'N/A' ? projection.serviceDisplay.specialtyLabel : null,
    request?.bed_number ? `Bed ${request.bed_number}` : null,
  ].filter(Boolean);
  const phone = projection.patientDisplay.phone;
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  const phoneHref = phoneDigits.length >= 7
    ? `tel:${String(phone).replace(/[^\d+]/g, '')}`
    : null;

  return {
    projection,
    name: projection.patientDisplay.name,
    facility: projection.facilityDisplay.name,
    location: projection.locationDisplay.label,
    responder: projection.responderDisplay.label,
    terminal: projection.statusDisplay.terminal,
    phone,
    phoneHref,
    patientEmail: projection.patientDisplay.email && projection.patientDisplay.email !== 'No email'
      ? projection.patientDisplay.email
      : null,
    coordinates: projection.locationDisplay.coordinates,
    displayId: projection.identity.displayId,
    isAmbulanceService: String(request?.service_type || '').toLowerCase() === 'ambulance',
    paymentParts,
    hasPayment: Boolean(projection.paymentDisplay.method || projection.paymentDisplay.status) && paymentParts.length > 0,
    vehicleParts,
    bedParts,
  };
};
