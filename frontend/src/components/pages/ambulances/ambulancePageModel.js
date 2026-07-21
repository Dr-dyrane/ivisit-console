import {
  ACTIVE_FLEET_STATUSES,
  getFleetStatus,
  getAmbulanceStatusLabel,
} from '../../../constants/ambulanceStatus';
import { formatRelativeTime } from '../../../utils/activityUtils';
import { formatDayTime } from '../../../utils/dayTime';

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
  // ADOPT-38: the dormant DB-domain states count exactly (stats first, visible
  // rows as fallback) so their chips render honest numbers -- including 0.
  if (id === 'returning') {
    return normalizeAmbulanceCount(
      stats?.returning,
      rows.filter((unit) => getFleetStatus(unit) === 'returning').length
    );
  }
  if (id === 'offline') {
    return normalizeAmbulanceCount(
      stats?.offline,
      rows.filter((unit) => getFleetStatus(unit) === 'offline').length
    );
  }
  if (id === 'pending_approval') {
    return normalizeAmbulanceCount(
      stats?.pendingApproval,
      rows.filter((unit) => getFleetStatus(unit) === 'pending_approval').length
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

  // ADOPT-38: the dormant DB-domain filters speak with their own honest voice;
  // an approval-core state that matches zero rows reads as an explicit zero.
  if (kpiFilter === 'pending_approval') {
    const pending = getFleetStateCount({ id: 'pending_approval', stats, ambulances: rows });
    return {
      iconKey: 'pending',
      tone: 'attention',
      label: 'Pending',
      headline: pending > 0
        ? `${pending} unit${pending === 1 ? '' : 's'} awaiting approval`
        : 'No units awaiting approval',
      subhead: 'Pending units stay read-only fleet evidence until approval flows are proved.',
    };
  }

  if (kpiFilter === 'returning') {
    const returning = getFleetStateCount({ id: 'returning', stats, ambulances: rows });
    return {
      iconKey: 'returning',
      tone: 'muted',
      label: 'Returning',
      headline: returning > 0
        ? `${returning} unit${returning === 1 ? '' : 's'} returning`
        : 'No returning units',
      subhead: 'Returning units are heading back from runs; dispatch changes stay in Requests.',
    };
  }

  if (kpiFilter === 'offline') {
    const offline = getFleetStateCount({ id: 'offline', stats, ambulances: rows });
    return {
      iconKey: 'offline',
      tone: 'muted',
      label: 'Offline',
      headline: offline > 0
        ? `${offline} unit${offline === 1 ? '' : 's'} offline`
        : 'No offline units',
      subhead: 'Offline units are out of rotation and stay visible as fleet evidence.',
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
    // ADOPT-38: the full DB status domain (schema CHECK + VALID_AMBULANCE_STATUSES)
    // is filterable -- returning/offline/pending_approval were dormant vocabulary
    // the read path already accepted but the grammar never offered.
    options: [
      { value: 'available', label: 'Available' },
      { value: 'en_route', label: 'En Route' },
      { value: 'busy', label: 'Busy' },
      { value: 'returning', label: 'Returning' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'offline', label: 'Offline' },
      { value: 'pending_approval', label: 'Pending approval' },
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

// Truncated-reference idiom for operational object references such as calls.
// Person-facing identity must not fall back to a raw internal UUID.
export const truncateAmbulanceReference = (value) => (
  String(value).slice(0, 8).toUpperCase()
);

const humanizeCallStatus = (status) => String(status)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

// Driver identity (ADOPT-22): profile_id resolved read-only at the projection
// boundary. Honest states -- no profile_id is 'Unassigned'; an unresolved id
// (for example an RLS-blocked profile read) stays product-facing and does not
// expose an internal UUID; phone only exists when resolution produced one.
export const getAmbulanceDriverModel = (ambulance = {}) => {
  const profileId = ambulance.profile_id || null;
  if (!profileId) {
    return { assigned: false, label: 'Unassigned', copyValue: null, phone: null };
  }
  const resolvedName = ambulance.driver_name || null;
  return {
    assigned: true,
    label: resolvedName || 'Driver details unavailable',
    copyValue: null,
    phone: ambulance.driver_phone || null,
  };
};

// Active-call context (ADOPT-23): current_call is the active emergency_request
// UUID; the projection resolves its display id + status read-only. Absent
// (null) when the unit carries no call -- never a fabricated linkage.
export const getAmbulanceActiveCallModel = (ambulance = {}) => {
  const currentCall = ambulance.current_call || null;
  if (!currentCall) return null;
  const displayId = ambulance.active_call_display_id || null;
  return {
    reference: displayId || truncateAmbulanceReference(currentCall),
    statusLabel: ambulance.active_call_status
      ? humanizeCallStatus(ambulance.active_call_status)
      : null,
    copyValue: displayId || currentCall,
  };
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
    driver: getAmbulanceDriverModel(ambulance),
    activeCall: getAmbulanceActiveCallModel(ambulance),
    crewLabel: crewCount > 0 ? `${crewCount} listed` : 'Not listed',
    positionLabel,
    // Commissioned date (ADOPT-39): created_at already drives the Commission
    // Date filter and the default sort, but the value itself rendered nowhere.
    // Shared day-aware formatter; a missing value stays an honest 'Unknown'.
    commissionedLabel: ambulance.created_at ? formatDayTime(ambulance.created_at) : 'Unknown',
    basePriceLabel: Number.isFinite(basePriceValue) && basePriceValue > 0
      ? basePriceValue.toLocaleString()
      : 'Not set',
    viewOpening: activeActionFeedback === `view-${ambulance.id}`,
    editOpening: activeActionFeedback === `edit-${ambulance.id}`,
  };
};
