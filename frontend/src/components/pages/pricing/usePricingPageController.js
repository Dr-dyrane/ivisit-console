import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { usePagination } from '../../../hooks/usePagination';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { getPricingPageData } from '../../../services/pricingService';
import {
  buildPricingAnalytics,
  buildPricingPageQuery,
  buildPricingRouteContext,
  createPricingDesktopFilters,
  EMPTY_PRICING_PROJECTION,
  EMPTY_PRICING_SUMMARY,
  getPricingRoleKind,
  normalizePricingProjection,
  PRICING_SCOPE_UNAVAILABLE_MESSAGE,
} from './pricingPageModel';

export const usePricingPageController = ({
  profile,
  admin,
  orgAdmin,
  provider,
  driver,
  isMobile,
}) => {
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const [pricingProjection, setPricingProjection] = useState(EMPTY_PRICING_PROJECTION);
  const pagination = usePagination(12);
  const {
    currentPage,
    hasNextPage,
    itemsPerPage,
    nextPage,
    resetPagination,
    setTotalCount,
  } = pagination;
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);

  const pricingSummary = pricingProjection.summary || EMPTY_PRICING_SUMMARY;
  const pricingTotalCount = pricingProjection.totalCount || 0;
  const canSelectPricing = admin || orgAdmin;
  const roleKind = useMemo(() => getPricingRoleKind({
    admin,
    orgAdmin,
    provider,
    driver,
  }), [admin, driver, orgAdmin, provider]);

  const pricingAnalytics = useMemo(() => buildPricingAnalytics({
    summary: pricingSummary,
    totalCount: pricingTotalCount,
  }), [pricingSummary, pricingTotalCount]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
    };
  }, []);

  const fetchPricing = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const canUpdateRouteState = () => (
      isMountedRef.current && fetchRequestRef.current === requestId
    );
    if (!canUpdateRouteState()) return;

    setLoading(true);
    setLoadError(null);
    try {
      const projection = normalizePricingProjection(await getPricingPageData(
        buildPricingPageQuery({
          activeTab,
          organizationId: orgAdmin ? profile?.organization_id || null : null,
          searchTerm,
          kpiFilter,
          sortDirection: sortConfig.direction,
          isMobile,
          currentPage,
          itemsPerPage,
        }),
      ));

      if (!canUpdateRouteState()) return;
      setPricing(projection.rows);
      setPricingProjection(projection);
      setTotalCount(projection.totalCount || 0);
    } catch (error) {
      if (!canUpdateRouteState()) return;
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load pricing data');
      setLoadError('Pricing rules could not load. Try again.');
    } finally {
      if (canUpdateRouteState()) {
        setLoading(false);
        setMobileLoadingMore(false);
      }
    }
  }, [
    activeTab,
    isMobile,
    kpiFilter,
    orgAdmin,
    currentPage,
    itemsPerPage,
    profile?.organization_id,
    searchTerm,
    setTotalCount,
    sortConfig.direction,
  ]);

  useEffect(() => {
    resetPagination();
    setMobileLoadingMore(false);
  }, [
    activeTab,
    kpiFilter,
    resetPagination,
    searchTerm,
  ]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const showPricingCommandUnavailable = useCallback(() => {
    setActionNotice(PRICING_SCOPE_UNAVAILABLE_MESSAGE);
    toast.info(PRICING_SCOPE_UNAVAILABLE_MESSAGE);
  }, []);

  const handleOpenPricingStats = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const filteredPricing = pricing;
  const paginatedPricing = pricing;
  const { focusedRecord: focusedPrice, setFocused } = useFocusedRecord(
    'pricing',
    pricing,
  );
  const selection = useRowSelection(paginatedPricing);
  const { clearSelection } = selection;

  useEffect(() => {
    clearSelection();
  }, [
    activeTab,
    kpiFilter,
    searchTerm,
    clearSelection,
    sortConfig.direction,
  ]);

  const handleMobileLoadMore = useCallback(() => {
    if (loading || !hasNextPage) return;
    setMobileLoadingMore(true);
    nextPage();
  }, [hasNextPage, loading, nextPage]);

  const hasPricingRows = paginatedPricing.length > 0;
  const initialLoading = loading && !hasPricingRows;
  const isFetching = loading && hasPricingRows;
  const mobileIsFetching = isFetching && !mobileLoadingMore;

  const desktopFilters = useMemo(() => createPricingDesktopFilters({
    searchTerm,
    activeTab,
    kpiFilter,
  }), [activeTab, kpiFilter, searchTerm]);

  const setDesktopFilters = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(desktopFilters) : updater;
    if (next.search !== searchTerm) setSearchTerm(next.search || '');
    if (next.family !== activeTab) setActiveTab(next.family || 'all');
    if (next.kpiFilter !== kpiFilter) setKpiFilter(next.kpiFilter || 'all');
  }, [activeTab, desktopFilters, kpiFilter, searchTerm]);

  const handleSort = useCallback((key) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const pricingRouteContext = useMemo(() => buildPricingRouteContext({
    pricing,
    focusedPrice,
    summary: pricingSummary,
    totalCount: pricingTotalCount,
    activeTab,
    kpiFilter,
    searchTerm,
    loading,
    loadError,
    projection: pricingProjection,
  }), [
    activeTab,
    focusedPrice,
    kpiFilter,
    loadError,
    loading,
    pricing,
    pricingProjection,
    pricingSummary,
    pricingTotalCount,
    searchTerm,
  ]);

  return {
    actionNotice,
    activeTab,
    analyticsModalOpen,
    canSelectPricing,
    desktopFilters,
    fetchPricing,
    filteredPricing,
    focusedPrice,
    handleMobileLoadMore,
    handleOpenPricingStats,
    handleSort,
    initialLoading,
    isFetching,
    kpiFilter,
    loadError,
    loading,
    mobileIsFetching,
    mobileLoadingMore,
    paginatedPricing,
    pagination,
    pricing,
    pricingAnalytics,
    pricingProjection,
    pricingRouteContext,
    pricingSummary,
    pricingTotalCount,
    roleKind,
    searchTerm,
    selection,
    setActiveTab,
    setAnalyticsModalOpen,
    setDesktopFilters,
    setFocused,
    setKpiFilter,
    setSearchTerm,
    showPricingCommandUnavailable,
    sortConfig,
  };
};
