import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getInsuranceBillingOutcomes,
  getInsurancePage,
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
} from '../../../services/insuranceService';
import {
  EMPTY_INSURANCE_BILLING_CONTEXT,
  EMPTY_INSURANCE_BILLING_STATS,
  EMPTY_INSURANCE_PAGE,
} from './insurancePageModel';

export const useInsurancePageData = ({
  filters,
  isMobile,
  pagination,
  sortConfig,
  isAdmin,
}) => {
  const [insurancePage, setInsurancePage] = useState(EMPTY_INSURANCE_PAGE);
  const [insuranceBillingContext, setInsuranceBillingContext] = useState(
    EMPTY_INSURANCE_BILLING_CONTEXT
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const billingFetchRequestRef = useRef(0);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const {
    currentPage,
    itemsPerPage,
    setTotalCount,
    resetPagination,
    hasNextPage,
    nextPage,
  } = pagination;

  const fetchInsurancePage = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const canUpdateRouteState = () => (
      isMountedRef.current && fetchRequestRef.current === requestId
    );

    try {
      if (!canUpdateRouteState()) return;
      setLoading(true);
      setError(null);

      const limit = isMobile
        ? currentPage * itemsPerPage
        : itemsPerPage;
      const offset = isMobile
        ? 0
        : (currentPage - 1) * itemsPerPage;
      const page = await getInsurancePage({
        ...filters,
        limit,
        offset,
        sortKey: sortConfig.key,
        sortDirection: sortConfig.direction,
        quiet: true,
      });

      if (!canUpdateRouteState()) return;
      if (page.failed) {
        setInsurancePage((previousPage) => ({
          ...previousPage,
          denied: false,
          failed: true,
          reason: page.reason || 'query_failed',
          errorMessage: page.errorMessage,
        }));
        setError('Insurance policies could not load. Try again.');
        return;
      }

      setInsurancePage(page);
      setTotalCount(page.count || 0);
      if (page.denied) {
        setError('Insurance access is not available for this role.');
      }
    } catch (fetchError) {
      if (!canUpdateRouteState()) return;
      setInsurancePage((previousPage) => ({
        ...previousPage,
        denied: false,
        failed: true,
        reason: 'query_failed',
        errorMessage: fetchError?.message,
      }));
      setError('Insurance policies could not load. Try again.');
    } finally {
      if (canUpdateRouteState()) {
        setLoading(false);
        setMobileLoadingMore(false);
      }
    }
  }, [
    filters,
    currentPage,
    isMobile,
    itemsPerPage,
    setTotalCount,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const fetchInsuranceBillingContext = useCallback(async () => {
    const requestId = billingFetchRequestRef.current + 1;
    billingFetchRequestRef.current = requestId;
    const canUpdateBillingState = () => (
      isMountedRef.current && billingFetchRequestRef.current === requestId
    );

    try {
      if (!canUpdateBillingState()) return;
      setInsuranceBillingContext((previousContext) => ({
        ...previousContext,
        loading: true,
        errorMessage: null,
      }));

      const billingResult = await getInsuranceBillingOutcomes({
        limit: 3,
        offset: 0,
        sortKey: 'created_at',
        sortDirection: 'desc',
        quiet: true,
      });

      if (!canUpdateBillingState()) return;
      if (billingResult.denied) {
        setInsuranceBillingContext({
          ...EMPTY_INSURANCE_BILLING_CONTEXT,
          loading: false,
          denied: true,
          reason: billingResult.reason || 'admin_only',
          errorMessage: 'Billing outcomes are unavailable for this role.',
          scope: billingResult.scope || 'admin_billing_outcome_projection',
        });
        return;
      }

      if (billingResult.failed) {
        setInsuranceBillingContext((previousContext) => ({
          ...previousContext,
          loading: false,
          denied: false,
          failed: true,
          reason: billingResult.reason || 'query_failed',
          errorMessage: 'Billing outcomes could not load.',
          scope: billingResult.scope
            || previousContext.scope
            || 'admin_billing_outcome_projection',
        }));
        return;
      }

      const outcomes = billingResult.data || [];
      setInsuranceBillingContext({
        outcomes,
        recentBilling: outcomes.slice(0, 3),
        stats: {
          ...EMPTY_INSURANCE_BILLING_STATS,
          ...(billingResult.stats || {}),
        },
        count: billingResult.count || outcomes.length,
        loading: false,
        denied: false,
        failed: false,
        reason: null,
        errorMessage: null,
        scope: billingResult.scope || 'admin_billing_outcome_projection',
      });
    } catch {
      if (!canUpdateBillingState()) return;
      setInsuranceBillingContext((previousContext) => ({
        ...previousContext,
        loading: false,
        denied: false,
        failed: true,
        reason: 'query_failed',
        errorMessage: 'Billing outcomes could not load.',
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
      billingFetchRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    resetPagination();
    setMobileLoadingMore(false);
  }, [filterKey, resetPagination]);

  useEffect(() => {
    fetchInsurancePage();
  }, [fetchInsurancePage]);

  useEffect(() => {
    fetchInsuranceBillingContext();
  }, [fetchInsuranceBillingContext]);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    let active = true;
    const unsubscribe = subscribeToInsurancePolicies(() => {
      if (active && isMountedRef.current) {
        fetchInsurancePage();
      }
    });

    return () => {
      active = false;
      fetchRequestRef.current += 1;
      unsubscribe();
    };
  }, [fetchInsurancePage, isAdmin]);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    let active = true;
    const unsubscribeBilling = subscribeToInsuranceBillingOutcomes(() => {
      if (active && isMountedRef.current) {
        fetchInsuranceBillingContext();
      }
    }, 'insurance_billing_route_context');

    return () => {
      active = false;
      billingFetchRequestRef.current += 1;
      unsubscribeBilling();
    };
  }, [fetchInsuranceBillingContext, isAdmin]);

  const handleMobileLoadMore = useCallback(() => {
    if (loading || !hasNextPage) return;
    setMobileLoadingMore(true);
    nextPage();
  }, [hasNextPage, loading, nextPage]);

  return {
    insurancePage,
    insuranceBillingContext,
    insurancePolicies: insurancePage.data || [],
    insuranceStats: insurancePage.stats || EMPTY_INSURANCE_PAGE.stats,
    loading,
    error,
    mobileLoadingMore,
    fetchInsurancePage,
    fetchInsuranceBillingContext,
    handleMobileLoadMore,
  };
};
