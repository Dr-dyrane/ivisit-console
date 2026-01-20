import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { withTimeout } from '../../lib/utils';
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
import { FilterSheet } from '../common/FilterSheet';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { SupportAnalyticsModal } from '../modals/SupportAnalyticsModal';
import { SupportTicketListView } from '../views/SupportTicketListView';
import { SupportTicketTableView } from '../views/SupportTicketTableView';
import { SupportTicketSimpleListView } from '../views/SupportTicketSimpleListView';

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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { viewMode, setViewMode } = useViewMode('support-tickets-page', 'grid');
  const pagination = usePagination(20);

  // Fetch support tickets with filters
  useEffect(() => {
    fetchSupportTickets(filters);
  }, [fetchSupportTickets, filters, pagination.currentPage]);

  // Listen for 'openSupportTicketModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedTicket(null);
      setModalMode('create');
    };
    window.addEventListener('openSupportTicketModal', handleOpenModal);
    return () => window.removeEventListener('openSupportTicketModal', handleOpenModal);
  }, []);

  // Fetch analytics on mount
  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, fetchAnalytics]);

  // Filter schema for FilterSheet
  const filterSchema = React.useMemo(() => [
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: STATUSES.map(status => ({
        value: status.value,
        label: status.label
      }))
    },
    {
      key: 'priority',
      type: 'multiselect',
      label: 'Priority',
      options: PRIORITIES.map(priority => ({
        value: priority.value,
        label: priority.label
      }))
    },
    {
      key: 'category',
      type: 'multiselect',
      label: 'Category',
      options: CATEGORIES.map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
      }))
    }
  ], []);

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

  // Memoized components for header
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary"
    >
      <Filter className="h-4 w-4" />
    </Button>
  ), []);

  const headerActions = React.useMemo(() => (
    <Button
      onClick={handleCreate}
      className="bg-muted/20 text-foreground hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
    >
      <Plus className="h-4 w-4 mr-2" />
      NEW TICKET
    </Button>
  ), [handleCreate]);

  usePageHeader(
    "Support Tickets",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Tickets</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && supportTickets.length > 0);

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
    <div className="min-h-screen py-6 md:py-8">
      <div className="pt-2" />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : supportTickets.length === 0 ? (
        <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-12 border-0 text-center col-span-full">
          <Headphones className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">No Support Tickets</h3>
          <p className="text-muted-foreground mb-6">There are currently no active support tickets.</p>
          <Button onClick={handleCreate} className="squircle bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create New Ticket
          </Button>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' && <SupportTicketListView tickets={supportTickets} onView={handleEdit} onEdit={handleEdit} onDelete={handleDelete} onAssign={handleAssign} getStatusConfig={getStatusConfig} getPriorityColor={getPriorityColor} isAdmin={isAdmin} isMobile={isMobile} />}
          {viewMode === 'list' && <SupportTicketSimpleListView tickets={supportTickets} onView={handleEdit} onEdit={handleEdit} onDelete={handleDelete} onAssign={handleAssign} getStatusConfig={getStatusConfig} getPriorityColor={getPriorityColor} isAdmin={isAdmin} isMobile={isMobile} />}
          {viewMode === 'table' && <SupportTicketTableView tickets={supportTickets} onView={handleEdit} onEdit={handleEdit} onDelete={handleDelete} onAssign={handleAssign} getStatusConfig={getStatusConfig} getPriorityColor={getPriorityColor} isAdmin={isAdmin} isMobile={isMobile} />}
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
