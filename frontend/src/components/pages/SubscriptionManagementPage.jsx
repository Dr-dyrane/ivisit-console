import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
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
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { FilterSheet } from '../common/FilterSheet';
import { ViewToggle } from '../common/ViewToggle';
import { SubscriptionListView } from '../views/SubscriptionListView';
import { SubscriptionTableView } from '../views/SubscriptionTableView';
import { MobileSubscriptions } from '../mobile/MobileSubscriptions';
import {
  Users,
  Plus,
  Filter as FilterIcon,
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

const SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE = 'Subscriber changes are not ready until subscriber authority is verified.';

const SUBSCRIPTION_STATE_OPTIONS = [
  { id: 'all', label: 'Subscribers', icon: Users, tone: 'sky',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-sky-600 dark:text-sky-200' },
  { id: 'active', label: 'Active', icon: CheckCircle, tone: 'emerald',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-emerald-600 dark:text-emerald-200' },
  { id: 'new', label: 'New', icon: Clock, tone: 'amber',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-amber-600 dark:text-amber-200' },
  { id: 'paid', label: 'Paid', icon: Crown, tone: 'violet',
    activeClass: 'bg-violet-500/10 text-violet-800 shadow-[0_18px_54px_rgba(139,92,246,0.16)] dark:text-violet-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-violet-600 dark:text-violet-200' },
  { id: 'free', label: 'Free', icon: Mail, tone: 'cyan',
    activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-[0_18px_54px_rgba(6,182,212,0.16)] dark:text-cyan-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-cyan-600 dark:text-cyan-200' },
];

const subscriptionToneClass = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  muted: 'bg-muted/30 text-muted-foreground',
};

const normalizeSubscriptionCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getSubscriptionStateCount = ({ id, stats, subscribers }) => {
  const rows = Array.isArray(subscribers) ? subscribers : [];
  switch (id) {
    case 'active':
      return normalizeSubscriptionCount(stats?.active, rows.filter((s) => s.status === 'active').length);
    case 'new':
      return normalizeSubscriptionCount(stats?.newUsers, rows.filter((s) => s.new_user).length);
    case 'paid':
      return normalizeSubscriptionCount(stats?.paid, rows.filter((s) => s.type === 'paid').length);
    case 'free':
      return normalizeSubscriptionCount(stats?.free, rows.filter((s) => s.type === 'free').length);
    default:
      return normalizeSubscriptionCount(stats?.total, rows.length);
  }
};

const getSubscriptionSignal = ({ stats, subscribers, kpiFilter }) => {
  const activeId = kpiFilter || 'all';
  const option = SUBSCRIPTION_STATE_OPTIONS.find((item) => item.id === activeId) || SUBSCRIPTION_STATE_OPTIONS[0];
  const count = getSubscriptionStateCount({ id: option.id, stats, subscribers });
  const nounMap = { all: 'subscriber record', active: 'active subscriber', new: 'new subscriber', paid: 'paid subscriber', free: 'free subscriber' };
  const emptyMap = { all: 'subscribers', active: 'active subscribers', new: 'new subscribers', paid: 'paid subscribers', free: 'free subscribers' };
  return {
    icon: option.icon,
    tone: option.tone,
    label: option.label,
    headline: count > 0 ? `${count} ${nounMap[option.id] || 'subscriber'}${count === 1 ? '' : 's'}` : `No ${emptyMap[option.id] || 'subscribers'}`,
    subhead: count > 0
      ? 'Review subscriber status, plan tier, and welcome activity. Subscriber commands stay disabled until subscriber authority is verified.'
      : 'Subscriber records for this scope will appear here.',
  };
};

const SubscriptionStateStrip = ({ stats, subscribers, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    {SUBSCRIPTION_STATE_OPTIONS.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getSubscriptionStateCount({ id: item.id, stats, subscribers });
      return (
        <motion.button key={item.id} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active} aria-label={`Show ${item.label.toLowerCase()}`} data-state={active ? 'selected' : 'idle'}>
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-inner bg-background/45 transition-transform group-hover:scale-105 ${active ? item.iconClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const SubscriptionSignalPanel = ({ stats, subscribers, loading, kpiFilter, setKpiFilter }) => {
  const signal = loading
    ? { icon: Users, tone: 'muted', label: 'Loading', headline: 'Loading subscribers', subhead: 'One moment while the subscriber list comes in.' }
    : getSubscriptionSignal({ stats, subscribers, kpiFilter });
  const SignalIcon = signal.icon;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}
      className="flex min-h-[240px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[288px]" aria-live="polite">
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${subscriptionToneClass[signal.tone] || subscriptionToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] text-foreground md:text-6xl">{signal.headline}</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{signal.subhead}</p>
        </div>
        <SubscriptionStateStrip stats={stats} subscribers={subscribers} loading={loading} kpiFilter={kpiFilter} setKpiFilter={setKpiFilter} />
      </div>
    </motion.section>
  );
};

export const SubscriptionManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const {
    subscribers,
    loading,
    error,
    fetchSubscribers
  } = useSubscription();

  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
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

  const { viewMode, setViewMode } = useViewMode('subscription', 'grid');
  const pagination = usePagination(20);

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
    window.addEventListener('openSubscriptionModal', handleOpenModal);
    return () => window.removeEventListener('openSubscriptionModal', handleOpenModal);
  }, [handleSubscriptionCommandUnavailable]);

  useEffect(() => {
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    return () => window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
  }, []);

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

  const mobileVisibleSubscribers = useMemo(() => {
    const visibleCount = pagination.currentPage * pagination.itemsPerPage;
    return filteredSubscribers.slice(0, visibleCount);
  }, [filteredSubscribers, pagination.currentPage, pagination.itemsPerPage]);

  const subscriptionsRouteContext = useMemo(() => {
    const subscriberRows = Array.isArray(subscribers) ? subscribers : [];
    const active = subscriberRows.filter(s => s.status === 'active').length;
    const pending = subscriberRows.filter(s => s.status === 'pending').length;
    const free = subscriberRows.filter(s => s.type === 'free').length;
    const paid = subscriberRows.filter(s => s.type === 'paid').length;
    const newUsers = subscriberRows.filter(s => s.new_user).length;

    return {
      subscribers: subscriberRows.slice(0, 8),
      summary: {
        total: subscriberRows.length,
        active,
        pending,
        free,
        paid,
        newUsers,
        loading,
        error: error ? String(error?.message || error) : null,
        source: 'route'
      }
    };
  }, [subscribers, loading, error]);

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

  const handleEdit = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleView = useCallback((subscriber) => {
    setSelectedSubscriber(subscriber);
    setModalMode('view');
  }, []);

  const handleDelete = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleSelect = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleSelectAll = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  // Header Configuration
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

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
    isAdmin && (
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
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-muted/30  text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} / {filteredSubscribers.length} Subscribers</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, filteredSubscribers.length]);

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
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={null}
          onDelete={null}
          onRefresh={fetchSubscribers}
          canManage={false}
          loading={loading}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={handleViewAnalytics}
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
          analytics={{
            total: subscribers.length,
            active: subscribers.filter(s => s.status === 'active').length,
            paid: subscribers.filter(s => s.type === 'paid').length,
            free: subscribers.filter(s => s.type === 'free').length
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
      {subscriptionCommandNotice && (
        <p
          id="subscriptions-action-feedback"
          className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {subscriptionCommandNotice}
        </p>
      )}

      {/* Signal panel (headline + state chips) replaces the bento KPI cards */}
      <SubscriptionSignalPanel
        stats={subscriptionsRouteContext.summary}
        subscribers={paginatedSubscribers}
        loading={loading}
        kpiFilter={filters.kpiFilter}
        setKpiFilter={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
      />

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] dark:bg-card/50 md:rounded-sheet">
        <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredSubscribers.length === 0 ? (
        <Card className="rounded-card bg-card/70 p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">
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
              <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="" className="squircle">
                <FilterIcon className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            )}
            {(filters.kpiFilter !== 'all' ||
              Object.keys(filters).filter(k => k !== 'kpiFilter').some(k => {
                if (k === 'status' || k === 'type') return filters[k] && filters[k].length > 0;
                return filters[k] && filters[k] !== '' && filters[k] !== 'all';
              })) && (
                <Button onClick={() => setFilters({ kpiFilter: 'all', status: [], type: [], search: '', welcomeEmailSent: '', dateRange: 'all' })} variant="" className="squircle">
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              )}
            <Button
              onClick={handleCreate}
              className="bg-card/70"
              aria-label="Add subscriber unavailable"
              aria-describedby={subscriptionCommandNotice ? 'subscriptions-action-feedback' : undefined}
              data-state="unavailable"
            >
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
                    <Card className="h-full rounded-card bg-card/70 p-6 group relative overflow-hidden flex flex-col">
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className={`absolute inset-0 ${subscriber.status === 'unsubscribed' ? 'bg-destructive/20' : 'bg-muted/30'} rounded-pill scale-150`} />
                          <div className="w-10 h-10 rounded-card surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Mail className={`h-5 w-5 ${subscriber.status === 'unsubscribed' ? 'text-destructive' : 'text-muted-foreground'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`rounded-inner ${getStatusBadge(subscriber.status)} font-bold editorial-subtitle px-3 py-1`}>
                          {subscriber.status}
                        </Badge>
                        <Badge className={`rounded-inner ${getTypeBadge(subscriber.type)} font-bold editorial-subtitle px-3 py-1`}>
                          {subscriber.type}
                        </Badge>
                        {subscriber.new_user && (
                          <Badge variant="outline" className="rounded-inner  text-amber-700 dark:text-amber-200 px-2 py-1 font-semibold gap-1">
                            <Clock className="w-3 h-3" /> NEW
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 tracking-tight relative z-10 truncate">
                        {subscriber.email}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 font-mono tracking-tight">
                        {subscriber.subscription_date ? new Date(subscriber.subscription_date).toLocaleDateString() : 'N/A'}
                      </p>

                      <div className="space-y-3 mb-6 relative z-10 flex-1">
                        <div className="flex items-center justify-between p-3 rounded-inner bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-normal">Email Sent</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {subscriber.welcome_email_sent ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-inner bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-200" />
                            <span className="font-normal">Updated</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {subscriber.updated_at ? new Date(subscriber.updated_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-4   relative z-10 px-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          ACTIONS
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(subscriber)}
                            className="rounded-card h-8 w-8 p-0 hover:bg-muted hover:text-muted-foreground"
                            aria-label={`View details for ${subscriber.email}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(subscriber)}
                            className="rounded-card h-8 w-8 p-0 hover:bg-muted hover:text-muted-foreground"
                            aria-label={`Edit unavailable for ${subscriber.email}`}
                            aria-describedby={subscriptionCommandNotice ? 'subscriptions-action-feedback' : undefined}
                            data-state="unavailable"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(subscriber)}
                            className="rounded-card h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete unavailable for ${subscriber.email}`}
                            aria-describedby={subscriptionCommandNotice ? 'subscriptions-action-feedback' : undefined}
                            data-state="unavailable"
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
              onEdit={null}
              onDelete={null}
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
              onEdit={null}
              onDelete={null}
              getStatusBadge={getStatusBadge}
              getTypeBadge={getTypeBadge}
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
      </div>

      {/* Modals */}
      <SubscriptionModal
        isOpen={!!modalMode}
        onClose={() => setModalMode(null)}
        subscriber={selectedSubscriber}
        mode={modalMode}
        onSave={handleSave}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="subscription"
        analytics={{
          total: subscribers.length,
          active: subscribers.filter(s => s.status === 'active').length,
          paid: subscribers.filter(s => s.type === 'paid').length,
          free: subscribers.filter(s => s.type === 'free').length,
          newUsers: subscribers.filter(s => s.new_user).length,
          welcomeEmailsSent: subscribers.filter(s => s.welcome_email_sent).length,
          paidConversionRate: subscribers.length > 0 ? Math.round((subscribers.filter(s => s.type === 'paid').length / subscribers.length) * 100) : 0,
          verified: subscribers.filter(s => s.status === 'active').length,
          premium: subscribers.filter(s => s.type === 'paid').length,
          pending: subscribers.filter(s => s.status === 'pending').length,
          recent: subscribers.filter(s => {
            const signupDate = new Date(s.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return signupDate >= thirtyDaysAgo;
          }).length
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
            onClick={handleSubscriptionCommandUnavailable}
            className="h-10 w-10 rounded-pill bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
            title="Delete Selected"
            aria-label="Delete subscribers unavailable"
            aria-describedby={subscriptionCommandNotice ? 'subscriptions-action-feedback' : undefined}
            data-state="unavailable"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </BulkActionBar>
    </div>
  );
};
