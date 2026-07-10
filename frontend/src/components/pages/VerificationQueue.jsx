import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getVerificationQueue, verifyProvider, subscribeToVerificationQueue } from '../../services/verificationService';
import { getOrgVerificationQueue, verifyOrganization, subscribeToOrgVerificationQueue } from '../../services/orgVerificationService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { VerificationModal } from '../modals/VerificationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { BulkActionBar } from '../common/BulkActionBar';
import {
  CheckCircle,
  FileText,
  User,
  Phone,
  FileCheck,
  Search,
  Filter as FilterIcon,
  Clock,
  Shield,
  AlertTriangle,
  ChevronRight,
  MoreHorizontal,
  Ban,
  Mail,
  MapPin,
  Eye,
  Info
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { PaginationControls } from '../ui/PaginationControls';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { VerificationQueueListView } from '../views/VerificationQueueListView';
import { VerificationQueueTableView } from '../views/VerificationQueueTableView';
import { MobileVerification } from '../mobile/MobileVerification';

/**
 * Approvals Page
 * 
 * Status: route-owned read surface with admin-only approval commands.
 */

const isTransientVerificationRefreshError = (error) => {
  const message = String(error?.message || error || '');
  return /failed to fetch|network|aborted|abort/i.test(message);
};

const quietTabPanelStyle = {
  outline: 'none',
  '--tw-ring-shadow': '0 0 #0000',
  '--tw-ring-offset-shadow': '0 0 #0000'
};

export const VerificationQueue = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedProvider, setSelectedProvider] = useState(null);
  // Right-side detail rail focus (a provider or facility record). Distinct from
  // selectedProvider, which drives the full-detail modal. Reset on queue switch.
  const [focusedItem, setFocusedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter state matching Insurance/Subscription pattern
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  // ?type=driver scopes the providers queue to a provider_type (data-sync-guided:
  // the Ambulances FAB is about the FLEET, so "Driver approvals" must show DRIVERS,
  // not every provider — the queue is role='provider' with no type filter otherwise).
  const providerTypeFilter = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('type')
    : null;
  // Track which queue we're viewing. ?queue=organizations preselects the
  // facilities tab (receiver for the Hospitals FAB, arbitration 2026-07-09).
  const [queueType, setQueueType] = useState(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('queue') === 'organizations'
      ? 'organizations'
      : 'providers'
  )); // 'providers' | 'organizations'
  const [organizations, setOrganizations] = useState([]);
  const [orgStats, setOrgStats] = useState({ pending: 0, verified: 0, rejected: 0, total: 0 });
  const providerRequestSeqRef = useRef(0);
  const facilityRequestSeqRef = useRef(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    itemsPerPage: 12
  });
  const { viewMode, setViewMode } = useViewMode('verification-queue-page', 'grid');
  const canApprove = isAdmin();
  const canReview = canApprove || isOrgAdmin();
  const activeItems = queueType === 'providers' ? providers : organizations;

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
    setLoading(true);
    try {
      const result = await getVerificationQueue({
        status: filters.status,
        search: filters.search,
        providerType: providerTypeFilter || undefined,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        quiet: true
      });

      if (requestSeq !== providerRequestSeqRef.current) return;
      setProviders(result.data);
      setStats(result.stats);
      setPagination(prev => ({
        ...prev,
        totalCount: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (error) {
      if (requestSeq !== providerRequestSeqRef.current || isTransientVerificationRefreshError(error)) return;
      handleApiError(error, 'fetch');
    } finally {
      if (requestSeq === providerRequestSeqRef.current) setLoading(false);
    }
  }, [filters.status, filters.search, pagination.currentPage, pagination.itemsPerPage, canReview]);

  // Fetch facility verification queue.
  const fetchOrgVerificationData = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    const requestSeq = facilityRequestSeqRef.current + 1;
    facilityRequestSeqRef.current = requestSeq;
    setLoading(true);
    try {
      const status = filters.status === 'approved' ? 'verified' : filters.status;
      const result = await getOrgVerificationQueue({
        status,
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        quiet: true
      });

      if (requestSeq !== facilityRequestSeqRef.current) return;
      setOrganizations(result.data);
      setOrgStats(result.stats);
      setPagination(prev => ({
        ...prev,
        totalCount: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (error) {
      if (requestSeq !== facilityRequestSeqRef.current || isTransientVerificationRefreshError(error)) return;
      handleApiError(error, 'fetch');
    } finally {
      if (requestSeq === facilityRequestSeqRef.current) setLoading(false);
    }
  }, [filters.status, filters.search, pagination.currentPage, pagination.itemsPerPage, canReview]);

  // Handle facility verification.
  const handleVerifyOrg = async (hospitalId, approved) => {
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
  };

  useEffect(() => {
    // Fetch based on current queue type
    if (queueType === 'providers') {
      fetchVerificationData();
    } else {
      fetchOrgVerificationData();
    }

    // Real-time subscriptions stay scoped to the active lane.
    let unsubscribeProviders;
    let unsubscribeOrgs;
    if (canReview && queueType === 'providers') {
      unsubscribeProviders = subscribeToVerificationQueue(fetchVerificationData);
    }
    if (canReview && queueType === 'organizations') {
      unsubscribeOrgs = subscribeToOrgVerificationQueue(() => fetchOrgVerificationData());
    }

    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);

    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      if (unsubscribeProviders) unsubscribeProviders();
      if (unsubscribeOrgs) unsubscribeOrgs();
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [fetchVerificationData, fetchOrgVerificationData, canReview, queueType]);

  // Header Configuration
  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-amber-400/10 hover:text-amber-700 dark:hover:text-amber-200 relative"
      aria-label="Filter approvals"
    >
      <FilterIcon className="h-4 w-4" />
      {(filters.search || filters.status !== 'all' || filters.created_at) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-amber-300" />
      )}
    </Button>
  ), [filters]);

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setSelectedIds([]);
    setFocusedItem(null);
  }, [queueType]);

  const viewToggleComponent = useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} tone="review" />
  ), [viewMode, setViewMode]);

  usePageHeader("Approvals", null, !isMobile ? viewToggleComponent : null, filterButtonComponent);

  usePageFooter(null, 'status', false);

  const handleVerify = async (providerId, approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return false;
    }

    setActionLoading(true);
    try {
      await verifyProvider(providerId, approved);
      toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
      setSelectedProvider(null);
      await fetchVerificationData();
      return true;
    } catch (error) {
      handleApiError(error, 'update');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkVerify = async (approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return;
    }

    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setActionLoading(true);
    let failed = 0;
    for (const id of ids) {
      try {
        await verifyProvider(id, approved);
      } catch (error) {
        failed += 1;
      }
    }

    setSelectedIds([]);
    await fetchVerificationData();
    setActionLoading(false);

    if (failed > 0) {
      toast.error(`${failed} ${approved ? 'approval' : 'rejection'}${failed === 1 ? '' : 's'} failed`);
    } else {
      toast.success(`${ids.length} provider${ids.length === 1 ? '' : 's'} ${approved ? 'approved' : 'rejected'}`);
    }
  };

  const handleSelect = useCallback((id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    const activeItems = queueType === 'providers' ? providers : organizations;
    if (checked) {
      setSelectedIds(activeItems.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  }, [queueType, providers, organizations]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return 'bg-emerald-500/15 text-emerald-300';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      case 'pending':
      default:
        return 'bg-amber-400/15 text-amber-200';
    }
  };

  // Desktop right panel — publish live route context so ContextPanel/VerificationPanel
  // render this page's real data (canon pattern shared by Staff/Visits/etc.), instead of
  // reading stale PageData. Org stats use `verified`; normalize to the panel's shape.
  const verificationPanelContext = useMemo(() => {
    const activeStats = queueType === 'providers'
      ? stats
      : { pending: orgStats.pending, approved: orgStats.verified, rejected: orgStats.rejected, total: orgStats.total };
    const items = queueType === 'providers' ? providers : organizations;
    return {
      queueType,
      stats: activeStats,
      count: items.length,
      recent: items.slice(0, 4),
      selected: focusedItem,
      canApprove,
      loading,
    };
  }, [queueType, stats, orgStats, providers, organizations, focusedItem, canApprove, loading]);

  const publishVerificationRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('verificationRouteContextUpdated', { detail: verificationPanelContext }));
  }, [verificationPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishVerificationRouteContext();
    window.addEventListener('requestVerificationRouteContext', publishVerificationRouteContext);
    return () => window.removeEventListener('requestVerificationRouteContext', publishVerificationRouteContext);
  }, [publishVerificationRouteContext]);

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Lookup applicant...',
    },
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Applications' },
        { value: 'pending', label: 'Pending Review' },
        { value: 'approved', label: 'Approved' },
        // 'Rejected' is FACILITY-ONLY (2026-07-10): providers have no rejected state,
        // so the filter returned pending rows (a lie). Offered only for the org lane.
        ...(queueType === 'providers' ? [] : [{ value: 'rejected', label: 'Rejected' }]),
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Application Date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], []);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />

        <MobileVerification
          queueType={queueType}
          setQueueType={setQueueType}
          providers={providers}
          organizations={organizations}
          loading={loading}
          stats={stats}
          orgStats={orgStats}
          filters={filters}
          setFilters={(updater) => {
            setFilters(prev => (typeof updater === 'function' ? updater(prev) : updater));
            setPagination(prev => ({ ...prev, currentPage: 1 }));
          }}
          onViewProvider={setSelectedProvider}
          onVerifyProvider={canApprove ? handleVerify : null}
          onVerifyOrganization={canApprove ? handleVerifyOrg : null}
          canApprove={canApprove}
          onRefresh={queueType === 'providers' ? fetchVerificationData : fetchOrgVerificationData}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          selectedIds={selectedIds}
          onSelect={canApprove ? handleSelect : null}
          onSelectAll={canApprove ? handleSelectAll : null}
        />

        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrevPage={() => setPagination(prev => ({ ...prev, currentPage: Math.max(prev.currentPage - 1, 1) }))}
          onNextPage={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.currentPage + 1, prev.totalPages || prev.currentPage + 1) }))}
          hasPrevPage={pagination.currentPage > 1}
          hasNextPage={pagination.currentPage < pagination.totalPages}
          loading={loading}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          initialValues={filters}
          onApply={handleApplyFilters}
          filterSchema={filterSchema}
          viewToggle={null}
          isMobile={true}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={queueType === 'providers' ? stats : orgStats}
          type="verification"
        />

        <VerificationModal
          isOpen={!!selectedProvider}
          provider={selectedProvider}
          mode="view"
          onClose={() => setSelectedProvider(null)}
          onVerify={canApprove ? handleVerify : null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />

      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
        <section className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:self-stretch">
      <Tabs defaultValue="providers" onValueChange={setQueueType} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="rounded-inner bg-muted/30 p-1">
            <TabsTrigger
              value="providers"
              aria-label="Show provider approvals"
              data-testid="approval-tab-providers"
              className="px-6 py-2 rounded-button data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-200 data-[state=active]:shadow-[0_10px_28px_rgba(251,191,36,0.14)] transition-all active:scale-[0.96]"
            >
              Providers
            </TabsTrigger>
            <TabsTrigger
              value="organizations"
              aria-label="Show facility approvals"
              data-testid="approval-tab-facilities"
              className="px-6 py-2 rounded-button data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-200 data-[state=active]:shadow-[0_10px_28px_rgba(251,191,36,0.14)] transition-all active:scale-[0.96]"
            >
              Facilities
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Bento Overview Cards - responsive status filtering */}
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
          >
            {/* Pending Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <button
                type="button"
                aria-label="Show applications needing review"
                data-testid="approval-status-needs-review"
                className={`h-full min-h-[140px] w-full text-left rounded-card bg-muted/22 shadow-sm p-6 active:scale-[0.98] cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'pending' ? 'bg-amber-400/10 shadow-[0_18px_55px_rgba(251,191,36,0.18)] scale-[1.01]' : 'hover:bg-muted/34'
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Clock className={`h-5 w-5 ${filters.status === 'pending' ? 'text-amber-300' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground">Needs Review</p>
                    {filters.status === 'pending' && <div className="h-2 w-2 rounded-pill bg-amber-300" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.pending : orgStats.pending}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="rounded-pill bg-amber-400/15 text-amber-200 font-bold text-xs">
                      Review
                    </Badge>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Approved Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <button
                type="button"
                aria-label={queueType === 'providers' ? 'Show approved providers' : 'Show approved facilities'}
                data-testid="approval-status-approved"
                className={`h-full min-h-[140px] w-full text-left rounded-card bg-muted/22 shadow-sm p-6 active:scale-[0.98] cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'approved' ? 'bg-emerald-500/10 shadow-[0_18px_55px_rgba(52,211,153,0.18)] scale-[1.01]' : 'hover:bg-muted/34'
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'approved' }))}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <CheckCircle className={`h-5 w-5 ${filters.status === 'approved' ? 'text-emerald-300' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {queueType === 'providers' ? 'Approved Providers' : 'Approved Facilities'}
                    </p>
                    {filters.status === 'approved' && <div className="h-2 w-2 rounded-pill bg-emerald-300" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.approved : orgStats.verified}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="rounded-pill bg-emerald-500/15 text-emerald-300 font-bold text-xs">
                      {Math.round(((queueType === 'providers' ? stats.approved : orgStats.verified) / ((queueType === 'providers' ? stats.total : orgStats.total) || 1)) * 100)}%
                    </Badge>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Rejected Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <button
                type="button"
                aria-label="Show rejected applications"
                data-testid="approval-status-rejected"
                className={`h-full min-h-[140px] w-full text-left rounded-card bg-muted/22 shadow-sm p-6 active:scale-[0.98] cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'rejected' ? 'bg-destructive/10 shadow-[0_18px_55px_hsl(var(--destructive)/0.16)] scale-[1.01]' : 'hover:bg-muted/34'
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Ban className={`h-5 w-5 ${filters.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground">Rejected</p>
                    {filters.status === 'rejected' && <div className="h-2 w-2 rounded-pill bg-destructive" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.rejected : orgStats.rejected}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="rounded-pill bg-destructive/20 text-destructive font-bold text-xs">
                      INACTIVE
                    </Badge>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Total Card */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <button
                type="button"
                aria-label="Show all approval applications"
                data-testid="approval-status-total"
                className={`h-full min-h-[140px] w-full text-left rounded-card bg-muted/22 shadow-sm p-6 active:scale-[0.98] cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'all' ? 'bg-sky-400/10 shadow-[0_18px_55px_rgba(56,189,248,0.18)] scale-[1.01]' : 'hover:bg-muted/34'
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Shield className={`h-5 w-5 ${filters.status === 'all' ? 'text-sky-300' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground">Total</p>
                    {filters.status === 'all' && <div className="h-2 w-2 rounded-pill bg-sky-300" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.total : orgStats.total}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="rounded-pill bg-sky-400/15 text-sky-300 font-bold text-xs">
                      All
                    </Badge>
                  </div>
                </div>
              </button>
            </motion.div>
          </motion.div>
        </LayoutGroup>

        {/* Filter Sheet - Fixed Props */}
        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          initialValues={filters}
          onApply={handleApplyFilters}
          filterSchema={filterSchema}
          isMobile={isMobile}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={stats}
          type="verification"
        />

        <TabsContent value="providers" className="mt-0" style={quietTabPanelStyle}>
          {!canReview && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="w-20 h-20 squircle bg-amber-400/15 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-amber-200" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground font-normal">This role cannot open Approvals.</p>
            </motion.div>
          )}

          {loading && (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
              >
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-[280px] rounded-card bg-muted/10 animate-pulse"
                  />
                ))}
              </motion.div>
            </LayoutGroup>
          )}

          {!loading && providers.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="w-20 h-20 squircle bg-muted/20 flex items-center justify-center mx-auto mb-6">
                <FileCheck className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{canApprove ? 'All Clear' : 'No visible provider applications'}</h3>
              <p className="text-muted-foreground font-normal">
                {canApprove ? 'No provider applications found.' : 'Provider applications are not visible for this role.'}
              </p>
            </motion.div>
          )}

          {!loading && providers.length > 0 && viewMode === 'grid' && (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
              >
                <AnimatePresence mode='popLayout'>
                  {providers.map((provider) => (
                    <motion.div
                      layout
                      key={provider.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div
                        style={{ outline: 'none' }}
                        className={`h-full rounded-card bg-muted/22 shadow-sm p-6 flex flex-col justify-between hover:bg-muted/34 active:scale-[0.98] group relative overflow-hidden cursor-pointer transition-all duration-200 focus-visible:bg-amber-400/[0.04] focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_24px_60px_rgba(0,0,0,0.26)] ${focusedItem?.id === provider.id ? 'bg-amber-400/[0.06] shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_24px_60px_rgba(0,0,0,0.26)]' : ''}`}
                        onClick={() => setFocusedItem(provider)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setFocusedItem(provider);
                          }
                        }}
                        role="button"
                        aria-label={`Select approval for ${provider.username || provider.email || 'provider'}`}
                        data-testid="approval-provider-card"
                        tabIndex={0}
                      >
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className="relative mb-4">
                            <Avatar className="h-24 w-24 squircle shadow-sm">
                              <AvatarImage src={provider.avatar_url || provider.image_uri || undefined} />
                              <AvatarFallback className="text-2xl font-bold bg-amber-400/10 text-amber-700 dark:text-amber-200">
                                {getAvatarFallback(provider)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <h3 className="text-xl font-bold tracking-tight mb-1 truncate w-full">{provider.username || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground font-medium mb-4 truncate w-full">{provider.email}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-pill bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                              {provider.role}
                            </Badge>
                            <Badge variant="secondary" className="rounded-pill bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                              {new Date(provider.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>

                        <div className="relative z-10 mt-6 pt-4 flex items-center justify-between gap-2">
                          {/* Provider lane is APPROVE-ONLY (2026-07-10): no rejected state,
                              so REJECT was a no-op. Approve verifies; decline = leave pending. */}
                          {!provider.bvn_verified && canApprove ? (
                            <Button
                              size="sm"
                              className="h-8 w-full rounded-pill bg-emerald-500/90 hover:bg-emerald-400 text-white text-[10px] font-bold"
                              disabled={actionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerify(provider.id, true);
                              }}
                            >
                              APPROVE
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center w-full">
                              <Badge className={`${provider.bvn_verified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'} font-bold px-4 py-1 rounded-pill`}>
                                {provider.bvn_verified ? 'APPROVED' : 'ADMIN REVIEW'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}
          {!loading && providers.length > 0 && viewMode === 'list' && (
            <VerificationQueueListView
              providers={providers}
              onFocus={setFocusedItem}
              selectedId={focusedItem?.id}
              onView={setSelectedProvider}
              onVerify={canApprove ? handleVerify : null}
              isMobile={isMobile}
            />
          )}

          {!loading && providers.length > 0 && viewMode === 'table' && (
            <VerificationQueueTableView
              providers={providers}
              onFocus={setFocusedItem}
              selectedId={focusedItem?.id}
              onView={setSelectedProvider}
              onVerify={canApprove ? handleVerify : null}
              getStatusBadge={getStatusBadge}
              selectedIds={selectedIds}
              onSelect={canApprove ? handleSelect : null}
              onSelectAll={canApprove ? handleSelectAll : null}
              isMobile={isMobile}
            />
          )}
        </TabsContent>

        <TabsContent value="organizations" className="mt-0" style={quietTabPanelStyle}>
          {!canReview && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="w-20 h-20 squircle bg-amber-400/15 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-amber-200" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground font-normal">This role cannot open Approvals.</p>
            </motion.div>
          )}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[200px] rounded-card bg-muted/10" />
              ))}
            </div>
          )}

          {!loading && organizations.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 squircle bg-muted/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Facilities Pending</h3>
              <p className="text-muted-foreground">The queue is empty.</p>
            </div>
          )}

          {!loading && organizations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  data-testid="approval-facility-card"
                  style={{ outline: 'none' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select approval for ${org.name || 'facility'}`}
                  onClick={() => setFocusedItem(org)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFocusedItem(org);
                    }
                  }}
                  className={`rounded-card bg-muted/22 shadow-sm p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:bg-muted/34 active:scale-[0.98] focus-visible:bg-amber-400/[0.04] focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] ${focusedItem?.id === org.id ? 'bg-amber-400/[0.06] shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_24px_60px_rgba(0,0,0,0.26)]' : ''}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="rounded-pill bg-muted/35 text-foreground/60 font-mono text-[10px]">
                        {org.display_id || 'ORG-PENDING'}
                      </Badge>
                      <Badge className={`rounded-pill font-bold text-[10px] ${org.verification_status === 'verified' ? 'bg-emerald-500/15 text-emerald-300' :
                        org.verification_status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-amber-400/15 text-amber-200'
                        }`}>
                        {org.verification_status.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold truncate mb-1">{org.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">{org.address}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2 uppercase tracking-widest font-bold">
                      TYPE: {org.type}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 rounded-inner bg-muted/20 p-2">
                    {org.verification_status === 'pending' && canApprove && (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 flex-1 rounded-pill text-[10px] font-bold"
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerifyOrg(org.id, false);
                          }}
                        >
                          REJECT
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 flex-1 rounded-pill bg-emerald-500/90 hover:bg-emerald-400 text-white text-[10px] font-bold"
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerifyOrg(org.id, true);
                          }}
                        >
                          APPROVE
                        </Button>
                      </>
                    )}
                    {org.verification_status === 'pending' && !canApprove && (
                      <Badge className="h-8 flex-1 rounded-pill bg-amber-400/15 text-amber-200 flex items-center justify-center text-[10px] font-bold">
                        ADMIN REVIEW
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <div className="mt-8">
          {/* Pagination etc move below TabsContent */}
        </div>
      </Tabs>
        </section>

        <VerificationDetailRail
          item={focusedItem}
          queueType={queueType}
          canApprove={canApprove}
          onOpen={setSelectedProvider}
          onApprove={(item) => (queueType === 'providers' ? handleVerify(item.id, true) : handleVerifyOrg(item.id, true))}
          // Provider lane is approve-only — no reject path even from the rail.
          onReject={queueType === 'organizations' ? (item) => handleVerifyOrg(item.id, false) : undefined}
          actionLoading={actionLoading}
        />
      </div>

      {/* Provider Details Modal - using new VerificationModal */}
      <VerificationModal
        isOpen={!!selectedProvider}
        provider={selectedProvider}
        mode="view"
        onClose={() => setSelectedProvider(null)}
        onVerify={canApprove ? handleVerify : null}
      />

      {/* Pagination */}
      {activeItems.length > 0 && pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
          />
        </div>
      )}

      {canApprove && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
        >
          <>
            {/* Bulk selection is providers-only, and providers are APPROVE-ONLY
                (2026-07-10) — so the bulk-reject action was a no-op and is removed. */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleBulkVerify(true)}
              disabled={actionLoading}
              className="h-10 w-10 rounded-pill bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all"
              title="Approve Selected"
            >
              <CheckCircle className="h-5 w-5" />
            </Button>
          </>
        </BulkActionBar>
      )}
    </div>
  );
};

// Detail line — icon + label + value on a soft inner surface. Borderless: depth via
// spacing and background tone only (canon radii, no rings/borders/dividers).
const VerificationDetailLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/20 p-2.5">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value || 'Not set'}</div>
    </div>
  </div>
);

const VerificationRailButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

const getFacilityInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((word) => word[0]).join('').toUpperCase();
  return initials || 'F';
};

/**
 * VerificationDetailRail — right-side selected-record rail for Approvals.
 *
 * Mirrors DoctorsPage's StaffDetailRail so Approvals carries BOTH a Quick Actions
 * panel (shared ContextPanel/VerificationPanel) and this focused-row detail rail.
 * The rail never mutates directly by itself: approve/reject are fail-closed on
 * `canApprove`, and "View details"/"Open record" defer to the full modal via onOpen.
 */
const VerificationDetailRail = ({ item, queueType, canApprove, onOpen, onApprove, onReject, actionLoading }) => {
  if (!item) {
    return (
      <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <FileCheck className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No application selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            Applications that match your filters will appear here.
          </p>
        </div>
      </aside>
    );
  }

  const isProviders = queueType === 'providers';
  const isPending = isProviders ? !item.bvn_verified : item.verification_status === 'pending';

  let statusLabel;
  let statusClass;
  let StatusIcon;
  if (isProviders) {
    if (item.bvn_verified) {
      statusLabel = 'Approved';
      statusClass = 'bg-emerald-500/15 text-emerald-300';
      StatusIcon = CheckCircle;
    } else {
      statusLabel = 'Pending review';
      statusClass = 'bg-amber-400/15 text-amber-200';
      StatusIcon = Clock;
    }
  } else if (item.verification_status === 'verified') {
    statusLabel = 'Verified';
    statusClass = 'bg-emerald-500/15 text-emerald-300';
    StatusIcon = CheckCircle;
  } else if (item.verification_status === 'rejected') {
    statusLabel = 'Rejected';
    statusClass = 'bg-destructive/20 text-destructive';
    StatusIcon = Ban;
  } else {
    statusLabel = 'Pending';
    statusClass = 'bg-amber-400/15 text-amber-200';
    StatusIcon = Clock;
  }

  const primary = isProviders
    ? (item.username || item.email || 'Unknown')
    : (item.name || 'Unnamed facility');
  const subtitle = isProviders ? (item.role || 'provider') : (item.type || 'facility');
  const applied = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';

  return (
    <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
      <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Application details</h2>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusClass}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusLabel}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
          onClick={() => onOpen(item)}
          aria-label="Open full application details"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-5 flex items-center gap-4">
        {isProviders ? (
          <Avatar className="h-14 w-14 squircle shadow-sm">
            <AvatarImage src={item.avatar_url || item.image_uri || undefined} />
            <AvatarFallback className="text-lg font-bold bg-amber-400/10 text-amber-700 dark:text-amber-200">
              {getAvatarFallback(item)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center squircle bg-sky-400/12 text-lg font-semibold text-sky-300">
            {getFacilityInitials(item.name)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{primary}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {isProviders ? (
          <>
            <VerificationDetailLine icon={User} label="Applicant" value={item.username || item.email} />
            <VerificationDetailLine icon={Shield} label="Role" value={item.role} />
            <VerificationDetailLine icon={StatusIcon} label="Status" value={statusLabel} />
            <VerificationDetailLine icon={Mail} label="Contact" value={item.email} />
            <VerificationDetailLine icon={Clock} label="Applied" value={applied} />
          </>
        ) : (
          <>
            <VerificationDetailLine icon={User} label="Name" value={item.name} />
            <VerificationDetailLine icon={Shield} label="Type" value={item.type} />
            <VerificationDetailLine icon={StatusIcon} label="Status" value={statusLabel} />
            <VerificationDetailLine icon={MapPin} label="Address" value={item.address} />
            <VerificationDetailLine icon={Clock} label="Applied" value={applied} />
          </>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onOpen(item)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {/* Provider lane is APPROVE-ONLY (2026-07-10): providers have no rejected state,
            so a Reject was a no-op. Facilities keep a real Approve + Reject
            (verification_status). Only render Reject when the lane can truly reject. */}
        {canApprove && isPending && (
          <div className={queueType === 'organizations' ? 'grid grid-cols-2 gap-3' : ''}>
            {queueType === 'organizations' && onReject && (
              <Button
                variant="destructive"
                disabled={actionLoading}
                className="h-11 rounded-button text-sm font-bold"
                onClick={() => onReject(item)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Reject
              </Button>
            )}
            <Button
              disabled={actionLoading}
              className="h-11 w-full rounded-button bg-emerald-500/90 text-white transition-all hover:bg-emerald-400 text-sm font-bold"
              onClick={() => onApprove(item)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <VerificationRailButton icon={Info} label="Open record" onClick={() => onOpen(item)} />
        </div>

        {!canApprove && (
          <div
            role="note"
            className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            <Shield className="h-4 w-4 shrink-0" />
            Approvals are read-only until admin authority is verified.
          </div>
        )}
      </div>
    </aside>
  );
};
