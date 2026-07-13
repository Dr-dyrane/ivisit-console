import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

/**
 * Get health news analytics.
 */
export async function getHealthNewsAnalytics() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('source, category, published, created_at');

    if (error) {
      console.error('Analytics query error:', error);
      return {
        total: 0,
        published: 0,
        bySource: {},
        byCategory: {},
        recent: 0,
      };
    }

    if (!data || data.length === 0) {
      return {
        total: 0,
        published: 0,
        bySource: {},
        byCategory: {},
        recent: 0,
      };
    }

    const analytics = {
      total: data?.length || 0,
      published: data?.filter((item) => item.published).length || 0,
      bySource: {},
      byCategory: {},
      recent: data?.filter((item) => {
        const createdAt = new Date(item.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length || 0,
    };

    data?.forEach((item) => {
      if (item.source) {
        analytics.bySource[item.source] = (analytics.bySource[item.source] || 0) + 1;
      }
    });

    data?.forEach((item) => {
      if (item.category) {
        analytics.byCategory[item.category] = (analytics.byCategory[item.category] || 0) + 1;
      }
    });

    return analytics;
  } catch (error) {
    console.error('Error fetching health news analytics:', error);
    return {
      total: 0,
      published: 0,
      bySource: {},
      byCategory: {},
      recent: 0,
    };
  }
}
