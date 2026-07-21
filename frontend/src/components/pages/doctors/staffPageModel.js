import {
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  ShieldAlert,
  UserRound,
  Users,
} from 'lucide-react';
import { formatRelativeTime } from '../../../utils/activityUtils';

export const STAFF_PAGE_SIZE = 20;
export const STAFF_DEFAULT_SORT = { key: 'created_at', direction: 'desc' };

export const STAFF_STATUS_META = {
  available: { label: 'Available', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200', icon: CheckCircle2 },
  on_call: { label: 'On call', tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-200', icon: Phone },
  busy: { label: 'Busy', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200', icon: Clock },
  off_duty: { label: 'Away', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]', icon: UserRound },
  invited: { label: 'Invited', tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-200', icon: Mail },
  unavailable: { label: 'Unavailable for assignment', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200', icon: ShieldAlert },
};

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const getStaffStatusMeta = (status) => {
  const key = String(status || '').toLowerCase();
  return STAFF_STATUS_META[key] || {
    label: titleCase(status) || 'Unknown',
    tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
    icon: UserRound,
  };
};

export const getEffectiveStaffStatus = (staff) => {
  const status = String(staff?.status || '').toLowerCase();
  return status === 'available' && staff?.is_available === false ? 'unavailable' : status;
};

export const getInitials = (name = 'Staff') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'S'}${parts[1]?.[0] || ''}`.toUpperCase();
};

export const STAFF_KPI_OPTIONS = [
  { id: 'all', label: 'All', icon: Users, colorClass: 'text-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
  { id: 'available', label: 'Available', icon: CheckCircle2, colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'on_call', label: 'On call', icon: Phone, colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'busy', label: 'Busy', icon: Clock, colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'off_duty', label: 'Away', icon: UserRound, colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.055] text-muted-foreground shadow-e2 dark:bg-white/[0.06]' },
];

export const STAFF_KPI_IMPORTANCE = { all: 0, available: 1, on_call: 2, busy: 3, off_duty: 4 };
export const PINNED_STAFF_KPI_IDS = ['available', 'on_call'];

export const staffToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const STAFF_GRID_COLS = 'grid-cols-[minmax(150px,1.5fr)_minmax(110px,auto)_minmax(110px,0.8fr)_minmax(120px,1fr)_minmax(92px,auto)_84px]';
export const STAFF_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(150px,1.5fr)_minmax(110px,auto)_minmax(110px,0.8fr)_minmax(120px,1fr)_minmax(92px,auto)_84px]';

export const STAFF_EMPTY_HEADINGS = {
  all: 'No staff yet',
  available: 'No available staff',
  on_call: 'No on-call staff',
  busy: 'No busy staff',
  off_duty: 'No away staff',
};

export const STAFF_FILTER_SCHEMA = [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Search staff...',
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' },
      { value: 'off_duty', label: 'Away' },
      { value: 'on_call', label: 'On call' },
      { value: 'invited', label: 'Invited' },
    ],
  },
  {
    key: 'specialization',
    type: 'multiselect',
    label: 'Specialization',
    options: [
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'pediatrics', label: 'Pediatrics' },
      { value: 'general', label: 'General' },
      { value: 'orthopedics', label: 'Orthopedics' },
      { value: 'dermatology', label: 'Dermatology' },
    ],
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Added',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 days', value: '7days' },
      { label: 'Last 30 days', value: '30days' },
      { label: 'This month', value: 'month' },
    ],
  },
];

export const getStaffKpiCount = (id, stats = {}) => {
  if (id === 'all') return stats.total || 0;
  return stats[id] || 0;
};

export const formatJoinedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Caseload population is unverified in production, so the ratio is hide-when-null:
// it renders only when max_patients is a positive number and current_patients is a
// real count. A null or empty side never becomes a fabricated 0 (Number('') is 0,
// so blank values are rejected before coercion). The same coercion guards the
// rating evidence below.
const toFiniteNumber = (value) => {
  if (value == null || String(value).trim() === '') return null;
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
};

export const getStaffCaseload = (staff) => {
  const max = toFiniteNumber(staff?.max_patients);
  const current = toFiniteNumber(staff?.current_patients);
  if (max == null || max <= 0) return null;
  if (current == null || current < 0) return null;
  return `${current}/${max}`;
};

// ADOPT-41: updated_at surfaces as a relative rail line ONLY. The estate allows
// one sortable Time header per page and this page's header already sorts
// created_at ("Added"), so last-updated renders without a second sort
// affordance. Hide-when-null: a missing or unparseable timestamp renders
// nothing instead of "Unknown time".
export const getStaffLastUpdated = (staff) => {
  const value = staff?.updated_at;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatRelativeTime(value);
};

// ADOPT-42: per-record rating evidence, hide-when-null/zero. A null rating, a
// zero rating (unpopulated default), or zero/null reviews_count renders
// nothing -- a score with no reviews behind it would be fabricated truth.
// Blank strings are rejected before coercion (Number('') === 0).
export const getStaffRating = (staff) => {
  const rating = toFiniteNumber(staff?.rating);
  const reviews = toFiniteNumber(staff?.reviews_count);
  if (rating == null || rating <= 0) return null;
  if (reviews == null || reviews <= 0) return null;
  return `${rating.toFixed(1)} (${reviews} review${reviews === 1 ? '' : 's'})`;
};

export const getStaffIdentity = (staff) => ({
  doctorId: staff?.id || null,
  profileId: staff?.profile_id || null,
  facilityId: staff?.hospital_id || null,
  organizationId: staff?.organization_id || staff?.hospitals?.organization_id || null,
});

export const getStaffProjection = (staff) => ({
  name: staff?.name || 'Unknown staff',
  specialization: staff?.specialization || 'General',
  facility: staff?.hospitals?.name || staff?.organization?.name || 'No facility',
  contact: staff?.phone || staff?.email || 'No contact',
  phone: staff?.phone || '',
  email: staff?.email || '',
  displayId: staff?.display_id || null,
  experience: staff?.experience,
  caseload: getStaffCaseload(staff),
  joined: staff?.created_at,
  updatedAgo: getStaffLastUpdated(staff),
  ratingChip: getStaffRating(staff),
  statusMeta: getStaffStatusMeta(getEffectiveStaffStatus(staff)),
});

export const getStaffSignal = ({ stats, kpiFilter, loadError, hasAny }) => {
  const activeId = kpiFilter || 'all';
  const option = STAFF_KPI_OPTIONS.find((item) => item.id === activeId) || STAFF_KPI_OPTIONS[0];
  const count = getStaffKpiCount(option.id, stats);

  if (loadError && !hasAny) {
    return { icon: ShieldAlert, tone: 'danger', label: 'Load failed', headline: 'Staff did not load', subhead: 'Retry to load the directory.' };
  }

  if (option.id === 'all') {
    return {
      icon: Users,
      tone: 'muted',
      label: 'Staff',
      headline: count > 0 ? `${count} staff member${count === 1 ? '' : 's'}` : 'No staff yet',
      subhead: count > 0 ? 'Review the directory and keep facility assignments current.' : 'Staff you add will appear here.',
    };
  }

  const toneById = { available: 'clear', on_call: 'info', busy: 'warning', off_duty: 'muted' };
  const noun = option.label.toLowerCase();
  return {
    icon: option.icon,
    tone: toneById[option.id] || 'muted',
    label: option.label,
    headline: count > 0 ? `${count} ${noun} staff member${count === 1 ? '' : 's'}` : `No ${noun} staff`,
    subhead: count > 0 ? 'Confirm availability before assigning care.' : `${option.label} staff will appear here.`,
  };
};

const getStatusList = (value) => {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
};

export const resolveStaffStatusFilter = (filters = {}) => {
  const sheetStatuses = getStatusList(filters.status);
  const kpiStatus = filters.kpiFilter && filters.kpiFilter !== 'all' ? filters.kpiFilter : null;

  if (!kpiStatus) {
    return { status: sheetStatuses, forceEmpty: false, statsStatus: sheetStatuses };
  }
  if (sheetStatuses.length === 0 || sheetStatuses.includes(kpiStatus)) {
    return { status: kpiStatus, forceEmpty: false, statsStatus: sheetStatuses };
  }
  return { status: kpiStatus, forceEmpty: true, statsStatus: sheetStatuses };
};

const hasDateFilter = (value) => Boolean(value && typeof value === 'object' && (value.start || value.end));

export const hasActiveStaffFilters = (filters = {}) => Boolean(
  filters.search
  || (Array.isArray(filters.status) && filters.status.length > 0)
  || (Array.isArray(filters.specialization) && filters.specialization.length > 0)
  || hasDateFilter(filters.created_at)
);

export const buildStaffQueryFilter = ({
  filters = {},
  isMobile,
  currentPage,
  itemsPerPage,
  offset,
  sortConfig = STAFF_DEFAULT_SORT,
}) => {
  const statusFilter = resolveStaffStatusFilter(filters);
  const nextFilter = {
    limit: isMobile ? currentPage * itemsPerPage : itemsPerPage,
    offset: isMobile ? 0 : offset,
    quiet: true,
    status: statusFilter.status,
    requireAssignable: (
      statusFilter.status === 'available'
      || (
        Array.isArray(statusFilter.status)
        && statusFilter.status.length === 1
        && statusFilter.status[0] === 'available'
      )
    ),
    forceEmpty: statusFilter.forceEmpty,
    statsStatus: statusFilter.statsStatus,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
  };

  if (filters.search) nextFilter.search = filters.search;
  if (filters.specialization) nextFilter.specialization = filters.specialization;
  if (hasDateFilter(filters.created_at)) nextFilter.created_at = filters.created_at;

  return nextFilter;
};

export const buildStaffStats = ({ staffStats, count }) => {
  const stats = staffStats || {};
  return {
    total: Number(stats.total) || count,
    available: Number(stats.available) || 0,
    on_call: Number(stats.on_call) || 0,
    onCall: Number(stats.onCall ?? stats.on_call) || 0,
    busy: Number(stats.busy) || 0,
    off_duty: Number(stats.off_duty) || 0,
  };
};

export const getStaffRoleKind = ({ admin, orgAdmin }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  return 'viewer';
};

export const buildStaffPanelContext = ({
  stats,
  staffRows,
  focusedStaff,
  loading,
  count,
  canManage,
}) => ({
  stats,
  recent: staffRows.slice(0, 4),
  focusedStaff,
  loading,
  count,
  canManage,
});
