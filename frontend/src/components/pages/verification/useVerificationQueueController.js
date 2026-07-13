import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getVerificationQueue,
  subscribeToVerificationQueue,
  verifyProvider,
} from '../../../services/verificationService';
import {
  getOrgVerificationQueue,
  subscribeToOrgVerificationQueue,
  verifyOrganization,
} from '../../../services/orgVerificationService';
import { usePagination } from '../../../hooks/usePagination';
import { toast } from 'sonner';
import { handleApiError } from '../../../utils/errorHandler';
import {
  DEFAULT_FACILITY_STATS,
  DEFAULT_PROVIDER_STATS,
  executeVerificationBulkAction,
  isTransientVerificationRefreshError,
  normalizeActiveStats,
  sortVerificationItems,
  toVerificationServiceStatus,
} from './verificationQueueModel';

export const useVerificationQueueController = ({
  canReview,
  canApprove,
  initialQueueType = 'providers',
  providerTypeFilter = null,
  onProviderVerified,
}) => {
  const [providers, setProviders] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(() => ({ ...DEFAULT_PROVIDER_STATS }));
  const [orgStats, setOrgStats] = useState(() => ({ ...DEFAULT_FACILITY_STATS }));
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [queueType, setQueueType] = useState(initialQueueType);

  const providerRequestSeqRef = useRef(0);
  const facilityRequestSeqRef = useRef(0);
  const loadedQueuesRef = useRef({ providers: false, organizations: false });
  const pagination = usePagination(12);
  const {
    currentPage,
    itemsPerPage,
    setTotalCount,
  } = pagination;

  const activeItems = queueType === 'providers' ? providers : organizations;
  const activeStats = useMemo(
    () => normalizeActiveStats(queueType, stats, orgStats),
    [queueType, stats, orgStats],
  );
  const sortedItems = useMemo(
    () => sortVerificationItems(activeItems, sortConfig.direction),
    [activeItems, sortConfig.direction],
  );

  useEffect(() => {
    if (!canReview) {
      setProviders([]);
      setOrganizations([]);
      setLoading(false);
    }
  }, [canReview]);

  const fetchVerificationData = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    const requestSeq = providerRequestSeqRef.current + 1;
    providerRequestSeqRef.current = requestSeq;
    if (!loadedQueuesRef.current.providers) setLoading(true);
    setIsFetching(true);

    try {
      const result = await getVerificationQueue({
        status: filters.status,
        search: filters.search,
        providerType: providerTypeFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
        quiet: true,
      });

      if (requestSeq !== providerRequestSeqRef.current) return;
      setProviders(result.data);
      setStats(result.stats);
      setLoadError(null);
      loadedQueuesRef.current.providers = true;
      setTotalCount(result.pagination.total);
    } catch (error) {
      if (requestSeq !== providerRequestSeqRef.current || isTransientVerificationRefreshError(error)) return;
      setLoadError('Check your connection and try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (requestSeq === providerRequestSeqRef.current) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [
    canReview,
    filters.search,
    filters.status,
    currentPage,
    itemsPerPage,
    setTotalCount,
    providerTypeFilter,
  ]);

  const fetchOrgVerificationData = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    const requestSeq = facilityRequestSeqRef.current + 1;
    facilityRequestSeqRef.current = requestSeq;
    if (!loadedQueuesRef.current.organizations) setLoading(true);
    setIsFetching(true);

    try {
      const result = await getOrgVerificationQueue({
        status: toVerificationServiceStatus('organizations', filters.status),
        search: filters.search,
        page: currentPage,
        limit: itemsPerPage,
        quiet: true,
      });

      if (requestSeq !== facilityRequestSeqRef.current) return;
      setOrganizations(result.data);
      setOrgStats(result.stats);
      setLoadError(null);
      loadedQueuesRef.current.organizations = true;
      setTotalCount(result.pagination.total);
    } catch (error) {
      if (requestSeq !== facilityRequestSeqRef.current || isTransientVerificationRefreshError(error)) return;
      setLoadError('Check your connection and try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (requestSeq === facilityRequestSeqRef.current) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [
    canReview,
    filters.search,
    filters.status,
    currentPage,
    itemsPerPage,
    setTotalCount,
  ]);

  const refetchActive = useCallback(
    () => (queueType === 'providers' ? fetchVerificationData() : fetchOrgVerificationData()),
    [queueType, fetchVerificationData, fetchOrgVerificationData],
  );

  useEffect(() => {
    if (queueType === 'providers') fetchVerificationData();
    else fetchOrgVerificationData();

    let unsubscribeProviders;
    let unsubscribeOrganizations;

    if (canReview && queueType === 'providers') {
      unsubscribeProviders = subscribeToVerificationQueue(fetchVerificationData);
    }
    if (canReview && queueType === 'organizations') {
      unsubscribeOrganizations = subscribeToOrgVerificationQueue(fetchOrgVerificationData);
    }

    return () => {
      unsubscribeProviders?.();
      unsubscribeOrganizations?.();
    };
  }, [canReview, queueType, fetchVerificationData, fetchOrgVerificationData]);

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    pagination.resetPagination();
  }, [pagination]);

  const setStatusFilter = useCallback((status) => {
    setFilters((current) => ({ ...current, status: status || 'all' }));
    pagination.resetPagination();
  }, [pagination]);

  const setSearchFilter = useCallback((search) => {
    setFilters((current) => ({ ...current, search }));
    pagination.resetPagination();
  }, [pagination]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleVerify = useCallback(async (providerId, approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return false;
    }

    setActionLoading(true);
    try {
      await verifyProvider(providerId, approved);
      toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
      onProviderVerified?.();
      await fetchVerificationData();
      return true;
    } catch (error) {
      handleApiError(error, 'update');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [canApprove, fetchVerificationData, onProviderVerified]);

  const handleVerifyOrg = useCallback(async (hospitalId, approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return;
    }

    setActionLoading(true);
    try {
      await verifyOrganization(hospitalId, approved);
      toast.success(approved ? 'Facility approved' : 'Facility rejected');
      fetchOrgVerificationData();
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setActionLoading(false);
    }
  }, [canApprove, fetchOrgVerificationData]);

  const handleBulkAction = useCallback(async (ids, approved, clearSelection) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return;
    }
    if (!Array.isArray(ids) || ids.length === 0) return;

    setActionLoading(true);
    const result = await executeVerificationBulkAction({
      ids,
      queueType,
      approved,
      verifyProviderCommand: verifyProvider,
      verifyOrganizationCommand: verifyOrganization,
    });

    clearSelection?.();
    await refetchActive();
    setActionLoading(false);

    if (result.failed > 0) {
      toast.error(`${result.failed} ${approved ? 'approval' : 'rejection'}${result.failed === 1 ? '' : 's'} failed`);
    } else {
      toast.success(`${result.total} ${result.total === 1 ? result.noun : result.plural} ${approved ? 'approved' : 'rejected'}`);
    }
  }, [canApprove, queueType, refetchActive]);

  return {
    providers,
    organizations,
    stats,
    orgStats,
    activeItems,
    activeStats,
    sortedItems,
    loading,
    isFetching,
    loadError,
    actionLoading,
    filters,
    setFilters,
    sortConfig,
    queueType,
    setQueueType,
    pagination,
    refetchActive,
    handleApplyFilters,
    setStatusFilter,
    setSearchFilter,
    handleSort,
    handleVerify,
    handleVerifyOrg,
    handleBulkAction,
  };
};
