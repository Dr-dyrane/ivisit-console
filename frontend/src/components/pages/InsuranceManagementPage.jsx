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
import { InsuranceAnalyticsModal } from '../modals/InsuranceAnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { ViewToggle } from '../common/ViewToggle';
import { InsuranceListView } from '../views/InsuranceListView';
import { InsuranceTableView } from '../views/InsuranceTableView';
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
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
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

  // Filter state - includes search
  const [filters, setFilters] = useState({ search: '', status: [], type: [], verified: '' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { viewMode, setViewMode } = useViewMode('insurance', 'grid');
  const pagination = usePagination(20);

  // Listen for 'openInsuranceModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedPolicy(null);
      setModalMode('create');
    };
    window.addEventListener('openInsuranceModal', handleOpenModal);
    return () => window.removeEventListener('openInsuranceModal', handleOpenModal);
  }, []);

  // Filter Logic
  const filteredPolicies = useMemo(() => {
    return insurancePolicies.filter(policy => {
      const searchTerm = filters.search?.toLowerCase() || '';
      const matchesSearch = searchTerm === '' ||
        policy.policy_number?.toLowerCase().includes(searchTerm) ||
        policy.policy_holder_name?.toLowerCase().includes(searchTerm) ||
        policy.provider_name?.toLowerCase().includes(searchTerm);

      const matchesStatus = !filters.status || filters.status.length === 0 || filters.status.includes(policy.status);
      const matchesType = !filters.type || filters.type.length === 0 || filters.type.includes(policy.policy_type);

      let matchesVerification = true;
      if (filters.verified === 'verified') matchesVerification = policy.verified === true;
      if (filters.verified === 'unverified') matchesVerification = policy.verified === false;

      return matchesSearch && matchesStatus && matchesType && matchesVerification;
    });
  }, [insurancePolicies, filters]);

  // Pagination Logic
  const paginatedPolicies = useMemo(() => {
    if (!filteredPolicies) return [];
    pagination.setTotalCount(filteredPolicies.length);
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return filteredPolicies.slice(start, start + pagination.itemsPerPage);
  }, [filteredPolicies, pagination]);

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
    if (!window.confirm('Are you sure you want to delete this policy?')) return;
    try {
      await deletePolicy(policy.id);
      toast.success('Policy deleted successfully');
    } catch (err) {
      toast.error('Failed to delete policy');
    }
  }, [deletePolicy]);

  const handleVerify = useCallback(async (policy) => {
    try {
      await verifyPolicy(policy.id, true);
      toast.success('Policy verified successfully');
    } catch (err) {
      toast.error('Failed to verify policy');
    }
  }, [verifyPolicy]);

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
      toast.error(selectedPolicy ? 'Failed to update policy' : 'Failed to create policy');
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
    >
      <FilterIcon className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.type && filters.type.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add Policy)
  const headerActions = React.useMemo(() => (
    isAdmin && (
      <Button
        onClick={handleCreate}
        className="glass squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase"
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
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
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
    }
  ], []);


  return (
    <div className="min-h-screen bg-background px-0 md:px-12 py-6 md:py-8 pt-6">

      {/* Bento Overview Cards */}
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
        >
          {/* Total Policies Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="h-full min-h-[140px] geo-sharp glass-strong shadow-2xl p-6 border-0 hover-lift relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Policies</p>
                <h3 className="text-3xl font-black tracking-tighter">{filteredPolicies.length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-sm bg-primary/20 text-primary border-0 font-black text-xs">
                    {insurancePolicies.length} Total
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Active Policies Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="h-full min-h-[140px] geo-round glass-strong shadow-2xl p-6 border-0 hover-lift relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-success/20 blur-xl rounded-full scale-150" />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Active</p>
                <h3 className="text-3xl font-black tracking-tighter">{filteredPolicies.filter(p => p.status === 'active').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-sm bg-success/20 text-success border-0 font-black text-xs">
                    {Math.round((filteredPolicies.filter(p => p.status === 'active').length / filteredPolicies.length) * 100) || 0}% Active
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Pending Verification Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="h-full min-h-[140px] squircle-3xl glass-strong shadow-2xl p-6 border-0 hover-lift relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-warning/20 blur-xl rounded-full scale-150" />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Pending</p>
                <h3 className="text-3xl font-black tracking-tighter">{filteredPolicies.filter(p => p.status === 'pending').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-sm bg-warning/20 text-warning border-0 font-black text-xs">
                    Verification
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Analytics Button Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card 
              className="h-full min-h-[140px] geo-ticket glass-strong shadow-2xl p-6 border-0 hover-lift cursor-pointer group relative overflow-hidden"
              onClick={handleViewAnalytics}
            >
              <div className="absolute top-0 right-0 p-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-info/20 blur-xl rounded-full scale-150" />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <BarChart3 className="h-5 w-5 text-info" />
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center justify-between h-full">
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Analytics</p>
                  <h3 className="text-xl font-black tracking-tighter">View Insights</h3>
                </div>
                <div className="w-12 h-12 squircle bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 text-info" />
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </LayoutGroup>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            filteredPolicies.length === 0 ? (
              <Card className="squircle-lg glass shadow-premium p-12 border-0 text-center">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-black text-xl mb-2">No Policies Found</h3>
                <p className="text-muted-foreground mb-6">Create a new policy to get started</p>
                <Button onClick={handleCreate} className="squircle bg-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </Card>
            ) : (
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
                      <Card className="h-full squircle-xl glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 p-5 z-20">
                          <div className="relative">
                            <div className={`absolute inset-0 ${policy.status === 'expired' ? 'bg-destructive/20' : 'bg-primary/10'} blur-xl rounded-full scale-150`} />
                            <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                              <Shield className={`h-5 w-5 ${policy.status === 'expired' ? 'text-destructive' : 'text-primary'}`} />
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                          <Badge className={`geo-sharp ${getStatusBadge(policy.status)} border-0 font-black editorial-subtitle px-3 py-1`}>
                            {policy.status}
                          </Badge>
                          {policy.verified && (
                            <Badge variant="outline" className="geo-sharp border-primary/20 text-primary px-2 py-1 font-bold gap-1">
                              <CheckCircle className="w-3 h-3" /> VERIFIED
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-black text-xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                          {policy.policy_holder_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 font-mono tracking-tight">{policy.policy_number}</p>

                        <div className="space-y-3 mb-6 relative z-10 flex-1">
                          <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <span className="font-medium">Coverage</span>
                            </div>
                            <span className="font-bold text-foreground">
                              ${policy.coverage_amount?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 text-warning" />
                              <span className="font-medium">Expires</span>
                            </div>
                            <span className="font-bold text-foreground">
                              {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            ACTIONS
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(policy)}
                              className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(policy)}
                              className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(policy)}
                              className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
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
            )
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

      <InsuranceAnalyticsModal
        isOpen={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
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

    </div>
  );
};
