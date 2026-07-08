import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { getHealthNewsPage } from '../../services/healthNewsService';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  File,
  Filter,
  Globe,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { HealthNewsModal } from '../modals/HealthNewsModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { HealthNewsListView } from '../views/HealthNewsListView';
import { HealthNewsTableView } from '../views/HealthNewsTableView';
import { SEOHead } from '../common/SEOHead';
import { MobileHealthNews } from '../mobile/MobileHealthNews';

const CATEGORIES = [
  'general', 'medical', 'research', 'wellness', 'emergency', 'policy'
];

const SOURCES = [
  'Hospital Update', 'Medical Journal', 'Health Authority', 'Research Institute',
  'Government Health', 'WHO Update', 'CDC Alert', 'Medical News'
];

const HEALTH_NEWS_EMPTY_STATS = {
  total: 0,
  published: 0,
  draft: 0,
  medical: 0,
  recent: 0,
  categories: 0,
  exactCounts: true,
  scope: 'published_feed',
  draftUnavailable: true
};

const newsStateOptions = [
  {
    id: 'all',
    label: 'Feed',
    icon: Newspaper,
    countKey: 'total',
    tone: 'primary',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-sky-700 dark:text-sky-200',
  },
  {
    id: 'published',
    label: 'Readable',
    icon: Eye,
    countKey: 'published',
    tone: 'clear',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.14)] dark:text-emerald-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-emerald-700 dark:text-emerald-200',
  },
  {
    id: 'medical',
    label: 'Medical',
    icon: Tag,
    countKey: 'medical',
    tone: 'info',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-[0_18px_54px_rgba(6,182,212,0.14)] dark:text-cyan-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-cyan-700 dark:text-cyan-200',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: Clock,
    countKey: 'recent',
    tone: 'warning',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-[0_18px_54px_rgba(245,158,11,0.14)] dark:text-amber-200',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-amber-700 dark:text-amber-200',
  },
  {
    id: 'draft',
    label: 'Drafts',
    icon: File,
    countKey: 'draft',
    tone: 'muted',
    activeClass: 'bg-muted/36 text-foreground shadow-[0_18px_54px_rgb(0_0_0/0.10)]',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    colorClass: 'text-muted-foreground',
  },
];

const newsToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-[0_16px_42px_rgb(0_0_0/0.08)]',
};

const normalizeCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const hasAppliedFilters = (filters = {}) => Boolean(
  filters.search ||
  filters.published !== undefined ||
  filters.category ||
  filters.source ||
  filters.created_at ||
  (filters.kpiFilter && filters.kpiFilter !== 'all')
);

const getStateCount = ({ id, stats, news }) => {
  const rows = Array.isArray(news) ? news : [];
  const option = newsStateOptions.find((item) => item.id === id) || newsStateOptions[0];
  const fallback = id === 'all'
    ? rows.length
    : rows.filter((item) => {
      if (id === 'published') return item.published === true;
      if (id === 'medical') return String(item.category || '').toLowerCase() === 'medical';
      if (id === 'draft') return item.published === false;
      if (id === 'recent') {
        const created = new Date(item.created_at || 0).getTime();
        return Number.isFinite(created) && created >= Date.now() - (7 * 24 * 60 * 60 * 1000);
      }
      return true;
    }).length;

  return normalizeCount(stats?.[option.countKey], fallback);
};

const getNewsSignal = ({ stats, news, kpiFilter }) => {
  const activeId = kpiFilter || 'all';
  const option = newsStateOptions.find((item) => item.id === activeId) || newsStateOptions[0];
  const count = getStateCount({ id: option.id, stats, news });

  if (option.id === 'published') {
    return {
      icon: Eye,
      tone: 'clear',
      label: 'Readable',
      headline: count > 0 ? `${count} source${count === 1 ? '' : 's'} ready` : 'No readable sources',
      subhead: count > 0 ? 'Open one source and verify the detail before sharing it forward.' : 'Approved published sources will appear here.',
    };
  }

  if (option.id === 'medical') {
    return {
      icon: Tag,
      tone: 'info',
      label: 'Medical',
      headline: count > 0 ? `${count} medical update${count === 1 ? '' : 's'}` : 'No medical updates',
      subhead: count > 0 ? 'Medical items stay scoped to the curated feed projection.' : 'Medical category items will appear when the feed has them.',
    };
  }

  if (option.id === 'recent') {
    return {
      icon: Clock,
      tone: 'warning',
      label: 'Recent',
      headline: count > 0 ? `${count} recent item${count === 1 ? '' : 's'}` : 'No recent items',
      subhead: count > 0 ? 'Recent means published within the current seven day window.' : 'New published items will appear here.',
    };
  }

  if (option.id === 'draft') {
    return {
      icon: File,
      tone: 'muted',
      label: 'Drafts',
      headline: 'Draft writing is locked',
      subhead: 'The console shows the published feed until writer authority and public-feed consequence are proved.',
    };
  }

  return {
    icon: Newspaper,
    tone: 'primary',
    label: 'Health News',
    headline: count > 0 ? `${count} published source${count === 1 ? '' : 's'}` : 'No published sources',
    subhead: count > 0 ? 'Review the feed, open one item, and keep writing actions unavailable until the receiver is proved.' : 'Published health news will appear here when available.',
  };
};

const getNewsDate = (news) => {
  if (!news?.created_at) return 'No date';
  try {
    return new Date(news.created_at).toLocaleDateString();
  } catch {
    return 'No date';
  }
};

export const HealthNewsManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useNavigation();
  const [healthNews, setHealthNews] = useState([]);
  const [mobileNewsFeed, setMobileNewsFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [healthNewsError, setHealthNewsError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [stats, setStats] = useState(HEALTH_NEWS_EMPTY_STATS);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const actionFeedbackTimerRef = useRef(null);

  const { viewMode, setViewMode } = useViewMode('health-news-page', 'table');
  const pagination = usePagination(20);
  const canManageContent = false;

  // Shared focused-record store: most-urgent-at-rest fallback + consistent toggle.
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('healthnews', healthNews);
  const focusedNews = focusedRecord;

  useEffect(() => () => {
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
  }, []);

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
    pagination.resetPagination();
    setMobileNewsFeed([]);
    setFilters((currentFilters) => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, [pagination.resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    handleApplyFilters((current) => ({ ...current, kpiFilter: nextFilter }));
  }, [handleApplyFilters]);

  const fetchHealthNews = useCallback(async () => {
    try {
      setLoading(true);
      setHealthNewsError(null);

      const statsFilter = { ...filters };
      delete statsFilter.kpiFilter;
      delete statsFilter.published;

      const { data, count, stats: pageStats } = await getHealthNewsPage({
        ...filters,
        statsFilter,
        limit: pagination.itemsPerPage,
        offset: pagination.paginationRange.start,
        quiet: true,
      });

      const pageData = data || [];
      setStats(pageStats || HEALTH_NEWS_EMPTY_STATS);
      pagination.setTotalCount(count || 0);
      setHealthNews(pageData);
      if (isMobile) {
        setMobileNewsFeed(prev =>
          pagination.currentPage === 1
            ? pageData
            : [...prev, ...pageData.filter(item => !prev.some(existing => existing.id === item.id))]
        );
      }
    } catch (error) {
      console.error('Error fetching health news:', error);
      setHealthNewsError('Health news could not load. Try again.');
      setHealthNews([]);
      setMobileNewsFeed([]);
      setStats(HEALTH_NEWS_EMPTY_STATS);
      pagination.setTotalCount(0);
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  }, [filters, isMobile, pagination.currentPage, pagination.itemsPerPage, pagination.paginationRange.start, pagination.setTotalCount]);

  useEffect(() => {
    fetchHealthNews();
  }, [fetchHealthNews, pagination.currentPage]);

  const handleCreateUnavailable = useCallback(() => {
    markActionFeedback('create-unavailable');
    toast.info('Content authoring is unavailable until the published feed writer is approved.');
  }, [markActionFeedback]);

  const handleView = useCallback((news) => {
    markActionFeedback(`view-${news?.id || 'unknown'}`);
    if (news?.id) setFocused(news.id);
    setSelectedNews(news);
    setModalMode('view');
  }, [markActionFeedback, setFocused]);

  const handleSave = useCallback(async () => {
    throw new Error('Health news authoring is unavailable.');
  }, []);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedNews(null);
    if (shouldRefresh) {
      fetchHealthNews();
    }
  }, [fetchHealthNews]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const healthNewsPanelContext = useMemo(() => ({
    articles: healthNews,
    recentNews: healthNews.slice(0, 3),
    focusedNews,
    stats,
    count: pagination.totalCount || healthNews.length,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    filters,
    hasFilters: hasAppliedFilters(filters),
    loading,
    errorMessage: healthNewsError,
    viewMode,
    canManageContent,
    scope: stats?.scope || 'published_feed',
  }), [
    canManageContent,
    filters,
    focusedNews,
    healthNews,
    healthNewsError,
    loading,
    pagination.currentPage,
    pagination.totalCount,
    pagination.totalPages,
    stats,
    viewMode,
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
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true') {
      handleCreateUnavailable();
      navigate('/health-news', { replace: true });
    }

    const handleOpenModal = () => {
      handleCreateUnavailable();
    };

    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openHealthNewsModal', handleOpenModal);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openHealthNewsModal', handleOpenModal);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreateUnavailable, handleOpenAnalytics, handleOpenFilters, location.search, navigate]);

  const getStatusBadge = (published) => {
    return published ? 'bg-emerald-500/16 text-emerald-500' : 'bg-amber-500/16 text-amber-500';
  };

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search health news'
    },
    {
      key: 'published',
      type: 'select',
      label: 'Published Status',
      options: [
        { value: true, label: 'Published' },
        { value: false, label: 'Draft' }
      ]
    },
    {
      key: 'category',
      type: 'select',
      label: 'Category',
      options: CATEGORIES.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
    },
    {
      key: 'source',
      type: 'select',
      label: 'Source',
      options: SOURCES.map(source => ({ value: source, label: source }))
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Published Date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], []);

  const viewToggleComponent = useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} tone="neutral" />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      className={`relative h-9 w-9 rounded-button bg-muted/30 text-muted-foreground transition-[background,color,transform,box-shadow] hover:bg-muted/45 hover:text-primary active:scale-[0.98] ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
      aria-label="Filter health news"
      aria-busy={activeActionFeedback === 'filters'}
      data-state={activeActionFeedback === 'filters' ? 'opening' : hasAppliedFilters(filters) ? 'filtered' : 'idle'}
    >
      <Filter className="h-4 w-4" />
      {hasAppliedFilters(filters) && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-primary" />}
    </Button>
  ), [activeActionFeedback, filters, handleOpenFilters]);

  const headerActions = useMemo(() => {
    if (canManageContent) {
      return (
        <Button
          onClick={handleCreateUnavailable}
          aria-busy={activeActionFeedback === 'create-unavailable'}
          data-state={activeActionFeedback === 'create-unavailable' ? 'opening' : 'idle'}
          className="h-9 rounded-button px-4 text-sm font-semibold shadow-[0_14px_34px_hsl(var(--primary)/0.18)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          New article
        </Button>
      );
    }
    return null;
  }, [activeActionFeedback, canManageContent, handleCreateUnavailable]);

  usePageHeader(
    'Health News',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
        <MobileHealthNews
          articles={mobileNewsFeed}
          stats={stats}
          filters={filters}
          setFilters={handleApplyFilters}
          onView={handleView}
          onRefresh={fetchHealthNews}
          loading={loading}
          errorMessage={healthNewsError}
          onRetry={fetchHealthNews}
          onOpenFilters={handleOpenFilters}
          onViewAnalytics={handleOpenAnalytics}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        {modalMode && (
          <HealthNewsModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            news={selectedNews}
            mode={modalMode}
            onSave={handleSave}
          />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={handleApplyFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile={true}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="news"
          analytics={stats}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-8 pt-3 text-foreground md:px-6 lg:px-8">
      <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.15),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(6,182,212,0.12),transparent_30%)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0">
          <HealthNewsSignalPanel
            stats={stats}
            news={healthNews}
            loading={loading}
            kpiFilter={filters.kpiFilter || 'all'}
            setKpiFilter={handleKpiFilterChange}
          />

          <HealthNewsActivitySheet
            filters={filters}
            setFilters={handleApplyFilters}
            openFilters={handleOpenFilters}
            openAnalytics={handleOpenAnalytics}
            loading={loading}
            pagination={pagination}
            errorMessage={healthNewsError}
            onRetry={fetchHealthNews}
            activeActionFeedback={activeActionFeedback}
            viewToggle={viewToggleComponent}
          >
            {loading && healthNews.length === 0 && <TableSkeleton rows={6} />}
            {!loading && healthNewsError && healthNews.length === 0 && (
              <HealthNewsEmptyState
                title="Health news did not load"
                copy="Try again before treating the published feed as clear."
                actionLabel="Retry"
                onAction={fetchHealthNews}
              />
            )}
            {!loading && !healthNewsError && pagination.totalCount === 0 && (
              <HealthNewsEmptyState
                title={hasAppliedFilters(filters) ? 'No matching articles' : 'No published articles'}
                copy={hasAppliedFilters(filters) ? 'Clear filters or search a different source.' : 'Published health news will appear here when available.'}
                actionLabel={hasAppliedFilters(filters) ? 'Clear filters' : null}
                onAction={hasAppliedFilters(filters) ? () => handleApplyFilters({ kpiFilter: 'all' }) : null}
              />
            )}
            {healthNews.length > 0 && (
              <>
                {viewMode === 'grid' && (
                  <LayoutGroup>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3" data-testid="health-news-grid">
                      {healthNews.map((news, index) => (
                        <HealthNewsGridCard
                          key={news.id}
                          news={news}
                          index={index}
                          selected={isFocused(news.id)}
                          onFocus={() => setFocused(news.id)}
                          onView={handleView}
                          activeActionFeedback={activeActionFeedback}
                        />
                      ))}
                    </div>
                  </LayoutGroup>
                )}
                {viewMode === 'list' && (
                  <HealthNewsListView
                    healthNews={healthNews}
                    onView={handleView}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                  />
                )}
                {viewMode === 'table' && (
                  <HealthNewsTableView
                    healthNews={healthNews}
                    onView={handleView}
                    getStatusBadge={getStatusBadge}
                  />
                )}
              </>
            )}
          </HealthNewsActivitySheet>
        </main>

        <HealthNewsDetailRail
          news={focusedNews}
          loading={loading}
          onView={handleView}
          activeActionFeedback={activeActionFeedback}
        />
      </div>

      {modalMode && (
        <HealthNewsModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          news={selectedNews}
          mode={modalMode}
          onSave={handleSave}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={handleApplyFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="news"
        analytics={stats}
      />
    </div>
  );
};

const HealthNewsSignalPanel = ({ stats, news, loading, kpiFilter, setKpiFilter }) => {
  const signal = loading
    ? {
      icon: Newspaper,
      tone: 'muted',
      label: 'Loading',
      headline: 'Loading health news',
      subhead: 'One moment while the published feed loads.',
    }
    : getNewsSignal({ stats, news, kpiFilter });
  const SignalIcon = signal.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="flex min-h-[248px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[310px]"
    >
      <div className="min-w-0">
        <div className="max-w-3xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${newsToneClass[signal.tone] || newsToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-3xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            {signal.headline}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {signal.subhead}
          </p>
        </div>

        <HealthNewsStateStrip
          stats={stats}
          news={news}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </motion.section>
  );
};

const HealthNewsStateStrip = ({ stats, news, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5">
    {newsStateOptions.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getStateCount({ id: item.id, stats, news });

      return (
        <motion.button
          key={item.id}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform,color] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active}
          aria-label={`Show ${item.label.toLowerCase()} health news`}
          data-state={active ? 'selected' : 'idle'}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold tracking-normal text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 transition-transform group-hover:scale-105 ${active ? item.colorClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const HealthNewsActivitySheet = ({
  filters,
  setFilters,
  openFilters,
  openAnalytics,
  loading,
  pagination,
  errorMessage,
  onRetry,
  activeActionFeedback,
  viewToggle,
  children,
}) => (
  <section
    className="mt-2 flex min-h-[520px] flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet"
    data-testid="health-news-activity-sheet"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    <HealthNewsSheetToolbar
      filters={filters}
      setFilters={setFilters}
      openFilters={openFilters}
      openAnalytics={openAnalytics}
      activeActionFeedback={activeActionFeedback}
      viewToggle={viewToggle}
    />

    <div className="mt-3 flex items-center justify-between gap-3 px-2 text-xs font-semibold text-muted-foreground">
      <span>{loading ? 'Loading feed' : `${pagination.totalCount} article${pagination.totalCount === 1 ? '' : 's'}`}</span>
      <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
    </div>

    {errorMessage && (
      <HealthNewsErrorBanner message={errorMessage} onRetry={onRetry} />
    )}

    <div className="mt-3 min-h-[360px] flex-1 overflow-y-auto rounded-inner bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
      {children}
    </div>

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
  </section>
);

const HealthNewsSheetToolbar = ({ filters, setFilters, openFilters, openAnalytics, activeActionFeedback, viewToggle }) => {
  const hasFilter = hasAppliedFilters(filters);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
        <input
          type="search"
          value={filters.search || ''}
          onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
          placeholder="Search health news"
          className="h-12 w-full rounded-button bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-[background,box-shadow] placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
          data-testid="health-news-sheet-search"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={openFilters}
          className={`h-12 rounded-button bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-[background,color,transform] hover:bg-primary/10 hover:text-primary active:scale-95 ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
          aria-busy={activeActionFeedback === 'filters'}
          data-state={activeActionFeedback === 'filters' ? 'opening' : hasFilter ? 'filtered' : 'idle'}
        >
          <Filter className="mr-2 h-4 w-4" />
          {activeActionFeedback === 'filters' ? 'Opening' : 'Filters'}
          {hasFilter && <span className="ml-2 h-2 w-2 rounded-pill bg-primary" />}
        </Button>
        <Button
          variant="ghost"
          onClick={openAnalytics}
          className={`h-12 rounded-button bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition-[background,transform] hover:bg-primary/15 active:scale-95 ${activeActionFeedback === 'analytics' ? 'scale-95' : ''}`}
          aria-busy={activeActionFeedback === 'analytics'}
          data-state={activeActionFeedback === 'analytics' ? 'opening' : 'idle'}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </Button>
        <div className="hidden lg:block">
          {viewToggle}
        </div>
      </div>
    </div>
  );
};

const HealthNewsErrorBanner = ({ message, onRetry }) => (
  <div
    className="mt-3 flex flex-col gap-3 rounded-card bg-amber-500/10 p-4 text-amber-800 shadow-[inset_0_0_0_2px_rgba(245,158,11,0.14)] dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
    data-testid="health-news-error-state"
  >
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Health news could not load</p>
        <p className="mt-1 text-xs leading-5 opacity-80">{message}</p>
      </div>
    </div>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-10 shrink-0 rounded-button bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

const HealthNewsEmptyState = ({ title, copy, actionLabel, onAction }) => (
  <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-icon bg-primary/10 text-primary shadow-[0_16px_42px_hsl(var(--primary)/0.14)]">
      <Newspaper className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-2xl font-semibold">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
    {onAction && actionLabel && (
      <Button type="button" onClick={onAction} className="mt-5 h-10 rounded-button px-4 text-sm font-semibold">
        <RefreshCw className="mr-2 h-4 w-4" />
        {actionLabel}
      </Button>
    )}
  </div>
);

const HealthNewsGridCard = ({ news, index, selected, onFocus, onView, activeActionFeedback }) => {
  const statusTone = news.published ? newsToneClass.clear : newsToneClass.warning;
  const viewOpening = activeActionFeedback === `view-${news.id}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18) }}
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      data-state={selected ? 'selected' : 'idle'}
      className={`flex min-h-[244px] cursor-pointer flex-col rounded-card p-4 transition-[background,box-shadow,transform] duration-200 active:scale-[0.995] ${selected ? 'bg-foreground/[0.07] shadow-[0_24px_70px_rgb(0_0_0/0.14)] dark:bg-white/[0.075]' : 'bg-muted/22 hover:bg-muted/34 hover:shadow-[0_18px_54px_rgb(0_0_0/0.10)]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusTone}`}>
          <Newspaper className="h-5 w-5" />
        </span>
        <span className="rounded-pill bg-background/45 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          {news.published ? 'Published' : 'Draft'}
        </span>
      </div>

      <h3 className="mt-5 line-clamp-3 text-xl font-semibold tracking-tight text-foreground">
        {news.title || 'Untitled article'}
      </h3>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {news.source || 'Unknown source'}
      </p>

      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
        <HealthNewsFact icon={Tag} label="Category" value={news.category || 'General'} />
        <HealthNewsFact icon={Calendar} label="Published" value={getNewsDate(news)} />
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={(event) => {
          event.stopPropagation();
          onView(news);
        }}
        aria-busy={viewOpening}
        data-state={viewOpening ? 'opening' : 'idle'}
        className={`mt-4 h-11 rounded-button bg-background/55 text-sm font-semibold text-foreground transition-all hover:bg-background hover:text-primary active:scale-95 ${viewOpening ? 'scale-95 text-primary' : ''}`}
      >
        <Eye className="mr-2 h-4 w-4" />
        {viewOpening ? 'Opening' : 'Details'}
        <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
      </Button>
    </motion.article>
  );
};

const HealthNewsFact = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-center gap-2 rounded-inner bg-background/42 p-3">
    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  </div>
);

const HealthNewsDetailRail = ({ news, loading, onView, activeActionFeedback }) => {
  if (loading) {
    return (
      <aside className="hidden min-h-0 xl:flex xl:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col rounded-sheet bg-card/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <div className="h-5 w-28 rounded-pill bg-muted/40" />
          <div className="mt-6 h-24 rounded-inner bg-muted/28" />
          <div className="mt-4 space-y-3">
            <div className="h-14 rounded-inner bg-muted/24" />
            <div className="h-14 rounded-inner bg-muted/24" />
            <div className="h-14 rounded-inner bg-muted/24" />
          </div>
        </div>
      </aside>
    );
  }

  if (!news) {
    return (
      <aside className="hidden min-h-0 xl:flex xl:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col justify-center rounded-sheet bg-card/70 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <Newspaper className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No article selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Published items will appear here when the feed has results.</p>
        </div>
      </aside>
    );
  }

  const viewOpening = activeActionFeedback === `view-${news.id}`;
  const hostLabel = news.source_host || news.source || 'Unknown source';

  return (
    <aside className="hidden min-h-0 xl:flex xl:flex-col" data-testid="health-news-detail-rail">
      <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden rounded-sheet bg-card/72 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className={`${news.published ? 'bg-emerald-500/16 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/16 text-amber-600 dark:text-amber-300'} inline-flex items-center rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]`}>
            {news.published ? 'Published' : 'Draft'}
          </span>
          <span className="rounded-pill bg-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Focus
          </span>
        </div>

        <div className="mt-6 rounded-card bg-background/42 p-5 shadow-[inset_0_2px_0_hsl(var(--foreground)/0.06)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-icon bg-primary/12 text-primary shadow-[0_18px_50px_hsl(var(--primary)/0.14)]">
              <Newspaper className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current source</p>
              <h2 className="mt-1 line-clamp-3 text-2xl font-semibold tracking-tight">
                {news.title || 'Untitled article'}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {getNewsDate(news)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
          <HealthNewsFocusRow icon={Globe} label="Source" value={hostLabel} />
          <HealthNewsFocusRow icon={Tag} label="Category" value={news.category || 'General'} />
          <HealthNewsFocusRow icon={Clock} label="Time" value={news.time || 'No time'} />
          <HealthNewsFocusRow icon={Eye} label="URL" value={news.source_url_valid ? 'Valid link' : 'No valid link'} />

          <div className="rounded-inner bg-muted/22 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Record</p>
            <p className="mt-2 break-all font-mono text-xs text-foreground/70">#{news.id}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            onClick={() => onView(news)}
            className={`h-12 w-full rounded-button bg-foreground text-sm font-semibold text-background shadow-[0_18px_46px_rgba(0,0,0,0.18)] transition-all hover:scale-[1.01] hover:bg-foreground/90 active:scale-95 ${viewOpening ? 'scale-95' : ''}`}
            aria-busy={viewOpening}
            data-state={viewOpening ? 'opening' : 'idle'}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewOpening ? 'Opening' : 'View details'}
            <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
          </Button>
          <p className="rounded-inner bg-muted/24 p-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            Writing, publish changes, imports, and deletion stay locked until the content receiver is proved.
          </p>
        </div>
      </div>
    </aside>
  );
};

const HealthNewsFocusRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/24 p-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-icon bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  </div>
);
