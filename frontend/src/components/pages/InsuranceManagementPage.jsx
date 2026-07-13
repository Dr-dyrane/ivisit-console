import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePagination } from '../../hooks/usePagination';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { InsuranceDesktopWorkspace } from './insurance/InsuranceDesktopWorkspace';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getInsuranceBillingOutcomes,
  getInsurancePage,
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
} from '../../services/insuranceService';
import { InsuranceModal } from '../modals/InsuranceModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { MobileInsurance } from '../mobile/MobileInsurance';
import { SEOHead } from '../common/SEOHead';
import { Button } from '../ui/button';
import { BarChart3, Filter } from 'lucide-react';

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
  type: '',
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
  const { isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
  const { isMobile } = useNavigation();
  const [insurancePage, setInsurancePage] = useState(EMPTY_INSURANCE_PAGE);
  const [insuranceBillingContext, setInsuranceBillingContext] = useState(EMPTY_INSURANCE_BILLING_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [modalMode, setModalMode] = useState(null); // read-only 'view'
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Filter state - includes search
  const [filters, setFilters] = useState(EMPTY_INSURANCE_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const billingFetchRequestRef = useRef(0);

  const pagination = usePagination(20);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const hasActiveFilters = useMemo(() => hasActiveInsuranceFilters(filters), [filters]);
  const insurancePolicies = insurancePage.data || [];
  const insuranceStats = insurancePage.stats || EMPTY_INSURANCE_PAGE.stats;
  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isProvider()) return isDriver() ? 'driver' : 'provider';
    return 'viewer';
  }, [isAdmin, isOrgAdmin, isProvider, isDriver]);
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
  const { routingPath, handleRailNavigate } = useWayfindingNav();

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
        setMobileLoadingMore(false);
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

  useEffect(() => {
    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };
    const handleOpenFocusedRecord = (event) => {
      if (!event.detail) return;
      setSelectedPolicy(event.detail);
      setModalMode('view');
    };

    window.addEventListener('openInsuranceFilters', handleOpenFilters);
    window.addEventListener('openInsuranceAnalytics', handleOpenAnalytics);
    window.addEventListener('openFocusedInsuranceRecord', handleOpenFocusedRecord);

    return () => {
      window.removeEventListener('openInsuranceFilters', handleOpenFilters);
      window.removeEventListener('openInsuranceAnalytics', handleOpenAnalytics);
      window.removeEventListener('openFocusedInsuranceRecord', handleOpenFocusedRecord);
    };
  }, []);

  useEffect(() => {
    pagination.resetPagination();
    setMobileLoadingMore(false);
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

  // Shared focused-record store: explicit selection OR the most-urgent policy at rest.
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('insurance', paginatedPolicies);
  const focusedPolicy = focusedRecord;

  const hasDesktopRows = paginatedPolicies.length > 0;
  const hasMobileRows = mobileVisiblePolicies.length > 0;

  const insurancePanelContext = useMemo(() => ({
    policies: paginatedPolicies,
    recentPolicies: paginatedPolicies.slice(0, 3),
    focusedPolicy,
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
    focusedPolicy,
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
      pending: insuranceStats.pending,
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
    insuranceStats.pending,
    insuranceStats.total,
    insuranceStats.verified,
    visibleAnalyticsPolicies,
  ]);

  // Handlers
  const handleView = useCallback((policy) => {
    if (policy?.id != null && !isFocused(policy.id)) setFocused(policy.id);
    setSelectedPolicy(policy);
    setModalMode('view');
  }, [isFocused, setFocused]);

  const handleMobileLoadMore = useCallback(() => {
    if (loading || !pagination.hasNextPage) return;
    setMobileLoadingMore(true);
    pagination.nextPage();
  }, [loading, pagination.hasNextPage, pagination.nextPage]);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const headerActions = useMemo(() => (
    <Button
      onClick={handleViewAnalytics}
      data-state={analyticsModalOpen ? 'open' : 'idle'}
      aria-label="Policy stats"
      aria-haspopup="dialog"
      aria-expanded={analyticsModalOpen}
      className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
    >
      <BarChart3 className="mr-2 h-4 w-4" />
      Policy stats
    </Button>
  ), [analyticsModalOpen, handleViewAnalytics]);

  const filterButtonComponent = useMemo(() => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      data-state={filterSheetOpen ? 'open' : hasActiveFilters ? 'active' : 'idle'}
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
      className="relative h-9 w-9 rounded-icon bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter insurance policies"
    >
      <Filter className="h-4 w-4" />
      {hasActiveFilters && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasActiveFilters]);

  usePageHeader('Insurance', headerActions, null, filterButtonComponent);

  usePageFooter(null, 'status', false);

  usePageShell({ bleed: true, hideFab: true });

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
        { value: 'pending', label: 'Pending' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'type',
      type: 'text',
      label: 'Plan type',
      placeholder: 'Basic, Gold, PPO...'
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

        <MobileInsurance
          policies={mobileVisiblePolicies}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onRefresh={fetchInsurancePage}
          loading={loading && !hasMobileRows}
          isFetching={loading && hasMobileRows && !mobileLoadingMore}
          error={error}
          onRetry={fetchInsurancePage}
          stats={insuranceStats}
          count={insurancePage.count}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={handleViewAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={handleMobileLoadMore}
          isLoadingMore={mobileLoadingMore}
        />

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
    <>
      <SEOHead title="Insurance" description="Review insurance policy evidence and claim outcomes." />
      <InsuranceDesktopWorkspace
        rows={paginatedPolicies}
        stats={insuranceStats}
        denied={insurancePage.denied}
        loading={loading && !hasDesktopRows}
        isFetching={loading && hasDesktopRows}
        error={error}
        filters={filters}
        setFilters={setFilters}
        filterSheetOpen={filterSheetOpen}
        openFilters={() => setFilterSheetOpen(true)}
        retry={fetchInsurancePage}
        clearFilters={() => setFilters(EMPTY_INSURANCE_FILTERS)}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={(key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }))}
        focusedPolicy={focusedPolicy}
        setFocused={setFocused}
        onView={handleView}
        moduleRailItems={moduleRailItems}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />
      <InsuranceModal isOpen={!!modalMode} onClose={() => setModalMode(null)} policy={selectedPolicy} mode={modalMode} />
      <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} type="insurance" analytics={visibleInsuranceAnalytics} />
      <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={setFilters} initialValues={filters} resetValues={EMPTY_INSURANCE_FILTERS} resetLabel="Clear" viewToggle={null} isMobile={false} />
    </>
  );


};
