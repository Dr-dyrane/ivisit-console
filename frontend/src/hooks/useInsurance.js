import { useState, useEffect, useCallback } from 'react';
import { 
  getInsurancePolicies, 
  createInsurancePolicy, 
  updateInsurancePolicy, 
  deleteInsurancePolicy,
  updatePolicyStatus,
  verifyInsurancePolicy,
  getInsuranceAnalytics,
  subscribeToInsurancePolicies
} from '../services/insuranceService';

export const useInsurance = () => {
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Fetch insurance policies
  const fetchInsurancePolicies = useCallback(async (filter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInsurancePolicies(filter);
      setInsurancePolicies(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch insurance policies');
      console.error('Error fetching insurance policies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create insurance policy
  const createPolicy = useCallback(async (policyData) => {
    try {
      const newPolicy = await createInsurancePolicy(policyData);
      setInsurancePolicies((prev) => [newPolicy, ...prev]);
      return newPolicy;
    } catch (err) {
      setError(err.message || 'Failed to create insurance policy');
      throw err;
    }
  }, []);

  // Update insurance policy
  const updatePolicy = useCallback(async (id, updates) => {
    try {
      const updatedPolicy = await updateInsurancePolicy(id, updates);
      setInsurancePolicies((prev) => 
        prev.map((policy) => policy.id === id ? { ...policy, ...updatedPolicy } : policy)
      );
      return updatedPolicy;
    } catch (err) {
      setError(err.message || 'Failed to update insurance policy');
      throw err;
    }
  }, []);

  // Delete insurance policy
  const deletePolicy = useCallback(async (id) => {
    try {
      await deleteInsurancePolicy(id);
      setInsurancePolicies((prev) => prev.filter((policy) => policy.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete insurance policy');
      throw err;
    }
  }, []);

  // Update policy status
  const updateStatus = useCallback(async (id, status) => {
    try {
      const updatedPolicy = await updatePolicyStatus(id, status);
      setInsurancePolicies((prev) => 
        prev.map((policy) => policy.id === id ? { ...policy, ...updatedPolicy } : policy)
      );
      return updatedPolicy;
    } catch (err) {
      setError(err.message || 'Failed to update policy status');
      throw err;
    }
  }, []);

  // Verify policy
  const verifyPolicy = useCallback(async (id, verified) => {
    try {
      const updatedPolicy = await verifyInsurancePolicy(id, verified);
      setInsurancePolicies((prev) => 
        prev.map((policy) => policy.id === id ? { ...policy, ...updatedPolicy } : policy)
      );
      return updatedPolicy;
    } catch (err) {
      setError(err.message || 'Failed to verify policy');
      throw err;
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getInsuranceAnalytics();
      setAnalytics(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchInsurancePolicies();
  }, [fetchInsurancePolicies]);

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToInsurancePolicies((payload) => {
      console.log('Insurance policy change:', payload);
      fetchInsurancePolicies(); // Refetch on any change
    });

    return unsubscribe;
  }, [fetchInsurancePolicies]);

  return {
    insurancePolicies,
    loading,
    error,
    analytics,
    fetchInsurancePolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    updateStatus,
    verifyPolicy,
    fetchAnalytics,
    clearError,
  };
};
