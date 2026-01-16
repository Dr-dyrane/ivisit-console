import React, { useState, useEffect, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { 
  Headphones, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  UserCheck,
  BarChart3,
  Filter,
  Search,
  Calendar,
  Tag,
  Flag
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ViewToggle } from '../common/ViewToggle';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { SupportAnalyticsModal } from '../modals/SupportAnalyticsModal';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'blue' },
  { value: 'normal', label: 'Normal', color: 'green' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
];

const STATUSES = [
  { value: 'open', label: 'Open', icon: AlertCircle, color: 'red' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'yellow' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'green' },
  { value: 'closed', label: 'Closed', icon: CheckCircle, color: 'gray' }
];

const CATEGORIES = [
  'general', 'technical', 'billing', 'account', 'feature_request', 'bug_report', 'medical'
];

export const SupportTicketsPage = () => {
  const { isAdmin, profile } = useAuth();
  const { isMobile } = useNavigation();
  const { 
    supportTickets, 
    loading, 
    error, 
    analytics,
    fetchSupportTickets, 
    createTicket, 
    updateTicket, 
    deleteTicket, 
    updateStatus,
    assignTicketToAgent,
    fetchAnalytics,
    clearError 
  } = useSupportTickets();

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { viewMode, setViewMode } = useViewMode('support-tickets-page', 'table');
  const pagination = usePagination(20);

  // Fetch analytics on mount
  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, fetchAnalytics]);

  // Filter and search tickets
  const filteredTickets = React.useMemo(() => {
    let filtered = supportTickets;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }
    if (filters.category) {
      filtered = filtered.filter(ticket => ticket.category === filters.category);
    }

    return filtered;
  }, [supportTickets, searchTerm, filters]);

  // Paginated data
  const paginatedData = React.useMemo(() => {
    const start = pagination.paginationRange.start;
    const end = pagination.paginationRange.end;
    return filteredTickets.slice(start, end + 1);
  }, [filteredTickets, pagination.paginationRange]);

  // Update pagination when filtered data changes
  useEffect(() => {
    pagination.setTotalCount(filteredTickets.length);
  }, [filteredTickets.length, pagination]);

  const handleCreate = useCallback(() => {
    setSelectedTicket(null);
    setModalMode('create');
  }, []);

  const handleEdit = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (ticket) => {
    if (window.confirm(`Are you sure you want to delete ticket "${ticket.subject}"?`)) {
      try {
        await deleteTicket(ticket.id);
        toast.success('Support ticket deleted successfully');
      } catch (error) {
        toast.error('Failed to delete support ticket');
      }
    }
  }, [deleteTicket]);

  const handleStatusUpdate = useCallback(async (ticket, newStatus) => {
    try {
      await updateStatus(ticket.id, newStatus);
      toast.success(`Ticket status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update ticket status');
    }
  }, [updateStatus]);

  const handleAssign = useCallback(async (ticket) => {
    try {
      await assignTicketToAgent(ticket.id, profile.id);
      toast.success('Ticket assigned to you');
    } catch (error) {
      toast.error('Failed to assign ticket');
    }
  }, [assignTicketToAgent, profile]);

  const getPriorityColor = (priority) => {
    const priorityConfig = PRIORITIES.find(p => p.value === priority);
    return priorityConfig?.color || 'gray';
  };

  const getStatusConfig = (status) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  // Header actions
  const headerActions = React.useMemo(() => (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tickets..."
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

      {/* Add New */}
      <Button
        onClick={handleCreate}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        New Ticket
      </Button>
    </div>
  ), [searchTerm, isAdmin, handleCreate]);

  usePageHeader('Support Tickets', headerActions);

  if (loading && supportTickets.length === 0) {
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
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
              <Headphones className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="text-2xl font-bold">{analytics.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-2xl font-bold">{analytics.recent}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Resolution</p>
                <p className="text-2xl font-bold">
                  {Math.round(analytics.averageResolutionTime || 0)}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {filteredTickets.length} tickets found
          </span>
        </div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Tickets List/Table */}
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
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {ticket.subject}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ticket.message?.substring(0, 100)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {ticket.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            <Flag className="h-3 w-3 mr-1" />
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(ticket)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(ticket)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {ticket.status === 'open' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAssign(ticket)}
                                className="h-8 w-8 p-0"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
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
              {paginatedData.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card key={ticket.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {ticket.message}
                        </p>
                      </div>
                      <Badge variant={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          <Flag className="h-3 w-3 mr-1" />
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline">
                          {ticket.category}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {ticket.status === 'open' && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          onClick={() => handleAssign(ticket)}
                          className="w-full"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Assign to Me
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
          <SupportTicketModal
            ticket={selectedTicket}
            mode={modalMode}
            onClose={() => setModalMode(null)}
            onSave={modalMode === 'create' ? createTicket : updateTicket}
            priorities={PRIORITIES}
            categories={CATEGORIES}
          />
        )}
        
        {analyticsModalOpen && (
          <SupportAnalyticsModal
            open={analyticsModalOpen}
            onClose={() => setAnalyticsModalOpen(false)}
            analytics={analytics}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
