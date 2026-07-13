import { DEFAULT_ANALYTICS_SUBSCRIPTION_STATS } from '../../../services/analyticsService';
import { canonicalizeEmergencyStatus } from '../../../utils/emergencyStatus';
import { formatAnalyticsWindow } from '../../analytics/AnalyticsSummaryPrimitives';

export const ANALYTICS_EXPORT_UNAVAILABLE_MESSAGE = 'Report downloads are not available yet.';
export const ANALYTICS_DETAIL_UNAVAILABLE_MESSAGE = 'Detailed statistics are unavailable until request data loads.';
export const ANALYTICS_LOAD_ERROR_MESSAGE = 'Statistics did not load.';
export const ANALYTICS_REFRESH_PENDING_MESSAGE = 'Refreshing statistics.';
export const ANALYTICS_STALE_SOURCE_MESSAGE = 'Statistics could not refresh. Showing the last loaded view.';
export const ANALYTICS_PARTIAL_SOURCE_MESSAGE = 'Some statistics are unavailable.';
export const ANALYTICS_DENIED_SOURCE_MESSAGE = 'Some statistics are not available for this role.';

const ANALYTICS_SOURCE_LABELS = {
  requests: 'Requests',
  users: 'Users',
  hospitals: 'Hospitals',
  ambulances: 'Ambulances',
  subscriptions: 'Subscriptions',
  finance: 'Payments',
};

export const DEFAULT_ANALYTICS_STATS = {
  totalEmergencies: 0,
  completedEmergencies: 0,
  avgResponseTime: 0,
  responseSampleSize: 0,
  totalUsers: 0,
  successRate: 0,
  totalHospitals: 0,
  totalAmbulances: 0,
};

export const DEFAULT_REQUEST_SAMPLE = {
  returnedCount: 0,
  totalCount: null,
  limit: 1000,
  complete: false,
};

export const DEFAULT_SUBSCRIPTION_SAMPLE = {
  returnedCount: 0,
  totalCount: null,
  complete: false,
};

export const DEFAULT_HOSPITAL_SAMPLE = {
  returnedCount: 0,
  totalCount: null,
  limit: 1000,
  complete: false,
};

export const DEFAULT_SUBSCRIPTION_STATS = {
  total: 0,
  active: 0,
  paid: 0,
  free: 0,
  newUsers: 0,
  welcomeEmailsSent: 0,
  paidConversionRate: 0,
  activeFree: 0,
  activePremium: 0,
  inactiveFree: 0,
  inactivePremium: 0,
  ...(DEFAULT_ANALYTICS_SUBSCRIPTION_STATS || {}),
  sample: DEFAULT_SUBSCRIPTION_SAMPLE,
};

export const DEFAULT_HOSPITAL_CAPACITY = { total: 0, occupied: 0, icu: 0 };

export const normalizeRequestSample = (value) => ({
  ...DEFAULT_REQUEST_SAMPLE,
  ...(value || {}),
});

export const normalizeHospitalSample = (value) => ({
  ...DEFAULT_HOSPITAL_SAMPLE,
  ...(value || {}),
});

export const normalizeSubscriptionStats = (value) => ({
  ...DEFAULT_SUBSCRIPTION_STATS,
  ...(value || {}),
  sample: {
    ...DEFAULT_SUBSCRIPTION_SAMPLE,
    ...(value?.sample || {}),
  },
});

export const getAnalyticsSourceIssueSummary = (issues = []) => {
  if (!issues.length) return null;

  const deniedLabels = issues
    .filter((issue) => issue.kind === 'denied')
    .map((issue) => ANALYTICS_SOURCE_LABELS[issue.source] || issue.source);
  const partialLabels = issues
    .filter((issue) => issue.kind === 'partial')
    .map((issue) => ANALYTICS_SOURCE_LABELS[issue.source] || issue.source);
  const failedLabels = issues
    .filter((issue) => issue.kind !== 'denied' && issue.kind !== 'partial')
    .map((issue) => ANALYTICS_SOURCE_LABELS[issue.source] || issue.source);
  const detailParts = [
    deniedLabels.length ? `${deniedLabels.join(', ')} need role access.` : null,
    partialLabels.length ? `${partialLabels.join(', ')} returned incomplete data.` : null,
    failedLabels.length ? `${failedLabels.join(', ')} did not load.` : null,
  ].filter(Boolean);

  return {
    kind: deniedLabels.length ? 'denied' : partialLabels.length ? 'partial' : 'failed',
    title: deniedLabels.length && !partialLabels.length && !failedLabels.length
      ? ANALYTICS_DENIED_SOURCE_MESSAGE
      : ANALYTICS_PARTIAL_SOURCE_MESSAGE,
    detail: detailParts.join(' ') || 'Try again when the data is ready.',
  };
};

export const getVisibleAnalyticsSourceIssueSummary = ({
  refreshNotice,
  issueSummary,
  snapshotTimeRange,
  timeRange,
}) => {
  if (!refreshNotice) return issueSummary;

  return {
    kind: 'stale',
    title: refreshNotice,
    detail: refreshNotice === ANALYTICS_REFRESH_PENDING_MESSAGE
      ? snapshotTimeRange === timeRange
        ? 'The last loaded view stays visible while it refreshes.'
        : `Loading ${formatAnalyticsWindow(timeRange).toLowerCase()}; the ${formatAnalyticsWindow(snapshotTimeRange).toLowerCase()} snapshot stays visible.`
      : 'Try again when the data is available.',
  };
};

const getRangeDays = (timeRange) => ({ '7d': 7, '30d': 30, '90d': 90 }[timeRange] || 7);

export const getLocalDayKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export const extractResponseMinutes = (request) => {
  const direct = Number(request?.response_time_minutes ?? request?.response_time ?? request?.avg_response_time);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const created = request?.created_at ? new Date(request.created_at) : null;
  const endTimestamp = request?.responded_at
    || request?.dispatched_at
    || request?.completed_at
    || request?.updated_at;
  const ended = endTimestamp ? new Date(endTimestamp) : null;
  if (created && ended && !Number.isNaN(created.getTime()) && !Number.isNaN(ended.getTime())) {
    const minutes = (ended.getTime() - created.getTime()) / 60000;
    if (Number.isFinite(minutes) && minutes >= 0) return minutes;
  }
  return null;
};

export const buildAnalyticsChartData = (requests, requestedRange, nowValue = new Date()) => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  if (!safeRequests.length) {
    return {
      requestsByDay: [],
      requestsByStatus: [],
      emergencyTypes: [],
      dominantType: null,
    };
  }

  const rangeDays = getRangeDays(requestedRange);
  const now = new Date(nowValue);
  now.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);

  const dayMap = new Map();
  for (let index = 0; index < rangeDays; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    dayMap.set(getLocalDayKey(date), {
      requests: 0,
      completed: 0,
      responseTotal: 0,
      responseCount: 0,
      date,
    });
  }

  const statusCounts = {};
  const typeCounts = {};
  safeRequests.forEach((request) => {
    if (!request?.created_at) return;
    const created = new Date(request.created_at);
    if (Number.isNaN(created.getTime()) || created < start || created > now) return;
    const day = dayMap.get(getLocalDayKey(created));
    if (!day) return;

    day.requests += 1;
    const status = canonicalizeEmergencyStatus(request.status, 'pending_approval');
    if (status === 'completed') day.completed += 1;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const responseMinutes = extractResponseMinutes(request);
    if (responseMinutes !== null) {
      day.responseTotal += responseMinutes;
      day.responseCount += 1;
    }

    const type = String(request.service_type || request.emergency_type || request.type || 'other')
      .replace(/[_-]/g, ' ')
      .trim()
      .toLowerCase();
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const requestsByDay = Array.from(dayMap.values()).map((day) => ({
    day: day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    shortDay: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    avgTime: day.responseCount > 0 ? Math.round((day.responseTotal / day.responseCount) * 10) / 10 : 0,
    requests: day.requests,
    completed: day.completed,
  }));
  const requestsByStatus = Object.entries(statusCounts)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value,
    }))
    .sort((left, right) => right.value - left.value);
  const emergencyTypes = Object.entries(typeCounts)
    .map(([name, value]) => ({
      name: name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value,
    }))
    .sort((left, right) => right.value - left.value);

  return {
    requestsByDay,
    requestsByStatus,
    emergencyTypes,
    dominantType: emergencyTypes[0] || null,
  };
};

export const buildAnalyticsSnapshot = ({
  analyticsPage,
  requestedRange,
  canReadSubscriptionAnalytics,
  canReadFinanceAnalytics,
  nowValue,
}) => {
  const requests = analyticsPage?.requests || [];
  const completed = requests.filter(
    (request) => canonicalizeEmergencyStatus(request.status, 'pending_approval') === 'completed',
  );
  const responseTimes = requests.map(extractResponseMinutes).filter((value) => value !== null);
  const avgResponseTime = responseTimes.length
    ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
    : 0;
  const hospitalSample = normalizeHospitalSample(analyticsPage?.hospitalSample);
  const hospitals = analyticsPage?.hospitals || [];
  const totalBeds = hospitalSample.complete
    ? hospitals.reduce((sum, hospital) => sum + (Number(hospital.total_beds) || 0), 0)
    : 0;
  const availableBeds = hospitalSample.complete
    ? hospitals.reduce((sum, hospital) => sum + (Number(hospital.available_beds) || 0), 0)
    : 0;
  const icuAvailable = hospitalSample.complete
    ? hospitals.reduce((sum, hospital) => sum + (Number(hospital.icu_beds_available) || 0), 0)
    : 0;

  return {
    sourceIssues: analyticsPage?.sourceIssues || [],
    requestSample: normalizeRequestSample(analyticsPage?.requestSample),
    hospitalSample,
    financeData: canReadFinanceAnalytics ? analyticsPage?.financeData || [] : [],
    subscriptionStats: canReadSubscriptionAnalytics
      ? normalizeSubscriptionStats(analyticsPage?.subscriptionStats)
      : normalizeSubscriptionStats(),
    stats: {
      totalEmergencies: requests.length,
      completedEmergencies: completed.length,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      responseSampleSize: responseTimes.length,
      totalUsers: analyticsPage?.usersCount || 0,
      successRate: requests.length > 0 ? Math.round((completed.length / requests.length) * 100) : 0,
      totalHospitals: analyticsPage?.hospitalsCount || 0,
      totalAmbulances: analyticsPage?.ambulancesCount || 0,
    },
    hospitalCapacity: hospitalSample.complete
      ? { total: totalBeds, occupied: Math.max(0, totalBeds - availableBeds), icu: icuAvailable }
      : DEFAULT_HOSPITAL_CAPACITY,
    ...buildAnalyticsChartData(requests, requestedRange, nowValue),
  };
};

export const getFinanceCurrency = (financeData = []) => {
  const currency = financeData[0]?.currency;
  return typeof currency === 'string' && currency.trim()
    ? currency.trim().toUpperCase()
    : null;
};

export const getFinanceSummary = (financeData = [], financeCurrency = null) => {
  if (!Array.isArray(financeData) || !financeData.length) {
    return { totalCredits: 0, totalDebits: 0, todayCredits: 0, dailyAverageCredits: 0, currency: null };
  }
  const totalCredits = financeData.reduce((sum, point) => sum + (Number(point?.income) || 0), 0);
  const totalDebits = financeData.reduce((sum, point) => sum + (Number(point?.outflow) || 0), 0);
  return {
    totalCredits,
    totalDebits,
    todayCredits: Number(financeData[financeData.length - 1]?.income) || 0,
    dailyAverageCredits: totalCredits / financeData.length,
    currency: financeCurrency,
  };
};

export const getAnalyticsSourceReadiness = ({
  snapshotReady,
  sourceIssues,
  hospitalSample,
  subscriptionStats,
  canReadSubscriptionAnalytics,
  canReadFinanceAnalytics,
  financeCurrency,
}) => {
  const issueSources = new Set((sourceIssues || []).map((issue) => issue.source));
  return {
    requests: snapshotReady && !issueSources.has('requests'),
    users: snapshotReady && !issueSources.has('users'),
    hospitals: snapshotReady && !issueSources.has('hospitals') && hospitalSample?.complete === true,
    ambulances: snapshotReady && !issueSources.has('ambulances'),
    subscriptions: snapshotReady
      && canReadSubscriptionAnalytics
      && !issueSources.has('subscriptions')
      && subscriptionStats?.sample?.complete === true,
    finance: snapshotReady
      && canReadFinanceAnalytics
      && !issueSources.has('finance')
      && Boolean(financeCurrency),
  };
};

export const getAnalyticsRoleKind = ({ admin, orgAdmin, sponsor, provider, driver }) => {
  if (admin) return 'admin';
  if (orgAdmin) return 'org_admin';
  if (sponsor) return 'sponsor';
  if (provider) return driver ? 'driver' : 'provider';
  return 'viewer';
};

export const getModalAnalytics = ({ stats, requestsByStatus, emergencyTypes }) => ({
  total: stats.totalEmergencies,
  completed: stats.completedEmergencies,
  active: stats.totalAmbulances,
  verified: stats.totalHospitals,
  emergency: stats.totalEmergencies,
  avgResponseTime: stats.avgResponseTime,
  byStatus: Object.fromEntries(requestsByStatus.map((item) => [item.name, item.value])),
  byCategory: Object.fromEntries(emergencyTypes.map((item) => [item.name, item.value])),
});
