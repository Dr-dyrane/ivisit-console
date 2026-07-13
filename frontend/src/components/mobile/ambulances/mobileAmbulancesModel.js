import { ACTIVE_FLEET_STATUSES } from '../../../constants/ambulanceStatus';
import { formatRelativeTime } from '../../../utils/activityUtils';

export const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const hasMobileFleetFilters = (filters = {}) => Boolean(
  filters?.search
  || filters?.type
  || filters?.station
  || filters?.created_at?.start
  || filters?.created_at?.end
);

export const getMobileAmbulanceStation = (ambulance) => (
  ambulance?.station_name || ambulance?.hospital || null
);

export const getMobileAmbulanceStatus = (ambulance) => (
  String(ambulance?.status || 'available').toLowerCase()
);

export const getMobileFleetTotals = (statistics, ambulances) => {
  const rows = Array.isArray(ambulances) ? ambulances : [];
  return {
    all: metricValue(statistics?.total, rows.length),
    available: metricValue(
      statistics?.available,
      rows.filter((unit) => getMobileAmbulanceStatus(unit) === 'available').length
    ),
    onRoute: metricValue(
      statistics?.onRoute,
      rows.filter((unit) => ['on_route', 'en_route'].includes(getMobileAmbulanceStatus(unit))).length
    ),
    busy: metricValue(
      statistics?.busy,
      rows.filter((unit) => ACTIVE_FLEET_STATUSES.has(getMobileAmbulanceStatus(unit))).length
    ),
    maintenance: metricValue(
      statistics?.maintenance,
      rows.filter((unit) => getMobileAmbulanceStatus(unit) === 'maintenance').length
    ),
  };
};

export const getMobileFleetKpis = (totals) => [
  { id: 'all', label: 'Fleet', value: totals.all, color: 'hsl(var(--muted-foreground))' },
  { id: 'available', label: 'Ready', value: totals.available, color: 'hsl(160 84% 39%)' },
  { id: 'on_route', label: 'En route', value: totals.onRoute, color: 'hsl(38 92% 50%)' },
  { id: 'busy', label: 'Active', value: totals.busy, color: 'hsl(189 94% 43%)' },
];

export const buildMobileFleetFilterSignature = (filters, kpiFilter) => JSON.stringify({
  search: filters?.search || '',
  type: filters?.type || null,
  station: filters?.station || null,
  date: filters?.created_at || null,
  kpi: kpiFilter || 'all',
});

export const getMobileFleetScopeCount = (totals, kpiFilter) => {
  const kpiToTotal = {
    all: 'all',
    available: 'available',
    on_route: 'onRoute',
    busy: 'busy',
  };
  return totals[kpiToTotal[kpiFilter] || 'all'] ?? totals.all;
};

export const getMobileAmbulanceStatusColor = (status) => {
  if (status === 'available') return 'hsl(160 84% 39%)';
  if (status === 'on_route' || status === 'en_route') return 'hsl(38 92% 50%)';
  if (ACTIVE_FLEET_STATUSES.has(status)) return 'hsl(189 94% 43%)';
  return 'hsl(var(--muted-foreground))';
};

export const getMobileAmbulanceOrbClass = (status) => {
  if (status === 'available') {
    return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
  }
  if (status === 'on_route' || status === 'en_route') {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
  }
  if (ACTIVE_FLEET_STATUSES.has(status)) {
    return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
  }
  return 'bg-muted/40 text-muted-foreground';
};

export const getMobileAmbulanceAvailabilityLabel = (status) => {
  if (status === 'available') return 'Ready';
  if (status === 'dispatched') return 'Dispatched';
  if (status === 'on_route' || status === 'en_route') return 'En route';
  if (status === 'on_trip') return 'On trip';
  if (status === 'on_scene') return 'On scene';
  if (status === 'returning') return 'Returning';
  if (status === 'maintenance') return 'Offline';
  if (status === 'pending_approval') return 'Pending';
  return String(status || 'Unknown').replace(/_/g, ' ');
};

export const getMobileAmbulanceRowModel = (ambulance) => {
  const status = getMobileAmbulanceStatus(ambulance);
  const typeLabel = String(ambulance.type || 'Standard');
  const activeRun = ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route';
  const vehicle = ambulance.vehicle_label
    || ambulance.license_plate
    || ambulance.vehicle_number
    || 'No vehicle ID';

  return {
    status,
    title: ambulance.call_sign || 'Unknown Unit',
    meta: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} \u00b7 ${vehicle}`,
    time: activeRun
      ? (ambulance.eta ? String(ambulance.eta) : 'En route')
      : formatRelativeTime(ambulance.updated_at),
    availabilityLabel: getMobileAmbulanceAvailabilityLabel(status),
    orbClass: getMobileAmbulanceOrbClass(status),
  };
};

export const getMobileAmbulanceDetailModel = (ambulance) => {
  if (!ambulance) return null;

  const status = getMobileAmbulanceStatus(ambulance);
  const typeLabel = String(ambulance.type || 'Standard');
  const activeRun = ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route';

  return {
    status,
    color: getMobileAmbulanceStatusColor(status),
    station: getMobileAmbulanceStation(ambulance) || 'No station',
    typeLabel: typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1),
    activeRun,
    unitId: ambulance.display_id
      || `#${String(ambulance.id || '').slice(0, 12).toUpperCase()}`,
    vehicleLabel: ambulance.vehicle_label
      || ambulance.license_plate
      || ambulance.vehicle_number
      || null,
    availabilityLabel: getMobileAmbulanceAvailabilityLabel(status),
  };
};
