import { useState, useEffect, useCallback } from 'react';
import { 
  getRecentActivity, 
  getActivityStats, 
  subscribeToActivity,
  logActivity,
  logEmergencyActivity,
  logProviderActivity,
  logAmbulanceActivity,
  logVisitActivity,
  logSupportActivity,
  logSubscriptionActivity,
  logSystemActivity
} from '../services/activityService';
import { toast } from 'sonner';

export const useActivity = (options = {}) => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { 
    limit = 20, 
    autoRefresh = true, 
    includeStats = false,
    realTime = true 
  } = options;

  // Fetch recent activities
  const fetchActivities = useCallback(async (refreshLimit = limit) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentActivity(refreshLimit);
      setActivities(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Fetch activity statistics
  const fetchStats = useCallback(async (daysBack = 7) => {
    try {
      const data = await getActivityStats(daysBack);
      setStats(data);
    } catch (err) {
      console.error('Error fetching activity stats:', err);
    }
  }, []);

  // Refresh both activities and stats
  const refresh = useCallback(async () => {
    await fetchActivities();
    if (includeStats) {
      await fetchStats();
    }
  }, [fetchActivities, includeStats, fetchStats]);

  // Log new activity
  const log = useCallback(async (action, entityType, entityId, description, metadata) => {
    try {
      const activityId = await logActivity(action, entityType, entityId, description, metadata);
      
      // Refresh activities to show new entry
      if (autoRefresh) {
        await fetchActivities();
      }
      
      return activityId;
    } catch (err) {
      console.error('Error logging activity:', err);
      toast.error('Failed to log activity');
      throw err;
    }
  }, [fetchActivities, autoRefresh]);

  // Convenience logging methods
  const logEmergency = useCallback(logEmergencyActivity, []);
  const logProvider = useCallback(logProviderActivity, []);
  const logAmbulance = useCallback(logAmbulanceActivity, []);
  const logVisit = useCallback(logVisitActivity, []);
  const logSupport = useCallback(logSupportActivity, []);
  const logSubscription = useCallback(logSubscriptionActivity, []);
  const logSystem = useCallback(logSystemActivity, []);

  // Load more activities
  const loadMore = useCallback(async (additionalLimit = 20) => {
    try {
      setLoading(true);
      const currentLength = activities.length;
      const data = await getRecentActivity(additionalLimit, currentLength);
      
      if (data.length > 0) {
        setActivities(prev => [...prev, ...data]);
      }
      
      return data;
    } catch (err) {
      console.error('Error loading more activities:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [activities.length]);

  // Get activity by ID
  const getActivityById = useCallback((activityId) => {
    return activities.find(activity => activity.id === activityId);
  }, [activities]);

  // Filter activities by type
  const getActivitiesByType = useCallback((action) => {
    return activities.filter(activity => activity.action === action);
  }, [activities]);

  // Filter activities by entity
  const getActivitiesByEntity = useCallback((entityType, entityId) => {
    return activities.filter(activity => 
      activity.entity_type === entityType && activity.entity_id === entityId
    );
  }, [activities]);

  // Real-time subscription
  useEffect(() => {
    if (!realTime) return;

    const unsubscribe = subscribeToActivity((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          // Add new activity to the beginning of the list
          setActivities(prev => [newRecord, ...prev.slice(0, limit - 1)]);
          break;
        
        case 'UPDATE':
          // Update existing activity
          setActivities(prev => 
            prev.map(activity => 
              activity.id === newRecord.id ? newRecord : activity
            )
          );
          break;
        
        case 'DELETE':
          // Remove activity
          setActivities(prev => 
            prev.filter(activity => activity.id !== oldRecord.id)
          );
          break;
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [realTime, limit]);

  // Initial data fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // Data
    activities,
    stats,
    loading,
    error,
    
    // Actions
    fetchActivities,
    fetchStats,
    refresh,
    loadMore,
    log,
    
    // Convenience methods
    logEmergency,
    logProvider,
    logAmbulance,
    logVisit,
    logSupport,
    logSubscription,
    logSystem,
    
    // Utilities
    getActivityById,
    getActivitiesByType,
    getActivitiesByEntity,
  };
};

// Export individual convenience hooks for specific use cases
export const useEmergencyActivity = () => {
  const { logEmergency } = useActivity();
  return { logEmergency };
};

export const useProviderActivity = () => {
  const { logProvider } = useActivity();
  return { logProvider };
};

export const useSystemActivity = () => {
  const { logSystem } = useActivity();
  return { logSystem };
};
