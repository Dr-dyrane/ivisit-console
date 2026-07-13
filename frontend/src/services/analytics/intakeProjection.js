import { supabase } from '../../lib/supabase';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { getFinanceAnalytics } from '../walletService';
import { getSubscriptionAnalytics } from '../subscriptionService';
import { getAnalyticsHospitalCapacitySource } from './hospitalCapacityProjection';
import {
  ANALYTICS_REQUEST_SAMPLE_LIMIT,
  ANALYTICS_WINDOW_DAYS,
  DEFAULT_ANALYTICS_SUBSCRIPTION_STATS,
} from './constants';
import {
  getAnalyticsSourceIssue,
  resolveAnalyticsSource,
  toExactCount,
} from './sourceIntegrity';

const EMPTY_SCOPE_UUID = '00000000-0000-0000-0000-000000000000';

const applyAmbulanceScope = (query, user) => {
  if (user?.role !== 'provider') {
    return applyAuthFilter(query, user, {
      orgIdField: 'organization_id',
      resourceType: 'ambulances',
    });
  }

  const providerHospitalIds = Array.isArray(user?.hospital_ids)
    ? user.hospital_ids.filter(Boolean)
    : [];

  if (providerHospitalIds.length > 1) {
    return query.in('hospital_id', providerHospitalIds);
  }
  if (providerHospitalIds.length === 1) {
    return query.eq('hospital_id', providerHospitalIds[0]);
  }
  if (user?.organization_id) {
    return query.eq('organization_id', user.organization_id);
  }
  return user?.id
    ? query.eq('profile_id', user.id)
    : query.eq('id', EMPTY_SCOPE_UUID);
};

const addCountIssue = (sourceIssues, source, result, count) => {
  if (!result.error && count === null) {
    sourceIssues.push({ source, kind: 'failed', reason: 'count_unavailable' });
  }
};

export const getAnalyticsIntakePage = async ({
  timeRange = '7d',
  includeSubscriptionAnalytics = false,
  includeFinanceAnalytics = false,
} = {}) => {
  const user = await getCurrentUser();
  const canReadSubscriptionAnalytics = includeSubscriptionAnalytics && user?.role === 'admin';
  const canReadFinanceAnalytics = includeFinanceAnalytics && user?.role === 'admin';

  let requestsQuery = supabase
    .from('emergency_requests')
    .select('*', { count: 'exact' })
    .limit(ANALYTICS_REQUEST_SAMPLE_LIMIT);
  let usersQuery = supabase.from('profiles').select('id', { count: 'exact', head: true });
  let ambulancesQuery = supabase.from('ambulances').select('id', { count: 'exact', head: true });

  requestsQuery = applyAuthFilter(requestsQuery, user, {
    userIdField: 'user_id',
    orgIdField: 'hospital_id',
    providerIdField: 'responder_id',
    resourceType: 'emergency',
  });

  const selectedWindowDays = ANALYTICS_WINDOW_DAYS[timeRange];
  if (selectedWindowDays) {
    const windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0);
    windowStart.setDate(windowStart.getDate() - (selectedWindowDays - 1));
    requestsQuery = requestsQuery.gte('created_at', windowStart.toISOString());
  }

  usersQuery = applyAuthFilter(usersQuery, user, {
    userIdField: 'id',
    orgIdField: 'organization_id',
    resourceType: 'users',
  });
  ambulancesQuery = applyAmbulanceScope(ambulancesQuery, user);

  const subscriptionAnalyticsRequest = canReadSubscriptionAnalytics
    ? resolveAnalyticsSource(getSubscriptionAnalytics({ quiet: true }).then((data) => ({ data })))
    : Promise.resolve({ data: DEFAULT_ANALYTICS_SUBSCRIPTION_STATS });

  const [requestsRes, usersRes, hospitalsRes, ambulancesRes, subscriptionRes] = await Promise.all([
    resolveAnalyticsSource(requestsQuery),
    resolveAnalyticsSource(usersQuery),
    resolveAnalyticsSource(getAnalyticsHospitalCapacitySource(user)),
    resolveAnalyticsSource(ambulancesQuery),
    subscriptionAnalyticsRequest,
  ]);

  const sourceIssues = [
    getAnalyticsSourceIssue('requests', requestsRes),
    getAnalyticsSourceIssue('users', usersRes),
    getAnalyticsSourceIssue('hospitals', hospitalsRes),
    getAnalyticsSourceIssue('ambulances', ambulancesRes),
    getAnalyticsSourceIssue('subscriptions', subscriptionRes),
  ].filter(Boolean);
  const requestTotalCount = toExactCount(requestsRes.count);
  const hospitalTotalCount = toExactCount(hospitalsRes.count);
  const usersCount = toExactCount(usersRes.count);
  const ambulancesCount = toExactCount(ambulancesRes.count);
  const hospitalReturnedCount = (hospitalsRes.data || []).length;
  const hospitalSampleComplete = !hospitalsRes.error && hospitalsRes.complete === true;

  addCountIssue(sourceIssues, 'requests', requestsRes, requestTotalCount);
  addCountIssue(sourceIssues, 'users', usersRes, usersCount);
  addCountIssue(sourceIssues, 'ambulances', ambulancesRes, ambulancesCount);
  if (!hospitalsRes.error && !hospitalSampleComplete) {
    sourceIssues.push({
      source: 'hospitals',
      kind: 'partial',
      reason: 'capacity_sample_incomplete',
      returnedCount: hospitalReturnedCount,
      totalCount: hospitalTotalCount,
    });
  }

  let financeData = [];
  if (canReadFinanceAnalytics) {
    try {
      const financeLookbackDays = Math.max(0, (selectedWindowDays || 30) - 1);
      const resolvedFinanceData = await getFinanceAnalytics(
        user,
        true,
        financeLookbackDays,
        { quiet: true, throwOnError: true },
      );
      financeData = Array.isArray(resolvedFinanceData) ? resolvedFinanceData : [];
    } catch (financeError) {
      sourceIssues.push(getAnalyticsSourceIssue('finance', { error: financeError }));
    }
  }

  return {
    user,
    requests: requestsRes.data || [],
    requestSample: {
      returnedCount: (requestsRes.data || []).length,
      totalCount: requestTotalCount,
      limit: ANALYTICS_REQUEST_SAMPLE_LIMIT,
      complete: !requestsRes.error
        && requestTotalCount !== null
        && requestTotalCount <= (requestsRes.data || []).length,
    },
    usersCount: usersCount || 0,
    hospitals: hospitalsRes.data || [],
    hospitalsCount: hospitalTotalCount || 0,
    hospitalSample: {
      returnedCount: hospitalReturnedCount,
      totalCount: hospitalTotalCount,
      limit: hospitalsRes.pageSize || 1000,
      complete: hospitalSampleComplete,
    },
    ambulancesCount: ambulancesCount || 0,
    subscriptionStats: canReadSubscriptionAnalytics
      ? { ...DEFAULT_ANALYTICS_SUBSCRIPTION_STATS, ...(subscriptionRes.data || {}) }
      : DEFAULT_ANALYTICS_SUBSCRIPTION_STATS,
    financeData,
    sourceIssues,
  };
};
