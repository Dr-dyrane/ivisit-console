import { getEmergencyRequests } from '../emergencyService';
import { getCachedOrFetch } from './cache';

const getPeriodKey = (date, period) => {
  switch (period) {
    case 'hour':
      return `${date.toISOString().slice(0, 13)}:00`;
    case 'day':
      return date.toISOString().slice(0, 10);
    case 'week': {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    case 'month':
      return date.toISOString().slice(0, 7);
    default:
      return date.toISOString().slice(0, 10);
  }
};

export const buildTimeSeries = (emergencies, period) => {
  const grouped = emergencies.reduce((accumulator, emergency) => {
    const key = getPeriodKey(new Date(emergency.created_at), period);

    if (!accumulator[key]) {
      accumulator[key] = { date: key, count: 0, responseTime: 0, completed: 0 };
    }

    accumulator[key].count += 1;
    if (emergency.response_time_minutes) {
      accumulator[key].responseTime += emergency.response_time_minutes;
    }
    if (emergency.status === 'completed') {
      accumulator[key].completed += 1;
    }

    return accumulator;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      avgResponseTime: item.count > 0 ? item.responseTime / item.count : 0,
    }))
    .sort((left, right) => new Date(left.date) - new Date(right.date));
};

export const buildPerformanceMetrics = (emergencies) => {
  const responseTimes = emergencies
    .filter((emergency) => emergency.response_time_minutes)
    .map((emergency) => emergency.response_time_minutes);

  return {
    avgResponseTime: responseTimes.length > 0
      ? responseTimes.reduce((left, right) => left + right) / responseTimes.length
      : 0,
    medianResponseTime: responseTimes.length > 0
      ? responseTimes.sort((left, right) => left - right)[Math.floor(responseTimes.length / 2)]
      : 0,
    p95ResponseTime: responseTimes.length > 0
      ? responseTimes.sort((left, right) => left - right)[Math.floor(responseTimes.length * 0.95)]
      : 0,
    totalRequests: emergencies.length,
    completedRequests: emergencies.filter((emergency) => emergency.status === 'completed').length,
    failedRequests: emergencies.filter((emergency) => emergency.status === 'failed').length,
  };
};

export const getTimeSeriesData = async (metric = 'emergencies', period = 'day') => {
  try {
    const cacheKey = `timeseries_${metric}_${period}`;

    return await getCachedOrFetch(cacheKey, async () => {
      const emergencies = await getEmergencyRequests();
      return buildTimeSeries(emergencies, period);
    });
  } catch (error) {
    console.error('Error fetching time-series data:', error);
    throw new Error('Failed to fetch time-series data');
  }
};

export const getPerformanceMetrics = async () => {
  try {
    return await getCachedOrFetch('performance_metrics', async () => {
      const emergencies = await getEmergencyRequests();
      return buildPerformanceMetrics(emergencies);
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw new Error('Failed to fetch performance metrics');
  }
};
