import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '../../../hooks/usePagination';
import { useEmergencyQuery } from '../../../hooks/useEmergencyQuery';
import {
  buildRequestsServiceFilter,
  EMPTY_REQUEST_FILTERS,
  getDefaultRequestKpi,
} from './requestPageModel';

export const useEmergencyRequestsQueryState = ({ authReady }) => {
  const pagination = usePagination(20);
  const setRequestTotalCount = pagination.setTotalCount;
  const [requestStats, setRequestStats] = useState(null);
  const [filters, setFilters] = useState(EMPTY_REQUEST_FILTERS);
  const [kpiFilter, setKpiFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const selectedKpiFilter = useMemo(
    () => kpiFilter || getDefaultRequestKpi(requestStats),
    [kpiFilter, requestStats]
  );
  const queryFilter = useMemo(() => ({
    ...buildRequestsServiceFilter(filters),
    kpiFilter: selectedKpiFilter,
    limit: pagination.itemsPerPage,
    offset: pagination.paginationRange.start,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  }), [
    filters,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    selectedKpiFilter,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const {
    requests,
    count,
    stats,
    loading: queryLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useEmergencyQuery(queryFilter, { enabled: authReady });

  const loading = !authReady || queryLoading;
  const loadError = queryError ? 'Check your connection and try again.' : null;
  const fetchRequests = refetch;

  useEffect(() => {
    if (queryError) console.error('[requests] load failed:', queryError);
  }, [queryError]);

  useEffect(() => {
    setRequestStats(stats || null);
  }, [stats]);

  useEffect(() => {
    setRequestTotalCount(count || 0);
  }, [count, setRequestTotalCount]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return {
    requests,
    loading,
    isFetching,
    requestStats,
    filters,
    setFilters,
    selectedKpiFilter,
    setKpiFilter,
    pagination,
    loadError,
    fetchRequests,
    sortConfig,
    handleSort,
    queryFilter,
  };
};
