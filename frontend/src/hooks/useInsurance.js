import { useState, useCallback } from 'react';

export const useInsurance = () => {
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics] = useState(null);

  const showUnavailableCommand = useCallback((message) => {
    const unavailableError = new Error(message);
    setError(message);
    throw unavailableError;
  }, []);

  // Legacy hook compatibility. Active reads are route-owned by getInsurancePage().
  const fetchInsurancePolicies = useCallback(async () => {
    setInsurancePolicies([]);
    setLoading(false);
    return showUnavailableCommand(
      'Insurance policy list reads are unavailable; use getInsurancePage() from insuranceService.'
    );
  }, [showUnavailableCommand]);

  // Create insurance policy
  const createPolicy = useCallback(async () => showUnavailableCommand(
    'Insurance policy create is unavailable until admin policy authority is verified.'
  ), [showUnavailableCommand]);

  // Update insurance policy
  const updatePolicy = useCallback(async () => showUnavailableCommand(
    'Insurance policy update is unavailable until admin policy authority is verified.'
  ), [showUnavailableCommand]);

  // Delete insurance policy
  const deletePolicy = useCallback(async () => showUnavailableCommand(
    'Insurance policy delete is unavailable until admin policy authority is verified.'
  ), [showUnavailableCommand]);

  // Update policy status
  const updateStatus = useCallback(async () => showUnavailableCommand(
    'Insurance policy status update is unavailable until admin policy authority is verified.'
  ), [showUnavailableCommand]);

  // Verify policy
  const verifyPolicy = useCallback(async () => showUnavailableCommand(
    'Insurance policy verification is unavailable until admin policy authority is verified.'
  ), [showUnavailableCommand]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => showUnavailableCommand(
    'Insurance analytics are unavailable until route-wide distribution scope is verified.'
  ), [showUnavailableCommand]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
