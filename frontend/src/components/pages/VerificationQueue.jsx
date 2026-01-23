import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getVerificationQueue, verifyProvider, subscribeToVerificationQueue, canVerifyProviders } from '../../services/verificationService';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { VerificationModal } from '../modals/VerificationModal';
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
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { PaginationControls } from '../ui/PaginationControls';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { VerificationQueueListView } from '../views/VerificationQueueListView';
import { VerificationQueueTableView } from '../views/VerificationQueueTableView';

/**
 * Verification Queue Page
 * 
 * Status: ✅ READY FOR DATA VIEW SYSTEM
 */

export const VerificationQueue = () => {
  const { isMobile } = useNavigation();
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter state matching Insurance/Subscription pattern
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [canVerify, setCanVerify] = useState(false);
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
      toast.error(error.message || 'Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, pagination.currentPage, pagination.itemsPerPage, canVerify]);

  useEffect(() => {
    fetchVerificationData();

    // Real-time subscription
    let unsubscribe;
    if (canVerify) {
      unsubscribe = subscribeToVerificationQueue(fetchVerificationData);
    }

    const handleOpenFilters = () => setFilterSheetOpen(true);
    window.addEventListener('openFilters', handleOpenFilters);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('openFilters', handleOpenFilters);
    };
  }, [fetchVerificationData, canVerify]);

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
      {(filters.search || filters.status !== 'all') && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const viewToggleComponent = useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  usePageHeader("Identity Vault", null, !isMobile ? viewToggleComponent : null, filterButtonComponent);

  const footerContent = useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
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
      toast.error(error.message || 'Failed to update verification status');
    } finally {
      setActionLoading(false);
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
    }
  ], []);

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">

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
                <h3 className="text-3xl font-bold tracking-tighter">{stats.pending}</h3>
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
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Verified Users</p>
                  {filters.status === 'approved' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{stats.approved}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">
                    {Math.round((stats.approved / (stats.total || 1)) * 100)}% TOTAL
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
                <h3 className="text-3xl font-bold tracking-tighter">{stats.rejected}</h3>
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
                <h3 className="text-3xl font-bold tracking-tighter">{stats.total}</h3>
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

      {/* Permission Check */}
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

      {loading ? (
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
      ) : providers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 text-center"
        >
          <div className="w-20 h-20 squircle bg-muted/20 flex items-center justify-center mx-auto mb-6">
            <FileCheck className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-2">All Clear</h3>
          <p className="text-muted-foreground font-normal">No applications found matching your criteria.</p>
        </motion.div>
      ) : viewMode === 'grid' ? (
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
                    role="button"
                    tabIndex={0}
                    aria-label={`View verification details for ${provider.username || 'applicant'}`}
                  >
                    {/* Apple hover glow effect */}
                    <div className="hover-glow hover-glow-primary" />
                    {/* Card Hover Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <Avatar className="h-24 w-24 squircle-xl shadow-lg group-hover:scale-105 transition-transform duration-300">
                          <AvatarImage src={getAvatarUrl(provider)} />
                          <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                            {getAvatarFallback(provider)}
                          </AvatarFallback>
                        </Avatar>
                        <Badge className={`absolute -bottom-2 -right-2 squircle-sm px-2 py-0.5 ${provider.bvn_verified ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                          }`}>
                          {provider.bvn_verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-bold tracking-tight mb-1 truncate w-full">{provider.username || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground font-medium mb-4 truncate w-full">{provider.email}</p>

                      <div className="flex items-center gap-2 w-full justify-center">
                        {provider.role && (
                          <Badge variant="secondary" className="squircle-sm bg-muted/50 text-muted-foreground">
                            {provider.role}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="squircle-sm bg-muted/50 text-muted-foreground">
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
                            className="h-8 flex-1 rounded-full text-xs font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(provider.id, false);
                            }}
                          >
                            REJECT
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 flex-1 rounded-full bg-success hover:bg-success/90 text-success-foreground text-xs font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(provider.id, true);
                            }}
                          >
                            APPROVE
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-muted-foreground">VIEW DETAILS</span>
                          <div className="w-8 h-8 rounded-full surface-raised flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      ) : viewMode === 'list' ? (
        <VerificationQueueListView
          providers={providers}
          onView={setSelectedProvider}
          onVerify={handleVerify}
          onDelete={() => { }}
          isMobile={isMobile}
        />
      ) : (
        <VerificationQueueTableView
          providers={providers}
          onView={setSelectedProvider}
          onVerify={handleVerify}
          onDelete={() => { }}
          isMobile={isMobile}
        />
      )}

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
    </div>
  );
};
