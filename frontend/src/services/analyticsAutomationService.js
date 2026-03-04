/**
 * Analytics Automation Service
 * Automatically populates trending topics from search data
 * Bridges the gap between search analytics and user-facing trends
 */

import { supabase } from '../lib/supabase';

/**
 * Analytics Automation Service
 * Handles automatic updates of trending topics from search data
 */
export const analyticsAutomationService = {
    /**
     * Manually trigger trending topics update from search analytics
     * @param {Object} options
     * @param {number} options.daysBack - Days to analyze (default: 7)
     * @param {number} options.limitCount - Max topics to generate (default: 10)
     * @returns {Promise<Array>} Updated trending topics with analytics
     */
    updateTrendingTopics: async ({ daysBack = 7, limitCount = 10 } = {}) => {
        try {
            const { data, error } = await supabase.rpc('admin_update_trending_topics', {
                payload: {
                    days_back: daysBack,
                    limit_count: limitCount
                }
            });

            if (error) throw error;
            
            console.log(`✅ Updated ${data?.length || 0} trending topics from search analytics`);
            return data || [];
        } catch (error) {
            console.error('Error updating trending topics:', error);
            return null;
        }
    },

    /**
     * Get current trending topics with real-time analytics
     * @param {Object} options
     * @param {number} options.limit - Max results (default: 8)
     * @returns {Promise<Array>} Trending topics with analytics data
     */
    getTrendingTopicsWithAnalytics: async ({ limit = 8 } = {}) => {
        try {
            const { data, error } = await supabase
                .from('trending_searches_view')
                .select('*')
                .order('rank', { ascending: true })
                .limit(limit);

            if (error) throw error;
            
            return (data || []).map(item => ({
                query: item.query,
                count: item.search_count,
                unique_users: item.unique_users,
                rank: item.rank,
                category: item.category,
                updated_at: item.updated_at
            }));
        } catch (error) {
            console.error('Error fetching trending topics with analytics:', error);
            return [];
        }
    },

    /**
     * Schedule automatic updates (requires server-side implementation)
     * This would typically be called by a cron job or scheduled function
     */
    scheduleAutomaticUpdates: async () => {
        try {
            // This would be implemented as:
            // 1. Supabase Edge Function with cron
            // 2. PostgreSQL pg_cron extension
            // 3. External scheduler calling this endpoint
            
            const { data, error } = await supabase.rpc('update_trending_topics_from_search');
            
            if (error) throw error;
            
            console.log('🔄 Automatic trending topics update completed');
            return true;
        } catch (error) {
            console.error('Error in automatic update:', error);
            return false;
        }
    },

    /**
     * Get analytics update history
     * @returns {Promise<Array>} History of trending topic updates
     */
    getUpdateHistory: async () => {
        try {
            const { data, error } = await supabase
                .from('search_events')
                .select('*')
                .eq('source', 'system')
                .eq('selected_key', 'auto_update')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching update history:', error);
            return [];
        }
    },

    /**
     * Force refresh trending topics (admin only)
     * @returns {Promise<boolean>} Success status
     */
    forceRefresh: async () => {
        try {
            const success = await analyticsAutomationService.updateTrendingTopics();
            
            if (success) {
                console.log('🚀 Trending topics force refreshed successfully');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error force refreshing trending topics:', error);
            return false;
        }
    }
};
