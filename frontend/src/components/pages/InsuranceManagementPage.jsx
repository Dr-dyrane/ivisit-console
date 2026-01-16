import React, { useState, useEffect, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useInsurance } from '../../hooks/useInsurance';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Building,
  CreditCard,
  BarChart3,
  Filter,
  Search,
  FileText,
  Upload,
  Download
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ViewToggle } from '../common/ViewToggle';
import { InsuranceModal } from '../modals/InsuranceModal';
import { InsuranceAnalyticsModal } from '../modals/InsuranceAnalyticsModal';

const COVERAGE_TYPES = [
  'health_maintenance', 'dental', 'vision', 'prescription', 'mental_health', 'emergency', 'specialist'
];

const PROVIDERS = [
  'Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Cigna', 'Humana', 'Kaiser Permanente',
  'Medicare', 'Medicaid', 'Private Insurance'
];

const STATUSES = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'expired', label: 'Expired', color: 'red' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'suspended', label: 'Suspended', color: 'gray' }
];

export const InsuranceManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const { 
    insurancePolicies, 
    loading, 
    error, 
    analytics,
    fetchInsurancePolicies, 
    createPolicy, 
    updatePolicy, 
    deletePolicy, 
    updateStatus,
    verifyPolicy,
    fetchAnalytics,
    clearError 
  } = useInsurance();

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { viewMode, setViewMode } = useViewMode('insurance-page', 'table');
  const pagination = usePagination(20);

  // Fetch analytics on mount
  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, fetchAnalytics]);

  // Filter and search policies
  const filteredPolicies = React.useMemo(() => {
    let filtered = insurancePolicies;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(policy => 
        policy.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.policy_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.policy_holder_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.coverage_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.provider_name) {
      filtered = filtered.filter(policy => policy.provider_name === filters.provider_name);
    }
    if (filters.coverage_type) {
      filtered = filtered.filter(policy => policy.coverage_type === filters.coverage_type);
    }
    if (filters.status) {
      filtered = filtered.filter(policy => policy.status === filters.status);
    }
    if (filters.verified !== undefined) {
      filtered = filtered.filter(policy => policy.verified === filters.verified);
    }

    return filtered;
  }, [insurancePolicies, searchTerm, filters]);

  // Paginated data
  const paginatedData = React.useMemo(() => {
    const start = pagination.paginationRange.start;
    const end = pagination.paginationRange.end;
    return filteredPolicies.slice(start, end + 1);
  }, [filteredPolicies, pagination.paginationRange]);

  // Update pagination when filtered data changes
  useEffect(() => {
    pagination.setTotalCount(filteredPolicies.length);
  }, [filteredPolicies.length, pagination]);

  const handleCreate = useCallback(() => {
    setSelectedPolicy(null);
    setModalMode('create');
  }, []);

  const handleEdit = useCallback((policy) => {
    setSelectedPolicy(policy);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (policy) => {
    if (window.confirm(`Are you sure you want to delete policy "${policy.policy_number}"?`)) {
      try {
        await deletePolicy(policy.id);
        toast.success('Insurance policy deleted successfully');
      } catch (error) {
        toast.error('Failed to delete insurance policy');
      }
    }
  }, [deletePolicy]);

  const handleStatusUpdate = useCallback(async (policy, newStatus) => {
    try {
      await updateStatus(policy.id, newStatus);
      toast.success(`Policy status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update policy status');
    }
  }, [updateStatus]);

  const handleVerify = useCallback(async (policy, verified) => {
    try {
      await verifyPolicy(policy.id, verified);
      toast.success(`Policy ${verified ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      toast.error('Failed to update verification status');
    }
  }, [verifyPolicy]);

  const getStatusConfig = (status) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  const isExpired = (endDate) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const end = new Date(endDate);
    return end > new Date() && end <= thirtyDaysFromNow;
  };

  // Header actions
  const headerActions = React.useMemo(() => (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search policies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {/* Filters */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFilters({})}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters
      </Button>

      {/* Analytics */}
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAnalyticsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      )}

      {/* Export */}
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      {/* Add New */}
      {isAdmin && (
        <Button
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      )}
    </div>
  ), [searchTerm, isAdmin, handleCreate]);

  usePageHeader('Insurance Management', headerActions);

  if (loading && insurancePolicies.length === 0) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={clearError}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Policies</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold">{analytics.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-2xl font-bold">{analytics.verified}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold">{analytics.expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {filteredPolicies.length} policies found
          </span>
        </div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Policies List/Table */}
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Holder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coverage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((policy) => {
                    const statusConfig = getStatusConfig(policy.status);
                    const expired = isExpired(policy.end_date);
                    const expiringSoon = isExpiringSoon(policy.end_date);
                    
                    return (
                      <tr key={policy.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {policy.policy_holder_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Building className="h-4 w-4 mr-1" />
                            {policy.provider_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm font-mono">
                            <CreditCard className="h-4 w-4 mr-1" />
                            {policy.policy_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {policy.coverage_type?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                            {policy.verified && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                            {expired && <AlertTriangle className="h-4 w-4 ml-2 text-red-500" />}
                            {expiringSoon && !expired && <AlertTriangle className="h-4 w-4 ml-2 text-orange-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerify(policy, !policy.verified)}
                                  className="h-8 w-8 p-0"
                                  title={policy.verified ? 'Unverify' : 'Verify'}
                                >
                                  {policy.verified ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(policy)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(policy)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {paginatedData.map((policy) => {
                const statusConfig = getStatusConfig(policy.status);
                const expired = isExpired(policy.end_date);
                const expiringSoon = isExpiringSoon(policy.end_date);
                
                return (
                  <Card key={policy.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {policy.policy_holder_name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {policy.provider_name}
                        </p>
                        <div className="flex items-center text-sm font-mono text-gray-600">
                          <CreditCard className="h-4 w-4 mr-1" />
                          {policy.policy_number}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        {policy.verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          {policy.coverage_type?.replace('_', ' ')}
                        </Badge>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      
                      {(expired || expiringSoon) && (
                        <div className={`p-2 rounded-lg text-xs ${
                          expired ? 'bg-red-50 text-red-700 border border-red-200' : 
                          'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}>
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {expired ? 'Policy Expired' : 'Expiring Soon'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerify(policy, !policy.verified)}
                          className="h-8 w-8 p-0"
                          title={policy.verified ? 'Unverify' : 'Verify'}
                        >
                          {policy.verified ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(policy)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Pagination */}
      <PaginationControls pagination={pagination} />

      {/* Modals */}
      <AnimatePresence>
        {modalMode && (
          <InsuranceModal
            policy={selectedPolicy}
            mode={modalMode}
            onClose={() => setModalMode(null)}
            onSave={modalMode === 'create' ? createPolicy : updatePolicy}
            coverageTypes={COVERAGE_TYPES}
            providers={PROVIDERS}
            statuses={STATUSES}
          />
        )}
        
        {analyticsModalOpen && (
          <InsuranceAnalyticsModal
            open={analyticsModalOpen}
            onClose={() => setAnalyticsModalOpen(false)}
            analytics={analytics}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
