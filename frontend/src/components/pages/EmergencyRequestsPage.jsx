import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { LocationCell } from '../ui/LocationCell';
import {
  getServiceTypeBadge,
  getServiceTypeDisplay,
  getStatusDisplay
} from '../../constants/emergency';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { getEmergencyRequests } from '../../services/emergencyService';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import { getCurrentUser, applyAuthFilter } from '../../services/authService';
import * as walletService from '../../services/walletService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { withTimeout } from '../../lib/utils';
import { toast } from 'sonner';
import { ReportsModal } from '../modals/ReportsModal';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  User,
  Navigation,
  Activity,
  Eye,
  Trash2,
  RefreshCw,
  Filter as FilterIcon,
  Siren,
  Shield,
  Zap,
  CheckCircle,
  FileText,
  BarChart3,
  Hospital,
  Send,
  CheckCheck
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';

import { EmergencyRequestListView } from '../views/EmergencyRequestListView';
import { EmergencyRequestTableView } from '../views/EmergencyRequestTableView';
import { usePageData } from '../../contexts/PageDataContext';
import { SEOHead } from '../common/SEOHead';

export const EmergencyRequestsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, orgId, profile, can, user } = useAuth();
  const location = useLocation();
  const { isMobile } = useNavigation();
  const { emergencyData, refreshAllData } = usePageData();

  // Create currentUser object with methods expected by child components
  const currentUser = useMemo(() => ({
    isAdmin: () => isAdmin(),
    isOrgAdmin: () => isOrgAdmin(),
    isProvider: () => isProvider(),
    user,
    profile
  }), [isAdmin, isOrgAdmin, isProvider, user, profile]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Delete'
  });

  const { viewMode, setViewMode } = useViewMode('emergency-requests-page', 'grid');
  const pagination = usePagination(20);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user for RBAC filtering
      const user = await getCurrentUser();

      let query = supabase.from('emergency_requests').select('*', { count: 'exact', head: true });

      // Apply RBAC filter using centralized service
      query = applyAuthFilter(query, user, {
        userIdField: 'user_id',
        orgIdField: 'hospital_id',
        providerIdField: 'responder_id',
        resourceType: 'emergency'
      });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.search) {
        // Search by location or service_type
        query = query.or(`location.ilike.%${filters.search}%,service_type.ilike.%${filters.search}%`);
      }

      // Apply KPI Filter to count query
      if (kpiFilter === 'ambulance') query = query.eq('service_type', 'ambulance');
      if (kpiFilter === 'bed') query = query.eq('service_type', 'bed');
      if (kpiFilter === 'pending') query = query.eq('status', 'pending_approval');
      if (kpiFilter === 'inProgress') query = query.eq('status', 'in_progress');

      const { count } = await query;
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('emergency_requests')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order(sortConfig.key || 'created_at', { ascending: sortConfig.direction === 'asc' });

      // Apply RBAC filter to data query using centralized service
      dataQuery = applyAuthFilter(dataQuery, user, {
        userIdField: 'user_id',
        orgIdField: 'hospital_id',
        providerIdField: 'responder_id',
        resourceType: 'emergency'
      });

      if (filters.status && filters.status.length > 0) {
        dataQuery = dataQuery.in('status', filters.status);
      }
      if (filters.search) {
        dataQuery = dataQuery.or(`location.ilike.%${filters.search}%,service_type.ilike.%${filters.search}%`);
      }

      // Apply KPI Filter to data query
      if (kpiFilter === 'ambulance') dataQuery = dataQuery.eq('service_type', 'ambulance');
      if (kpiFilter === 'bed') dataQuery = dataQuery.eq('service_type', 'bed');
      if (kpiFilter === 'pending') dataQuery = dataQuery.eq('status', 'pending_approval');
      if (kpiFilter === 'inProgress') dataQuery = dataQuery.eq('status', 'in_progress');

      const { data, error } = await withTimeout(dataQuery, 8000, 'Failed to load emergency requests - timeout');

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
      toast.error(error.message || 'Failed to load emergency requests');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters, kpiFilter, orgId, isOrgAdmin, isAdmin, sortConfig]);

  useEffect(() => {
    fetchRequests();

    // Real-time updates
    const channel = supabase
      .channel('emergency_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, fetchRequests)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchRequests]);

  const handleCreateEmergency = useCallback(() => {
    setSelectedRequest(null);
    setIsEmergencyModalOpen(true);
  }, []);

  // Handle custom events
  useEffect(() => {
    const handleOpenModal = () => handleCreateEmergency();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);

    window.addEventListener('openEmergencyModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openReportsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openEmergencyModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openReportsModal', handleOpenAnalytics);
    };
  }, [handleCreateEmergency]);

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search Requests',
      placeholder: 'Search by location or type...'
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Date Range',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], []);

  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter emergency requests"
    >
      <FilterIcon className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const headerActions = React.useMemo(() => {
    // Only Admins and Org Admins can create new emergency requests
    if (currentUser.isAdmin() || currentUser.isOrgAdmin()) {
      return (
        <Button
          onClick={handleCreateEmergency}
          className="bg-muted/20 text-foreground hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
          aria-label="Create new emergency request"
        >
          <Zap className="h-4 w-4 mr-2" />
          NEW REQUEST
        </Button>
      );
    }
    return null;
  }, [handleCreateEmergency, currentUser]);

  usePageHeader(
    'Emergency Logs',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const pendingCount = React.useMemo(() =>
    requests.filter(r => r.status === 'pending' || r.status === 'pending_approval').length,
    [requests]);

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 uppercase tracking-widest text-[10px] font-bold text-destructive">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>Live Buffer: {pendingCount} Active</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Requests</span>
      </div>
    </div>
  ), [pendingCount, pagination]);

  usePageFooter(footerContent, 'status', !loading && requests.length > 0);

  const handleDelete = async (request) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Emergency Request',
      description: `Are you sure you want to delete this emergency request at ${request.location}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('emergency_requests')
            .delete()
            .eq('id', request.id);

          if (error) throw error;

          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CANCELLED,
            request.id,
            { message: `Emergency request has been cancelled` }
          );
          toast.success('Emergency request deleted successfully');
          fetchRequests();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting emergency request:', error);
          toast.error(error.message || 'Failed to delete emergency request');
        }
      },
      variant: 'destructive',
      confirmLabel: 'Delete Request'
    });
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  };



  const handleCloseEmergencyModal = () => {
    setIsEmergencyModalOpen(false);
    fetchRequests(); // Refresh the list
  };

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? requests.map(r => r.id) : []);
  }, [requests]);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.length} emergencies?`)) return;
    try {
      const { error } = await supabase.from('emergency_requests').delete().in('id', selectedIds);
      if (error) throw error;
      toast.success(`${selectedIds.length} emergencies deleted`);
      setSelectedIds([]);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to delete emergencies');
    }
  }, [selectedIds, fetchRequests]);

  const handleDispatch = useCallback(async (request) => {
    try {
      // 1. Wallet Cap Check for Cash Payments
      // We check eligibility based on estimated base costs ($50 for ambulance, $25 for beds)
      if (isOrgAdmin() || isAdmin()) {
        const targetOrgId = orgId || request.organization_id || request.hospital_id;
        if (targetOrgId && targetOrgId.length === 36) { // Ensure it's a UUID
          const estimatedAmount = request.service_type === 'ambulance' ? 50 : 25;
          const isEligible = await walletService.checkCashEligibility(targetOrgId, estimatedAmount);

          if (!isEligible) {
            toast.error("Insufficient Wallet Balance", {
              description: "Your organization balance must cover the 2.5% platform fee to accept cash jobs. Please top up."
            });
            return;
          }
        }
      }

      toast.loading('Dispatching emergency response...', { id: 'dispatch' });

      const result = await dispatchEmergency(request.id, request);

      toast.success('Emergency dispatched! Resources assigned.', { id: 'dispatch' });
      toast.info(`Ambulance: ${result.assignments.ambulance?.type || 'Assigned'}`, { duration: 3000 });

      fetchRequests();
    } catch (error) {
      console.error('Dispatch failed:', error);
      toast.error('Failed to dispatch emergency', { id: 'dispatch' });
    }
  }, [fetchRequests]);

  const handleComplete = useCallback(async (request) => {
    if (!confirm('Mark this emergency as completed?')) return;

    try {
      await completeEmergency(request.id);

      // Auto-trigger cash processing if it's a cash job and not yet completed
      if (request.payment_method_id === 'cash' && request.payment_status !== 'completed') {
        toast.info('Cash Payment Required', {
          description: 'This was a cash job. Please confirm total amount received.'
        });
        handleProcessCash(request);
      } else {
        toast.success('Emergency completed. Resources freed.');
      }

      fetchRequests();
    } catch (error) {
      console.error('Complete failed:', error);
      toast.error('Failed to complete emergency');
    }
  }, [fetchRequests]);

  const handleProcessCash = useCallback(async (request) => {
    try {
      const amount = prompt("Enter the total cash amount received (USD):", "50.00");
      if (!amount || isNaN(amount)) return;

      toast.loading('Processing cash payment...', { id: 'cash-pay' });

      const targetOrgId = orgId || request.organization_id || request.hospital_id;
      await walletService.processCashPayment(request.id, targetOrgId, amount);

      toast.success('Cash payment confirmed and fee deducted.', { id: 'cash-pay' });
      fetchRequests();
    } catch (error) {
      console.error('Cash processing failed:', error);
      toast.error(error.message || 'Failed to process cash payment', { id: 'cash-pay' });
    }
  }, [fetchRequests, orgId]);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => {
      handleCreateEmergency();
    };

    window.addEventListener('openEmergencyModal', handleOpenModal);

    return () => {
      window.removeEventListener('openEmergencyModal', handleOpenModal);
    };
  }, [handleCreateEmergency]);

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="Emergency Requests" description="Monitor and respond to critical emergency requests in real-time." />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {/* Bento Overview Cards - Always visible */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ x: 50, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 50, opacity: 0, scale: 0.9 }}
                className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15 backdrop-blur-sm border-0 shadow-none rounded-full"
              >
                <div className="bg-primary text-primary-foreground text-[10px] font-bold h-6 min-w-[24px] px-1.5 rounded-full flex items-center justify-center shadow-sm mb-1">
                  {selectedIds.length}
                </div>

                {(currentUser.isAdmin() || (typeof currentUser.isProvider === 'function' && currentUser.isProvider())) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBulkDelete}
                    className="h-10 w-10 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
                    title="Delete Selected"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}

                <div className="w-8 h-[1px] bg-white/10 my-0.5" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedIds([])}
                  className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                  title="Clear Selection"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {!loading && emergencyData?.stats && (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
              >
                {/* Total Requests Card */}
                <motion.div
                  layout
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card
                    className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                      }`}
                    onClick={() => setKpiFilter('all')}
                    role="button"
                    tabIndex={0}
                    aria-label="Show all emergency requests"
                  >
                    {/* Apple hover glow effect */}
                    <div className="hover-glow hover-glow-primary" />
                    <div className="absolute top-0 right-0 p-4 z-20">
                      <div className="relative">
                        <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                        <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                          <FileText className={`h-5 w-5 ${kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Requests</p>
                        {kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter">{emergencyData.stats.total || 0}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">
                          {kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Ambulance Card - Main Emergency Type */}
                <motion.div
                  layout
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <Card
                    className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'ambulance' ? 'ring-2 ring-primary shadow-lg' : ''
                      }`}
                    onClick={() => setKpiFilter('ambulance')}
                    role="button"
                    tabIndex={0}
                    aria-label="Filter by ambulance requests"
                  >
                    <div className="hover-glow hover-glow-primary" />
                    <div className="absolute top-0 right-0 p-4 z-20">
                      <div className="relative">
                        <div className={`absolute inset-0 ${kpiFilter === 'ambulance' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                        <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                          <Navigation className={`h-5 w-5 ${kpiFilter === 'ambulance' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ambulance</p>
                        {kpiFilter === 'ambulance' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter">{emergencyData.stats.ambulance || 0}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="geo-round bg-primary/20 text-primary border-0 font-bold text-xs">
                          DISPATCH
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Bed Booking Card - Main Emergency Type */}
                <motion.div
                  layout
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card
                    className={`h-full min-h-[140px] squircle-3xl glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'bed' ? 'ring-2 ring-warning shadow-lg' : ''
                      }`}
                    onClick={() => setKpiFilter('bed')}
                    role="button"
                    tabIndex={0}
                    aria-label="Filter by bed booking requests"
                  >
                    <div className="hover-glow hover-glow-warning" />
                    <div className="absolute top-0 right-0 p-4 z-20">
                      <div className="relative">
                        <div className={`absolute inset-0 ${kpiFilter === 'bed' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                        <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                          <Hospital className={`h-5 w-5 ${kpiFilter === 'bed' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Bed Booking</p>
                        {kpiFilter === 'bed' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter">{emergencyData.stats.bed || 0}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-bold text-xs">
                          RESERVE
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Pending Card */}
                <motion.div
                  layout
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                >
                  <Card
                    className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'pending' ? 'ring-2 ring-info shadow-lg' : ''
                      }`}
                    onClick={() => setKpiFilter('pending')}
                    role="button"
                    tabIndex={0}
                    aria-label="Filter by pending requests"
                  >
                    {/* Apple hover glow effect */}
                    <div className="hover-glow hover-glow-info" />
                    <div className="absolute top-0 right-0 p-4 z-20">
                      <div className="relative">
                        <div className={`absolute inset-0 ${kpiFilter === 'pending' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                        <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                          <Clock className={`h-5 w-5 ${kpiFilter === 'pending' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
                        {kpiFilter === 'pending' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter">{emergencyData.stats.pending || 0}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="geo-ticket bg-info/20 text-info border-0 font-bold text-xs">
                          NEW
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Active Card */}
                <motion.div
                  layout
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Card
                    className={`h-full min-h-[140px] geo-wave glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${kpiFilter === 'active' ? 'ring-2 ring-success shadow-lg' : ''
                      }`}
                    onClick={() => setKpiFilter('active')}
                    role="button"
                    tabIndex={0}
                    aria-label="Filter by active requests"
                  >
                    {/* Apple hover glow effect */}
                    <div className="hover-glow hover-glow-success" />
                    <div className="absolute top-0 right-0 p-4 z-20">
                      <div className="relative">
                        <div className={`absolute inset-0 ${kpiFilter === 'active' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                        <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                          <Zap className={`h-5 w-5 ${kpiFilter === 'active' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
                        {kpiFilter === 'active' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter">{emergencyData.stats.active || 0}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="geo-wave bg-success/20 text-success border-0 font-bold text-xs">
                          NOW
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            </LayoutGroup>
          )}

          {/* Grid View Cards */}
          {viewMode === 'grid' && (
            <>
              {requests.length === 0 ? (
                <Card className="squircle-lg glass-card-premium p-12 text-center">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-bold text-xl mb-2">No Active Emergencies</h3>
                  <p className="text-muted-foreground">All clear for now</p>
                </Card>
              ) : (
                <LayoutGroup>
                  <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
                  >
                    {requests.map((req, index) => (
                      <motion.div
                        layout
                        key={req.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="col-span-1"
                      >
                        <Card className={`h-full geo-arrow glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col ${req.service_type === 'critical_care' || req.service_type === 'ambulance' ? 'ring-1 ring-destructive/20' : ''}`}>
                          {/* Apple hover glow effect */}
                          <div className={`hover-glow ${req.service_type === 'critical_care' ? 'hover-glow-destructive' : req.service_type === 'ambulance' ? 'hover-glow-primary' : req.service_type === 'bed' ? 'hover-glow-warning' : 'hover-glow-success'}`} />
                          <div className="absolute top-0 right-0 p-5 z-20">
                            <div className="relative">
                              <div className={`absolute inset-0 ${req.service_type === 'critical_care' ? 'bg-destructive/20' : req.service_type === 'ambulance' ? 'bg-primary/20' : req.service_type === 'bed' ? 'bg-warning/20' : 'bg-success/10'} blur-xl rounded-full scale-150`} />
                              <div className="w-10 h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                                {req.service_type === 'ambulance' ? (
                                  <Navigation className={`h-5 w-5 text-primary`} />
                                ) : req.service_type === 'bed' ? (
                                  <Hospital className={`h-5 w-5 text-warning`} />
                                ) : (
                                  <Siren className={`h-5 w-5 ${req.service_type === 'critical_care' ? 'text-destructive' : 'text-warning'}`} />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Badge className={`geo-sharp ${getServiceTypeBadge(req.service_type)} border-0 font-bold editorial-subtitle px-3 py-1`}>
                              {getServiceTypeDisplay(req.service_type)}
                            </Badge>
                            <Badge className="geo-sharp bg-muted text-muted-foreground border-0 px-2 py-1 font-semibold">
                              {getStatusDisplay(req.status)}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                            {req.patient_snapshot?.fullName || req.requester_name || req.patient_name || 'Unknown Requester'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 relative z-10">
                            <User className="h-4 w-4" />
                            <span className="font-normal">{req.patient_snapshot?.phone || req.requester_phone || req.patient_phone || 'No contact info'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 relative z-10">
                            <Clock className="h-4 w-4 text-info" />
                            <span className="font-normal">{req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Just now'}</span>
                          </div>
                          <div className="space-y-3 mb-6 relative z-10">
                            <div className="flex items-start gap-3 text-sm p-3 geo-sharp bg-muted/30">
                              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="font-normal leading-snug truncate-2">
                                <LocationCell
                                  location={req.patient_location}
                                  pickupLocation={req.pickup_location}
                                  responderLocation={req.responder_location}
                                />
                              </span>
                            </div>
                            {req.hospital_name && (
                              <div className="flex items-start gap-3 text-sm p-3 geo-sharp bg-muted/30">
                                <Hospital className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                                <span className="font-normal leading-snug truncate-2">
                                  {req.hospital_name}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ACTIONS</div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-12">
                              {/* View Details - Always First */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(req)}
                                className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                                aria-label={`View details for emergency at ${req.location}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Primary Action: Dispatch OR Complete */}
                              {(currentUser.isAdmin() || currentUser.isOrgAdmin()) && (
                                <>
                                  {/* Dispatch Case: Pending/In-Progress & No Ambulance */}
                                  {(req.status === 'pending' || (req.status === 'in_progress' && !req.ambulance_id)) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDispatch(req)}
                                      className="geo-round h-8 w-8 p-0 hover:bg-success/10 hover:text-success transition-colors"
                                      title="Dispatch Emergency Response"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* Complete Case: Accepted/Has Ambulance & Not Completed */}
                                  {(req.status === 'accepted' || req.ambulance_id) && req.status !== 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleComplete(req)}
                                      className="geo-round h-8 w-8 p-0 hover:bg-info/10 hover:text-info transition-colors"
                                      title="Mark as Completed"
                                    >
                                      <CheckCheck className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Cash Payment Action */}
                                  {req.status === 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleProcessCash(req)}
                                      className="geo-round h-8 w-8 p-0 hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors"
                                      title="Process Cash Payment"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <circle cx="8" cy="8" r="6" />
                                        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                                        <path d="M7 6h1v4" />
                                        <path d="m16.71 13.88.7.71-2.82 2.82" />
                                      </svg>
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Delete Action - Always Last */}
                              {currentUser.isAdmin() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(req)}
                                  className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  aria-label={`Delete emergency request at ${req.location}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Provider-specific actions */}
                              {currentUser.isProvider() && req.status !== 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleComplete(req)}
                                  className="geo-round h-8 w-8 p-0 hover:bg-info/10 hover:text-info transition-colors"
                                  title="Mark as Completed"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </LayoutGroup>
              )}
            </>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <EmergencyRequestListView
              requests={requests}
              onView={handleViewDetails}
              onDelete={handleDelete}
              onDispatch={handleDispatch}
              onComplete={handleComplete}
              onProcessCash={handleProcessCash}
              isMobile={isMobile}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              currentUser={currentUser}
            />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <EmergencyRequestTableView
              requests={requests}
              onView={handleViewDetails}
              onDelete={handleDelete}
              onDispatch={handleDispatch}
              onComplete={handleComplete}
              onProcessCash={handleProcessCash}
              isMobile={isMobile}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              sortConfig={sortConfig}
              onSort={handleSort}
              currentUser={currentUser}
            />
          )}
        </>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        itemsPerPage={pagination.itemsPerPage}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
        loading={loading}
      />

      {/* Emergency Details Modal */}
      <EmergencyDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={(shouldRefresh) => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
          if (shouldRefresh === true) {
            fetchRequests();
          }
        }}
        request={selectedRequest}
      />

      {/* Emergency Request Modal */}
      <EmergencyRequestModal
        isOpen={isEmergencyModalOpen}
        onClose={handleCloseEmergencyModal}
        request={selectedRequest}
        mode="create"
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <ReportsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analyticsData={emergencyData?.stats}
        initialType="emergency"
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />

    </div>
  );
};
