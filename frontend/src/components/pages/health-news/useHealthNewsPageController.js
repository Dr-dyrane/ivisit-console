import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useAuth } from '../../../contexts/AuthContext';
import { useFocusedRecord } from '../../../contexts/FocusedRecordContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useHealthNewsQuery } from '../../../hooks/useHealthNewsQuery';
import { usePagination } from '../../../hooks/usePagination';
import { useWayfindingNav } from '../../console/WorkspaceStage';
import {
  buildHealthNewsAnalytics,
  buildHealthNewsPanelContext,
  buildHealthNewsQueryFilter,
  buildVisibleHealthNewsStats,
  getHealthNewsRoleKind,
  hasAppliedFilters,
  HEALTH_NEWS_EMPTY_STATS,
  mergeMobileNewsFeed,
} from './healthNewsPageModel';

export const useHealthNewsPageController = () => {
  const { isPhone, isMobile } = useNavigation();
  const { isAdmin, isOrgAdmin } = useAuth();
  const [mobileNewsFeed, setMobileNewsFeed] = useState([]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const actionFeedbackTimerRef = useRef(null);
  const pagination = usePagination(20);
  const {
    currentPage,
    itemsPerPage,
    paginationRange,
    resetPagination,
    setTotalCount,
    totalCount,
    totalPages,
  } = pagination;
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const roleKind = getHealthNewsRoleKind({
    admin: isAdmin(),
    orgAdmin: isOrgAdmin(),
  });
  const visibleModuleRail = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind]
  );

  const queryFilter = useMemo(() => buildHealthNewsQueryFilter({
    filters,
    kpiFilter,
    itemsPerPage,
    offset: paginationRange.start,
    sortConfig,
  }), [
    filters,
    kpiFilter,
    itemsPerPage,
    paginationRange.start,
    sortConfig,
  ]);

  const {
    data: healthNews,
    count,
    stats: pageStats,
    loading,
    isFetching,
    error: queryError,
    refetch,
  } = useHealthNewsQuery(queryFilter);

  const projectionStats = pageStats || HEALTH_NEWS_EMPTY_STATS;
  const healthNewsError = queryError ? 'Health news could not load. Try again.' : null;
  const loadError = healthNewsError;
  const fetchHealthNews = refetch;
  const newsRows = useMemo(() => (Array.isArray(healthNews) ? healthNews : []), [healthNews]);
  const visibleStatsRows = isPhone && mobileNewsFeed.length > 0 ? mobileNewsFeed : newsRows;
  const statsUnavailable = projectionStats.available === false;
  const stats = useMemo(() => (
    statsUnavailable
      ? buildVisibleHealthNewsStats(visibleStatsRows, projectionStats.reason)
      : projectionStats
  ), [projectionStats, statsUnavailable, visibleStatsRows]);
  const newsAnalytics = useMemo(() => buildHealthNewsAnalytics({
    rows: newsRows,
    stats,
    statsUnavailable,
  }), [newsRows, stats, statsUnavailable]);

  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('healthnews', newsRows);
  const focusedNews = focusedRecord;
  const hasFilter = hasAppliedFilters(filters, kpiFilter);

  useEffect(() => () => {
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setTotalCount(count || 0);
  }, [count, setTotalCount]);

  useEffect(() => {
    if (!isPhone) return;
    setMobileNewsFeed((previousRows) => mergeMobileNewsFeed({
      previousRows,
      pageRows: newsRows,
      currentPage,
    }));
  }, [currentPage, isPhone, newsRows]);

  const markActionFeedback = useCallback((actionId) => {
    if (!actionId) return;
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
    setActiveActionFeedback(actionId);
    actionFeedbackTimerRef.current = window.setTimeout(() => {
      setActiveActionFeedback((current) => (current === actionId ? null : current));
    }, 900);
  }, []);

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    resetPagination();
    setMobileNewsFeed([]);
    setFilters((currentFilters) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, [resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    resetPagination();
    setMobileNewsFeed([]);
    setKpiFilter(nextFilter);
  }, [resetPagination]);

  const handleMobileFiltersChange = useCallback((nextFiltersOrUpdater) => {
    handleApplyFilters((current) => {
      const next = typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater({ ...current, kpiFilter })
        : nextFiltersOrUpdater;
      if (next?.kpiFilter !== undefined) {
        setKpiFilter(next.kpiFilter);
      }
      return next || current;
    });
  }, [handleApplyFilters, kpiFilter]);

  const handleSort = useCallback((key) => {
    resetPagination();
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, [resetPagination]);

  const setSearchFilter = useCallback((search) => {
    handleApplyFilters((current) => ({ ...current, search }));
  }, [handleApplyFilters]);

  const handleView = useCallback((news) => {
    markActionFeedback(`view-${news?.id || 'unknown'}`);
    if (news?.id && !isFocused(news.id)) setFocused(news.id);
    setSelectedNews(news);
    setModalMode('view');
  }, [isFocused, markActionFeedback, setFocused]);

  const handleModalClose = useCallback(() => {
    setModalMode(null);
    setSelectedNews(null);
  }, []);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({});
  }, [handleApplyFilters, handleKpiFilterChange]);

  const healthNewsPanelContext = useMemo(() => buildHealthNewsPanelContext({
    newsRows,
    focusedNews,
    stats,
    pagination: { currentPage, totalCount, totalPages },
    filters,
    kpiFilter,
    loading,
    healthNewsError,
    statsUnavailable,
  }), [
    filters,
    focusedNews,
    healthNewsError,
    kpiFilter,
    loading,
    newsRows,
    currentPage,
    stats,
    statsUnavailable,
    totalCount,
    totalPages,
  ]);

  const publishHealthNewsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('healthNewsRouteContextUpdated', {
      detail: healthNewsPanelContext,
    }));
  }, [healthNewsPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishHealthNewsRouteContext();
    window.addEventListener('requestHealthNewsRouteContext', publishHealthNewsRouteContext);
    return () => {
      window.removeEventListener('requestHealthNewsRouteContext', publishHealthNewsRouteContext);
    };
  }, [publishHealthNewsRouteContext]);

  useEffect(() => {
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);
    return () => {
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleOpenAnalytics, handleOpenFilters]);

  return {
    activeActionFeedback,
    analyticsModalOpen,
    fetchHealthNews,
    filterSheetOpen,
    filters,
    focusedNews,
    handleApplyFilters,
    handleClearFilters,
    handleKpiFilterChange,
    handleMobileFiltersChange,
    handleModalClose,
    handleOpenAnalytics,
    handleOpenFilters,
    handleRailNavigate,
    handleSort,
    handleView,
    hasFilter,
    healthNewsError,
    isFetching,
    isMobile,
    kpiFilter,
    loadError,
    loading,
    mobileNewsFeed,
    modalMode,
    newsAnalytics,
    newsRows,
    pagination,
    routingPath,
    selectedNews,
    setAnalyticsModalOpen,
    setFilterSheetOpen,
    setFocused,
    setSearchFilter,
    sortConfig,
    stats,
    statsUnavailable,
    visibleModuleRail,
  };
};
