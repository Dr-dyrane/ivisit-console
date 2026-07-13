import { statusPill } from '../../../constants/vitalTracks';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';

const ALPHA_ORDER = ['A-F', 'G-L', 'M-R', 'S-Z', '#'];

export const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const getStatus = (doctor) => {
  const status = String(doctor?.status || 'available').toLowerCase();
  return status === 'available' && doctor?.is_available === false ? 'unavailable' : status;
};

export const getDoctorStatusPill = (doctor) => {
  const status = getStatus(doctor);
  return status === 'unavailable'
    ? statusPill('off_duty', 'Unavailable for assignment')
    : statusPill(status);
};

export const getFacility = (doctor) => doctor?.hospitals?.name || null;

export const coarseAlpha = (name) => {
  const stripped = String(name || '')
    .replace(/^\s*(dr|prof|mr|mrs|ms)\.?\s+/i, '')
    .trim()
    .toUpperCase();
  const code = stripped.charCodeAt(0);
  if (!(code >= 65 && code <= 90)) return '#';
  if (code <= 70) return 'A-F';
  if (code <= 76) return 'G-L';
  if (code <= 82) return 'M-R';
  return 'S-Z';
};

export const orbClassFor = (status) => (
  status === 'available'
    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
    : status === 'on_call'
      ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
      : status === 'busy'
        ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
        : status === 'off_duty' || status === 'unavailable'
          ? 'bg-muted/40 text-muted-foreground'
          : 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
);

export const hasActiveDoctorFilters = (filters = {}) => Boolean(
  filters?.search
  || (filters?.kpiFilter && filters.kpiFilter !== 'all')
  || filters?.created_at?.start
  || filters?.created_at?.end
);

export const buildMobileDoctorTotals = ({ statistics, sourceDoctors }) => ({
  all: metricValue(statistics?.total, sourceDoctors.length),
  available: metricValue(
    statistics?.available,
    sourceDoctors.filter((doctor) => getStatus(doctor) === 'available').length
  ),
  onCall: metricValue(
    statistics?.onCall,
    sourceDoctors.filter((doctor) => getStatus(doctor) === 'on_call').length
  ),
  busy: metricValue(
    statistics?.busy,
    sourceDoctors.filter((doctor) => getStatus(doctor) === 'busy').length
  ),
});

export const buildMobileDoctorKpis = (totals) => [
  { id: 'all', label: 'Staff', value: totals.all, color: 'hsl(var(--muted-foreground))' },
  { id: 'available', label: 'Available', value: totals.available, color: 'hsl(160 84% 39%)' },
  { id: 'on_call', label: 'On call', value: totals.onCall, color: 'hsl(199 89% 48%)' },
  { id: 'busy', label: 'Busy', value: totals.busy, color: 'hsl(38 92% 50%)' },
];

export const getMobileDoctorScopeCount = ({ totals, activeKpi }) => {
  const kpiToTotal = { all: 'all', available: 'available', on_call: 'onCall', busy: 'busy' };
  return totals[kpiToTotal[activeKpi] || 'all'] ?? totals.all;
};

export const getMobileDoctorGroups = (doctors) => resolveAdaptiveGroups(doctors, [
  { key: 'facility', assign: getFacility, orphanLabel: 'Unassigned' },
  {
    key: 'alpha',
    assign: (doctor) => coarseAlpha(doctor.name),
    order: (keys) => keys.slice().sort((a, b) => ALPHA_ORDER.indexOf(a) - ALPHA_ORDER.indexOf(b)),
  },
  { type: 'coarse-recency', key: 'joined', getDate: (doctor) => doctor.updated_at || doctor.created_at },
]).groups;

export const getMobileDoctorDetail = (doctor) => ({
  name: doctor?.name || 'Unknown staff',
  specialty: doctor?.specialization || 'General',
  facility: getFacility(doctor) || 'No facility',
  phone: doctor?.phone || 'No phone',
  status: getStatus(doctor),
});
