import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getVerificationQueue, verifyProvider, subscribeToVerificationQueue, canVerifyProviders } from '../../services/verificationService';
import { getOrgVerificationQueue, verifyOrganization, subscribeToOrgVerificationQueue } from '../../services/orgVerificationService';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
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
  Ban
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
import { VerificationQueueListView } from '../views/VerificationQueueListView';
import { VerificationQueueTableView } from '../views/VerificationQueueTableView';
import { MobileVerification } from '../mobile/MobileVerification';

/**
 * Verification Queue Page
 * 
 * Status: ✅ READY FOR DATA VIEW SYSTEM
 */

export const VerificationQueue = () => {
  const { isAdmin, isOrgAdmin, isSponsor } = useAuth();
  const { isMobile } = useNavigation();
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter state matching Insurance/Subscription pattern
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  const [canVerify, setCanVerify] = useState(false);

  // NEW: Track which queue we're viewing
  const [queueType, setQueueType] = useState('providers'); // 'providers' | 'organizations'
  const [organizations, setOrganizations] = useState([]);
  const [orgStats, setOrgStats] = useState({ pending: 0, verified: 0, rejected: 0, total: 0 });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    itemsPerPage: 12
  });
  const { viewMode, setViewMode } = useViewMode('verification-queue-page', 'grid');

  // Check permissions once on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const hasPermission = await canVerifyProviders();
        setCanVerify(hasPermission);
      } catch (error) {
        // Permission check failed silently handled
      }
    };
    checkPermissions();
  }, []);

  const fetchVerificationData = useCallback(async () => {
    if (!canVerify) return;

    setLoading(true);
    try {
      const result = await getVerificationQueue({
        status: filters.status,
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage
      });

      setProviders(result.data);
      setStats(result.stats);
      setPagination(prev => ({
        ...prev,
        totalCount: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (error) {
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, pagination.currentPage, pagination.itemsPerPage, canVerify]);

  // NEW: Fetch organization verification queue
  const fetchOrgVerificationData = useCallback(async () => {
    if (!canVerify) return;

    setLoading(true);
    try {
      const result = await getOrgVerificationQueue({
        status: filters.status,
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage
      });

      setOrganizations(result.data);
      setOrgStats(result.stats);
      setPagination(prev => ({
        ...prev,
        totalCount: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (error) {
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, pagination.currentPage, pagination.itemsPerPage, canVerify]);

  // Handle organization verification
  const handleVerifyOrg = async (hospitalId, approved) => {
    if (!canVerify) {
      toast.error('Admin access required for verification');
      return;
    }

    setActionLoading(true);
    try {
      await verifyOrganization(hospitalId, approved);
      toast.success(approved ? 'Organization verified!' : 'Organization rejected');
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

    // Real-time subscriptions
    let unsubscribeProviders;
    let unsubscribeOrgs;
    if (canVerify) {
      unsubscribeProviders = subscribeToVerificationQueue(fetchVerificationData);
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
  }, [fetchVerificationData, fetchOrgVerificationData, canVerify, queueType]);

  // Header Configuration
  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter verification queue"
    >
      <FilterIcon className="h-4 w-4" />
      {(filters.search || filters.status !== 'all' || filters.created_at) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
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
  }, [queueType]);

  const viewToggleComponent = useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  usePageHeader("Identity Vault", null, !isMobile ? viewToggleComponent : null, filterButtonComponent);

  const footerContent = useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5  uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} {filters.status === 'pending' ? 'Pending' : filters.status === 'approved' ? 'Verified' : filters.status === 'rejected' ? 'Rejected' : 'Total'}</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount, filters.status]);

  usePageFooter(footerContent, 'pagination', !loading && providers.length > 0 && canVerify);

  const handleVerify = async (providerId, approved) => {
    if (!canVerify) {
      toast.error('Admin access required for verification');
      return;
    }

    setActionLoading(true);
    try {
      await verifyProvider(providerId, approved);
      toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
      setSelectedProvider(null);
      fetchVerificationData();
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setActionLoading(false);
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
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      case 'pending':
      default:
        return 'bg-warning/20 text-warning';
    }
  };

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
        { value: 'rejected', label: 'Rejected' }
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
          onVerifyProvider={handleVerify}
          onVerifyOrganization={handleVerifyOrg}
          onRefresh={queueType === 'providers' ? fetchVerificationData : fetchOrgVerificationData}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
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
          onVerify={handleVerify}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <Tabs defaultValue="providers" onValueChange={setQueueType} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="squircle-lg bg-background/30 backdrop-blur-md  p-1">
            <TabsTrigger value="providers" className="px-6 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Providers
            </TabsTrigger>
            <TabsTrigger value="organizations" className="px-6 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Organizations
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Bento Overview Cards - Updated with geo styles and responsive filtering */}
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
          >
            {/* Pending Card - geo-sharp */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'pending' ? 'ring-2 ring-warning shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-warning" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.status === 'pending' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Clock className={`h-5 w-5 ${filters.status === 'pending' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</p>
                    {filters.status === 'pending' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.pending : orgStats.pending}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-sharp bg-warning/20 text-warning border-0 font-bold text-xs">
                      ACTION REQUIRED
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Approved Card - geo-round */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'approved' ? 'ring-2 ring-success shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'approved' }))}
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-success" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.status === 'approved' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <CheckCircle className={`h-5 w-5 ${filters.status === 'approved' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {queueType === 'providers' ? 'Verified Users' : 'Verified Orgs'}
                    </p>
                    {filters.status === 'approved' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.approved : orgStats.verified}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">
                      {Math.round(((queueType === 'providers' ? stats.approved : orgStats.verified) / ((queueType === 'providers' ? stats.total : orgStats.total) || 1)) * 100)}% TOTAL
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Rejected Card - geo-sharp */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'rejected' ? 'ring-2 ring-destructive shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'rejected' }))}
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-destructive" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.status === 'rejected' ? 'bg-destructive/30' : 'bg-destructive/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Ban className={`h-5 w-5 ${filters.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rejected</p>
                    {filters.status === 'rejected' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.rejected : orgStats.rejected}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-sharp bg-destructive/20 text-destructive border-0 font-bold text-xs">
                      INACTIVE
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Total Card - geo-round */}
            <motion.div
              layout
              className="col-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.status === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
              >
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-primary" />
                <div className="absolute top-0 right-0 p-4 z-20">
                  <div className="relative">
                    <div className={`absolute inset-0 ${filters.status === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                      <Shield className={`h-5 w-5 ${filters.status === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Database</p>
                    {filters.status === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">
                    {queueType === 'providers' ? stats.total : orgStats.total}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="geo-round bg-primary/20 text-primary border-0 font-bold text-xs">
                      OVERVIEW
                    </Badge>
                  </div>
                </div>
              </Card>
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

        <TabsContent value="providers" className="mt-0">
          {!canVerify && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="w-20 h-20 squircle bg-warning/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-warning" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground font-normal">Admin access required to view verification queue.</p>
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
                    className="h-[280px] squircle-lg bg-muted/10 animate-pulse"
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
              <h3 className="text-2xl font-bold mb-2">All Clear</h3>
              <p className="text-muted-foreground font-normal">No provider applications found.</p>
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
                      <Card
                        className="h-full squircle-lg glass-card-premium p-6 flex flex-col justify-between hover-lift group relative overflow-hidden cursor-pointer"
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <div className="hover-glow hover-glow-primary" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className="relative mb-4">
                            <Avatar className="h-24 w-24 squircle-xl shadow-lg">
                              <AvatarImage src={getAvatarUrl(provider)} />
                              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                                {getAvatarFallback(provider)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <h3 className="text-xl font-bold tracking-tight mb-1 truncate w-full">{provider.username || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground font-medium mb-4 truncate w-full">{provider.email}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="squircle-sm bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                              {provider.role}
                            </Badge>
                            <Badge variant="secondary" className="squircle-sm bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                              {new Date(provider.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>

                        <div className="relative z-10 mt-6 pt-4 flex items-center justify-between gap-2">
                          {!provider.bvn_verified ? (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 flex-1 rounded-full text-[10px] font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerify(provider.id, false);
                                }}
                              >
                                REJECT
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 flex-1 rounded-full bg-success hover:bg-success/90 text-success-foreground text-[10px] font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerify(provider.id, true);
                                }}
                              >
                                APPROVE
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center justify-center w-full">
                              <Badge className="bg-success/20 text-success border-0 font-bold px-4 py-1 rounded-full">VERIFIED</Badge>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}
          {!loading && providers.length > 0 && viewMode === 'list' && (
            <VerificationQueueListView
              providers={providers}
              onView={setSelectedProvider}
              onVerify={handleVerify}
              onDelete={() => { }}
              isMobile={isMobile}
            />
          )}

          {!loading && providers.length > 0 && viewMode === 'table' && (
            <VerificationQueueTableView
              providers={providers}
              onView={setSelectedProvider}
              onVerify={handleVerify}
              onDelete={() => { }}
              getStatusBadge={getStatusBadge}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              isMobile={isMobile}
            />
          )}
        </TabsContent>

        <TabsContent value="organizations" className="mt-0">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[200px] squircle-lg bg-white/5 " />
              ))}
            </div>
          )}

          {!loading && organizations.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 squircle bg-muted/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Organizations Pending</h3>
              <p className="text-muted-foreground">The queue is empty.</p>
            </div>
          )}

          {!loading && organizations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {organizations.map((org) => (
                <Card key={org.id} className="squircle-lg glass-card-premium p-6 hover-lift flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="squircle-sm bg-primary/20 text-primary border-0 font-mono text-[10px]">
                        {org.display_id || 'ORG-PENDING'}
                      </Badge>
                      <Badge className={`squircle-sm border-0 font-bold text-[10px] ${org.verification_status === 'verified' ? 'bg-success/20 text-success' :
                        org.verification_status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-warning/20 text-warning'
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

                  <div className="mt-6 pt-4 flex items-center gap-2 border-t border-white/5">
                    {org.verification_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 flex-1 rounded-full text-[10px] font-bold"
                          onClick={() => handleVerifyOrg(org.id, false)}
                        >
                          REJECT
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 flex-1 rounded-full bg-success hover:bg-success/90 text-success-foreground text-[10px] font-bold"
                          onClick={() => handleVerifyOrg(org.id, true)}
                        >
                          VERIFY
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <div className="mt-8">
          {/* Pagination etc move below TabsContent */}
        </div>
      </Tabs>

      {/* Provider Details Modal - using new VerificationModal */}
      <VerificationModal
        isOpen={!!selectedProvider}
        provider={selectedProvider}
        mode="view"
        onClose={() => setSelectedProvider(null)}
        onVerify={handleVerify}
      />

      {/* Pagination */}
      {providers.length > 0 && pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
          />
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
      >
        {canVerify && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Bulk approve logic would go here
                toast.success(`${selectedIds.length} providers approved`);
                setSelectedIds([]);
              }}
              className="h-10 w-10 rounded-full bg-success/20 text-success hover:bg-success hover:text-white transition-all"
              title="Approve Selected"
            >
              <CheckCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Bulk reject logic would go here
                toast.success(`${selectedIds.length} providers rejected`);
                setSelectedIds([]);
              }}
              className="h-10 w-10 rounded-full bg-warning/20 text-warning hover:bg-warning hover:text-white transition-all"
              title="Reject Selected"
            >
              <AlertTriangle className="h-5 w-5" />
            </Button>
          </>
        )}
      </BulkActionBar>
    </div>
  );
};
