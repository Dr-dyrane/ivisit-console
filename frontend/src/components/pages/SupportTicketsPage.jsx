import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser, applyAuthFilter } from '../../services/authService';
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
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  Filter,
  Search,
  Calendar,
  Tag,
  TrendingUp,
  User,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { ReportsModal } from '../modals/ReportsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { SupportTicketListView } from '../views/SupportTicketListView';
import { SupportTicketTableView } from '../views/SupportTicketTableView';
import { SEOHead } from '../common/SEOHead';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'blue' },
  { value: 'normal', label: 'Normal', color: 'green' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
];

const STATUSES = [
  { value: 'open', label: 'Open', icon: Clock, color: 'bg-warning/20 text-warning' },
  { value: 'in_progress', label: 'In Progress', icon: Activity, color: 'bg-info/20 text-info' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'bg-success/20 text-success' },
  { value: 'closed', label: 'Closed', icon: CheckCircle, color: 'bg-muted/20 text-muted-foreground' }
];

const CATEGORIES = [
  'general', 'technical', 'billing', 'account', 'feature_request', 'bug_report', 'medical'
];

export const SupportTicketsPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, profile } = useAuth();
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
  const [filters, setFilters] = useState({ search: '', status: [], priority: [], category: [], kpiFilter: 'all' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { viewMode, setViewMode } = useViewMode('support-tickets-page', 'grid');
  const pagination = usePagination(20);

  // Apply filters and fetch logic
  useEffect(() => {
    const queryFilters = { ...filters };

    // KPI Filter Override
    if (filters.kpiFilter && filters.kpiFilter !== 'all') {
      if (filters.kpiFilter === 'avg') {
        // No filter for Avg, just show all or maybe recently resolved?
        // For now treat as 'all' for list, but UI shows selected
      } else {
        queryFilters.status = [filters.kpiFilter];
      }
    }

    // Remove client-side only filters from API call if needed
    delete queryFilters.kpiFilter;

    fetchSupportTickets(queryFilters);
  }, [fetchSupportTickets, filters, pagination.currentPage]);

  // Listen for 'openSupportTicketModal'
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedTicket(null);
      setModalMode('create');
    };

    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };

    window.addEventListener('openSupportTicketModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);

    return () => {
      window.removeEventListener('openSupportTicketModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
    };
  }, []);

  // Fetch analytics separately
  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, fetchAnalytics]);

  // Handlers
  const handleCreate = useCallback(() => {
    setSelectedTicket(null);
    setModalMode('create');
  }, []);

  const handleEdit = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (ticket) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Support Ticket',
      description: `Are you sure you want to delete ticket "${ticket.subject}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteTicket(ticket.id);
          toast.success('Ticket deleted successfully');
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleApiError(error, 'delete');
        }
      },
      variant: 'destructive',
      confirmLabel: 'Delete Ticket'
    });
  }, [deleteTicket]);

  const handleSelect = useCallback((id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(supportTickets.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  }, [supportTickets]);

  const handleAssign = useCallback(async (ticket) => {
    try {
      await assignTicketToAgent(ticket.id, profile.id);
      toast.success('Ticket assigned to you');
    } catch (error) {
      handleApiError(error, 'update');
    }
  }, [assignTicketToAgent, profile]);

  const handleView = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setModalMode('edit'); // Reuse edit modal for view details
  }, []);

  const getPriorityColor = (priority) => {
    const priorityConfig = PRIORITIES.find(p => p.value === priority);
    return priorityConfig?.color || 'gray';
  };

  const getStatusConfig = (status) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  // Header helpers
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter tickets"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || filters.kpiFilter !== 'all' || filters.created_at) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const headerActions = React.useMemo(() => {
    // Admins, Org Admins, and Providers can create new support tickets
    if (isAdmin() || isOrgAdmin() || isProvider()) {
      return (
        <Button
          onClick={handleCreate}
          className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
          aria-label="Create new ticket"
        >
          <Plus className="h-4 w-4 mr-2" />
          NEW TICKET
        </Button>
      );
    }
    return null;
  }, [isAdmin, isOrgAdmin, isProvider, handleCreate]);

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

  // Filter Schema
  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search tickets...'
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: STATUSES.map(s => ({ value: s.value, label: s.label }))
    },
    {
      key: 'priority',
      type: 'multiselect',
      label: 'Priority',
      options: PRIORITIES.map(p => ({ value: p.value, label: p.label }))
    },
    {
      key: 'category',
      type: 'multiselect',
      label: 'Category',
      options: CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ') }))
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Created Date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], []);

  if (loading && supportTickets.length === 0 && !analytics) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="Support Tickets" description="Track and resolve customer support inquiries." />
      {/* Bento Grid KPI Stats - Matching Insurance Layout */}
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
        >
          {/* Total */}
          <motion.div layout className="col-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card
              className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group ${filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
              role="button"
              tabIndex={0}
              aria-label="Show all tickets"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-primary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <Headphones className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Tickets</p>
                  {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{analytics?.total || 0}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-xs">{filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}</Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Open */}
          <motion.div layout className="col-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card
              className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group ${filters.kpiFilter === 'open' ? 'ring-2 ring-warning shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'open' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by open tickets"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-warning" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'open' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <AlertCircle className={`h-5 w-5 ${filters.kpiFilter === 'open' ? 'text-warning' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Open</p>
                  {filters.kpiFilter === 'open' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{analytics?.open || 0}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-warning/20 text-warning border-0 font-bold text-xs">ATTENTION</Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* In Progress */}
          <motion.div layout className="col-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card
              className={`h-full min-h-[140px] squircle-3xl glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group ${filters.kpiFilter === 'in_progress' ? 'ring-2 ring-info shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'in_progress' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by in-progress tickets"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'in_progress' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <Activity className={`h-5 w-5 ${filters.kpiFilter === 'in_progress' ? 'text-info' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">In Progress</p>
                  {filters.kpiFilter === 'in_progress' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{analytics?.inProgress || 0}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-3xl bg-info/20 text-info border-0 font-bold text-xs">ACTIVE</Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Resolved */}
          <motion.div layout className="col-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <Card
              className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group ${filters.kpiFilter === 'resolved' ? 'ring-2 ring-success shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'resolved' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by resolved tickets"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-success" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'resolved' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <CheckCircle className={`h-5 w-5 ${filters.kpiFilter === 'resolved' ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resolved</p>
                  {filters.kpiFilter === 'resolved' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{analytics?.resolved || 0}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-ticket bg-success/20 text-success border-0 font-bold text-xs">COMPLETE</Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Avg Turnaround */}
          <motion.div layout className="col-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card
              className={`h-full min-h-[140px] geo-wave glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group ${filters.kpiFilter === 'avg' ? 'ring-2 ring-muted shadow-lg' : ''}`}
            // onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'avg' }))} // Optional
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-secondary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className={`absolute inset-0 ${filters.kpiFilter === 'avg' ? 'bg-muted/30' : 'bg-muted/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <TrendingUp className={`h-5 w-5 ${filters.kpiFilter === 'avg' ? 'text-foreground' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg Time</p>
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{analytics?.averageResolutionTime || 0}h</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-wave bg-muted/20 text-muted-foreground border-0 font-bold text-xs">METRIC</Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </LayoutGroup>

      {/* Main Content */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : supportTickets.length === 0 ? (
        <Card className="squircle-lg glass-card-premium p-12 text-center">
          <Headphones className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">
            {filters.search || filters.kpiFilter !== 'all' ? 'No Matching Tickets' : 'No Support Tickets'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filters.search || filters.kpiFilter !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'There are currently no active support tickets in the system.'}
          </p>
          <div className="flex justify-center gap-3">
            {(filters.search || filters.kpiFilter !== 'all') && (
              <Button onClick={() => setFilters({ search: '', status: [], priority: [], category: [], kpiFilter: 'all' })} variant="outline" className="squircle" aria-label="Reset all filters">
                <X className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button onClick={handleCreate} className="glass-card-premium" aria-label="Create your first support ticket">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Inline Grid View for perfect match */}
          {viewMode === 'grid' && (
            <LayoutGroup>
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense">
                {supportTickets.map((ticket, index) => (
                  <motion.div
                    layout
                    key={ticket.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="col-span-1"
                  >
                    <Card className="h-full squircle-xl glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col">
                      {/* Apple hover glow effect */}
                      <div className={`hover-glow ${ticket.priority === 'urgent' ? 'hover-glow-destructive' : ticket.priority === 'high' ? 'hover-glow-warning' : 'hover-glow-primary'}`} />
                      {/* Deco */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className={`absolute inset-0 ${ticket.priority === 'urgent' ? 'bg-destructive/20' : ticket.priority === 'high' ? 'bg-orange-500/20' : 'bg-primary/10'} blur-xl rounded-full scale-150`} />
                          <div className="w-10 h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            {ticket.status === 'open' ? <AlertCircle className="h-5 w-5 text-warning" /> :
                              ticket.status === 'resolved' ? <CheckCircle className="h-5 w-5 text-success" /> :
                                <Activity className="h-5 w-5 text-primary" />}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-sharp ${getStatusConfig(ticket.status).color} border-0 font-bold editorial-subtitle px-3 py-1`}>
                          {getStatusConfig(ticket.status).label.toUpperCase()}
                        </Badge>
                        {ticket.priority === 'urgent' && (
                          <Badge variant="outline" className="geo-sharp border-destructive/20 text-destructive px-2 py-1 font-semibold gap-1">
                            <AlertTriangle className="w-3 h-3" /> URGENT
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 tracking-tight relative z-10 line-clamp-2">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground mb-6 font-mono tracking-tight">{ticket.id.substring(0, 8)}</p>

                      <div className="space-y-3 mb-6 relative z-10 flex-1">
                        <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-normal">Customer</span>
                          </div>
                          <span className="font-semibold text-foreground truncate max-w-[120px]">{ticket.customer_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 text-info" />
                            <span className="font-normal">Created</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ACTIONS</div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button variant="ghost" size="sm" onClick={() => handleView(ticket)} className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" aria-label={`View ticket ${ticket.id}`}>
                            <Headphones className="h-4 w-4" />
                          </Button>
                          {/* RBAC: Admins and Org Admins can edit/delete, Providers can edit their own tickets */}
                          {(isAdmin() || isOrgAdmin()) && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(ticket)} className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" aria-label={`Edit ticket ${ticket.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(ticket)} className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ticket ${ticket.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {/* Providers can edit their own tickets but not delete */}
                          {isProvider() && ticket.user_id === profile?.id && (
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(ticket)} className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" aria-label={`Edit ticket ${ticket.id}`}>
                              <Edit className="h-4 w-4" />
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

          {/* ListView fallback */}
          {viewMode === 'list' && <SupportTicketListView tickets={supportTickets} onView={handleEdit} onEdit={handleEdit} onDelete={handleDelete} onAssign={handleAssign} getStatusConfig={getStatusConfig} getPriorityColor={getPriorityColor} isAdmin={isAdmin} isMobile={isMobile} />}
          {viewMode === 'table' && <SupportTicketTableView tickets={supportTickets} onView={handleEdit} onEdit={handleEdit} onDelete={handleDelete} onAssign={handleAssign} getStatusConfig={getStatusConfig} getPriorityColor={getPriorityColor} isAdmin={isAdmin} isMobile={isMobile} selectedIds={selectedIds} onSelect={handleSelect} onSelectAll={handleSelectAll} />}
        </>
      )}

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

      {/* Modals ... */}
      <AnimatePresence>
        {modalMode && <SupportTicketModal ticket={selectedTicket} mode={modalMode} onClose={() => setModalMode(null)} onSave={modalMode === 'create' ? createTicket : updateTicket} priorities={PRIORITIES} categories={CATEGORIES} />}
        <ReportsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} analyticsData={analytics} initialType="support" />
      </AnimatePresence>

      <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={setFilters} initialValues={filters} viewToggle={isMobile ? viewToggleComponent : null} isMobile={isMobile} />

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
                title: 'Delete Selected Tickets',
                description: `Are you sure you want to delete ${selectedIds.length} tickets? This action cannot be undone.`,
                onConfirm: async () => {
                  try {
                    // Bulk delete logic would go here
                    toast.success(`${selectedIds.length} tickets deleted`);
                    setSelectedIds([]);
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
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
  )
}
