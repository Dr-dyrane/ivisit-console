import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useAuth } from '../../../contexts/AuthContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import { usePagination } from '../../../hooks/usePagination';
import { useRowSelection } from '../../../hooks/useRowSelection';
import {
  useInvalidateSubscriptions,
  useSubscriptionsQuery,
} from '../../../hooks/useSubscriptionsQuery';
import { subscribeToSubscribers } from '../../../services/subscriptionService';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import {
  buildSubscriptionAnalytics,
  buildSubscriptionQueryFilter,
  buildSubscriptionsRouteContext,
  buildVisibleSubscriptionStats,
  createSubscriptionFilters,
  EMPTY_SUBSCRIPTION_STATS,
  getSubscriptionRoleKind,
  hasActiveSubscriberFilters,
  SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE,
  SUBSCRIPTION_DEFAULT_SORT,
  SUBSCRIPTION_FILTER_SCHEMA,
  SUBSCRIPTION_PAGE_SIZE,
} from './subscriptionPageModel';

const createConfirmationState = () => ({
  isOpen: false,
  title: '',
  description: '',
  onConfirm: null,
  variant: 'destructive',
  confirmLabel: 'Delete',
});

export const useSubscriptionPageController = () => {
  const { isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
  const { isMobile } = useNavigation();
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const admin = isAdmin();
  const orgAdmin = isOrgAdmin();
  const provider = isProvider();
  const driver = isDriver();
  const canManageSubscribers = admin;

  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState(SUBSCRIPTION_DEFAULT_SORT);
  const [subscriptionCommandNotice, setSubscriptionCommandNotice] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(createConfirmationState);
  const [filters, setFilters] = useState(createSubscriptionFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [mobileSubscriberFeed, setMobileSubscriberFeed] = useState([]);
  const mobileSubscriberPagesRef = useRef(new Map());

  const pagination = usePagination(SUBSCRIPTION_PAGE_SIZE);
  const { resetPagination, setTotalCount } = pagination;
  const subscriptionQueryFilter = useMemo(() => buildSubscriptionQueryFilter({
    filters,
    pagination: {
      currentPage: pagination.currentPage,
      itemsPerPage: pagination.itemsPerPage,
    },
    sortConfig,
  }), [filters, pagination.currentPage, pagination.itemsPerPage, sortConfig]);

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
    setTotalCount(subscriberCount);
  }, [setTotalCount, subscriberCount]);

  useEffect(() => {
    resetPagination();
  }, [filters, resetPagination, sortConfig.direction, sortConfig.key]);

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
    if (!canManageSubscribers) return undefined;
    return subscribeToSubscribers(() => invalidateSubscriptions());
  }, [canManageSubscribers, invalidateSubscriptions]);

  const handleSubscriptionCommandUnavailable = useCallback(() => {
    setSubscriptionCommandNotice(SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE);
    toast.info(SUBSCRIPTION_COMMAND_UNAVAILABLE_MESSAGE);
    return false;
  }, []);

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

  const desktopSubscribers = useMemo(
    () => (Array.isArray(subscribers) ? subscribers : []),
    [subscribers]
  );
  const mobileVisibleSubscribers = useMemo(() => mobileSubscriberFeed, [mobileSubscriberFeed]);
  const visibleSubscriberRows = isMobile ? mobileVisibleSubscribers : desktopSubscribers;
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
  const subscriptionAnalytics = useMemo(() => buildSubscriptionAnalytics({
    displayStats: subscriptionDisplayStats,
    subscriberCount,
    statsUnavailable: subscriptionStatsUnavailable,
  }), [subscriberCount, subscriptionDisplayStats, subscriptionStatsUnavailable]);

  const selection = useRowSelection(visibleSubscriberRows);
  const { clearSelection } = selection;

  useEffect(() => {
    clearSelection();
  }, [clearSelection, filters, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    if (!isMobile) clearSelection();
  }, [clearSelection, isMobile, pagination.currentPage]);

  const roleKind = useMemo(() => getSubscriptionRoleKind({
    admin,
    orgAdmin,
    provider,
    driver,
  }), [admin, driver, orgAdmin, provider]);
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  const {
    focusedRecord: focusedSubscriber,
    setFocused,
    isFocused,
  } = useFocusedRecord('subscriptions', visibleSubscriberRows);

  const subscriptionsRouteContext = useMemo(() => buildSubscriptionsRouteContext({
    subscribers,
    focusedSubscriber,
    subscriberCount,
    displayStats: subscriptionDisplayStats,
    statsUnavailable: subscriptionStatsUnavailable,
    loading,
    error,
  }), [
    error,
    focusedSubscriber,
    loading,
    subscriberCount,
    subscribers,
    subscriptionDisplayStats,
    subscriptionStatsUnavailable,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const publishSubscriptionsRouteContext = () => {
      window.dispatchEvent(new CustomEvent('subscriptionsRouteContextUpdated', {
        detail: subscriptionsRouteContext,
      }));
    };

    publishSubscriptionsRouteContext();
    window.addEventListener('requestSubscriptionsRouteContext', publishSubscriptionsRouteContext);
    return () => {
      window.removeEventListener('requestSubscriptionsRouteContext', publishSubscriptionsRouteContext);
    };
  }, [subscriptionsRouteContext]);

  const handleView = useCallback((subscriber) => {
    if (subscriber?.id != null && !isFocused(subscriber.id)) setFocused(subscriber.id);
    setSelectedSubscriber(subscriber);
    setModalMode('view');
  }, [isFocused, setFocused]);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(createSubscriptionFilters());
  }, []);

  const handleOpenFilters = useCallback(() => {
    setFilterSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleDelete = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  const handleSave = useCallback(() => {
    handleSubscriptionCommandUnavailable();
  }, [handleSubscriptionCommandUnavailable]);

  return {
    isMobile,
    role: {
      canManageSubscribers,
      roleKind,
    },
    data: {
      subscribers,
      desktopSubscribers,
      mobileVisibleSubscribers,
      visibleSubscriberRows,
      subscriberCount,
      subscriptionDisplayStats,
      subscriptionStatsUnavailable,
      subscriptionAnalytics,
      subscriptionDenied,
      loading,
      subscriptionIsFetching,
      error,
      fetchSubscribers,
    },
    state: {
      selectedSubscriber,
      modalMode,
      analyticsModalOpen,
      sortConfig,
      subscriptionCommandNotice,
      confirmationModal,
      filters,
      filterSheetOpen,
      hasSubscriberFilters: hasActiveSubscriberFilters(filters),
      focusedSubscriber,
    },
    setters: {
      setModalMode,
      setAnalyticsModalOpen,
      setConfirmationModal,
      setFilters,
      setFilterSheetOpen,
    },
    actions: {
      handleSubscriptionCommandUnavailable,
      handleCreate,
      handleView,
      handleDelete,
      handleViewAnalytics,
      handleSave,
      handleSort,
      clearFilters,
      handleOpenFilters,
      setFocused,
    },
    selection,
    pagination,
    filterSchema: SUBSCRIPTION_FILTER_SCHEMA,
    wayfinding: {
      moduleRailItems,
      routingPath,
      handleRailNavigate,
    },
  };
};
