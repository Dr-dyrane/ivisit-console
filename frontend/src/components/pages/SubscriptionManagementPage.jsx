import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { BulkActionBar } from '../common/BulkActionBar';
import { SubscriptionModal } from '../modals/SubscriptionModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { FilterSheet } from '../common/FilterSheet';
import { MobileSubscriptions } from '../mobile/MobileSubscriptions';
import { SEOHead } from '../common/SEOHead';
import {
  AlertTriangle,
  BarChart3,
  Filter,
  MailX,
} from 'lucide-react';
import { toast } from 'sonner';

const SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE = 'Subscriber and email changes are not available yet.';
const TERMINAL_SUBSCRIBER_STATUSES = new Set(['unsubscribed', 'bounced', 'inactive', 'cancelled', 'expired']);
const EMPTY_SUBSCRIPTION_STATS = Object.freeze({
  total: 0,
  active: 0,
  pending: 0,
  unsubscribed: 0,
  paid: 0,
  free: 0,
  newUsers: 0,
  welcomeSent: 0,
  exactCounts: true,
  available: true,
  scope: 'admin_subscriber_projection',
});

const buildVisibleSubscriptionStats = (rows = [], reason = 'stats_query_failed') => {
  const visibleRows = Array.isArray(rows) ? rows : [];
  const statuses = visibleRows.map((subscriber) => String(subscriber?.status || 'pending').toLowerCase());

  return {
    total: visibleRows.length,
    active: statuses.filter((status) => status === 'active').length,
    pending: statuses.filter((status) => status !== 'active' && !TERMINAL_SUBSCRIBER_STATUSES.has(status)).length,
    unsubscribed: statuses.filter((status) => TERMINAL_SUBSCRIBER_STATUSES.has(status)).length,
    paid: visibleRows.filter((subscriber) => subscriber?.type === 'paid').length,
    free: visibleRows.filter((subscriber) => subscriber?.type === 'free').length,
    newUsers: visibleRows.filter((subscriber) => subscriber?.new_user === true).length,
    welcomeSent: visibleRows.filter((subscriber) => subscriber?.welcome_email_sent === true).length,
    exactCounts: false,
    available: false,
    reason,
    scope: 'visible_rows',
  };
};

const ProjectionStatsNotice = () => (
  <p
    className="mx-4 mt-3 flex items-start gap-2 rounded-inner bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 lg:mx-auto lg:max-w-3xl"
    role="status"
    aria-live="polite"
  >
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>Subscriber statistics are unavailable. Counts use the loaded rows; the list remains current.</span>
  </p>
);

export const SubscriptionManagementPage = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
  const { isMobile } = useNavigation();
  const canManageSubscribers = isAdmin();
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
  const [mobileSubscriberFeed, setMobileSubscriberFeed] = useState([]);
  const mobileSubscriberPagesRef = useRef(new Map());

  const pagination = usePagination(20);
  const subscriptionQueryFilter = useMemo(() => ({
    ...filters,
    limit: pagination.itemsPerPage,
    offset: (pagination.currentPage - 1) * pagination.itemsPerPage,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  }), [filters, pagination.currentPage, pagination.itemsPerPage, sortConfig.direction, sortConfig.key]);
  const {
    subscribers,
    count: subscriberCount,
    stats: subscriptionProjectionStats,
    loading,
    isFetching: subscriptionIsFetching,
    isPlaceholderData,
    denied: subscriptionDenied,
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

  const mobileQueryScope = useMemo(() => JSON.stringify({
    filters,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
  }), [filters, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    mobileSubscriberPagesRef.current = new Map();
    setMobileSubscriberFeed([]);
  }, [isMobile, mobileQueryScope]);

  useEffect(() => {
    if (!isMobile || isPlaceholderData || loading || error || subscriptionDenied) return;

    const pageRows = Array.isArray(subscribers) ? subscribers : [];
    const pages = pagination.currentPage === 1
      ? new Map()
      : new Map(mobileSubscriberPagesRef.current);
    pages.set(pagination.currentPage, pageRows);
    mobileSubscriberPagesRef.current = pages;

    const seen = new Set();
    const appendedRows = [...pages.entries()]
      .sort(([pageA], [pageB]) => pageA - pageB)
      .flatMap(([, rows]) => rows)
      .filter((subscriber) => {
        if (!subscriber?.id || seen.has(subscriber.id)) return false;
        seen.add(subscriber.id);
        return true;
      });
    setMobileSubscriberFeed(appendedRows);
  }, [
    error,
    isMobile,
    isPlaceholderData,
    loading,
    pagination.currentPage,
    subscribers,
    subscriptionDenied,
  ]);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    return subscribeToSubscribers(() => invalidateSubscriptions());
  }, [invalidateSubscriptions, isAdmin]);

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

  // Pagination Logic
  const paginatedSubscribers = useMemo(() => {
    return filteredSubscribers || [];
  }, [filteredSubscribers]);

  const mobileVisibleSubscribers = useMemo(() => {
    return mobileSubscriberFeed;
  }, [mobileSubscriberFeed]);
  const visibleSubscriberRows = isMobile ? mobileVisibleSubscribers : paginatedSubscribers;
  const subscriptionStatsUnavailable = Boolean(
    !subscriptionDenied
    && !error
    && subscriptionProjectionStats?.available === false
  );
  const subscriptionDisplayStats = useMemo(() => (
    subscriptionStatsUnavailable
      ? buildVisibleSubscriptionStats(visibleSubscriberRows, subscriptionProjectionStats?.reason)
      : (subscriptionProjectionStats || EMPTY_SUBSCRIPTION_STATS)
  ), [subscriptionProjectionStats, subscriptionStatsUnavailable, visibleSubscriberRows]);
  const subscriptionMobileStats = subscriptionDisplayStats;
  const subscriptionAnalytics = useMemo(() => {
    const total = Number(subscriptionDisplayStats.total ?? subscriberCount ?? 0);
    const paid = Number(subscriptionDisplayStats.paid ?? 0);
    const free = Number(subscriptionDisplayStats.free ?? 0);
    const active = Number(subscriptionDisplayStats.active ?? 0);
    const pending = Number(subscriptionDisplayStats.pending ?? 0);
    const unsubscribed = Number(subscriptionDisplayStats.unsubscribed ?? 0);

    return {
      total,
      active,
      paid,
      free,
      newUsers: Number(subscriptionDisplayStats.newUsers ?? 0),
      welcomeEmailsSent: Number(subscriptionDisplayStats.welcomeSent ?? 0),
      pending,
      unsubscribed,
      byType: { paid, free },
      byStatus: { active, pending, unsubscribed },
      statsAvailable: !subscriptionStatsUnavailable,
      distributionScope: subscriptionStatsUnavailable ? 'visible_page' : 'exact_filtered_projection',
      distributionLabel: subscriptionStatsUnavailable
        ? 'Loaded rows (statistics unavailable)'
        : 'Current filtered subscriber scope',
    };
  }, [subscriberCount, subscriptionDisplayStats, subscriptionStatsUnavailable]);
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(visibleSubscriberRows);

  useEffect(() => {
    clearSelection();
  }, [filters, sortConfig.direction, sortConfig.key, clearSelection]);

  useEffect(() => {
    if (!isMobile) clearSelection();
  }, [isMobile, pagination.currentPage, clearSelection]);

  const roleKind = useMemo(() => {
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isProvider()) return isDriver() ? 'driver' : 'provider';
    return 'viewer';
  }, [isAdmin, isOrgAdmin, isProvider, isDriver]);
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('subscriptions', visibleSubscriberRows);
  const focusedSubscriber = focusedRecord;

  const subscriptionsRouteContext = useMemo(() => {
    const subscriberRows = Array.isArray(subscribers) ? subscribers : [];
    const projectionStats = subscriptionDisplayStats;

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
        statsAvailable: !subscriptionStatsUnavailable,
        statsScope: projectionStats.scope,
        loading,
        error: error ? String(error?.message || error) : null,
        source: 'route'
      }
    };
  }, [subscribers, subscriberCount, subscriptionDisplayStats, subscriptionStatsUnavailable, focusedSubscriber, loading, error]);

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

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  // The list toolbar owns search, filters, and refresh. The navbar keeps one
  // working route action with state feedback.
  const headerActions = React.useMemo(() => (
    <Button
      onClick={handleViewAnalytics}
      data-state={analyticsModalOpen ? 'open' : 'idle'}
      aria-label="Subscriber stats"
      aria-haspopup="dialog"
      aria-expanded={analyticsModalOpen}
      className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
    >
      <BarChart3 className="mr-2 h-4 w-4" />
      Subscriber stats
    </Button>
  ), [analyticsModalOpen, handleViewAnalytics]);

  const hasSubscriberFilters = Boolean(
    filters.search
    || filters.status?.length
    || filters.type?.length
    || filters.welcomeEmailSent
    || (filters.dateRange && filters.dateRange !== 'all')
    || filters.kpiFilter !== 'all'
  );
  const filterButtonComponent = React.useMemo(() => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      data-state={filterSheetOpen ? 'open' : hasSubscriberFilters ? 'active' : 'idle'}
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
      className="relative h-9 w-9 rounded-icon bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter subscribers"
    >
      <Filter className="h-4 w-4" />
      {hasSubscriberFilters && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasSubscriberFilters]);

  usePageHeader('Email Subscribers', headerActions, null, filterButtonComponent);

  usePageFooter(null, 'status', false);

  usePageShell({ bleed: true, hideFab: true });

  // Badge Logic
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
      case 'unsubscribed': return 'bg-muted/60 text-muted-foreground';
      case 'pending': return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200';
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
          key: 'dateRange',
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
        <MobileSubscriptions
          subscribers={mobileVisibleSubscribers}
          stats={subscriptionMobileStats}
          statsUnavailable={subscriptionStatsUnavailable}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={null}
          onDelete={null}
          onRefresh={fetchSubscribers}
          canManage={canManageSubscribers}
          loading={loading || (subscriptionIsFetching && mobileVisibleSubscribers.length === 0)}
          isFetching={subscriptionIsFetching}
          errorMessage={error ? String(error?.message || error) : null}
          onRetry={fetchSubscribers}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={handleViewAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          actionNotice={subscriptionCommandNotice}
          selectionEnabled={canManageSubscribers}
          selectedIds={selectedIds}
          onSelect={handleToggleSelect}
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
      {subscriptionStatsUnavailable && <ProjectionStatsNotice />}
      <SubscriptionsDesktopWorkspace
        rows={paginatedSubscribers}
        stats={subscriptionDisplayStats}
        denied={subscriptionDenied}
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
        selectable={canManageSubscribers}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        moduleRailItems={moduleRailItems}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />
      {canManageSubscribers && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <Button
            variant="ghost"
            size="icon"
            disabled
            data-state="unavailable"
            title="Bulk subscriber changes unavailable"
            aria-label="Bulk subscriber changes unavailable"
            className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-40"
          >
            <MailX className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}
      <SubscriptionModal isOpen={!!modalMode} onClose={() => setModalMode(null)} subscriber={selectedSubscriber} mode={modalMode} onSave={handleSave} />
      <AnalyticsModal open={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} type="subscription" analytics={subscriptionAnalytics} />
      <FilterSheet isOpen={filterSheetOpen} onOpenChange={setFilterSheetOpen} filterSchema={filterSchema} onApply={setFilters} initialValues={filters} viewToggle={null} isMobile={false} />
    </>
  );

};
