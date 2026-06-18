/**
 * useAdmin Hook - Centralized admin functionality with proper RBAC
 * Provides all admin operations with automatic permission checking
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  isAdmin,
  getAdminUserData,
  getVerificationQueueData,
  getAdminAnalyticsData,
  adminSearchUsers,
  getUserOptions,
  withAdminPrivileges
} from '../services/adminService';

export const useAdmin = () => {
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check admin status on mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const adminStatus = await isAdmin();
        setIsCurrentUserAdmin(adminStatus);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsCurrentUserAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Get comprehensive user data
  const fetchUserData = useCallback(async (options = {}) => {
    if (!isCurrentUserAdmin) {
      throw new Error('Access denied: Admin privileges required');
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getAdminUserData(options);
      return data;
    } catch (err) {
      console.error('Admin user data fetch failed:', err);
      setError(err.message);
      // Return basic structure instead of throwing
      return {
        users: [],
        statistics: {
          totalUsers: 0,
          totalProfiles: 0,
          recentSignups: 0,
          emailVerifiedUsers: 0,
          phoneVerifiedUsers: 0,
          roleDistribution: {
            admin: 0,
            provider: 0,
            sponsor: 0,
            viewer: 0,
            patient: 0,
          }
        },
        totalCount: 0
      };
    } finally {
      setLoading(false);
    }
  }, [isCurrentUserAdmin]);

  // Get verification queue data
  const fetchVerificationQueue = useCallback(async (options = {}) => {
    if (!isCurrentUserAdmin) {
      throw new Error('Access denied: Admin privileges required');
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getVerificationQueueData(options);
      return data;
    } catch (err) {
      console.error('Verification queue fetch failed:', err);
      setError(err.message);
      // Return basic structure instead of throwing
      return {
        users: [],
        stats: { pending: 0, approved: 0, rejected: 0, total: 0 },
        totalCount: 0
      };
    } finally {
      setLoading(false);
    }
  }, [isCurrentUserAdmin]);

  // Get analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!isCurrentUserAdmin) {
      throw new Error('Access denied: Admin privileges required');
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getAdminAnalyticsData();
      return data;
    } catch (err) {
      console.error('Analytics fetch failed:', err);
      setError(err.message);
      // Return basic structure instead of throwing
      return {
        totalUsers: 0,
        totalProfiles: 0,
        recentSignups: 0,
        emailVerifiedUsers: 0,
        phoneVerifiedUsers: 0,
        roleDistribution: {
          admin: 0,
          provider: 0,
          sponsor: 0,
          viewer: 0,
          patient: 0,
        }
      };
    } finally {
      setLoading(false);
    }
  }, [isCurrentUserAdmin]);

  // Search users
  const searchUsers = useCallback(async (searchTerm) => {
    if (!isCurrentUserAdmin) {
      throw new Error('Access denied: Admin privileges required');
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await adminSearchUsers(searchTerm);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isCurrentUserAdmin]);

  // Get user options for dropdowns
  const fetchUserOptions = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getUserOptions(options);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute any admin function with privilege checking
  const executeAdminFunction = useCallback(async (serviceFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await withAdminPrivileges(serviceFunction, ...args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Admin action wrappers for common operations
  const adminActions = {
    // User management
    getAllUsers: (options) => fetchUserData(options),
    searchUsers: (searchTerm) => searchUsers(searchTerm),
    getUserOptions: (options) => fetchUserOptions(options),
    
    // Verification
    getVerificationQueue: (options) => fetchVerificationQueue(options),
    
    // Analytics
    getAnalytics: () => fetchAnalytics(),
    
    // Generic admin function execution
    execute: (serviceFunction, ...args) => executeAdminFunction(serviceFunction, ...args),
  };

  return {
    // State
    isCurrentUserAdmin,
    loading,
    error,
    
    // Actions
    ...adminActions,
    
    // Utilities
    clearError: () => setError(null),
    
    // Computed values
    canAccessAdminFeatures: isCurrentUserAdmin,
    hasAdminPrivileges: isCurrentUserAdmin,
  };
};
