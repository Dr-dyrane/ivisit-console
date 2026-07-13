export const HOSPITAL_PAGE_SIZE = 20;

export const HOSPITAL_DEFAULT_SORT = Object.freeze({
  key: 'created_at',
  direction: 'desc',
});

export const HOSPITAL_STATE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'all', label: 'All', countKey: 'total', tone: 'primary' }),
  Object.freeze({ id: 'available', label: 'Available', countKey: 'available', tone: 'clear' }),
  Object.freeze({ id: 'full', label: 'Full', countKey: 'full', tone: 'warning' }),
  Object.freeze({ id: 'busy', label: 'Busy', countKey: 'busy', tone: 'info' }),
]);

export const HOSPITAL_KPI_IMPORTANCE = Object.freeze({
  all: 0,
  available: 1,
  full: 2,
  busy: 3,
});

export const PINNED_HOSPITAL_STATE_IDS = Object.freeze(['full', 'busy']);

export const HOSPITAL_EMPTY_HEADINGS = Object.freeze({
  available: 'No available hospitals',
  full: 'No full hospitals',
  busy: 'No busy hospitals',
});

export const HOSPITAL_FILTER_SCHEMA = Object.freeze([
  Object.freeze({
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search by name, address, ID, or phone...',
  }),
  Object.freeze({
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: Object.freeze([
      Object.freeze({ value: 'available', label: 'Available' }),
      Object.freeze({ value: 'busy', label: 'Busy' }),
      Object.freeze({ value: 'full', label: 'Full' }),
    ]),
  }),
  Object.freeze({
    key: 'created_at',
    type: 'date',
    label: 'Registered On',
    placeholder: 'Select dates',
    shortcuts: Object.freeze([
      Object.freeze({ label: 'Today', value: 'today' }),
      Object.freeze({ label: 'Last 7 Days', value: '7days' }),
      Object.freeze({ label: 'Last 30 Days', value: '30days' }),
      Object.freeze({ label: 'This Month', value: 'month' }),
    ]),
  }),
]);

export const normalizeHospitalCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const getHospitalStatsFilters = (filters = {}) => {
  const { status: _status, ...statsFilters } = filters || {};
  return statsFilters;
};

export const buildHospitalServiceFilters = (filters = {}) => {
  const { created_at: createdRange, ...rest } = filters || {};

  return {
    ...rest,
    ...(createdRange?.start ? { date_from: `${createdRange.start}T00:00:00.000Z` } : {}),
    ...(createdRange?.end ? { date_to: `${createdRange.end}T23:59:59.999Z` } : {}),
  };
};

export const buildHospitalQueryFilter = ({
  filters = {},
  kpiFilter = 'all',
  itemsPerPage = HOSPITAL_PAGE_SIZE,
  offset = 0,
  sortConfig = HOSPITAL_DEFAULT_SORT,
} = {}) => {
  const serviceFilters = buildHospitalServiceFilters(filters);

  return {
    filters: {
      ...serviceFilters,
      ...(kpiFilter !== 'all' ? { status: kpiFilter } : {}),
    },
    statsFilters: getHospitalStatsFilters(serviceFilters),
    limit: itemsPerPage,
    offset,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  };
};

export const getHospitalStateDefinition = (id) => (
  HOSPITAL_STATE_DEFINITIONS.find((item) => item.id === id) || HOSPITAL_STATE_DEFINITIONS[0]
);

export const getHospitalStateCount = ({ id, stats, hospitals }) => {
  const sourceHospitals = Array.isArray(hospitals) ? hospitals : [];
  const option = getHospitalStateDefinition(id);
  const fallback = option.id === 'all'
    ? sourceHospitals.length
    : sourceHospitals.filter((hospital) => hospital.status === option.id).length;

  return normalizeHospitalCount(stats?.[option.countKey], fallback);
};

export const getHospitalSignal = ({ stats, hospitals, kpiFilter, loadError }) => {
  const option = getHospitalStateDefinition(kpiFilter || 'all');
  const sourceHospitals = Array.isArray(hospitals) ? hospitals : [];
  const count = getHospitalStateCount({ id: option.id, stats, hospitals: sourceHospitals });

  if (loadError && count === 0 && sourceHospitals.length === 0) {
    return {
      iconKey: 'error',
      tone: 'danger',
      label: 'Load failed',
      headline: 'Hospitals did not load',
      subhead: 'Retry to load the facility list.',
    };
  }

  if (option.id === 'available') {
    return {
      iconKey: 'available',
      tone: 'clear',
      label: 'Available',
      headline: count > 0 ? `${count} available hospital${count === 1 ? '' : 's'}` : 'No available hospitals',
      subhead: count > 0 ? 'Open a facility before changing capacity or care routing.' : 'Available facilities will appear here.',
    };
  }

  if (option.id === 'full') {
    return {
      iconKey: 'full',
      tone: 'warning',
      label: 'Full',
      headline: count > 0 ? `${count} full hospital${count === 1 ? '' : 's'}` : 'No full hospitals',
      subhead: count > 0 ? 'Review full sites before promising new capacity.' : 'Full facilities will appear here.',
    };
  }

  if (option.id === 'busy') {
    return {
      iconKey: 'busy',
      tone: 'info',
      label: 'Busy',
      headline: count > 0 ? `${count} busy hospital${count === 1 ? '' : 's'}` : 'No busy hospitals',
      subhead: count > 0 ? 'Check the facility record before routing more demand.' : 'Busy facilities will appear here.',
    };
  }

  return {
    iconKey: 'all',
    tone: 'primary',
    label: 'Hospitals',
    headline: count > 0 ? `${count} hospital record${count === 1 ? '' : 's'}` : 'No hospitals found',
    subhead: count > 0 ? 'Review facility status, visible capacity, and verified records before acting.' : 'Try a different filter or refresh the facility list.',
  };
};

export const hasActiveHospitalFilters = (filters = {}) => Boolean(
  filters.search ||
  (filters.status && filters.status.length > 0) ||
  filters.created_at?.start ||
  filters.created_at?.end
);

export const formatHospitalWait = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === '') {
    return 'Unknown';
  }

  const numericMinutes = Number(minutes);
  return Number.isFinite(numericMinutes) ? `${numericMinutes}m` : 'Unknown';
};

export const getHospitalRoleKind = ({ admin, orgAdmin, provider, driver }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  if (provider) return driver ? 'driver' : 'provider';
  return 'viewer';
};

export const canActorEditHospital = ({ admin, orgAdmin, orgId }, hospital) => {
  if (admin) return true;
  if (!orgAdmin) return false;
  return Boolean(hospital?.organization_id) && hospital.organization_id === orgId;
};

export const buildHospitalPanelContext = ({
  stats,
  hospitals,
  focusedHospital,
  totalCount,
  loading,
  errorMessage,
  currentState,
  canEdit,
}) => ({
  stats: stats || {},
  recent: (Array.isArray(hospitals) ? hospitals : []).slice(0, 4),
  focusedHospital,
  count: totalCount || hospitals?.length || 0,
  loading,
  errorMessage,
  currentState,
  canAdd: false,
  canEdit,
});

export const getHospitalRailModel = (hospital, activeActionFeedback) => {
  if (!hospital) return null;

  const statusKey = String(hospital.status || 'available').toLowerCase();
  const verificationKey = String(
    hospital.verification_status || (hospital.verified ? 'verified' : 'pending')
  ).toLowerCase();
  const availableBeds = normalizeHospitalCount(hospital.available_beds, 0);
  const fleet = normalizeHospitalCount(hospital.ambulances_count, 0);
  const totalBeds = Number(hospital.total_beds);
  const icuBeds = Number(hospital.icu_beds_available);
  const waitMinutes = Number(hospital.emergency_wait_time_minutes);
  const latitude = Number(hospital.latitude);
  const longitude = Number(hospital.longitude);
  const eligibility = [
    hospital.emergency_eligible && 'Emergency',
    hospital.dispatch_eligible && 'Dispatch',
    hospital.booking_eligible && 'Booking',
  ].filter(Boolean).join(' \u00b7 ');

  return {
    statusKey,
    verificationKey,
    rejected: verificationKey === 'rejected' || verificationKey === 'suspended',
    displayId: hospital.display_id || null,
    facilityName: hospital.name || 'Unnamed hospital',
    bedsValue: Number.isFinite(totalBeds) && totalBeds > 0
      ? `${availableBeds} of ${totalBeds} available${Number.isFinite(icuBeds) ? ` \u00b7 ICU ${icuBeds}` : ''}`
      : `${availableBeds}${Number.isFinite(icuBeds) ? ` \u00b7 ICU ${icuBeds}` : ''}`,
    erWaitValue: Number.isFinite(waitMinutes) && waitMinutes > 0
      ? `\u2248 ${waitMinutes} min`
      : (hospital.wait_time || 'Not tracked'),
    eligibility: eligibility || 'None',
    fleet: String(fleet),
    rating: Number.isFinite(Number(hospital.rating)) ? Number(hospital.rating).toFixed(1) : 'Not rated',
    hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
    latitude,
    longitude,
    viewOpening: activeActionFeedback === `view-${hospital.id}`,
    editOpening: activeActionFeedback === `edit-${hospital.id}`,
  };
};
