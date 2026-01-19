import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { PaginationControls } from '../ui/PaginationControls';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { TableSkeleton } from '../ui/skeleton';
import { SubscriptionModal } from '../modals/SubscriptionModal';
import { SubscriptionAnalyticsModal } from '../modals/SubscriptionAnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { ViewToggle } from '../common/ViewToggle';
import { SubscriptionListView } from '../views/SubscriptionListView';
import { SubscriptionTableView } from '../views/SubscriptionTableView';
import {
  Users,
  Plus,
  Filter as FilterIcon,
  Search,
  CheckCircle,
  Clock,
  Mail,
  Trash2,
  Eye,
  BarChart3,
  Edit,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, LayoutGroup } from 'framer-motion';
import { Badge } from '../ui/badge';
import { subscribeToSubscribers } from '../../services/subscribersService';
import { supabase } from '../../lib/supabase';

export const SubscriptionManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const {
    subscribers,
    loading,
    error,
    fetchSubscribers,
    createSubscriber,
    updateSubscriber,
    deleteSubscriber,
    fetchAnalytics
  } = useSubscription();

  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  // Filter state - includes search (enhanced based on insurance baseline)
  const [filters, setFilters] = useState({ 
    search: '', 
    status: [], 
    type: [], 
    kpiFilter: 'all',
    welcomeEmailSent: '',
    dateRange: 'all'
  });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { viewMode, setViewMode } = useViewMode('subscription', 'grid');
  const pagination = usePagination(20);

  // Listen for 'openSubscriptionModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedSubscriber(null);
      setModalMode('create');
    };
    window.addEventListener('openSubscriptionModal', handleOpenModal);
    return () => window.removeEventListener('openSubscriptionModal', handleOpenModal);
  }, []);

  // Listen for 'openSubscriptionAnalyticsModal' event from ContextPanel
  useEffect(() => {
    const handleOpenAnalytics = (event) => {
      setAnalyticsModalOpen(true);
      if (event.detail?.button) {
        console.log('Analytics button reference:', event.detail.button);
      }
    };
    window.addEventListener('openSubscriptionAnalyticsModal', handleOpenAnalytics);
    return () => window.removeEventListener('openSubscriptionAnalyticsModal', handleOpenAnalytics);
  }, []);

  // Real-time listener for new subscribers
  useEffect(() => {
    const handleNewSubscriber = async (newSubscriber, eventType) => {
      // Only handle INSERT events for new users
      if (eventType === 'INSERT' && newSubscriber.new_user) {
        // Show real-time notification in dashboard UI
        toast.success(`New subscriber: ${newSubscriber.email}`, {
          duration: 5000,
          icon: <Mail className="h-4 w-4" />
        });

        // Trigger Edge Function to send welcome email
        try {
          const { data, error } = await supabase.functions.invoke('sendWelcome', {
            body: { email: newSubscriber.email }
          });

          if (error) {
            console.error('Failed to send welcome email:', error);
            toast.error(`Failed to send welcome email to ${newSubscriber.email}`);
          } else {
            console.log('Welcome email sent successfully:', data);
            toast.success(`Welcome email sent to ${newSubscriber.email}`);
            
            // Refresh subscribers list to show updated status
            fetchSubscribers();
          }
        } catch (error) {
          console.error('Error calling sendWelcome function:', error);
          toast.error(`Error sending welcome email to ${newSubscriber.email}`);
        }
      }
    };

    const unsubscribe = subscribeToSubscribers(handleNewSubscriber);

    return () => {
      unsubscribe();
    };
  }, [fetchSubscribers]);

  // Filter Logic (enhanced based on insurance baseline)
  const filteredSubscribers = useMemo(() => {
    let subscribers_list = subscribers;

    // Apply KPI filter first
    if (filters.kpiFilter === 'active') {
      subscribers_list = subscribers_list.filter(subscriber => subscriber.status === 'active');
    } else if (filters.kpiFilter === 'new') {
      subscribers_list = subscribers_list.filter(subscriber => subscriber.new_user);
    } else if (filters.kpiFilter === 'paid') {
      subscribers_list = subscribers_list.filter(subscriber => subscriber.type === 'paid');
    } else if (filters.kpiFilter === 'free') {
      subscribers_list = subscribers_list.filter(subscriber => subscriber.type === 'free');
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (filters.dateRange) {
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        subscribers_list = subscribers_list.filter(subscriber => 
          new Date(subscriber.subscription_date || subscriber.created_at) >= cutoffDate
        );
      }
    }

    // Apply other filters
    const searchTerm = filters.search?.toLowerCase() || '';
    const matchesSearch = searchTerm === '' ||
      subscribers_list.filter(subscriber => 
        subscriber.email?.toLowerCase().includes(searchTerm)
      );

    const matchesStatus = !filters.status || filters.status.length === 0 || filters.status.some(status => subscribers_list.some(subscriber => subscriber.status === status));
    const matchesType = !filters.type || filters.type.length === 0 || filters.type.some(type => subscribers_list.some(subscriber => subscriber.type === type));

    let matchesWelcomeEmail = true;
    if (filters.welcomeEmailSent === 'sent') {
      matchesWelcomeEmail = subscribers_list.some(subscriber => subscriber.welcome_email_sent === true);
    } else if (filters.welcomeEmailSent === 'pending') {
      matchesWelcomeEmail = subscribers_list.some(subscriber => subscriber.welcome_email_sent === false);
    }

    return subscribers_list.filter(subscriber => {
      const searchMatch = searchTerm === '' ||
        subscriber.email?.toLowerCase().includes(searchTerm);

      const statusMatch = !filters.status || filters.status.length === 0 || filters.status.includes(subscriber.status);
      const typeMatch = !filters.type || filters.type.length === 0 || filters.type.includes(subscriber.type);
      const welcomeEmailMatch = !filters.welcomeEmailSent || 
        (filters.welcomeEmailSent === 'sent' && subscriber.welcome_email_sent === true) ||
        (filters.welcomeEmailSent === 'pending' && subscriber.welcome_email_sent === false) ||
        (filters.welcomeEmailSent === 'all');

      return searchMatch && statusMatch && typeMatch && welcomeEmailMatch;
    });
  }, [subscribers, filters]);

  // Pagination Logic
  const paginatedSubscribers = useMemo(() => {
    if (!filteredSubscribers) return [];
    pagination.setTotalCount(filteredSubscribers.length);
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return filteredSubscribers.slice(start, start + pagination.itemsPerPage);
  }, [filteredSubscribers, pagination]);

  // Handlers
  const handleCreate = useCallback(() => {
    setSelectedSubscriber(null);
    setModalMode('create');
  }, []);

  const handleEdit = useCallback((subscriber) => {
    setSelectedSubscriber(subscriber);
    setModalMode('edit');
  }, []);

  const handleView = useCallback((subscriber) => {
    setSelectedSubscriber(subscriber);
    setModalMode('view');
  }, []);

  const handleDelete = useCallback(async (subscriber) => {
    if (!window.confirm('Are you sure you want to delete this subscriber?')) return;
    try {
      await deleteSubscriber(subscriber.id);
      toast.success('Subscriber deleted successfully');
    } catch (err) {
      toast.error('Failed to delete subscriber');
    }
  }, [deleteSubscriber]);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleSave = useCallback(async (data) => {
    try {
      if (modalMode === 'edit' && selectedSubscriber) {
        await updateSubscriber(selectedSubscriber.id, data);
        toast.success('Subscriber updated successfully');
      } else {
        await createSubscriber(data);
        toast.success('Subscriber created successfully');
      }
      setModalMode(null);
    } catch (err) {
      toast.error(selectedSubscriber ? 'Failed to update subscriber' : 'Failed to create subscriber');
    }
  }, [selectedSubscriber, modalMode, updateSubscriber, createSubscriber]);

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
      {(filters.search || 
        (filters.status && filters.status.length > 0) || 
        (filters.type && filters.type.length > 0) ||
        filters.welcomeEmailSent ||
        filters.dateRange !== 'all') && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  // Primary Action (Add Subscriber)
  const headerActions = React.useMemo(() => (
    isAdmin && (
      <Button
        onClick={handleCreate}
        className="bg-muted/20 hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] text-foreground font-black tracking-widest uppercase"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">ADD SUBSCRIBER</span>
        <span className="md:hidden">ADD</span>
      </Button>
    )
  ), [isAdmin, handleCreate]);

  usePageHeader(
    'Subscription Management',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {filteredSubscribers.length} Subscribers</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, filteredSubscribers.length]);

  usePageFooter(footerContent, 'pagination', !loading && subscribers.length > 0);

  // Badge Logic
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success';
      case 'unsubscribed': return 'bg-destructive/20 text-destructive';
      case 'pending': return 'bg-warning/20 text-warning';
      case 'bounced': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'paid': return 'bg-primary/20 text-primary';
      case 'free': return 'bg-muted/20 text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter Schema (enhanced based on insurance baseline)
  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search subscribers...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'unsubscribed', label: 'Unsubscribed' },
        { value: 'bounced', label: 'Bounced' }
      ]
    },
    {
      key: 'type',
      type: 'multiselect',
      label: 'Subscription Type',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'paid', label: 'Paid' }
      ]
    },
    {
      key: 'welcomeEmailSent',
      type: 'select',
      label: 'Welcome Email',
      options: [
        { value: '', label: 'All' },
        { value: 'sent', label: 'Sent' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      key: 'dateRange',
      type: 'select',
      label: 'Date Range',
      options: [
        { value: 'all', label: 'All Time' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 90 Days' }
      ]
    }
  ], []);

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">

      {/* Bento Overview Cards - Enhanced with Filtering */}
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8"
        >
          {/* Total Subscribers Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card 
              className={`h-full min-h-[140px] geo-sharp bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
                filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
            >
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <Users className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Subscribers</p>
                  {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{subscribers.length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-black text-xs">
                    {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Active Subscribers Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card 
              className={`h-full min-h-[140px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
                filters.kpiFilter === 'active' ? 'ring-2 ring-success shadow-lg' : ''
              }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'active' }))}
            >
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'active' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <CheckCircle className={`h-5 w-5 ${filters.kpiFilter === 'active' ? 'text-success' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active</p>
                  {filters.kpiFilter === 'active' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{subscribers.filter(s => s.status === 'active').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-success/20 text-success border-0 font-black text-xs">
                    {Math.round((subscribers.filter(s => s.status === 'active').length / subscribers.length) * 100) || 0}%
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* New Users Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card 
              className={`h-full min-h-[140px] squircle-3xl bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
                filters.kpiFilter === 'new' ? 'ring-2 ring-warning shadow-lg' : ''
              }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'new' }))}
            >
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'new' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <Clock className={`h-5 w-5 ${filters.kpiFilter === 'new' ? 'text-warning' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">New Users</p>
                  {filters.kpiFilter === 'new' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{subscribers.filter(s => s.new_user).length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="squircle-3xl bg-warning/20 text-warning border-0 font-black text-xs">
                    RECENT
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Paid Subscribers Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card 
              className={`h-full min-h-[140px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
                filters.kpiFilter === 'paid' ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'paid' }))}
            >
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'paid' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <Crown className={`h-5 w-5 ${filters.kpiFilter === 'paid' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Paid</p>
                  {filters.kpiFilter === 'paid' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{subscribers.filter(s => s.type === 'paid').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-ticket bg-primary/20 text-primary border-0 font-black text-xs">
                    SUPPORTERS
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Free Subscribers Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card 
              className={`h-full min-h-[140px] geo-wave bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${
                filters.kpiFilter === 'free' ? 'ring-2 ring-info shadow-lg' : ''
              }`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'free' }))}
            >
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'free' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <Users className={`h-5 w-5 ${filters.kpiFilter === 'free' ? 'text-info' : 'text-muted-foreground'} transition-colors duration-200`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Free</p>
                  {filters.kpiFilter === 'free' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{subscribers.filter(s => s.type === 'free').length}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-wave bg-info/20 text-info border-0 font-black text-xs">
                    EARLY ACCESS
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </LayoutGroup>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredSubscribers.length === 0 ? (
        <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-12 border-0 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-black text-xl mb-2">
            {filters.search ? 'No Subscribers Found' : 
             filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ? 'No Subscribers Yet' :
             'No Matching Subscribers'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filters.search ? `No subscribers found matching "${filters.search}". Try adjusting your search terms.` :
             filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ? 
             'Create your first subscriber to get started with managing your community.' :
             'Try adjusting your filters or search criteria to find the subscribers you\'re looking for.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {filters.search && (
              <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="squircle">
                <FilterIcon className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            )}
            {(filters.kpiFilter !== 'all' || 
              Object.keys(filters).filter(k => k !== 'kpiFilter').some(k => {
                if (k === 'status' || k === 'type') return filters[k] && filters[k].length > 0;
                return filters[k] && filters[k] !== '' && filters[k] !== 'all';
              })) && (
              <Button onClick={() => setFilters({ kpiFilter: 'all', status: [], type: [], search: '', welcomeEmailSent: '', dateRange: 'all' })} variant="outline" className="squircle">
                <FilterIcon className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button onClick={handleCreate} className="squircle bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Subscriber
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
                {paginatedSubscribers.map((subscriber, index) => (
                  <motion.div
                    layout
                    key={subscriber.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="col-span-1"
                  >
                    <Card className="h-full squircle-xl bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className={`absolute inset-0 ${subscriber.status === 'unsubscribed' ? 'bg-destructive/20' : 'bg-primary/10'} blur-xl rounded-full scale-150`} />
                          <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                            <Mail className={`h-5 w-5 ${subscriber.status === 'unsubscribed' ? 'text-destructive' : 'text-primary'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-sharp ${getStatusBadge(subscriber.status)} border-0 font-black editorial-subtitle px-3 py-1`}>
                          {subscriber.status}
                        </Badge>
                        <Badge className={`geo-sharp ${getTypeBadge(subscriber.type)} border-0 font-black editorial-subtitle px-3 py-1`}>
                          {subscriber.type}
                        </Badge>
                        {subscriber.new_user && (
                          <Badge variant="outline" className="geo-sharp border-warning/20 text-warning px-2 py-1 font-bold gap-1">
                            <Clock className="w-3 h-3" /> NEW
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-black text-lg mb-2 tracking-tight relative z-10 truncate">
                        {subscriber.email}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 font-mono tracking-tight">
                        {subscriber.subscription_date ? new Date(subscriber.subscription_date).toLocaleDateString() : 'N/A'}
                      </p>

                      <div className="space-y-3 mb-6 relative z-10 flex-1">
                        <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 text-primary" />
                            <span className="font-medium">Email Sent</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {subscriber.welcome_email_sent ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 geo-sharp bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-warning" />
                            <span className="font-medium">Last Active</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {subscriber.last_engagement_at ? new Date(subscriber.last_engagement_at).toLocaleDateString() : 'Never'}
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
                            onClick={() => handleView(subscriber)}
                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(subscriber)}
                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(subscriber)}
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
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <SubscriptionListView
              subscribers={paginatedSubscribers}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              getTypeBadge={getTypeBadge}
              isMobile={isMobile}
            />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <SubscriptionTableView
              subscribers={paginatedSubscribers}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              getTypeBadge={getTypeBadge}
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
      <SubscriptionModal
        isOpen={!!modalMode}
        onClose={() => setModalMode(null)}
        subscriber={selectedSubscriber}
        mode={modalMode}
        onSave={handleSave}
      />

      {/* Analytics Modal */}
      <SubscriptionAnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={{
          total: subscribers.length,
          active: subscribers.filter(s => s.status === 'active').length,
          paid: subscribers.filter(s => s.type === 'paid').length,
          free: subscribers.filter(s => s.type === 'free').length,
          newUsers: subscribers.filter(s => s.new_user).length,
          welcomeEmailsSent: subscribers.filter(s => s.welcome_email_sent).length,
          paidConversionRate: subscribers.length > 0 ? Math.round((subscribers.filter(s => s.type === 'paid').length / subscribers.length) * 100) : 0,
          // Add missing fields expected by modal
          verified: subscribers.filter(s => s.status === 'active').length, // Using active as verified proxy
          premium: subscribers.filter(s => s.type === 'paid').length, // Same as paid
          pending: subscribers.filter(s => s.status === 'pending').length,
        }}
      />

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={viewToggleComponent}
        isMobile={isMobile}
      />
    </div>
  );
};
