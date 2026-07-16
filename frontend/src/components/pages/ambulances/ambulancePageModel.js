import {
  ACTIVE_FLEET_STATUSES,
  getFleetStatus,
  getAmbulanceStatusLabel,
} from '../../../constants/ambulanceStatus';
import { formatRelativeTime } from '../../../utils/activityUtils';

export const AMBULANCE_PAGE_SIZE = 20;
export const AMBULANCE_DEFAULT_SORT = { key: '', direction: 'asc' };

export const getAmbulanceStatsFilters = (filters = {}) => {
  const { status: _status, ...rest } = filters;
  return rest;
};

export const normalizeAmbulanceCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const getAmbulanceStation = (ambulance) => (
  ambulance?.station_name || ambulance?.hospital || 'No station'
);

export const getAmbulanceVehicle = (ambulance) => (
  ambulance?.vehicle_label
  || ambulance?.vehicle_number
  || ambulance?.license_plate
  || 'No vehicle'
);

export const getFleetStateCount = ({ id, stats, ambulances }) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  if (id === 'all') return normalizeAmbulanceCount(stats?.total, rows.length);
  if (id === 'available') {
    return normalizeAmbulanceCount(
      stats?.available,
      rows.filter((unit) => getFleetStatus(unit) === 'available').length
    );
  }
  if (id === 'on_route') {
    return normalizeAmbulanceCount(
      stats?.onRoute,
      rows.filter((unit) => ['en_route', 'on_route'].includes(getFleetStatus(unit))).length
    );
  }
  if (id === 'busy') {
    return normalizeAmbulanceCount(
      stats?.busy,
      rows.filter((unit) => ACTIVE_FLEET_STATUSES.has(getFleetStatus(unit))).length
    );
  }
  if (id === 'maintenance') {
    return normalizeAmbulanceCount(
      stats?.maintenance,
      rows.filter((unit) => getFleetStatus(unit) === 'maintenance').length
    );
  }
  return 0;
};

export const getAmbulanceSignal = ({ stats, ambulances, kpiFilter, loadError }) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  const total = getFleetStateCount({ id: 'all', stats, ambulances: rows });
  const ready = getFleetStateCount({ id: 'available', stats, ambulances: rows });
  const active = getFleetStateCount({ id: 'busy', stats, ambulances: rows });
  const service = getFleetStateCount({ id: 'maintenance', stats, ambulances: rows });

  if (loadError && total === 0 && rows.length === 0) {
    return {
      iconKey: 'error',
      tone: 'danger',
      label: 'Load failed',
      headline: 'Fleet did not load',
      subhead: 'Retry to load the fleet list.',
    };
  }

  if (kpiFilter === 'maintenance') {
    return {
      iconKey: 'service',
      tone: 'attention',
      label: 'Service',
      headline: service > 0
        ? `${service} unit${service === 1 ? '' : 's'} need service attention`
        : 'No units in service review',
      subhead: 'Review units out of service before assigning them to new requests.',
    };
  }

  if (kpiFilter === 'on_route' || kpiFilter === 'busy') {
    return {
      iconKey: 'active',
      tone: 'active',
      label: 'In motion',
      headline: active > 0
        ? `${active} unit${active === 1 ? '' : 's'} active now`
        : 'No active units',
      subhead: 'Active units stay visible as read-only fleet evidence until dispatch actions are proved.',
    };
  }

  if (kpiFilter === 'available') {
    return {
      iconKey: 'ready',
      tone: 'ready',
      label: 'Ready',
      headline: ready > 0 ? `${ready} unit${ready === 1 ? '' : 's'} ready` : 'No ready units',
      subhead: 'Ready units are available for review from the route-owned fleet list.',
    };
  }

  if (total === 0) {
    return {
      iconKey: 'fleet',
      tone: 'muted',
      label: 'Fleet',
      headline: 'No fleet rows found',
      subhead: 'Change filters or add a unit.',
    };
  }

  return {
    iconKey: 'fleet',
    tone: ready > 0 ? 'ready' : 'attention',
    label: 'Fleet',
    headline: `${total} unit${total === 1 ? '' : 's'} in the fleet`,
    subhead: `${ready} ready, ${active} active, ${service} in service review.`,
  };
};

export const hasActiveAmbulanceFilters = (filters = {}) => Boolean(
  filters.search
  || (filters.status && filters.status.length > 0)
  || (filters.type && filters.type.length > 0)
  || filters.hospital
  || filters.created_at
);

export const buildAmbulanceQueryFilter = ({
  filters,
  kpiFilter,
  sortConfig,
  isMobile,
  currentPage,
  itemsPerPage,
  offset,
}) => ({
  filters,
  statsFilters: getAmbulanceStatsFilters(filters),
  kpiFilter,
  sortConfig,
  limit: isMobile ? currentPage * itemsPerPage : itemsPerPage,
  offset: isMobile ? 0 : offset,
});

export const buildAmbulanceRouteContext = ({
  ambulances,
  stats,
  focusedAmbulance,
  totalCount,
  loading,
  loadError,
  canEdit,
}) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  const status = loadError ? 'failed' : loading ? 'loading' : rows.length === 0 ? 'empty' : 'ready';

  return {
    status,
    loading,
    error: loadError,
    canEdit,
    focusedAmbulance,
    stats: {
      total: getFleetStateCount({ id: 'all', stats, ambulances: rows }),
      available: getFleetStateCount({ id: 'available', stats, ambulances: rows }),
      onRoute: getFleetStateCount({ id: 'on_route', stats, ambulances: rows }),
      active: getFleetStateCount({ id: 'busy', stats, ambulances: rows }),
      maintenance: getFleetStateCount({ id: 'maintenance', stats, ambulances: rows }),
      visible: rows.length,
      totalCount,
    },
    recent: rows.slice(0, 5).map((unit) => ({
      id: unit.id,
      call_sign: unit.call_sign,
      vehicle_number: unit.vehicle_number,
      license_plate: unit.license_plate,
      status: getFleetStatus(unit),
      statusLabel: getAmbulanceStatusLabel(getFleetStatus(unit)),
      station: getAmbulanceStation(unit),
    })),
  };
};

export const buildAmbulanceFilterSchema = ({ hospitals = [], admin = false }) => [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search call sign, plate, vehicle...',
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'en_route', label: 'En Route' },
      { value: 'busy', label: 'Busy' },
      { value: 'maintenance', label: 'Maintenance' },
    ],
  },
  {
    key: 'type',
    type: 'multiselect',
    label: 'Type',
    options: [
      { value: 'Standard', label: 'Standard' },
      { value: 'Advanced', label: 'Advanced' },
      { value: 'ICU', label: 'ICU' },
      { value: 'Transport', label: 'Transport' },
    ],
  },
  {
    key: 'hospital',
    type: 'select',
    label: 'Station/Hospital',
    options: hospitals.map((hospital) => ({ value: hospital.id, label: hospital.name })),
    hidden: !admin,
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Commission Date',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 Days', value: '7days' },
      { label: 'Last 30 Days', value: '30days' },
      { label: 'This Month', value: 'month' },
    ],
  },
];

export const cycleAmbulanceSort = (current, key) => {
  if (current.key === key && current.direction === 'desc') {
    return AMBULANCE_DEFAULT_SORT;
  }
  return {
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  };
};

export const getAmbulanceRoleKind = ({ admin, orgAdmin }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  return 'viewer';
};

export const getAmbulanceRailModel = (ambulance, activeActionFeedback) => {
  if (!ambulance) return null;

  const status = getFleetStatus(ambulance);
  const basePriceValue = Number(ambulance.base_price);
  const crewCount = Array.isArray(ambulance.crew)
    ? ambulance.crew.filter(Boolean).length
    : 0;
  // Telemetry freshness (ADOPT-06): device observation time first, server
  // receipt time as fallback; absent telemetry stays an honest null label.
  const positionAt = ambulance.location_observed_at || ambulance.location_received_at;
  const accuracyMeters = ambulance.location_accuracy_meters == null
    ? NaN
    : Number(ambulance.location_accuracy_meters);
  const positionLabel = positionAt
    ? `${formatRelativeTime(positionAt)}${Number.isFinite(accuracyMeters) ? ` (\u00B1${Math.round(accuracyMeters)}m)` : ''}`
    : 'No recent telemetry';

  return {
    status,
    station: getAmbulanceStation(ambulance),
    vehicle: getAmbulanceVehicle(ambulance),
    displayId: ambulance.display_id || null,
    callSign: ambulance.call_sign || 'Unknown unit',
    crewLabel: crewCount > 0 ? `${crewCount} listed` : 'Not listed',
    positionLabel,
    basePriceLabel: Number.isFinite(basePriceValue) && basePriceValue > 0
      ? basePriceValue.toLocaleString()
      : 'Not set',
    viewOpening: activeActionFeedback === `view-${ambulance.id}`,
    editOpening: activeActionFeedback === `edit-${ambulance.id}`,
  };
};
