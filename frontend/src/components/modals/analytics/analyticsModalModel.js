import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Headphones,
  Newspaper,
  Shield,
  Star,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';

export const PHASES_CONFIG = {
  news: [
    { id: 'summary', label: 'Overview' },
    { id: 'sources', label: 'By Source' },
    { id: 'categories', label: 'By Category' },
  ],
  emergency: [
    { id: 'summary', label: 'Summary' },
    { id: 'priority', label: 'Priority' },
    { id: 'status', label: 'Status' },
  ],
  hospital: [
    { id: 'summary', label: 'Summary' },
    { id: 'resources', label: 'Capacity' },
    { id: 'verification', label: 'Verification' },
  ],
  ambulance: [
    { id: 'summary', label: 'Summary' },
    { id: 'types', label: 'Vehicle types' },
    { id: 'verification', label: 'Verification' },
  ],
  doctor: [
    { id: 'summary', label: 'Summary' },
    { id: 'specialty', label: 'Specialties' },
    { id: 'verification', label: 'Verification' },
  ],
  insurance: [
    { id: 'summary', label: 'Summary' },
    { id: 'providers', label: 'Providers' },
    { id: 'types', label: 'Policy types' },
  ],
  verification: [
    { id: 'summary', label: 'Summary' },
    { id: 'queue', label: 'Review queue' },
    { id: 'trust', label: 'Outcomes' },
  ],
  support: [
    { id: 'summary', label: 'Summary' },
    { id: 'priority', label: 'Priority' },
    { id: 'category', label: 'Category' },
  ],
  user: [
    { id: 'summary', label: 'Summary' },
    { id: 'roles', label: 'Roles' },
    { id: 'growth', label: 'Activity' },
  ],
  subscription: [
    { id: 'summary', label: 'Summary' },
    { id: 'tiers', label: 'Types' },
    { id: 'growth', label: 'Status' },
  ],
  visit: [
    { id: 'summary', label: 'Summary' },
    { id: 'status', label: 'Lifecycle' },
    { id: 'trends', label: 'Volume' },
  ],
  payments: [
    { id: 'summary', label: 'Summary' },
    { id: 'distribution', label: 'Sources' },
    { id: 'lifecycle', label: 'Payment lifecycle' },
  ],
  generic: [
    { id: 'summary', label: 'Summary' },
    { id: 'distribution', label: 'Distribution' },
    { id: 'activity', label: 'Activity' },
  ],
};

export const TYPE_LABELS = {
  news: 'News',
  emergency: 'Requests',
  hospital: 'Hospitals',
  ambulance: 'Ambulances',
  doctor: 'Doctors',
  insurance: 'Insurance',
  verification: 'Approvals',
  support: 'Support',
  user: 'Users',
  subscription: 'Subscriptions',
  visit: 'Visits',
  payments: 'Payments',
  generic: 'Statistics',
};

const SHARE_LABELS = {
  news: 'Published',
  emergency: 'Active',
  hospital: 'Verified',
  ambulance: 'Active',
  doctor: 'Verified',
  insurance: 'Active',
  verification: 'Approved',
  support: 'Resolved',
  user: 'Verified',
  subscription: 'Active',
  visit: 'Completed',
  payments: 'Completed',
};

const SECONDARY_LABELS = {
  insurance: 'Pending',
  support: 'Open',
  subscription: 'Pending',
};

export const getPhases = (type) => PHASES_CONFIG[type] || PHASES_CONFIG.generic;
export const getDisplayType = (type) => TYPE_LABELS[type] || TYPE_LABELS.generic;

export const getPercentage = (value, total) => {
  const v = Number(value) || 0;
  const t = Number(total) || 0;
  return t > 0 ? Math.round((v / t) * 100) : 0;
};

export const getSafePercentage = (value, total) => {
  const t = Number(total) || 0;
  if (t <= 0) return 'No data';
  return `${getPercentage(value, total)}%`;
};

export const getTrendPercentage = (value, total) => {
  const t = Number(total) || 0;
  return t > 0 ? `${getPercentage(value, total)}%` : null;
};

export const getCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMinutes = (value, total) => {
  const parsed = Number(value);
  const hasRows = Number(total) > 0;
  if (!hasRows || !Number.isFinite(parsed)) return 'No data';
  return `${parsed.toFixed(1)}m`;
};

export const formatHours = (value, total) => {
  if (Number(total) <= 0) return 'No data';
  if (value === null || value === undefined || value === '') return 'Unavailable';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}h` : 'Unavailable';
};

export const getDataSetTotal = (dataSet = {}) => (
  Object.values(dataSet).reduce((sum, value) => sum + (Number(value) || 0), 0)
);

export const isVisibleScopedDistribution = (analytics) => (
  ['visible_page', 'loaded_preview'].includes(analytics.distributionScope)
);

export const getSummaryProjection = ({ analytics, type }) => {
  const requestTotal = getCount(analytics.total || analytics.totalEmergencies);
  const userTotal = getCount(analytics.totalUsers);
  const genericTotal = getCount(analytics.total);
  const visibleScopedDistribution = isVisibleScopedDistribution(analytics);
  const shareValue = {
    news: analytics.published,
    emergency: analytics.active,
    hospital: analytics.verified,
    ambulance: analytics.active,
    doctor: analytics.verified,
    insurance: analytics.active,
    verification: analytics.approved ?? analytics.verified,
    support: analytics.resolved,
    user: analytics.verifiedUsers,
    subscription: analytics.active,
    visit: analytics.completed,
    payments: analytics.completed,
  }[type] ?? analytics.active;
  const data = {
    news: [
      { label: 'Articles', value: getCount(analytics.total), icon: Newspaper, color: 'hsl(199 89% 48%)' },
      { label: 'Published', value: getCount(analytics.published), trend: getTrendPercentage(analytics.published, analytics.total), icon: Eye, color: 'hsl(160 84% 39%)' },
      { label: 'Recent', value: getCount(analytics.recent), icon: Calendar, color: 'hsl(199 89% 48%)' },
      { label: 'Groups', value: Object.keys(analytics.byCategory || {}).length, icon: Tag, color: 'hsl(38 92% 50%)' },
    ],
    emergency: [
      { label: 'Requests', value: requestTotal, icon: AlertTriangle, color: 'hsl(199 89% 48%)' },
      { label: 'Needs review', value: getCount(analytics.pending ?? analytics.critical), icon: TrendingUp, color: getCount(analytics.pending ?? analytics.critical) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
      { label: 'Avg response', value: formatMinutes(analytics.avgResponseTime, requestTotal), icon: Clock, color: 'hsl(199 89% 48%)' },
      { label: 'Active', value: getCount(analytics.active), icon: Activity, color: 'hsl(160 84% 39%)' },
    ],
    support: [
      { label: 'Tickets', value: getCount(analytics.total), icon: Headphones, color: 'hsl(199 89% 48%)' },
      { label: 'Resolved', value: getCount(analytics.resolved), trend: getTrendPercentage(analytics.resolved, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
      { label: analytics.averageResolutionScope === 'visible_page' ? 'Avg on page' : 'Avg time', value: formatHours(analytics.averageResolutionTime, analytics.total), icon: Clock, color: 'hsl(199 89% 48%)' },
      { label: visibleScopedDistribution ? 'High on page' : 'High priority', value: getCount(analytics.byPriority?.high), icon: AlertTriangle, color: getCount(analytics.byPriority?.high) > 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))' },
    ],
    user: [
      { label: 'Users', value: userTotal, icon: Users, color: 'hsl(199 89% 48%)' },
      { label: 'Verified', value: getCount(analytics.verifiedUsers), trend: getTrendPercentage(analytics.verifiedUsers, analytics.totalUsers), icon: Shield, color: 'hsl(160 84% 39%)' },
      { label: 'New users', value: getCount(analytics.recentSignups), icon: TrendingUp, color: 'hsl(199 89% 48%)' },
      { label: 'Profiles', value: getCount(analytics.totalProfiles), icon: Activity, color: 'hsl(38 92% 50%)' },
    ],
    visit: [
      { label: 'Visits', value: genericTotal, icon: Calendar, color: 'hsl(199 89% 48%)' },
      { label: 'Completed', value: getCount(analytics.completed), trend: getTrendPercentage(analytics.completed, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
      { label: 'Scheduled', value: getCount(analytics.scheduled), icon: Clock, color: 'hsl(199 89% 48%)' },
      { label: 'In progress', value: getCount(analytics.inProgress), icon: Activity, color: 'hsl(38 92% 50%)' },
    ],
    payments: [
      { label: 'Loaded records', value: genericTotal, icon: BarChart3, color: 'hsl(199 89% 48%)' },
      { label: 'Completed', value: getCount(analytics.completed), trend: getTrendPercentage(analytics.completed, analytics.paymentCount), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
      { label: 'Needs review', value: getCount(analytics.needsReview), icon: AlertTriangle, color: getCount(analytics.needsReview) > 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))' },
      { label: 'Recent payments', value: getCount(analytics.recent), icon: Clock, color: 'hsl(199 89% 48%)' },
    ],
    ambulance: [
      { label: 'Units', value: genericTotal, icon: Activity, color: 'hsl(199 89% 48%)' },
      { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: TrendingUp, color: 'hsl(160 84% 39%)' },
      { label: 'Verified', value: getCount(analytics.verified), icon: Shield, color: 'hsl(199 89% 48%)' },
      { label: 'Emergency', value: getCount(analytics.emergency), icon: AlertTriangle, color: getCount(analytics.emergency) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
    ],
    hospital: [
      { label: 'Facilities', value: genericTotal, icon: Activity, color: 'hsl(199 89% 48%)' },
      { label: 'Verified', value: getCount(analytics.verified), trend: getTrendPercentage(analytics.verified, analytics.total), icon: Shield, color: 'hsl(160 84% 39%)' },
      { label: 'Emergency', value: getCount(analytics.emergency), icon: AlertTriangle, color: getCount(analytics.emergency) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
      { label: 'Active', value: getCount(analytics.active), icon: TrendingUp, color: 'hsl(199 89% 48%)' },
    ],
    doctor: [
      { label: 'Doctors', value: genericTotal, icon: Users, color: 'hsl(199 89% 48%)' },
      { label: 'Verified', value: getCount(analytics.verified), trend: getTrendPercentage(analytics.verified, analytics.total), icon: Shield, color: 'hsl(160 84% 39%)' },
      { label: 'Active', value: getCount(analytics.active), icon: Activity, color: 'hsl(199 89% 48%)' },
      { label: 'Specialists', value: getCount(analytics.specialized), icon: Star, color: 'hsl(38 92% 50%)' },
    ],
    insurance: [
      { label: 'Policies', value: genericTotal, icon: Shield, color: 'hsl(199 89% 48%)' },
      { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
      { label: 'Verified', value: getCount(analytics.verified), icon: Shield, color: 'hsl(199 89% 48%)' },
      { label: 'Expired', value: getCount(analytics.expired), icon: AlertTriangle, color: getCount(analytics.expired) > 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))' },
    ],
    verification: [
      { label: 'Applications', value: genericTotal, icon: FileText, color: 'hsl(199 89% 48%)' },
      { label: 'Approved', value: getCount(analytics.approved || analytics.verified), trend: getTrendPercentage(analytics.approved || analytics.verified, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
      { label: 'Pending', value: getCount(analytics.pending), icon: Clock, color: 'hsl(38 92% 50%)' },
      { label: 'Rejected', value: getCount(analytics.rejected), icon: Ban, color: getCount(analytics.rejected) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
    ],
    subscription: [
      { label: 'Subscribers', value: genericTotal, icon: Users, color: 'hsl(199 89% 48%)' },
      { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
      { label: 'Paid type', value: getCount(analytics.paid), icon: Star, color: 'hsl(199 89% 48%)' },
      { label: 'Pending', value: getCount(analytics.pending), icon: Clock, color: 'hsl(38 92% 50%)' },
    ],
  };

  const currentItems = data[type] || [
    { label: 'Items', value: getCount(analytics.total), icon: BarChart3, color: 'hsl(199 89% 48%)' },
    { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: Activity, color: 'hsl(160 84% 39%)' },
    { label: 'Recent', value: getCount(analytics.recent), icon: TrendingUp, color: 'hsl(199 89% 48%)' },
    { label: 'Diversity', value: Object.keys(analytics.byCategory || analytics.roleDistribution || analytics.byType || {}).length, icon: Tag, color: 'hsl(38 92% 50%)' },
  ];

  return {
    currentItems,
    groups: Object.keys(analytics.byCategory || analytics.roleDistribution || analytics.byType || analytics.byStatus || {}).length,
    secondaryLabel: SECONDARY_LABELS[type] || 'Recent',
    secondaryValue: getCount(type === 'support'
      ? analytics.open
      : type === 'subscription'
        ? analytics.pending
        : (analytics.recent || analytics.recentSignups || analytics.pending || analytics.critical)),
    shareLabel: SHARE_LABELS[type] || 'Share',
    shareValue: getSafePercentage(
      shareValue,
      type === 'payments' ? analytics.paymentCount : (analytics.total || analytics.totalUsers)
    ),
  };
};

export const getDistributionProjection = ({ analytics, type }) => {
  const dataSet = type === 'news'
    ? (analytics.bySource || {})
    : type === 'support'
      ? (analytics.byPriority || {})
      : type === 'subscription'
        ? (analytics.byType || {})
        : (analytics.bySource || analytics.byPriority || analytics.roleDistribution || analytics.byProvider || analytics.byOrg || analytics.byCategory || {});
  const total = analytics.total || analytics.totalUsers || 1;
  const visibleScopedDistribution = isVisibleScopedDistribution(analytics);
  const scopedTotal = visibleScopedDistribution
    ? (Number(analytics.visibleCount) || getDataSetTotal(dataSet) || 1)
    : total;

  return {
    dataSet,
    distributionLabel: analytics.distributionLabel || 'Visible page only',
    scopedTotal,
    visibleScopedDistribution,
  };
};

export const getDetailsProjection = ({ analytics, phaseId, type }) => {
  const isLifecyclePhase = phaseId === 'lifecycle';
  const dataSet = isLifecyclePhase
    ? (analytics.byStatus || {})
    : type === 'news' || type === 'support'
      ? (analytics.byCategory || {})
      : type === 'subscription'
        ? (analytics.byStatus || {})
        : (analytics.byCategory || analytics.byStatus || analytics.byTier || analytics.hospitalStats || {});
  const visibleScopedDistribution = isVisibleScopedDistribution(analytics);
  const scopedTotal = isLifecyclePhase
    ? (Number(analytics.lifecycleCount) || getDataSetTotal(dataSet) || 1)
    : visibleScopedDistribution
      ? (Number(analytics.visibleCount) || getDataSetTotal(dataSet) || 1)
      : (analytics.total || analytics.totalUsers || 100);

  return {
    dataSet,
    distributionLabel: analytics.distributionLabel || 'Visible page only',
    scopedTotal,
    visibleScopedDistribution,
  };
};
