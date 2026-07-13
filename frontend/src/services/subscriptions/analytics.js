import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export async function getSubscriptionAnalytics(options = {}) {
  try {
    const { data, error, count } = await supabase
      .from(TABLE_NAME)
      .select('type, status, new_user, welcome_email_sent, created_at, subscription_date', { count: 'exact' });

    if (error) throw error;

    const exactTotalCount = count !== null
      && count !== undefined
      && Number.isFinite(Number(count))
      ? Number(count)
      : null;

    const analytics = {
      total: data?.length || 0,
      byType: {},
      byStatus: {},
      newUsers: data?.filter((item) => item.new_user).length || 0,
      welcomeEmailsSent: data?.filter((item) => item.welcome_email_sent).length || 0,
      active: data?.filter((item) => item.status === 'active').length || 0,
      paid: data?.filter((item) => item.type === 'paid').length || 0,
      free: data?.filter((item) => item.type === 'free').length || 0,
      paidConversionRate: 0,
      recentSubscriptions: data?.filter((item) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(item.subscription_date || item.created_at) >= thirtyDaysAgo;
      }).length || 0,
      activeFree: data?.filter(
        (item) => item.status === 'active' && item.type === 'free'
      ).length || 0,
      activePremium: data?.filter(
        (item) => item.status === 'active' && item.type === 'paid'
      ).length || 0,
      inactiveFree: data?.filter(
        (item) => item.status !== 'active' && item.type === 'free'
      ).length || 0,
      inactivePremium: data?.filter(
        (item) => item.status !== 'active' && item.type === 'paid'
      ).length || 0,
      sample: {
        returnedCount: data?.length || 0,
        totalCount: exactTotalCount,
        complete: exactTotalCount !== null && exactTotalCount <= (data?.length || 0),
      },
    };

    if (analytics.total > 0) {
      analytics.paidConversionRate = Math.round((analytics.paid / analytics.total) * 100);
    }

    data?.forEach((item) => {
      analytics.byType[item.type] = (analytics.byType[item.type] || 0) + 1;
    });

    data?.forEach((item) => {
      analytics.byStatus[item.status] = (analytics.byStatus[item.status] || 0) + 1;
    });

    return analytics;
  } catch (error) {
    if (!options?.quiet) {
      console.error('Error fetching subscription analytics:', error);
    }
    throw error;
  }
}
