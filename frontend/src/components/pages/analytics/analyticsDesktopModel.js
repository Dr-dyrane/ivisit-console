import { formatMetricNumber } from '../../analytics/AnalyticsSummaryPrimitives';

export const SOURCE_UNAVAILABLE = 'Unavailable';
export const ANALYTICS_RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
export const ANALYTICS_CHART_HEIGHT = 210;
export const ANALYTICS_CHART_INITIAL_DIMENSION = {
  width: 1,
  height: ANALYTICS_CHART_HEIGHT,
};

const NOOP = () => {};

export const getAnalyticsAudienceLabel = (role = {}) => {
  if (role.isProvider) return 'Provider activity';
  if (role.isSponsor) return 'Sponsor view';
  if (role.isOrgAdmin) return 'Organization activity';
  if (role.isAdmin) return 'Platform activity';
  return 'Available activity';
};

export const formatAnalyticsCurrency = (value, currency) => {
  const safeCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  if (!safeCurrency) return SOURCE_UNAVAILABLE;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
    }).format(Number(value) || 0);
  } catch {
    return SOURCE_UNAVAILABLE;
  }
};

export const getBreakdownTone = (label = '', index = 0) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('complete')) return 'bg-emerald-500';
  if (normalized.includes('cancel') || normalized.includes('declined')) return 'bg-destructive';
  if (normalized.includes('pending')) return 'bg-amber-500';
  if (normalized.includes('progress') || normalized.includes('accepted') || normalized.includes('arrived')) {
    return 'bg-sky-500';
  }
  return ['bg-violet-500', 'bg-cyan-500', 'bg-sky-500', 'bg-amber-500'][index % 4];
};

export const getAnalyticsPagination = (dataWindow) => {
  const rangeDays = ANALYTICS_RANGE_DAYS[dataWindow] || 7;
  return {
    currentPage: 1,
    totalPages: 1,
    totalCount: rangeDays,
    itemsPerPage: rangeDays + 1,
    prevPage: NOOP,
    nextPage: NOOP,
    hasPrevPage: false,
    hasNextPage: false,
  };
};

export const getAnalyticsSignal = ({
  failedEmpty,
  requestSourceReady,
  audienceLabel,
  totalRequests,
  completedRequests,
  returnedRequestCount,
  requestSampleComplete,
  windowLabel,
  icons,
}) => {
  if (failedEmpty) {
    return {
      icon: icons.alert,
      tone: 'danger',
      label: 'Data unavailable',
      headline: 'Statistics did not load',
      subhead: 'Try again to review request activity for this time window.',
    };
  }
  if (!requestSourceReady) {
    return {
      icon: icons.alert,
      tone: 'warning',
      label: audienceLabel,
      headline: 'Request activity is unavailable',
      subhead: 'Other available information remains visible while request data is restored.',
    };
  }
  if (totalRequests > 0) {
    return {
      icon: icons.activity,
      tone: 'primary',
      label: audienceLabel,
      headline: requestSampleComplete
        ? `${formatMetricNumber(totalRequests)} requests in ${windowLabel.toLowerCase()}`
        : `Latest ${formatMetricNumber(returnedRequestCount)} requests`,
      subhead: requestSampleComplete
        ? `${formatMetricNumber(completedRequests)} completed, with timing shown only for requests that include usable timestamps.`
        : `${formatMetricNumber(completedRequests)} completed in the loaded sample for ${windowLabel.toLowerCase()}.`,
    };
  }
  return {
    icon: icons.activity,
    tone: 'muted',
    label: audienceLabel,
    headline: `No requests in ${windowLabel.toLowerCase()}`,
    subhead: 'Choose another time window or check again after new request activity is recorded.',
  };
};
