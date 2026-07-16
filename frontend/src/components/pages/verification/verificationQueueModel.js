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

// Humanize the profiles.onboarding_status enum for display; null stays null so
// the rail can render an honest absence instead of inventing a stage.
export const formatOnboardingStatus = (value) => {
  const text = String(value || '').trim();
  return text ? text.replace(/_/g, ' ') : null;
};

// ADOPT-40: payout readiness is presence-only Stripe display metadata -- the
// brand + last4 tokens ONLY ("Visa \u00b7\u00b7\u00b7\u00b7 4242"). The same profiles row also
// carries a raw payment-method id and Stripe account/customer ids; those raw
// identifiers must NEVER reach this surface, so this formatter reads exactly
// the two display columns and nothing else. Production population is sparse:
// both columns null is the norm today, which returns null so the rail hides
// the line entirely instead of fabricating an unfunded state.
export const formatPayoutMethod = (item) => {
  const brand = typeof item?.payout_method_brand === 'string' ? item.payout_method_brand.trim() : '';
  const last4 = typeof item?.payout_method_last4 === 'string' ? item.payout_method_last4.trim() : '';
  const parts = [];
  if (brand) parts.push(brand.charAt(0).toUpperCase() + brand.slice(1));
  if (last4) parts.push(`\u00b7\u00b7\u00b7\u00b7 ${last4}`);
  return parts.length > 0 ? parts.join(' ') : null;
};

// hospitals.specialties/service_types are string[] in the generated types but can
// reach the client as JSON strings or Postgres array literals depending on the
// driver path -- normalize at the projection boundary, never assume the shape.
export const toFacilityClaimList = (value) => {
  let raw = value;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try {
        raw = JSON.parse(text);
      } catch {
        return [];
      }
    } else if (text.startsWith('{') && text.endsWith('}')) {
      raw = text.slice(1, -1).split(',').map((entry) => entry.trim().replace(/^"(.*)"$/, '$1'));
    } else {
      raw = [text];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => String(entry ?? '').trim()).filter(Boolean);
};

const toFiniteCount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

// The claims a facility application carries -- the substance approval unlocks.
// Every member is null/empty when the row does not carry it (honest nulls).
export const getFacilityClaims = (item) => {
  const specialties = toFacilityClaimList(item?.specialties);
  const serviceTypes = toFacilityClaimList(item?.service_types);

  const totalBeds = toFiniteCount(item?.total_beds);
  const availableBeds = toFiniteCount(item?.available_beds);
  const icuBeds = toFiniteCount(item?.icu_beds_available);
  let beds = null;
  if (totalBeds !== null && totalBeds > 0) {
    beds = availableBeds !== null ? `${availableBeds} of ${totalBeds} available` : `${totalBeds} total`;
  } else if (availableBeds !== null) {
    beds = `${availableBeds} available`;
  }
  if (beds !== null && icuBeds !== null) beds += ` \u00b7 ICU ${icuBeds}`;

  const eligibilityFlags = [
    [item?.emergency_eligible, 'Emergency'],
    [item?.dispatch_eligible, 'Dispatch'],
    [item?.booking_eligible, 'Booking'],
  ];
  const flagsPresent = eligibilityFlags.some(([flag]) => typeof flag === 'boolean');
  const eligibility = flagsPresent
    ? (eligibilityFlags.filter(([flag]) => flag === true).map(([, label]) => label).join(' \u00b7 ') || 'None')
    : null;

  return { specialties, serviceTypes, beds, eligibility };
};

// Provenance is presence-only: Places sources (google_places/mapbox_places, or a
// real place_id) mean discovery imported the row; demo seeds stay labelled demo;
// any other named provider_source registered through console/app writes. With
// neither column present the origin is unknown -- return null, never a guess.
export const getFacilityProvenance = (item) => {
  const source = typeof item?.provider_source === 'string' ? item.provider_source.trim().toLowerCase() : '';
  const placeId = typeof item?.place_id === 'string' ? item.place_id.trim() : '';
  if (source === 'demo_bootstrap' || placeId.startsWith('demo:')) return 'Demo seed';
  if (source === 'google_places' || source === 'mapbox_places') return 'Imported \u00b7 Places';
  if (!source && placeId) return 'Imported \u00b7 Places';
  if (source) return 'Self-registered';
  return null;
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
