import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useRowSelection } from '../../hooks/useRowSelection';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { SubscriptionsDesktopWorkspace } from './subscriptions/SubscriptionsDesktopWorkspace';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useInvalidateSubscriptions, useSubscriptionsQuery } from '../../hooks/useSubscriptionsQuery';
import { subscribeToSubscribers } from '../../services/subscriptionService';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { Button } from '../ui/button';
import { SubscriptionModal } from '../modals/SubscriptionModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { FilterSheet } from '../common/FilterSheet';
import { MobileSubscriptions } from '../mobile/MobileSubscriptions';
import { SEOHead } from '../common/SEOHead';
import {
  Users,
  Plus,
  Filter as FilterIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE = 'Subscriber changes are not ready until subscriber authority is verified.';

export const SubscriptionManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [subscriptionCommandNotice, setSubscriptionCommandNotice] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Delete'
  });

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

  const pagination = usePagination(20);
  const subscriptionQueryFilter = useMemo(() => ({
    ...filters,
    limit: isMobile ? pagination.currentPage * pagination.itemsPerPage : pagination.itemsPerPage,
    offset: isMobile ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  }), [filters, isMobile, pagination.currentPage, pagination.itemsPerPage, sortConfig.direction, sortConfig.key]);
  const {
    subscribers,
    count: subscriberCount,
    stats: subscriptionProjectionStats,
    loading,
    isFetching: subscriptionIsFetching,
    isPlaceholderData,
    error,
    refetch: fetchSubscribers,
  } = useSubscriptionsQuery(subscriptionQueryFilter);
  const invalidateSubscriptions = useInvalidateSubscriptions();

  useEffect(() => {
    pagination.setTotalCount(subscriberCount);
  }, [pagination.setTotalCount, subscriberCount]);

  useEffect(() => {
    pagination.resetPagination();
  }, [filters, pagination.resetPagination, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    return subscribeToSubscribers(() => invalidateSubscriptions());
  }, [invalidateSubscriptions, isAdmin]);

  const subscriptionAnalytics = useMemo(() => {
    const stats = subscriptionProjectionStats || {};
    const total = Number(stats.total || subscriberCount || 0);
    const paid = Number(stats.paid || 0);
    return {
      total,
      active: Number(stats.active || 0),
      paid,
      free: Number(stats.free || 0),
      newUsers: Number(stats.newUsers || 0),
      welcomeEmailsSent: Number(stats.welcomeSent || 0),
      paidConversionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
      verified: Number(stats.active || 0),
      premium: paid,
      pending: Number(stats.pending || 0),
      distributionScope: 'exact_filtered_projection',
    };
  }, [subscriberCount, subscriptionProjectionStats]);

  const handleSubscriptionCommandUnavailable = useCallback(() => {
    setSubscriptionCommandNotice(SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE);
    toast.info(SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

  // Listen for 'openSubscriptionModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      handleSubscriptionCommandUnavailable();
    };
    const handleOpenFocusedRecord = (event) => {
      if (!event.detail) return;
      setSelectedSubscriber(event.detail);
      setModalMode('view');
    };
    window.addEventListener('openSubscriptionModal', handleOpenModal);
    window.addEventListener('openFocusedSubscriptionRecord', handleOpenFocusedRecord);
    return () => {
      window.removeEventListener('openSubscriptionModal', handleOpenModal);
      window.removeEventListener('openFocusedSubscriptionRecord', handleOpenFocusedRecord);
    };
  }, [handleSubscriptionCommandUnavailable]);

  useEffect(() => {
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    return () => window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
  }, []);

  // The route projection owns filtering. Keep this alias so the existing renderer can migrate
  // independently without re-filtering or presenting a page window as global truth.
  const subscriptionBaseFiltered = useMemo(() => {
    return Array.isArray(subscribers) ? subscribers : [];
  }, [subscribers]);

  // KPI status axis applied over the base. Adds pending/unsubscribed (terminal) so the mobile
  // status chips actually scope the list (no write is enabled); active/new/paid/free stay for
  // the desktop signal strip. This is the list the desktop + mobile both render.
  const filteredSubscribers = subscriptionBaseFiltered;

  // Status-keyed, full-scope (base) counts for the mobile KPI strip + heading. Buckets match the
  // filteredSubscribers branches exactly, so scopeCount == the rendered scope. No write is added.
  const subscriptionMobileStats = subscriptionProjectionStats || { total: 0, active: 0, pending: 0, unsubscribed: 0 };

  // Pagination Logic
  const paginatedSubscribers = useMemo(() => {
    return filteredSubscribers || [];
  }, [filteredSubscribers]);
  const selection = useRowSelection(paginatedSubscribers);
  const { selectedIds } = selection;
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems({ isAdmin: isAdmin() }), [isAdmin]);
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const mobileVisibleSubscribers = useMemo(() => {
    return filteredSubscribers || [];
  }, [filteredSubscribers]);

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('subscriptions', paginatedSubscribers);
  const focusedSubscriber = focusedRecord;

  const subscriptionsRouteContext = useMemo(() => {
    const subscriberRows = Array.isArray(subscribers) ? subscribers : [];
    const projectionStats = subscriptionProjectionStats || {};

    return {
      subscribers: subscriberRows.slice(0, 8),
      focusedSubscriber,
      summary: {
        total: subscriberCount,
        active: projectionStats.active || 0,
        pending: projectionStats.pending || 0,
        free: projectionStats.free || 0,
        paid: projectionStats.paid || 0,
        newUsers: projectionStats.newUsers || 0,
        loading,
        error: error ? String(error?.message || error) : null,
        source: 'route'
      }
    };
  }, [subscribers, subscriberCount, subscriptionProjectionStats, focusedSubscriber, loading, error]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const publishSubscriptionsRouteContext = () => {
      window.dispatchEvent(new CustomEvent('subscriptionsRouteContextUpdated', {
        detail: subscriptionsRouteContext
      }));
    };

    publishSubscriptionsRouteContext();
    window.addEventListener('requestSubscriptionsRouteContext', publishSubscriptionsRouteContext);

    return () => {
      window.removeEventListener('requestSubscriptionsRouteContext', publishSubscriptionsRouteContext);
    };
  }, [subscriptionsRouteContext]);

  // Handlers
  const handleCreate = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleView = useCallback((subscriber) => {
    if (subscriber?.id != null && !isFocused(subscriber.id)) setFocused(subscriber.id);
    setSelectedSubscriber(subscriber);
    setModalMode('view');
  }, [setFocused, isFocused]);

  const handleDelete = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleSelect = selection.handleToggleSelect;
  const handleSelectAll = selection.handleSelectAll;

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  // Header Configuration
  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-muted hover:text-muted-foreground relative"
      aria-label="Filter subscribers"
    >
      <FilterIcon className="h-4 w-4" />
      {(filters.search ||
        (filters.status && filters.status.length > 0) ||
        (filters.type && filters.type.length > 0) ||
        filters.welcomeEmailSent ||
        filters.created_at) && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-muted" />
        )}
    </Button>
  ), [filters]);

  // Primary Action (Add Subscriber)
  const headerActions = React.useMemo(() => (
    isAdmin() && (
      <Button
        onClick={handleCreate}
        className="bg-card/70 h-9 px-4 text-[10px] text-foreground font-bold"
        aria-label="Add subscriber unavailable"
        aria-describedby={subscriptionCommandNotice ? 'subscriptions-action-feedback' : undefined}
        data-state="unavailable"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">ADD SUBSCRIBER</span>
        <span className="md:hidden">ADD</span>
      </Button>
    )
  ), [isAdmin, handleCreate, subscriptionCommandNotice]);

  usePageHeader(
    'Subscription Management',
    headerActions,
    null,
    filterButtonComponent
  );

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-muted/30  text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} / {subscriberCount} Subscribers</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, subscriberCount]);

  usePageFooter(footerContent, 'pagination', !loading && subscribers.length > 0);

  usePageShell({ bleed: true, hideFab: true });

  // Badge Logic
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
      case 'unsubscribed': return 'bg-destructive/20 text-destructive';
      case 'pending': return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
      case 'bounced': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'paid': return 'bg-violet-500/15 text-violet-700 dark:text-violet-200';
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
      key: 'created_at',
      type: 'date',
      label: 'Subscription Date',
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
        <SEOHead title="Email Subscribers" description="Review subscriber lifecycle and welcome evidence." />
        {subscriptionCommandNotice && (
          <p
            id="subscriptions-action-feedback"
            className="mx-4 mb-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {subscriptionCommandNotice}
          </p>
        )}

        <MobileSubscriptions
          subscribers={mobileVisibleSubscribers}
          stats={subscriptionMobileStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={null}
          onDelete={null}
          onRefresh={fetchSubscribers}
          canManage={false}
          loading={loading}
          isFetching={subscriptionIsFetching}
          errorMessage={error ? String(error?.message || error) : null}
          onRetry={fetchSubscribers}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={handleViewAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        <SubscriptionModal
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          subscriber={selectedSubscriber}
          mode={modalMode}
          onSave={handleSave}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="subscription"
          analytics={subscriptionAnalytics}
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
    <>
      <SEOHead title="Email Subscribers" description="Review subscriber lifecycle and welcome evidence." />
      <SubscriptionsDesktopWorkspace
        rows={paginatedSubscribers}
        stats={subscriptionProjectionStats}
        loading={loading && paginatedSubscribers.length === 0}
        isFetching={subscriptionIsFetching}
        error={error}
        filters={filters}
        setFilters={setFilters}
        filterSheetOpen={filterSheetOpen}
        openFilters={() => setFilterSheetOpen(true)}
        retry={fetchSubscribers}
        clearFilters={() => setFilters({ search: '', status: [], type: [], kpiFilter: 'all', welcomeEmailSent: '', dateRange: 'all' })}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={(key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }))}
        focusedSubscriber={focusedSubscriber}
        setFocused={setFocused}
        onView={handleView}
        selection={selection}
        onUnavailable={handleSubscriptionCommandUnavailable}
        moduleRailItems={moduleRailItems}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />
      <SubscriptionModal isOpen={!!modalMode} onClose={() => setModalMode(null)} subscriber={selectedSubscriber} mode={modalMode} onSave={handleSave} />
      <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} type="subscription" analytics={subscriptionAnalytics} />
      <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={setFilters} initialValues={filters} viewToggle={null} isMobile={false} />
    </>
  );

};
