import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useInsurance } from '../../hooks/useInsurance';
import { PaginationControls } from '../ui/PaginationControls';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { TableSkeleton } from '../ui/skeleton';
import { InsuranceModal } from '../modals/InsuranceModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { FilterSheet } from '../common/FilterSheet';
import { ViewToggle } from '../common/ViewToggle';
import { InsuranceListView } from '../views/InsuranceListView';
import { InsuranceTableView } from '../views/InsuranceTableView';
import { MobileInsurance } from '../mobile/MobileInsurance';
import {
  Shield,
  Plus,
  Filter as FilterIcon,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  Trash2,
  Eye,
  BarChart3,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { toast } from "sonner";
import { handleApiError } from "../../utils/errorHandler";
import { motion, LayoutGroup } from 'framer-motion';
import { Badge } from '../ui/badge';

export const InsuranceManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const {
    insurancePolicies,
    loading,
    error,
    fetchInsurancePolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    verifyPolicy,
    fetchAnalytics
  } = useInsurance();

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
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

  // Filter state - includes search
  const [filters, setFilters] = useState({ search: '', status: [], type: [], verified: '', kpiFilter: 'all' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { viewMode, setViewMode } = useViewMode('insurance', 'grid');
  const pagination = usePagination(20);

  // Listen for 'openInsuranceModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedPolicy(null);
      setModalMode('create');
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
  }, []);

  useEffect(() => {
    fetchInsurancePolicies();
  }, [fetchInsurancePolicies]);

  // Filter Logic
  const filteredPolicies = useMemo(() => {
    let policies = insurancePolicies;

    // Apply KPI filter first
    if (filters.kpiFilter === 'active') {
      policies = policies.filter(policy => policy.status === 'active');
    } else if (filters.kpiFilter === 'pending') {
      policies = policies.filter(policy => policy.status === 'pending');
    } else if (filters.kpiFilter === 'expired') {
      policies = policies.filter(policy => policy.status === 'expired');
    } else if (filters.kpiFilter === 'unverified') {
      policies = policies.filter(policy => !policy.verified);
    }
    // 'all' shows everything

    // Apply other filters
    const searchTerm = filters.search?.toLowerCase() || '';
    const matchesSearch = searchTerm === '' ||
      policies.filter(policy =>
        policy.policy_number?.toLowerCase().includes(searchTerm) ||
        policy.policy_holder_name?.toLowerCase().includes(searchTerm) ||
        policy.provider_name?.toLowerCase().includes(searchTerm)
      );

    const matchesStatus = !filters.status || filters.status.length === 0 || filters.status.some(status => policies.some(policy => policy.status === status));
    const matchesType = !filters.type || filters.type.length === 0 || filters.type.some(type => policies.some(policy => policy.policy_type === type));

    let matchesVerification = true;
    if (filters.verified === 'verified') matchesVerification = policies.some(policy => policy.verified === true);
    if (filters.verified === 'unverified') matchesVerification = policies.some(policy => policy.verified === false);

    return policies.filter(policy => {
      const searchMatch = searchTerm === '' ||
        policy.policy_number?.toLowerCase().includes(searchTerm) ||
        policy.policy_holder_name?.toLowerCase().includes(searchTerm) ||
        policy.provider_name?.toLowerCase().includes(searchTerm);

      const statusMatch = !filters.status || filters.status.length === 0 || filters.status.includes(policy.status);
      const typeMatch = !filters.type || filters.type.length === 0 || filters.type.includes(policy.policy_type);
      const verificationMatch = !filters.verified ||
        (filters.verified === 'verified' && policy.verified === true) ||
        (filters.verified === 'unverified' && policy.verified === false) ||
        (filters.verified === 'all');

      return searchMatch && statusMatch && typeMatch && verificationMatch;
    });
  }, [insurancePolicies, filters]);

  // Pagination Logic
  const paginatedPolicies = useMemo(() => {
    if (!filteredPolicies) return [];
    pagination.setTotalCount(filteredPolicies.length);
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return filteredPolicies.slice(start, start + pagination.itemsPerPage);
  }, [filteredPolicies, pagination]);

  const mobileVisiblePolicies = useMemo(() => {
    const visibleCount = pagination.currentPage * pagination.itemsPerPage;
    return filteredPolicies.slice(0, visibleCount);
  }, [filteredPolicies, pagination.currentPage, pagination.itemsPerPage]);

  // Handlers
  const handleCreate = useCallback(() => {
    setSelectedPolicy(null);
    setModalMode('create');
  }, []);

  const handleEdit = useCallback((policy) => {
    setSelectedPolicy(policy);
    setModalMode('edit');
  }, []);

  const handleView = useCallback((policy) => {
    setSelectedPolicy(policy);
    setModalMode('view');
  }, []);

  const handleDelete = useCallback(async (policy) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Insurance Policy',
      description: `Are you sure you want to delete policy ${policy.policy_number}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deletePolicy(policy.id);
          toast.success('Policy deleted successfully');
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleApiError(err, 'delete');
        }
      },
      variant: 'destructive',
      confirmLabel: 'Delete Policy'
    });
  }, [deletePolicy]);

  const handleVerify = useCallback(async (policy) => {
    try {
      await verifyPolicy(policy.id, true);
      toast.success('Policy verified successfully');
    } catch (err) {
      handleApiError(err, 'update');
    }
  }, [verifyPolicy]);

  const handleSelect = useCallback((id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(insurancePolicies.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  }, [insurancePolicies]);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleSave = useCallback(async (data) => {
    try {
      if (modalMode === 'edit' && selectedPolicy) {
        await updatePolicy(selectedPolicy.id, data);
        toast.success('Policy updated successfully');
      } else {
        await createPolicy(data);
        toast.success('Policy created successfully');
      }
      setModalMode(null);
    } catch (err) {
      handleApiError(err, selectedPolicy ? 'update' : 'create');
    }
  }, [selectedPolicy, modalMode, updatePolicy, createPolicy]);

  // Header Configuration
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter policies"
    >
      <FilterIcon className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.type && filters.type.length > 0) || filters.verified !== '' || filters.created_at) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add Policy)
  const headerActions = React.useMemo(() => (
    isAdmin && (
      <Button
        onClick={handleCreate}
        className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">ADD POLICY</span>
        <span className="md:hidden">ADD</span>
      </Button>
    )
  ), [isAdmin, handleCreate]);

  usePageHeader(
    'Insurance Management',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5  uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {filteredPolicies.length} Policies</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, filteredPolicies.length]);

  usePageFooter(footerContent, 'pagination', !loading && insurancePolicies.length > 0);

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
      label: 'Policy Type',
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
        { value: 'verified', label: 'Verified Only' },
        { value: 'unverified', label: 'Unverified Only' }
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Policy Date',
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
        <MobileInsurance
          policies={mobileVisiblePolicies}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onVerify={handleVerify}
          onRefresh={fetchInsurancePolicies}
          canManage={isAdmin()}
          loading={loading}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={handleViewAnalytics}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        <InsuranceModal
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          policy={selectedPolicy}
          mode={modalMode}
          onSave={handleSave}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="insurance"
          analytics={{
            total: insurancePolicies.length,
            active: insurancePolicies.filter(p => p.status === 'active').length,
            verified: insurancePolicies.filter(p => p.verified).length,
            expired: insurancePolicies.filter(p => p.status === 'expired').length
          }}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile={true}
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
  }


  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">

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
              className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-primary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Shield className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Policies</p>
                  {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insurancePolicies.length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">
                    {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
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
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
                  {filters.kpiFilter === 'active' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insurancePolicies.filter(p => p.status === 'active').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-success/20 text-success border-0 font-bold text-xs">
                    {Math.round((insurancePolicies.filter(p => p.status === 'active').length / insurancePolicies.length) * 100) || 0}%
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
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
                  {filters.kpiFilter === 'pending' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insurancePolicies.filter(p => p.status === 'pending').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-bold text-xs">
                    VERIFICATION
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
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expired</p>
                  {filters.kpiFilter === 'expired' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insurancePolicies.filter(p => p.status === 'expired').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-ticket bg-destructive/20 text-destructive border-0 font-bold text-xs">
                    ACTION NEEDED
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
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Unverified</p>
                  {filters.kpiFilter === 'unverified' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{insurancePolicies.filter(p => !p.verified).length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-wave bg-info/20 text-info border-0 font-bold text-xs">
                    VERIFY NOW
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

      </LayoutGroup>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredPolicies.length === 0 ? (
        <Card className="squircle-lg glass-card-premium p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">
            {filters.search ? 'No Policies Found' :
              filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ? 'No Policies Yet' :
                'No Matching Policies'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filters.search ? `No policies found matching "${filters.search}". Try adjusting your search terms.` :
              filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ?
                'Create your first insurance policy to get started with managing your coverage.' :
                'Try adjusting your filters or search criteria to find the policies you\'re looking for.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {filters.search && (
              <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="squircle">
                <X className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            )}
            {(filters.kpiFilter !== 'all' || Object.keys(filters).filter(k => k !== 'kpiFilter').some(k => filters[k])) && (
              <Button onClick={() => setFilters({ kpiFilter: 'all', status: '', type: '', verification: '', search: '' })} variant="outline" className="squircle">
                <FilterIcon className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button onClick={handleCreate} className="glass-card-premium">
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </div>
        </Card>
      ) : (
        <>
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
                      <div className={`hover-glow ${policy.status === 'expired' ? 'hover-glow-destructive' : 'hover-glow-primary'}`} />
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className={`absolute inset-0 ${policy.status === 'expired' ? 'bg-destructive/20' : 'bg-primary/10'} blur-xl rounded-full scale-150`} />
                          <div className="w-10 h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Shield className={`h-5 w-5 ${policy.status === 'expired' ? 'text-destructive' : 'text-primary'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-sharp ${getStatusBadge(policy.status)} border-0 font-bold editorial-subtitle px-3 py-1`}>
                          {policy.status}
                        </Badge>
                        {policy.verified && (
                          <Badge variant="outline" className="geo-sharp border-primary/20 text-primary px-2 py-1 font-semibold gap-1">
                            <CheckCircle className="w-3 h-3" /> VERIFIED
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
                            <DollarSign className="h-4 w-4 text-primary" />
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
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          ACTIONS
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(policy)}
                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            aria-label={`View details for ${policy.policy_holder_name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(policy)}
                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            aria-label={`Edit ${policy.policy_holder_name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(policy)}
                            className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${policy.policy_holder_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
              onEdit={handleEdit}
              onDelete={handleDelete}
              onVerify={handleVerify}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <InsuranceTableView
              policies={paginatedPolicies}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onVerify={handleVerify}
              getStatusBadge={getStatusBadge}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
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
        onSave={handleSave}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="insurance"
        analytics={{
          total: insurancePolicies.length,
          active: insurancePolicies.filter(p => p.status === 'active').length,
          verified: insurancePolicies.filter(p => p.verified).length,
          expired: insurancePolicies.filter(p => p.status === 'expired').length,
          expiringSoon: insurancePolicies.filter(p => {
            const expiryDate = new Date(p.end_date);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return expiryDate <= thirtyDaysFromNow && p.status === 'active';
          }).length,
          byProvider: insurancePolicies.reduce((acc, policy) => {
            acc[policy.provider_name] = (acc[policy.provider_name] || 0) + 1;
            return acc;
          }, {}),
          byCategory: insurancePolicies.reduce((acc, policy) => {
            acc[policy.policy_type] = (acc[policy.policy_type] || 0) + 1;
            return acc;
          }, {})
        }}
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

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
      >
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setConfirmationModal({
                isOpen: true,
                title: 'Delete Selected Policies',
                description: `Are you sure you want to delete ${selectedIds.length} policies? This action cannot be undone.`,
                onConfirm: async () => {
                  try {
                    let failed = 0;
                    for (const id of selectedIds) {
                      try { await deletePolicy(id); } catch { failed++; }
                    }
                    setSelectedIds([]);
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                    await fetchInsurancePolicies();
                    if (failed > 0) {
                      toast.error(`${failed} deletions failed.`);
                    } else {
                      toast.success(`${selectedIds.length} policies deleted`);
                    }
                  } catch (err) {
                    handleApiError(err, 'delete');
                  }
                },
                variant: 'destructive',
                confirmLabel: 'Delete All'
              });
            }}
            className="h-10 w-10 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
            title="Delete Selected"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </BulkActionBar>

    </div>
  );
};
