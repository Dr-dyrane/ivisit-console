import { formatRelativeTime } from '../../../utils/activityUtils';

export const facilityTypeLabel = (hospital) => {
  const raw = hospital?.type || hospital?.provider_type;
  if (!raw) return 'Facility';
  const text = String(raw).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Facility';
};

export const mapsHref = (hospital) => {
  const lat = Number(hospital?.latitude);
  const lng = Number(hospital?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }
  if (hospital?.address) {
    return `https://maps.google.com/?q=${encodeURIComponent(hospital.address)}`;
  }
  return undefined;
};

export const hasMobileHospitalFilters = (filters = {}) => Boolean(
  filters?.search ||
  filters?.status ||
  filters?.created_at?.start ||
  filters?.created_at?.end
);

export const hasCapacitySignal = (hospital) => (
  (Number(hospital?.available_beds) || 0) > 0 ||
  (Number(hospital?.total_beds) || 0) > 0 ||
  (Number(hospital?.ambulances_count) || 0) > 0
);

export const getHospitalStatus = (hospital) => String(
  hospital?.status || hospital?.verification_status || 'available'
).toLowerCase();

export const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const getMobileHospitalTotals = (statistics) => {
  if (!statistics?.exactCounts) {
    return { total: null, available: null, full: null, busy: null };
  }
  return {
    total: metricValue(statistics.total, null),
    available: metricValue(statistics.available, null),
    full: metricValue(statistics.full, null),
    busy: metricValue(statistics.busy, null),
  };
};

export const getMobileHospitalKpis = (totals) => [
  {
    id: 'all',
    label: 'Hospitals',
    value: totals.total,
    color: 'hsl(var(--muted-foreground))',
  },
  {
    id: 'available',
    label: 'Available',
    value: totals.available,
    color: 'hsl(160 84% 39%)',
  },
  {
    id: 'busy',
    label: 'Busy',
    value: totals.busy,
    color: 'hsl(38 92% 50%)',
  },
  {
    id: 'full',
    label: 'Full',
    value: totals.full,
    color: 'hsl(var(--destructive))',
  },
];

export const createHospitalFilterSignature = (filters = {}) => JSON.stringify({
  search: filters?.search || '',
  status: filters?.status || null,
  date: filters?.created_at || null,
});

export const createHospitalAccumulator = () => ({
  signature: null,
  order: [],
  byId: new Map(),
  lastSource: null,
  provisional: false,
});

export const accumulateHospitalRows = (store, sourceHospitals, filterSignature) => {
  const rows = Array.isArray(sourceHospitals) ? sourceHospitals : [];
  const absorb = (row) => {
    const id = row?.id;
    if (id === null || id === undefined) return;
    if (!store.byId.has(id)) store.order.push(id);
    store.byId.set(id, row);
  };
  const scopeChanged = store.signature !== filterSignature;

  if (scopeChanged) {
    store.signature = filterSignature;
    store.order = [];
    store.byId = new Map();
    store.provisional = true;
  }

  if (store.lastSource !== rows) {
    store.lastSource = rows;
    if (store.provisional && !scopeChanged) {
      store.order = [];
      store.byId = new Map();
      store.provisional = false;
    }
    rows.forEach(absorb);
  } else if (scopeChanged) {
    rows.forEach(absorb);
  }

  return store.order.map((id) => store.byId.get(id));
};

export const getActiveHospitalStatusFilter = (filters = {}) => (
  Array.isArray(filters?.status)
    ? (filters.status.length === 1 ? filters.status[0] : 'all')
    : (filters?.status || 'all')
);

export const getHospitalScopeCount = (totals, activeStatusFilter) => (
  activeStatusFilter === 'all'
    ? totals.total
    : (totals[activeStatusFilter] ?? totals.total)
);

export const statusColorFor = (status) => (
  status === 'available' || status === 'verified'
    ? 'hsl(160 84% 39%)'
    : status === 'full' || status === 'pending'
      ? 'hsl(38 92% 50%)'
      : 'hsl(var(--muted-foreground))'
);

export const orbClassFor = (status) => (
  status === 'available'
    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
    : status === 'busy'
      ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
      : status === 'full'
        ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
        : 'bg-muted/40 text-muted-foreground'
);

const toReportedNonNegativeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export const getMobileHospitalRowModel = (hospital) => {
  const status = getHospitalStatus(hospital);
  const beds = toReportedNonNegativeNumber(hospital?.available_beds);
  const totalBeds = toReportedNonNegativeNumber(hospital?.total_beds);
  const fleet = toReportedNonNegativeNumber(hospital?.ambulances_count);
  const capacityText = totalBeds > 0
    ? `${beds ?? 'Unknown'} of ${totalBeds} beds`
    : beds !== null
      ? `${beds} beds`
      : fleet !== null
        ? `${fleet} unit${fleet === 1 ? '' : 's'}`
        : null;
  const address = hospital?.address || 'No address provided';

  return {
    status,
    orbClass: orbClassFor(status),
    title: hospital?.name || 'Unnamed Hospital',
    meta: capacityText ? `${capacityText} \u00b7 ${address}` : address,
    freshness: formatRelativeTime(hospital?.last_availability_update || hospital?.updated_at),
    markerChip: hospital?.verified ? 'Verified' : null,
  };
};

export const getMobileHospitalDetailModel = (hospital) => {
  const status = getHospitalStatus(hospital);
  const fleet = toReportedNonNegativeNumber(hospital?.ambulances_count);
  const beds = toReportedNonNegativeNumber(hospital?.available_beds);
  const totalBeds = toReportedNonNegativeNumber(hospital?.total_beds);
  const rating = Number(hospital?.rating) || 0;
  const icuBeds = hospital?.icu_beds_available != null
    ? Number(hospital.icu_beds_available)
    : null;
  const waitMinutes = Number(hospital?.emergency_wait_time_minutes);
  const specialties = Array.isArray(hospital?.specialties)
    ? hospital.specialties.filter(Boolean)
    : [];

  return {
    status,
    statusColor: statusColorFor(status),
    fleet,
    beds,
    totalBeds,
    rating,
    phone: hospital?.phone,
    facilityId: hospital?.display_id || `#${String(hospital?.id || '').slice(0, 12).toUpperCase()}`,
    icuBeds,
    waitValue: Number.isFinite(waitMinutes) && waitMinutes > 0
      ? `\u2248 ${waitMinutes} min`
      : (hospital?.wait_time || null),
    eligibility: [
      hospital?.emergency_eligible && 'Emergency',
      hospital?.dispatch_eligible && 'Dispatch',
      hospital?.booking_eligible && 'Booking',
    ].filter(Boolean).join(' \u00b7 '),
    availabilityUpdated: hospital?.last_availability_update
      ? formatRelativeTime(hospital.last_availability_update)
      : null,
    specialties,
  };
};
