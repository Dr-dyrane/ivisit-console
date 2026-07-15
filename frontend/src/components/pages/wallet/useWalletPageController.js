import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { buildLoadedLedgerCsv, getWalletPageData } from '../../../services/walletService';
import {
  buildLoadedPaymentAnalytics,
  createWalletFilters,
  createWalletPageDataState,
  formatCurrency as formatCurrencyValue,
  getWalletActivityLoadError,
  getPaymentDescription,
  getPaymentMethod,
  getWalletFilterSchema,
  preserveWalletPageDataAfterFailure,
  reconcileWalletPageData,
} from './walletPageModel';

export const useWalletPageController = ({ profile, isAdmin, isOrgAdmin, isMobile }) => {
  const [pageData, setPageData] = useState(createWalletPageDataState);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeTab, setActiveTab] = useState('ledger');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersByTab, setFiltersByTab] = useState(createWalletFilters);
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const [mobileLimit, setMobileLimit] = useState(20);
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
    };
  }, []);

  const fetchData = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const canUpdateRouteState = () => isMountedRef.current && fetchRequestRef.current === requestId;
    if (!canUpdateRouteState()) return;

    if (hasLoadedRef.current) {
      setIsFetching(true);
    } else {
      setLoading(true);
    }
    setLoadError('');

    try {
      const data = await getWalletPageData({
        profile,
        isAdmin,
        isOrgAdmin,
        limit: isMobile ? mobileLimit : 50,
      });

      if (!canUpdateRouteState()) return;
      setPageData((current) => reconcileWalletPageData(current, data));
      setLoadError(getWalletActivityLoadError(data.readState));
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (error) {
      if (!canUpdateRouteState()) return;
      void error;
      setPageData((current) => preserveWalletPageDataAfterFailure(current));
      setLoadError('Payments could not load. Please try again.');
      toast.error('Payments could not load. Please try again.');
    } finally {
      if (canUpdateRouteState()) {
        setLoading(false);
        setIsFetching(false);
        setMobileLoadingMore(false);
      }
    }
  }, [isAdmin, isMobile, isOrgAdmin, mobileLimit, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = useCallback((amount, currency = pageData.wallet?.currency || 'USD') => (
    formatCurrencyValue(amount, currency || pageData.wallet?.currency || 'USD')
  ), [pageData.wallet?.currency]);

  const handleExport = useCallback(() => {
    if (!pageData.ledger.length) {
      toast.info('No loaded transactions to export.');
      return;
    }

    const csvContent = buildLoadedLedgerCsv({
      ledger: pageData.ledger,
      currency: pageData.wallet?.currency,
    });
    const objectUrl = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.setAttribute('href', objectUrl);
    link.setAttribute('download', `ivisit_loaded_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    toast.success(`${pageData.ledger.length} loaded transaction${pageData.ledger.length === 1 ? '' : 's'} exported.`);
  }, [pageData.ledger, pageData.wallet?.currency]);

  useEffect(() => {
    const handleExportEvent = () => handleExport();
    const handlePaymentsDataChanged = () => fetchData();
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
    window.addEventListener('exportLedger', handleExportEvent);
    window.addEventListener('paymentsDataChanged', handlePaymentsDataChanged);
    window.addEventListener('openWalletAnalytics', handleOpenAnalytics);
    return () => {
      window.removeEventListener('exportLedger', handleExportEvent);
      window.removeEventListener('paymentsDataChanged', handlePaymentsDataChanged);
      window.removeEventListener('openWalletAnalytics', handleOpenAnalytics);
    };
  }, [fetchData, handleExport]);

  const walletPanelContext = useMemo(() => ({
    wallet: pageData.wallet,
    ledger: pageData.ledger.slice(0, 4),
    payments: pageData.payments.slice(0, 4),
    paymentMethods: pageData.paymentMethods,
    readState: pageData.readState,
    hasMore: pageData.hasMore,
    financeMetrics: pageData.financeMetrics,
    financeMetricsStale: pageData.financeMetricsStale,
    counts: {
      ledger: pageData.ledger.length,
      payments: pageData.payments.length,
      cards: pageData.paymentMethods.length,
    },
    loading,
    isFetching,
    loadError,
    hasLoaded,
    activeTab,
    roleLabel: isAdmin ? 'Platform admin' : 'Hospital admin',
    canManage: isAdmin || isOrgAdmin,
  }), [
    activeTab,
    hasLoaded,
    isAdmin,
    isFetching,
    isOrgAdmin,
    loadError,
    loading,
    pageData,
  ]);

  const publishWalletRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('walletRouteContextUpdated', {
      detail: walletPanelContext,
    }));
  }, [walletPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishWalletRouteContext();
    window.addEventListener('requestWalletRouteContext', publishWalletRouteContext);
    return () => {
      window.removeEventListener('requestWalletRouteContext', publishWalletRouteContext);
    };
  }, [publishWalletRouteContext]);

  const handleMobileLoadMore = useCallback(() => {
    if (loading || isFetching || mobileLoadingMore || !pageData.hasMore[activeTab]) return;
    setMobileLoadingMore(true);
    setMobileLimit((current) => current + 20);
  }, [activeTab, isFetching, loading, mobileLoadingMore, pageData.hasMore]);

  const activeFilters = filtersByTab[activeTab];
  const filterSchema = useMemo(() => getWalletFilterSchema(activeTab), [activeTab]);
  const applyFilters = useCallback((nextFilters) => {
    setFiltersByTab((current) => ({ ...current, [activeTab]: nextFilters }));
  }, [activeTab]);
  const clearFilters = useCallback(() => {
    setFiltersByTab((current) => ({
      ...current,
      [activeTab]: createWalletFilters()[activeTab],
    }));
  }, [activeTab]);

  const loadedAnalytics = useMemo(() => buildLoadedPaymentAnalytics({
    ledger: pageData.ledger,
    payments: pageData.payments,
  }), [pageData.ledger, pageData.payments]);

  return {
    ...pageData,
    loading,
    hasLoaded,
    isFetching,
    loadError,
    selectedPayment,
    setSelectedPayment,
    activeTab,
    setActiveTab,
    analyticsModalOpen,
    setAnalyticsModalOpen,
    filterSheetOpen,
    setFilterSheetOpen,
    search,
    setSearch,
    activeFilters,
    filterSchema,
    applyFilters,
    clearFilters,
    loadingMore: mobileLoadingMore,
    handleLoadMore: handleMobileLoadMore,
    mobileLoadingMore,
    handleMobileLoadMore,
    fetchData,
    loadedAnalytics,
    formatCurrency,
    formatPaymentMethod: getPaymentMethod,
    formatPaymentDescription: getPaymentDescription,
  };
};
