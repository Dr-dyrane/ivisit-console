import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getInsuranceBillingOutcomes,
  getInsurancePage,
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
} from '../../services/insuranceService';
import { PaginationControls } from '../ui/PaginationControls';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { TableSkeleton } from '../ui/skeleton';
import { InsuranceModal } from '../modals/InsuranceModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { ViewToggle } from '../common/ViewToggle';
import { InsuranceListView } from '../views/InsuranceListView';
import { InsuranceTableView } from '../views/InsuranceTableView';
import { MobileInsurance } from '../mobile/MobileInsurance';
import { SEOHead } from '../common/SEOHead';
import {
  Shield,
  Filter as FilterIcon,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  AlertTriangle,
  X
} from 'lucide-react';
import { toast } from "sonner";
import { motion, LayoutGroup } from 'framer-motion';
import { Badge } from '../ui/badge';

const EMPTY_INSURANCE_PAGE = {
  data: [],
  count: 0,
  denied: false,
  failed: false,
  reason: null,
  stats: {
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    verified: 0,
    unverified: 0,
    expiringSoon: 0,
    exactCounts: true,
    scope: 'admin_policy_projection',
  },
};

const EMPTY_INSURANCE_BILLING_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
};

const EMPTY_INSURANCE_BILLING_CONTEXT = {
  outcomes: [],
  recentBilling: [],
  stats: EMPTY_INSURANCE_BILLING_STATS,
  count: 0,
  loading: true,
  denied: false,
  failed: false,
  reason: null,
  errorMessage: null,
  scope: 'admin_billing_outcome_projection',
};

const EMPTY_INSURANCE_FILTERS = Object.freeze({
  search: '',
  status: [],
  type: [],
  verified: '',
  created_at: { start: '', end: '' },
  kpiFilter: 'all',
});

const hasInsuranceFilterValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') {
    return Boolean(value.start || value.end);
  }
  return Boolean(value && value !== 'all');
};

const hasActiveInsuranceFilters = (filters = {}) => (
  Object.entries(filters).some(([key, value]) => key !== 'kpiFilter' && hasInsuranceFilterValue(value))
);

export const InsuranceManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [insurancePage, setInsurancePage] = useState(EMPTY_INSURANCE_PAGE);
  const [insuranceBillingContext, setInsuranceBillingContext] = useState(EMPTY_INSURANCE_BILLING_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [commandNotice, setCommandNotice] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Filter state - includes search
  const [filters, setFilters] = useState(EMPTY_INSURANCE_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const billingFetchRequestRef = useRef(0);

  const { viewMode, setViewMode } = useViewMode('insurance', 'grid');
  const pagination = usePagination(20);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const hasActiveFilters = useMemo(() => hasActiveInsuranceFilters(filters), [filters]);
  const insurancePolicies = insurancePage.data || [];
  const insuranceStats = insurancePage.stats || EMPTY_INSURANCE_PAGE.stats;

  const showPolicyCommandUnavailable = useCallback((action = 'Policy changes') => {
    const message = `${action} unavailable until admin authority is verified.`;
    setCommandNotice(message);
    toast.info(message);
  }, []);

  const fetchInsurancePage = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const canUpdateRouteState = () => isMountedRef.current && fetchRequestRef.current === requestId;

    try {
      if (!canUpdateRouteState()) return;
      setLoading(true);
      setError(null);
      const limit = isMobile
        ? pagination.currentPage * pagination.itemsPerPage
        : pagination.itemsPerPage;
      const offset = isMobile ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage;
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
        setInsurancePage(prevPage => ({
          ...prevPage,
          denied: false,
          failed: true,
          reason: page.reason || 'query_failed',
          errorMessage: page.errorMessage,
        }));
        setError('Insurance policies could not load. Try again.');
        return;
      }

      setInsurancePage(page);
      pagination.setTotalCount(page.count || 0);
      if (page.denied) {
        setError('Insurance access is not available for this role.');
      }
    } catch (err) {
      if (!canUpdateRouteState()) return;
      setInsurancePage(prevPage => ({
        ...prevPage,
        denied: false,
        failed: true,
        reason: 'query_failed',
        errorMessage: err?.message,
      }));
      setError('Insurance policies could not load. Try again.');
    } finally {
      if (canUpdateRouteState()) {
        setLoading(false);
      }
    }
  }, [
    filters,
    isMobile,
    pagination.currentPage,
    pagination.itemsPerPage,
    pagination.setTotalCount,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const fetchInsuranceBillingContext = useCallback(async () => {
    const requestId = billingFetchRequestRef.current + 1;
    billingFetchRequestRef.current = requestId;
    const canUpdateBillingState = () => isMountedRef.current && billingFetchRequestRef.current === requestId;

    try {
      if (!canUpdateBillingState()) return;
      setInsuranceBillingContext(prevContext => ({
        ...prevContext,
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
        setInsuranceBillingContext(prevContext => ({
          ...prevContext,
          loading: false,
          denied: false,
          failed: true,
          reason: billingResult.reason || 'query_failed',
          errorMessage: 'Billing outcomes could not load.',
          scope: billingResult.scope || prevContext.scope || 'admin_billing_outcome_projection',
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
      setInsuranceBillingContext(prevContext => ({
        ...prevContext,
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

  // Listen for 'openInsuranceModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      showPolicyCommandUnavailable('Add policy');
    };

    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };

    window.addEventListener('openInsuranceModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openInsuranceModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [showPolicyCommandUnavailable]);

  useEffect(() => {
    pagination.resetPagination();
  }, [filterKey, pagination.resetPagination]);

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

  // Filter Logic
  const filteredPolicies = useMemo(() => {
    return insurancePolicies;
  }, [insurancePolicies]);

  // Pagination Logic
  const paginatedPolicies = useMemo(() => {
    return filteredPolicies || [];
  }, [filteredPolicies]);

  const mobileVisiblePolicies = useMemo(() => {
    return filteredPolicies || [];
  }, [filteredPolicies]);

  const hasDesktopRows = paginatedPolicies.length > 0;
  const hasMobileRows = mobileVisiblePolicies.length > 0;

  const insurancePanelContext = useMemo(() => ({
    policies: paginatedPolicies,
    recentPolicies: paginatedPolicies.slice(0, 3),
    stats: insuranceStats,
    count: pagination.totalCount || insurancePage.count || paginatedPolicies.length,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    filters,
    hasFilters: hasActiveFilters,
    sortConfig,
    loading,
    billing: insuranceBillingContext,
    errorMessage: error,
    denied: insurancePage.denied,
    failed: insurancePage.failed,
    reason: insurancePage.reason,
    scope: insuranceStats.scope || 'admin_policy_projection',
    canManagePolicies: false,
  }), [
    error,
    filters,
    hasActiveFilters,
    insurancePage.count,
    insurancePage.denied,
    insurancePage.failed,
    insurancePage.reason,
    insuranceStats,
    insuranceBillingContext,
    loading,
    paginatedPolicies,
    pagination.currentPage,
    pagination.totalCount,
    pagination.totalPages,
    sortConfig,
  ]);

  const publishInsuranceRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('insuranceRouteContextUpdated', {
      detail: insurancePanelContext,
    }));
  }, [insurancePanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishInsuranceRouteContext();
    window.addEventListener('requestInsuranceRouteContext', publishInsuranceRouteContext);

    return () => {
      window.removeEventListener('requestInsuranceRouteContext', publishInsuranceRouteContext);
    };
  }, [publishInsuranceRouteContext]);

  const visibleAnalyticsPolicies = isMobile ? mobileVisiblePolicies : paginatedPolicies;
  const visibleInsuranceAnalytics = useMemo(() => {
    const rows = Array.isArray(visibleAnalyticsPolicies) ? visibleAnalyticsPolicies : [];
    const byProvider = rows.reduce((acc, policy) => {
      const label = policy.provider_name || 'Unknown provider';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const byCategory = rows.reduce((acc, policy) => {
      const label = policy.policy_type || policy.coverage_type || policy.plan_type || 'Unknown type';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return {
      total: insuranceStats.total,
      active: insuranceStats.active,
      verified: insuranceStats.verified,
      expired: insuranceStats.expired,
      expiringSoon: insuranceStats.expiringSoon,
      byProvider,
      byCategory,
      visibleCount: rows.length,
      distributionScope: 'visible_page',
      distributionLabel: 'Visible page only',
    };
  }, [
    insuranceStats.active,
    insuranceStats.expired,
    insuranceStats.expiringSoon,
    insuranceStats.total,
    insuranceStats.verified,
    visibleAnalyticsPolicies,
  ]);

  // Handlers
  const handlePolicyToolsUnavailable = useCallback(() => {
    showPolicyCommandUnavailable('Policy changes');
  }, [showPolicyCommandUnavailable]);

  const handlePolicyToolsPress = useCallback((event) => {
    event.preventDefault();
    handlePolicyToolsUnavailable();
  }, [handlePolicyToolsUnavailable]);

  const handleView = useCallback((policy) => {
    setSelectedPolicy(policy);
    setModalMode('view');
  }, []);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  // Header Configuration
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-info/10 hover:text-info relative"
      aria-label="Filter policies"
    >
      <FilterIcon className="h-4 w-4" />
      {hasActiveFilters && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-info" />
      )}
    </Button>
  ), [hasActiveFilters]);

  // Command authority is not proved yet, so the header advertises read-only state.
  const headerActions = React.useMemo(() => (
    isAdmin() && (
      <Button
        onPointerDown={handlePolicyToolsPress}
        onClick={handlePolicyToolsUnavailable}
        variant="ghost"
        className="glass-card-premium h-9 px-4 text-xs font-semibold"
        aria-label="Insurance is read-only until policy authority is verified"
      >
        <Shield className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">Read-only</span>
        <span className="md:hidden">Read</span>
      </Button>
    )
  ), [isAdmin, handlePolicyToolsUnavailable]);

  usePageHeader(
    'Insurance',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[11px] font-semibold text-muted-foreground">
        <span>Page {pagination.currentPage} of {pagination.totalPages} / {pagination.totalCount} policies</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && pagination.totalCount > 0);

  // Badge Logic
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success';
      case 'expired': return 'bg-destructive/20 text-destructive';
      case 'pending': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter Schema
  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search policies...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      key: 'type',
      type: 'multiselect',
      label: 'Policy type',
      options: [
        { value: 'Health', label: 'Health' },
        { value: 'Life', label: 'Life' },
        { value: 'Vehicle', label: 'Vehicle' },
        { value: 'Property', label: 'Property' }
      ]
    },
    {
      key: 'verified',
      type: 'select',
      label: 'Verification',
      options: [
        { value: 'all', label: 'All' },
        { value: 'verified', label: 'Verified only' },
        { value: 'unverified', label: 'Unverified only' }
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Policy date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 days', value: '7days' },
        { label: 'Last 30 days', value: '30days' },
        { label: 'This month', value: 'month' }
      ]
    }
  ], []);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Insurance" description="Review insurance policy evidence and claim outcomes." />

        {error && !loading && !hasMobileRows ? (
          <div className="px-4 pt-24 pb-8" data-testid="mobile-insurance-error-state">
            {commandNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-2xl bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
              >
                {commandNotice}
              </div>
            )}
            <Card className="squircle-lg glass-card-premium p-6 text-center">
              <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-bold text-lg mb-2">Insurance could not load</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchInsurancePage} variant="outline" className="squircle">
                Try again
              </Button>
            </Card>
          </div>
        ) : (
          <MobileInsurance
            policies={mobileVisiblePolicies}
            filters={filters}
            setFilters={setFilters}
            onView={handleView}
            onRefresh={fetchInsurancePage}
            loading={loading}
            error={error}
            onRetry={fetchInsurancePage}
            stats={insuranceStats}
            onOpenFilters={() => setFilterSheetOpen(true)}
            onViewAnalytics={handleViewAnalytics}
            hasMore={pagination.hasNextPage}
            onLoadMore={pagination.nextPage}
          />
        )}

        <InsuranceModal
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          policy={selectedPolicy}
          mode={modalMode}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="insurance"
          analytics={visibleInsuranceAnalytics}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          resetValues={EMPTY_INSURANCE_FILTERS}
          resetLabel="Clear"
          viewToggle={null}
          isMobile={true}
        />

      </div>
    );
  }


  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="Insurance" description="Review insurance policy evidence and claim outcomes." />

      {/* Bento Overview Cards - Enhanced with Filtering */}
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
        >
          {/* Total Policies Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'all' ? 'ring-2 ring-info shadow-lg' : ''
                }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Shield className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Total policies</p>
                  {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insuranceStats.total}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-sharp bg-info/20 text-info border-0 font-semibold text-xs">
                    {filters.kpiFilter === 'all' ? 'Filtered' : 'View all'}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Active Policies Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'active' ? 'ring-2 ring-success shadow-lg' : ''
                }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'active' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-success" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'active' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <CheckCircle className={`h-5 w-5 ${filters.kpiFilter === 'active' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Active</p>
                  {filters.kpiFilter === 'active' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insuranceStats.active}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-success/20 text-success border-0 font-semibold text-xs">
                    {Math.round((insuranceStats.active / (insuranceStats.total || 1)) * 100) || 0}%
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Pending Verification Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card
              className={`h-full min-h-[140px] squircle-3xl glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'pending' ? 'ring-2 ring-warning shadow-lg' : ''
                }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'pending' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-warning" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'pending' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Clock className={`h-5 w-5 ${filters.kpiFilter === 'pending' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Pending</p>
                  {filters.kpiFilter === 'pending' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insuranceStats.pending}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-semibold text-xs">
                    Waiting
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Expired Policies Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'expired' ? 'ring-2 ring-destructive shadow-lg' : ''
                }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'expired' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-destructive" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'expired' ? 'bg-destructive/30' : 'bg-destructive/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <AlertTriangle className={`h-5 w-5 ${filters.kpiFilter === 'expired' ? 'text-destructive' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Expired</p>
                  {filters.kpiFilter === 'expired' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insuranceStats.expired}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-ticket bg-destructive/20 text-destructive border-0 font-semibold text-xs">
                    Expired
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Unverified Policies Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-wave glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'unverified' ? 'ring-2 ring-info shadow-lg' : ''
                }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'unverified' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'unverified' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Shield className={`h-5 w-5 ${filters.kpiFilter === 'unverified' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Unverified</p>
                  {filters.kpiFilter === 'unverified' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insuranceStats.unverified}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-wave bg-info/20 text-info border-0 font-semibold text-xs">
                    Unverified
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

      </LayoutGroup>

      {commandNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-2xl bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          {commandNotice}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error && !hasDesktopRows ? (
        <Card className="squircle-lg glass-card-premium p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">Insurance could not load</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {error}
          </p>
          <Button onClick={fetchInsurancePage} variant="outline" className="squircle">
            Try again
          </Button>
        </Card>
      ) : filteredPolicies.length === 0 ? (
        <Card className="squircle-lg glass-card-premium p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">
            {filters.search ? 'No policies found' :
              filters.kpiFilter === 'all' && !hasActiveFilters ? 'No policies yet' :
                'No matching policies'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filters.search ? `No policies found matching "${filters.search}". Try adjusting your search terms.` :
              filters.kpiFilter === 'all' && !hasActiveFilters ?
                'No policy records are available for this scope yet.' :
                'Try adjusting your filters or search criteria to find the policies you\'re looking for.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {filters.search && (
              <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="squircle">
                <X className="h-4 w-4 mr-2" />
                Clear search
              </Button>
            )}
            {(filters.kpiFilter !== 'all' || hasActiveFilters) && (
              <Button onClick={() => setFilters(EMPTY_INSURANCE_FILTERS)} variant="outline" className="squircle">
                <FilterIcon className="h-4 w-4 mr-2" />
                Reset filters
              </Button>
            )}
            <Button onClick={handlePolicyToolsUnavailable} variant="outline" className="squircle">
              <Shield className="h-4 w-4 mr-2" />
              Read-only
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {error && (
            <Card
              className="mb-4 squircle-lg glass-card-premium p-4"
              data-testid="insurance-degraded-state"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-warning/10 p-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Insurance did not refresh</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Showing the last loaded policy rows until the route read works again.
                    </p>
                  </div>
                </div>
                <Button onClick={fetchInsurancePage} variant="outline" className="squircle">
                  Try again
                </Button>
              </div>
            </Card>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
              >
                {paginatedPolicies.map((policy, index) => (
                  <motion.div
                    layout
                    key={policy.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="col-span-1"
                  >
                    <Card className="h-full squircle-xl glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col">
                      {/* Apple hover glow effect */}
                      <div className={`hover-glow ${policy.status === 'expired' ? 'hover-glow-destructive' : 'hover-glow-info'}`} />
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className={`absolute inset-0 ${policy.status === 'expired' ? 'bg-destructive/20' : 'bg-info/10'} blur-xl rounded-full scale-150`} />
                          <div className="w-10 h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Shield className={`h-5 w-5 ${policy.status === 'expired' ? 'text-destructive' : 'text-info'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-sharp ${getStatusBadge(policy.status)} border-0 font-bold editorial-subtitle px-3 py-1`}>
                          {policy.status}
                        </Badge>
                        {policy.verified && (
                          <Badge variant="outline" className="geo-sharp border-success/20 text-success px-2 py-1 font-semibold gap-1">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 tracking-tight relative z-10">
                        {policy.policy_holder_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 font-mono tracking-tight">{policy.policy_number}</p>

                      <div className="space-y-3 mb-6 relative z-10 flex-1">
                        <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 text-info" />
                            <span className="font-normal">Coverage</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            ${policy.coverage_amount?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-warning" />
                            <span className="font-normal">Expires</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Review
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleView(policy)}
                            className="geo-round h-8 px-3 text-xs font-semibold hover:bg-info/10 hover:text-info"
                            aria-label={`View details for ${policy.policy_holder_name}`}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="ml-2">Details</span>
                          </Button>
                        </div>
                      </div>

                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <InsuranceListView
              policies={paginatedPolicies}
              onView={handleView}
              onDelete={null}
              onVerify={null}
              canDelete={false}
              canVerify={false}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <InsuranceTableView
              policies={paginatedPolicies}
              onView={handleView}
              onDelete={null}
              onVerify={null}
              canDelete={false}
              canVerify={false}
              selectionEnabled={false}
              getStatusBadge={getStatusBadge}
            />
          )}
        </>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
        loading={loading}
      />

      {/* Modals */}
      <InsuranceModal
        isOpen={!!modalMode}
        onClose={() => setModalMode(null)}
        policy={selectedPolicy}
        mode={modalMode}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="insurance"
        analytics={visibleInsuranceAnalytics}
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        resetValues={EMPTY_INSURANCE_FILTERS}
        resetLabel="Clear"
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

    </div>
  );
};
