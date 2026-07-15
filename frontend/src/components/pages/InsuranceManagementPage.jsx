import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BarChart3, Filter, LockKeyhole } from 'lucide-react';
import {
  usePageFooter,
  usePageHeader,
  usePageShell,
} from '../../contexts/LayoutContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import { useRowSelection } from '../../hooks/useRowSelection';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { BulkActionBar } from '../common/BulkActionBar';
import { SEOHead } from '../common/SEOHead';
import { Button } from '../ui/button';
import { InsurancePageView } from './insurance/InsurancePageView';
import { useInsurancePageData } from './insurance/useInsurancePageData';
import { useInsuranceRouteBridge } from './insurance/useInsuranceRouteBridge';
import {
  buildInsurancePanelContext,
  buildVisibleInsuranceAnalytics,
  EMPTY_INSURANCE_FILTERS,
  hasActiveInsuranceFilters,
  resolveInsuranceRoleKind,
} from './insurance/insurancePageModel';

export const InsuranceManagementPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
  const { isPhone, isTablet, isMobile } = useNavigation();
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState(EMPTY_INSURANCE_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const pagination = usePagination(20);

  const hasActiveFilters = useMemo(
    () => hasActiveInsuranceFilters(filters),
    [filters]
  );
  const roleKind = useMemo(() => resolveInsuranceRoleKind({
    admin: isAdmin(),
    orgAdmin: isOrgAdmin(),
    provider: isProvider(),
    driver: isDriver(),
  }), [isAdmin, isDriver, isOrgAdmin, isProvider]);
  const moduleRailItems = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );
  const { routingPath, handleRailNavigate } = useWayfindingNav();
  const data = useInsurancePageData({
    filters,
    isMobile,
    pagination,
    sortConfig,
    isAdmin,
  });

  const paginatedPolicies = useMemo(
    () => data.insurancePolicies || [],
    [data.insurancePolicies]
  );
  const mobileVisiblePolicies = useMemo(
    () => data.insurancePolicies || [],
    [data.insurancePolicies]
  );

  // Selection is review state only. It never grants policy or billing write authority.
  const canSelectPolicies = isAdmin() && !data.insurancePage.denied;
  const visiblePolicyRows = isMobile ? mobileVisiblePolicies : paginatedPolicies;
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(visiblePolicyRows);

  useEffect(() => {
    if (!canSelectPolicies) clearSelection();
  }, [canSelectPolicies, clearSelection]);

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord(
    'insurance',
    paginatedPolicies
  );
  const focusedPolicy = focusedRecord;
  const hasDesktopRows = paginatedPolicies.length > 0;
  const hasMobileRows = mobileVisiblePolicies.length > 0;

  const insurancePanelContext = useMemo(() => buildInsurancePanelContext({
    policies: paginatedPolicies,
    focusedPolicy,
    stats: data.insuranceStats,
    page: data.insurancePage,
    pagination,
    filters,
    hasFilters: hasActiveFilters,
    sortConfig,
    loading: data.loading,
    billing: data.insuranceBillingContext,
    errorMessage: data.error,
  }), [
    data.error,
    data.insuranceBillingContext,
    data.insurancePage,
    data.insuranceStats,
    data.loading,
    filters,
    focusedPolicy,
    hasActiveFilters,
    paginatedPolicies,
    pagination,
    sortConfig,
  ]);

  useInsuranceRouteBridge({
    panelContext: insurancePanelContext,
    setFilterSheetOpen,
    setAnalyticsModalOpen,
    setSelectedPolicy,
    setModalMode,
  });

  const visibleAnalyticsPolicies = isMobile ? mobileVisiblePolicies : paginatedPolicies;
  const visibleInsuranceAnalytics = useMemo(() => buildVisibleInsuranceAnalytics({
    rows: visibleAnalyticsPolicies,
    stats: data.insuranceStats,
  }), [data.insuranceStats, visibleAnalyticsPolicies]);

  const handleView = useCallback((policy) => {
    if (policy?.id != null && !isFocused(policy.id)) setFocused(policy.id);
    setSelectedPolicy(policy);
    setModalMode('view');
  }, [isFocused, setFocused]);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);
  const handleOpenFilters = useCallback(() => {
    setFilterSheetOpen(true);
  }, []);
  const handleSort = useCallback((key) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'desc' ? 'asc' : 'desc',
    }));
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
      onClick={handleOpenFilters}
      data-state={filterSheetOpen ? 'open' : hasActiveFilters ? 'active' : 'idle'}
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
      className="relative h-9 w-9 rounded-icon bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter insurance policies"
    >
      <Filter className="h-4 w-4" />
      {hasActiveFilters && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [filterSheetOpen, handleOpenFilters, hasActiveFilters]);

  usePageHeader('Insurance', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const bulkActionBar = canSelectPolicies ? (
    <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title="Policy changes are unavailable"
        aria-label="Policy changes are unavailable"
        className="h-10 w-10 rounded-pill bg-foreground/[0.06] text-muted-foreground disabled:opacity-45 dark:bg-white/[0.06]"
      >
        <LockKeyhole className="h-5 w-5" />
      </Button>
    </BulkActionBar>
  ) : null;
  const seoHead = (
    <SEOHead
      title="Insurance"
      description="Review insurance policy evidence and claim outcomes."
    />
  );

  return (
    <InsurancePageView
      isPhone={isPhone}
      isTablet={isTablet}
      isMobile={isMobile}
      seoHead={seoHead}
      bulkActionBar={bulkActionBar}
      rows={{
        desktop: paginatedPolicies,
        mobile: mobileVisiblePolicies,
        hasDesktopRows,
        hasMobileRows,
      }}
      data={data}
      filters={filters}
      setFilters={setFilters}
      filterSheetOpen={filterSheetOpen}
      setFilterSheetOpen={setFilterSheetOpen}
      analyticsModalOpen={analyticsModalOpen}
      setAnalyticsModalOpen={setAnalyticsModalOpen}
      selectedPolicy={selectedPolicy}
      modalMode={modalMode}
      setModalMode={setModalMode}
      analytics={visibleInsuranceAnalytics}
      pagination={pagination}
      sortConfig={sortConfig}
      onSort={handleSort}
      onView={handleView}
      onOpenFilters={handleOpenFilters}
      onViewAnalytics={handleViewAnalytics}
      focusedPolicy={focusedPolicy}
      setFocused={setFocused}
      selection={{
        canSelectPolicies,
        selectedIds,
        handleSelectClick,
        handleToggleSelect,
        handleSelectAll,
        allSelected,
        someSelected,
      }}
      wayfinding={{ moduleRailItems, routingPath, handleRailNavigate }}
    />
  );
};
