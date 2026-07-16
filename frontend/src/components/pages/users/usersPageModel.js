import {
  Ambulance,
  Shield,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import { formatRelativeTime } from '../../../utils/activityUtils';

export const USER_DELETE_UNAVAILABLE_MESSAGE = 'Delete is unavailable until identity authority is verified.';

const ROLE_META = {
  admin: { label: 'Admin', tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-200' },
  org_admin: { label: 'Org admin', tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-200' },
  provider: { label: 'Provider', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  patient: { label: 'Patient', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
  sponsor: { label: 'Sponsor', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  viewer: { label: 'Viewer', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
  dispatcher: { label: 'Dispatcher', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
};

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const getRoleMeta = (role) => {
  const key = String(role || '').toLowerCase();
  return ROLE_META[key] || {
    label: titleCase(role) || 'Unknown',
    tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  };
};

// ADOPT-44: profiles.onboarding_status vocabulary is pending/complete/skipped
// (DB CHECK in 20260219000100_identity.sql). Null/empty resolves to null so the
// surfaces render an honest absence; unknown values render as their raw
// humanized key in a muted tone, never coerced to a known-looking state.
const ONBOARDING_STATUS_META = {
  pending: { label: 'Onboarding pending', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  complete: { label: 'Onboarding complete', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  skipped: { label: 'Onboarding skipped', tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' },
};

export const getOnboardingStatusMeta = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return null;
  return ONBOARDING_STATUS_META[key] || {
    label: `Onboarding ${key.replace(/_/g, ' ')}`,
    tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  };
};

// ADOPT-29: auth.users.last_sign_in_at arrives only when the admin-gated
// get_all_auth_users read succeeds; unparseable or missing values resolve to
// null so the rail and panel stay honestly absent instead of guessing.
export const formatLastSignIn = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatRelativeTime(value);
};

export const getProviderTypeIcon = (providerType) => {
  const type = String(providerType || '').toLowerCase();
  if (type.includes('driver') || type.includes('ambulance') || type.includes('paramedic')) return Ambulance;
  if (type.includes('doctor') || type.includes('physician') || type.includes('nurse') || type.includes('specialist')) return Stethoscope;
  return UserRound;
};

export const getUserInitials = (name = 'User') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'U'}${parts[1]?.[0] || ''}`.toUpperCase();
};

export const USERS_KPI_OPTIONS = [
  { id: 'all', label: 'All', icon: Users, colorClass: 'text-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
  { id: 'provider', label: 'Providers', icon: Stethoscope, colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'org_admin', label: 'Org admins', icon: Shield, colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'patient', label: 'Patients', icon: UserRound, colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.055] text-muted-foreground shadow-e2 dark:bg-white/[0.06]' },
];

export const USERS_KPI_IMPORTANCE = { all: 0, provider: 1, org_admin: 2, patient: 3 };
export const PINNED_USERS_KPI_IDS = ['provider', 'org_admin'];

export const usersToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const USERS_GRID_COLS = 'grid-cols-[minmax(160px,1.6fr)_minmax(96px,auto)_minmax(88px,auto)_minmax(120px,1fr)_minmax(92px,auto)_84px]';
export const USERS_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(160px,1.6fr)_minmax(96px,auto)_minmax(88px,auto)_minmax(120px,1fr)_minmax(92px,auto)_84px]';

export const USERS_EMPTY_HEADINGS = {
  all: 'No users yet',
  provider: 'No providers',
  org_admin: 'No org admins',
  patient: 'No patients',
};

export const USERS_FILTER_SCHEMA = [
  { key: 'search', type: 'text', label: 'Search', placeholder: 'Search users...' },
  {
    key: 'role',
    type: 'multiselect',
    label: 'Role',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'org_admin', label: 'Org admin' },
      { value: 'provider', label: 'Provider' },
      { value: 'patient', label: 'Patient' },
      { value: 'sponsor', label: 'Sponsor' },
    ],
  },
  {
    key: 'bvn_verified',
    type: 'select',
    label: 'Verification',
    options: [
      { value: 'all', label: 'All' },
      { value: 'verified', label: 'Verified only' },
      { value: 'unverified', label: 'Unverified only' },
    ],
  },
  {
    key: 'onboarding_status',
    type: 'select',
    label: 'Onboarding',
    options: [
      { value: 'all', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'complete', label: 'Complete' },
      { value: 'skipped', label: 'Skipped' },
    ],
  },
  {
    key: 'provider_type',
    type: 'multiselect',
    label: 'Provider type',
    dependsOn: { key: 'role', value: 'provider' },
    options: [
      { value: 'doctor', label: 'Doctor' },
      { value: 'driver', label: 'Driver' },
    ],
  },
  { key: 'created_at', type: 'date', label: 'Joined date', placeholder: 'Select dates' },
];

export const getUsersKpiCount = (id, stats) => {
  if (!stats) return null;
  const value = id === 'all' ? stats.total : stats[id];
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
};

export const formatJoinedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getUsersProjection = (user, organizationsMap = {}) => {
  const displayName = user?.full_name || user?.name || user?.username || 'Unnamed user';
  return {
    name: displayName,
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'unknown',
    roleMeta: getRoleMeta(user?.role),
    providerType: user?.provider_type || '',
    verified: Boolean(user?.bvn_verified),
    organization: user?.organization_name || (user?.organization_id
      ? (organizationsMap[user.organization_id] || 'Independent')
      : 'Independent'),
    displayId: user?.display_id || null,
    joined: user?.created_at,
    onboardingMeta: getOnboardingStatusMeta(user?.onboarding_status),
    lastSignIn: formatLastSignIn(user?.last_sign_in_at),
  };
};

export const resolveUsersVerifiedFilter = (filters = {}) => (
  filters.bvn_verified === 'verified'
    ? true
    : (filters.bvn_verified === 'unverified' ? false : undefined)
);

export const resolveUsersRoleFilter = (filters = {}) => {
  const sheetRoles = Array.isArray(filters.role)
    ? filters.role.filter(Boolean)
    : (filters.role ? [filters.role] : []);
  const kpiRole = filters.kpiFilter && filters.kpiFilter !== 'all' ? filters.kpiFilter : null;
  if (!kpiRole) return { role: sheetRoles, forceEmpty: false };
  if (sheetRoles.length === 0 || sheetRoles.includes(kpiRole)) return { role: kpiRole, forceEmpty: false };
  return { role: kpiRole, forceEmpty: true };
};

export const hasActiveUserFilters = (filters = {}) => Boolean(
  filters.search
  || (Array.isArray(filters.role) && filters.role.length > 0)
  || (Array.isArray(filters.provider_type) && filters.provider_type.length > 0)
  || (filters.bvn_verified && filters.bvn_verified !== 'all')
  || (filters.onboarding_status && filters.onboarding_status !== 'all')
  || (filters.created_at && (filters.created_at.start || filters.created_at.end))
);

export const normalizeUsersStats = (stats) => {
  if (!stats) return null;
  const normalized = {
    total: Number(stats.total),
    provider: Number(stats.provider),
    org_admin: Number(stats.org_admin),
    patient: Number(stats.patient),
    verified: Number(stats.verified),
  };
  return Object.values(normalized).every(Number.isFinite) ? normalized : null;
};

// AnalyticsModal (type="user") reads totalUsers/verifiedUsers/totalProfiles/
// roleDistribution, not the KPI-strip keys. Map the exact usersPageRead counts
// at the call site instead of widening the shared modal contract. The page
// read counts profiles rows, so users and profiles are the same scoped total;
// counts the read does not measure (e.g. new signups) stay absent.
export const toUsersAnalyticsShape = (stats) => {
  const normalized = normalizeUsersStats(stats);
  if (!normalized) return null;
  return {
    total: normalized.total,
    totalUsers: normalized.total,
    totalProfiles: normalized.total,
    verifiedUsers: normalized.verified,
    roleDistribution: {
      provider: normalized.provider,
      org_admin: normalized.org_admin,
      patient: normalized.patient,
    },
  };
};

export const getUsersSignal = ({ stats, kpiFilter, loadError, statisticsError, hasAny }) => {
  const activeId = kpiFilter || 'all';
  const option = USERS_KPI_OPTIONS.find((item) => item.id === activeId) || USERS_KPI_OPTIONS[0];

  if (loadError) {
    return hasAny
      ? { icon: ShieldAlert, tone: 'danger', label: 'Refresh failed', headline: 'Showing saved users', subhead: 'Retry before relying on this directory.' }
      : { icon: ShieldAlert, tone: 'danger', label: 'Load failed', headline: 'Users did not load', subhead: 'Retry to load the directory.' };
  }

  if (statisticsError) {
    return {
      icon: ShieldAlert,
      tone: 'warning',
      label: 'Totals unavailable',
      headline: 'User totals need a retry',
      subhead: hasAny ? 'Directory rows are available without KPI totals.' : 'Retry to load exact user totals.',
    };
  }

  const count = getUsersKpiCount(option.id, stats);
  const verified = getUsersKpiCount('verified', stats);
  if (option.id === 'all') {
    return {
      icon: Users,
      tone: 'muted',
      label: 'Users',
      headline: count > 0 ? `${count} user${count === 1 ? '' : 's'}` : 'No users yet',
      subhead: count > 0
        ? `${verified} verified. Invitations are available.`
        : 'User records for this scope will appear here.',
    };
  }

  const toneById = { provider: 'warning', org_admin: 'info', patient: 'muted' };
  const noun = option.label.toLowerCase().replace(/s$/, '');
  return {
    icon: option.icon,
    tone: toneById[option.id] || 'muted',
    label: option.label,
    headline: count > 0
      ? `${count} ${count === 1 ? noun : option.label.toLowerCase()}`
      : `No ${option.label.toLowerCase()}`,
    subhead: count > 0
      ? 'Review identity, role, and verification records.'
      : `${option.label} for this scope will appear here.`,
  };
};
