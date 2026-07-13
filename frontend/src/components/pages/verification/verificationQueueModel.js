import { getApprovalStatusKey } from '../../../constants/verificationStatus';

export const DEFAULT_PROVIDER_STATS = Object.freeze({
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0,
});

export const DEFAULT_FACILITY_STATS = Object.freeze({
  pending: 0,
  verified: 0,
  rejected: 0,
  total: 0,
});

export const getVerificationRouteScope = (search = '') => {
  const params = new URLSearchParams(search);
  return {
    queueType: params.get('queue') === 'organizations' ? 'organizations' : 'providers',
    providerTypeFilter: params.get('type') || null,
  };
};

export const isTransientVerificationRefreshError = (error) => {
  const message = String(error?.message || error || '');
  return /failed to fetch|network|aborted|abort/i.test(message);
};

export const normalizeActiveStats = (queueType, providerStats, facilityStats) => (
  queueType === 'providers'
    ? { ...DEFAULT_PROVIDER_STATS, ...(providerStats || {}) }
    : {
      pending: facilityStats?.pending || 0,
      approved: facilityStats?.verified || 0,
      rejected: facilityStats?.rejected || 0,
      total: facilityStats?.total || 0,
    }
);

export const getActiveVerificationItems = (queueType, providers, organizations) => (
  queueType === 'providers' ? providers : organizations
);

export const sortVerificationItems = (items, direction = 'desc') => {
  const rows = [...(Array.isArray(items) ? items : [])];
  rows.sort((a, b) => {
    const first = new Date(a?.created_at || 0).getTime();
    const second = new Date(b?.created_at || 0).getTime();
    return direction === 'asc' ? first - second : second - first;
  });
  return rows;
};

export const toVerificationServiceStatus = (queueType, status) => (
  queueType === 'organizations' && status === 'approved' ? 'verified' : status
);

export const hasVerificationFilter = (filters) => (
  Boolean(filters?.search) || Boolean(filters?.status && filters.status !== 'all')
);

export const createVerificationFilterSchema = (queueType) => [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    placeholder: 'Lookup applicant...',
  },
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { value: 'all', label: 'All Applications' },
      { value: 'pending', label: 'Pending Review' },
      { value: 'approved', label: 'Approved' },
      ...(queueType === 'providers' ? [] : [{ value: 'rejected', label: 'Rejected' }]),
    ],
  },
  {
    key: 'created_at',
    type: 'date',
    label: 'Application Date',
    placeholder: 'Select dates',
    shortcuts: [
      { label: 'Today', value: 'today' },
      { label: 'Last 7 Days', value: '7days' },
      { label: 'Last 30 Days', value: '30days' },
      { label: 'This Month', value: 'month' },
    ],
  },
];

export const getVerificationEmptyState = ({ queueType, canApprove, hasFilter }) => {
  const noun = queueType === 'providers' ? 'providers' : 'facilities';
  return {
    heading: hasFilter ? `No matching ${noun}` : (canApprove ? 'All clear' : `No visible ${noun}`),
    body: hasFilter
      ? 'Change filters or search again.'
      : (canApprove
        ? `No ${noun} awaiting review.`
        : `${queueType === 'providers' ? 'Provider' : 'Facility'} applications are not visible for this role.`),
  };
};

export const getFacilityInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((word) => word[0]).join('').toUpperCase();
  return initials || 'F';
};

export const formatAppliedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getProviderPersonaKind = (providerType) => {
  const type = String(providerType || '').toLowerCase();
  if (type.includes('driver') || type.includes('ambulance') || type.includes('paramedic')) return 'responder';
  if (type.includes('doctor') || type.includes('physician')) return 'clinician';
  return 'provider';
};

export const getApprovalProjection = (item, queueType) => {
  const statusKey = getApprovalStatusKey(item, queueType);
  if (queueType === 'providers') {
    return {
      isProvider: true,
      primary: item?.username || item?.email || 'Unknown',
      secondary: item?.email || 'No email on file',
      meta: item?.provider_type || item?.role || 'provider',
      applied: item?.created_at,
      avatarUrl: item?.avatar_url || item?.image_uri || null,
      displayId: item?.display_id || null,
      statusKey,
    };
  }

  return {
    isProvider: false,
    primary: item?.name || 'Unnamed facility',
    secondary: item?.address || 'No address on file',
    meta: item?.type || 'facility',
    applied: item?.created_at,
    avatarUrl: null,
    displayId: item?.display_id || null,
    statusKey,
  };
};

export const createVerificationPanelContext = ({
  queueType,
  providers,
  organizations,
  activeStats,
  focusedItem,
  canApprove,
  loading,
}) => {
  const items = getActiveVerificationItems(queueType, providers, organizations);
  return {
    queueType,
    stats: activeStats,
    count: items.length,
    recent: items.slice(0, 4),
    selected: focusedItem,
    canApprove,
    loading,
  };
};

export const executeVerificationBulkAction = async ({
  ids,
  queueType,
  approved,
  verifyProviderCommand,
  verifyOrganizationCommand,
}) => {
  const queue = Array.isArray(ids) ? ids : [];
  const isProviders = queueType === 'providers';
  let failed = 0;

  for (const id of queue) {
    try {
      if (isProviders) await verifyProviderCommand(id, true);
      else await verifyOrganizationCommand(id, approved);
    } catch {
      failed += 1;
    }
  }

  return {
    failed,
    total: queue.length,
    isProviders,
    noun: isProviders ? 'provider' : 'facility',
    plural: isProviders ? 'providers' : 'facilities',
  };
};
