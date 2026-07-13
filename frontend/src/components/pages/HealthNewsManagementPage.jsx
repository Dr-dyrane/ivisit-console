import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useHealthNewsQuery } from '../../hooks/useHealthNewsQuery';
// Console design system: Health News COMPOSES the shared workspace grammar (donor:
// Requests; closest analog: Support/Users) instead of the bespoke signal/state-strip/
// grid-card/rail look-alikes it used to inline. WorkspaceStage -> SignalPanel/KpiStrip
// -> one ActivitySheet + ListRowShell (one Time header) -> DetailRailShell rail.
//
// AUTHORITY (no parallel truth): this page is a read-only published-feed projection. Authoring
// controls are not rendered or mounted because no approved writer receiver exists.
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, DetailLine, CopyChip, EmptyState, LoadErrorState, StatusPill } from '../console/primitives';
import { SEOHead } from '../common/SEOHead';
import { FilterSheet } from '../common/FilterSheet';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { HealthNewsModal } from '../modals/HealthNewsModal';
import { Button } from '../ui/button';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  File,
  Filter,
  Globe,
  Info,
  Newspaper,
  Tag,
} from 'lucide-react';
import { MobileHealthNews } from '../mobile/MobileHealthNews';

const CATEGORIES = [
  'general', 'medical', 'research', 'wellness', 'emergency', 'policy'
];

const SOURCES = [
  'Hospital Update', 'Medical Journal', 'Health Authority', 'Research Institute',
  'Government Health', 'WHO Update', 'CDC Alert', 'Medical News'
];

// Recency window (7 days) -- MUST mirror healthNewsService.RECENT_NEWS_WINDOW_MS. The
// service scopes "recent" on created_at because there is NO published_at column.
const RECENT_NEWS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const HEALTH_NEWS_EMPTY_STATS = {
  total: 0,
  published: 0,
  draft: 0,
  medical: 0,
  recent: 0,
  categories: 0,
  exactCounts: true,
  available: true,
  scope: 'published_feed',
  draftUnavailable: true,
};

// KPI/state strip axis = category-partition + recency-overlay, published-feed scoped.
// Feed(total) / Readable(published, == total under scope) / Medical(category==='medical')
// / Recent(created_at within 7d) / Drafts(LOCKED dead chip -- draft always 0 under the
// published scope, kept as an honest "authoring locked" chip). Literal palette +
// NEUTRAL shadows only (shadow-e2); the shared KpiStrip owns width/tile/smart-context.
//
// LIVE-DB NOTE (verified): only 2 seed rows (Infrastructure, Logistics), both published,
// stale (2026-02-22). So medical=0 and recent(7d)=0 are LEGITIMATE zeros, not a bug --
// (1) 'medical' matches lowercase category==='medical' but live values are Title-Case;
// (2) recency uses created_at (no published_at column). Do NOT force the axis non-zero.
const NEWS_KPI_OPTIONS = [
  { id: 'all', label: 'Feed', icon: Newspaper, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'published', label: 'Readable', icon: Eye, countKey: 'published', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'medical', label: 'Medical', icon: Tag, countKey: 'medical', colorClass: 'text-cyan-700 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200' },
  { id: 'recent', label: 'Recent', icon: Clock, countKey: 'recent', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'draft', label: 'Drafts', icon: File, countKey: 'draft', colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
];
const NEWS_KPI_IMPORTANCE = { all: 0, medical: 1, recent: 2, published: 3, draft: 4 };
const PINNED_NEWS_KPI_IDS = ['recent'];

// SignalPanel eyebrow tones -- literal palette, NEUTRAL e2 shadows (no colored glow).
const newsToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  danger: 'bg-destructive/12 text-destructive shadow-e2',
};

// Status pill tone. Under the published-feed scope every row reads Published; Draft is
// kept for honesty if the projection ever surfaces one.
const getStatusMeta = (published) => (published === false
  ? { label: 'Draft', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' }
  : { label: 'Published', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' });

// Title | Source | Category | Status | Published(date, sortable) | Action -- read-only
// (no selection column: this is a published feed with no bulk write target).
const NEWS_GRID_COLS = 'grid-cols-[minmax(200px,1.9fr)_minmax(120px,1fr)_minmax(96px,auto)_minmax(96px,auto)_minmax(112px,auto)_96px]';

const normalizeCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const buildVisibleHealthNewsStats = (rows = [], reason = 'stats_query_failed') => {
  const visibleRows = Array.isArray(rows) ? rows : [];
  const recentThreshold = Date.now() - RECENT_NEWS_WINDOW_MS;

  return {
    total: visibleRows.length,
    published: visibleRows.filter((item) => item?.published !== false).length,
    draft: visibleRows.filter((item) => item?.published === false).length,
    medical: visibleRows.filter((item) => String(item?.category || '').toLowerCase() === 'medical').length,
    recent: visibleRows.filter((item) => {
      const createdAt = new Date(item?.created_at || 0).getTime();
      return Number.isFinite(createdAt) && createdAt >= recentThreshold;
    }).length,
    categories: new Set(visibleRows.map((item) => item?.category).filter(Boolean)).size,
    exactCounts: false,
    available: false,
    reason,
    scope: 'visible_rows',
    draftUnavailable: true,
  };
};

const ProjectionStatsNotice = ({ className = '' }) => (
  <p
    className={`flex items-start gap-2 rounded-inner bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 ${className}`}
    role="status"
    aria-live="polite"
  >
    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>Health News statistics are unavailable. Counts use the loaded rows; the list remains current.</span>
  </p>
);

const hasAppliedFilters = (filters = {}, kpiFilter = 'all') => Boolean(
  filters.search ||
  filters.published !== undefined ||
  filters.category ||
  filters.source ||
  filters.created_at ||
  (kpiFilter && kpiFilter !== 'all')
);

const getStateCount = ({ id, stats, news }) => {
  const rows = Array.isArray(news) ? news : [];
  const option = NEWS_KPI_OPTIONS.find((item) => item.id === id) || NEWS_KPI_OPTIONS[0];
  const fallback = id === 'all'
    ? rows.length
    : rows.filter((item) => {
      if (id === 'published') return item.published === true;
      if (id === 'medical') return String(item.category || '').toLowerCase() === 'medical';
      if (id === 'draft') return item.published === false;
      if (id === 'recent') {
        const created = new Date(item.created_at || 0).getTime();
        return Number.isFinite(created) && created >= Date.now() - RECENT_NEWS_WINDOW_MS;
      }
      return true;
    }).length;

  return normalizeCount(stats?.[option.countKey], fallback);
};

// Signal adapter -> {icon,tone,label,headline,subhead}. Renders gracefully at zero (the
// REAL live state is a 2-row stale feed) and surfaces an honest failed-hero on a cold
// load failure. The Drafts branch stays the honest "authoring locked" signal.
const getNewsSignal = ({ stats, news, kpiFilter, loadError, hasAny }) => {
  if (loadError && !hasAny) {
    return { icon: AlertCircle, tone: 'danger', label: 'Load failed', headline: 'Health news did not load', subhead: 'Retry to load the published feed.' };
  }

  const activeId = kpiFilter || 'all';
  const option = NEWS_KPI_OPTIONS.find((item) => item.id === activeId) || NEWS_KPI_OPTIONS[0];
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
      subhead: count > 0 ? 'Recent means created within the current seven day window.' : 'New published items will appear here.',
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

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const HealthNewsManagementPage = () => {
  const { isMobile } = useNavigation();
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
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const roleKind = isAdmin() ? 'admin' : (isOrgAdmin() ? 'org_admin' : 'viewer');
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  // --- Read path: React Query (mirrors SupportTicketsPage / DoctorsPage) ---
  // The route-owned published-feed projection (getHealthNewsPage) flows through
  // useHealthNewsQuery, so the ['healthNews', queryFilter] cache is the single store.
  // The KPI category pill and sheet filters compose into one server filter; stats are
  // requested on the status-agnostic set (statsFilter) so the KPI counts stay stable
  // while the list narrows. Time-only sort (created_at) is threaded here.
  const queryFilter = useMemo(() => {
    const routeFilters = { ...filters, kpiFilter };
    const statsFilter = { ...routeFilters };
    delete statsFilter.kpiFilter;
    delete statsFilter.published;

    return {
      ...routeFilters,
      statsFilter,
      limit: pagination.itemsPerPage,
      offset: pagination.paginationRange.start,
      sortKey: sortConfig.key,
      sortDirection: sortConfig.direction,
      quiet: true,
    };
  }, [filters, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start, sortConfig.key, sortConfig.direction]);

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
  // RQ error object -> the page's degraded-state copy. loadError is the honest-failed-hero
  // source threaded into the workspace signal.
  const healthNewsError = queryError ? 'Health news could not load. Try again.' : null;
  const loadError = healthNewsError;
  // fetchHealthNews is now the RQ refetch (Retry on desktop, pull-to-refresh on mobile).
  const fetchHealthNews = refetch;

  const newsRows = useMemo(() => (Array.isArray(healthNews) ? healthNews : []), [healthNews]);
  const visibleStatsRows = isMobile && mobileNewsFeed.length > 0 ? mobileNewsFeed : newsRows;
  const statsUnavailable = projectionStats.available === false;
  const stats = useMemo(() => (
    statsUnavailable
      ? buildVisibleHealthNewsStats(visibleStatsRows, projectionStats.reason)
      : projectionStats
  ), [projectionStats, statsUnavailable, visibleStatsRows]);
  const newsAnalytics = useMemo(() => {
    const bySource = {};
    const byCategory = {};

    newsRows.forEach((item) => {
      const source = String(item?.source || 'Unknown source').trim() || 'Unknown source';
      const category = String(item?.category || 'uncategorized').trim().toLowerCase() || 'uncategorized';
      bySource[source] = (bySource[source] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return {
      ...stats,
      bySource,
      byCategory,
      distributionScope: 'visible_page',
      distributionLabel: statsUnavailable ? 'Loaded rows (statistics unavailable)' : 'Current page',
      visibleCount: newsRows.length,
    };
  }, [newsRows, stats, statsUnavailable]);

  // Auto-select the focused record via the console-wide shared store (never empty when data).
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('healthnews', newsRows);
  const focusedNews = focusedRecord;

  const hasFilter = hasAppliedFilters(filters, kpiFilter);

  // selection excluded by decision: PAGE_REVAMP_GATE Page 11 Admission - Health News --
  // read-only published feed, no bulk write target (no useRowSelection / delete surface).
  // deep-link excluded by decision: the retired create deep link has no approved write target.
  // submit-spinner excluded by decision: there is no mounted Health News write surface.
  // arrival-toast excluded by decision: PAGE_REVAMP_GATE Page 11 Admission - Health News --
  // published feed with near-zero inserts and no page-level realtime channel; there is no
  // INSERT refetch to throttle a toast against (mirrors the Support exclusion, 2026-07-03).

  useEffect(() => () => {
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
  }, []);

  // Keep the shared pagination store's total in sync with the RQ count.
  useEffect(() => {
    pagination.setTotalCount(count || 0);
  }, [count, pagination.setTotalCount]);

  // Mobile infinite feed: accumulate pages (page 1 replaces, later pages append de-duped);
  // the mobile lane owns MobileHealthNews and reads this accumulated `articles` list.
  useEffect(() => {
    if (!isMobile) return;
    setMobileNewsFeed((prev) => (
      pagination.currentPage === 1
        ? newsRows
        : [...prev, ...newsRows.filter((item) => !prev.some((existing) => existing.id === item.id))]
    ));
  }, [isMobile, pagination.currentPage, newsRows]);

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
    pagination.resetPagination();
    setMobileNewsFeed([]);
    setKpiFilter(nextFilter);
  }, [pagination.resetPagination]);

  // Bridge for MobileHealthNews: it routes KPI selection through the filters object
  // (setFilters(prev => ({ ...prev, kpiFilter: id }))), but kpiFilter is SEPARATE state that
  // queryFilter's { ...filters, kpiFilter } shorthand overrides back to its own value -- so a
  // mobile KPI tap would be silently dropped without this. Mirror the Support bridge: lift any
  // incoming filters.kpiFilter into setKpiFilter so mobile chips actually narrow the feed.
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
    pagination.resetPagination();
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, [pagination.resetPagination]);

  const setSearchFilter = useCallback((search) => {
    handleApplyFilters((current) => ({ ...current, search }));
  }, [handleApplyFilters]);

  const handleView = useCallback((news) => {
    markActionFeedback(`view-${news?.id || 'unknown'}`);
    if (news?.id && !isFocused(news.id)) setFocused(news.id);
    setSelectedNews(news);
    setModalMode('view');
  }, [markActionFeedback, setFocused, isFocused]);

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

  // Republish the whole-object panel context (consumed verbatim by HealthNewsPanel via
  // healthNewsContext pass-through -- already canon; no reshape).
  const healthNewsPanelContext = useMemo(() => ({
    articles: newsRows,
    recentNews: newsRows.slice(0, 3),
    focusedNews,
    stats,
    count: pagination.totalCount || newsRows.length,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    filters,
    hasFilters: hasAppliedFilters(filters, kpiFilter),
    loading,
    errorMessage: healthNewsError,
    authoringAvailable: false,
    statsAvailable: !statsUnavailable,
    scope: stats?.scope || 'published_feed',
  }), [
    filters,
    focusedNews,
    healthNewsError,
    kpiFilter,
    loading,
    newsRows,
    pagination.currentPage,
    pagination.totalCount,
    pagination.totalPages,
    stats,
    statsUnavailable,
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

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search health news',
    },
    {
      key: 'published',
      type: 'select',
      label: 'Published Status',
      options: [
        { value: true, label: 'Published' },
        { value: false, label: 'Draft' },
      ],
    },
    {
      key: 'category',
      type: 'select',
      label: 'Category',
      options: CATEGORIES.map((cat) => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) })),
    },
    {
      key: 'source',
      type: 'select',
      label: 'Source',
      options: SOURCES.map((source) => ({ value: source, label: source })),
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
        { label: 'This Month', value: 'month' },
      ],
    },
  ], []);

  const filterButtonComponent = useMemo(() => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter health news"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [handleOpenFilters, filterSheetOpen, hasFilter]);

  usePageHeader('Health News', null, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
        {statsUnavailable && <ProjectionStatsNotice className="relative z-20 mx-4 mt-3" />}
        <MobileHealthNews
          articles={mobileNewsFeed}
          stats={stats}
          filters={{ ...filters, kpiFilter }}
          setFilters={handleMobileFiltersChange}
          onView={handleView}
          onRefresh={fetchHealthNews}
          loading={loading}
          isFetching={isFetching}
          errorMessage={healthNewsError}
          onRetry={fetchHealthNews}
          onOpenFilters={handleOpenFilters}
          onViewAnalytics={handleOpenAnalytics}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        {modalMode && (
          <HealthNewsModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            news={selectedNews}
          />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={handleApplyFilters}
          initialValues={filters}
          isMobile
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="news"
          analytics={newsAnalytics}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Health News" description="Manage health news, updates, and announcements." />

      <HealthNewsDesktopWorkspace
        items={newsRows}
        stats={stats}
        statsUnavailable={statsUnavailable}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        focusedNews={focusedNews}
        setFocused={setFocused}
        filters={filters}
        kpiFilter={kpiFilter}
        setKpiFilter={handleKpiFilterChange}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={handleOpenFilters}
        onRetry={fetchHealthNews}
        onClearFilters={handleClearFilters}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        onView={handleView}
        activeActionFeedback={activeActionFeedback}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {modalMode && (
        <HealthNewsModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          news={selectedNews}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={handleApplyFilters}
        initialValues={filters}
        isMobile={false}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="news"
        analytics={newsAnalytics}
      />
    </div>
  );
};

const HealthNewsDesktopWorkspace = ({
  items,
  stats,
  statsUnavailable,
  loading,
  isFetching,
  loadError,
  focusedNews,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  onClearFilters,
  pagination,
  sortConfig,
  onSort,
  onView,
  activeActionFeedback,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getNewsSignal({ stats, news: items, kpiFilter, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedNews,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-health-news-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/health-news"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <HealthNewsDetailRail
          news={focusedNews}
          loading={loading}
          hasFilter={hasFilter}
          onView={onView}
          activeActionFeedback={activeActionFeedback}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={newsToneClass}>
        <KpiStrip
          options={NEWS_KPI_OPTIONS}
          getCount={(id) => getStateCount({ id, stats, news: items })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_NEWS_KPI_IDS}
          importance={NEWS_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-health-news-state"
        />
        {statsUnavailable && <ProjectionStatsNotice className="mt-3" />}
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="articles"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search health news by title, source, or category..."
            searchTestId="health-news-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="health news"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Health news list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
          data-testid="health-news-list"
        >
          <HealthNewsListHeader sortConfig={sortConfig} onSort={onSort} />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Health news did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Newspaper}
              heading={hasFilter ? 'No matching articles' : 'No published articles'}
              body={hasFilter ? 'Clear filters or search a different source.' : 'Published health news will appear here when available.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={onClearFilters}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all articles
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((news) => (
            <HealthNewsRow
              key={news.id}
              news={news}
              selected={focusedNews?.id === news.id}
              onFocus={() => setFocused(news.id)}
              onView={onView}
              activeActionFeedback={activeActionFeedback}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

const HealthNewsListHeader = ({ sortConfig, onSort }) => (
  <div className={`grid ${NEWS_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {/* Title / Source / Category / Status are plain labels -- only Published (created_at)
        is a meaningful sort; the rest belong in the FilterSheet (TIME-only sort). */}
    <span>Title</span>
    <span>Source</span>
    <span>Category</span>
    <span>Status</span>
    <SortableColumnHeader label="Published" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const HealthNewsRow = ({ news, selected, onFocus, onView, activeActionFeedback }) => {
  const statusMeta = getStatusMeta(news.published);
  const title = news.title || 'Untitled article';

  return (
    <ListRowShell
      id={news.id}
      dataAttrName="data-health-news-row"
      gridCols={NEWS_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(news)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusMeta.tone}`}>
          <Newspaper className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={title}>{title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={news.source || undefined}>{news.source || 'Unknown source'}</div>
        </div>
      </div>

      <div className="min-w-0 truncate text-sm font-medium text-muted-foreground" title={news.source || undefined}>{news.source || 'Unknown source'}</div>

      <div className="min-w-0 truncate text-sm font-medium capitalize text-muted-foreground">{news.category || 'General'}</div>

      <div className="min-w-0">
        <StatusPill label={statusMeta.label} className={statusMeta.tone} compact />
      </div>

      <div className="text-sm font-medium text-muted-foreground">{formatDate(news.created_at)}</div>

      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(news); }}
          data-state={activeActionFeedback === `view-${news.id}` ? 'opening' : 'idle'}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${title}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </ListRowShell>
  );
};

const HealthNewsDetailRail = ({ news, loading, hasFilter, onView, activeActionFeedback }) => {
  if (loading && !news) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-2/3 rounded-inner" />
          <Shimmer className="h-4 w-1/2 rounded-inner" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (<Shimmer key={i} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!news) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Newspaper className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No article selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Articles that match your filters will appear here.' : 'Select an article to see its details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const statusMeta = getStatusMeta(news.published);
  const hostLabel = news.source_host || news.source || 'Unknown source';
  const displayId = news.id ? `Article ${String(news.id).slice(0, 8)}` : null;
  const viewOpening = activeActionFeedback === `view-${news.id}`;

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Article details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={news.id} label="Copy article ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              <Newspaper className="h-3.5 w-3.5" />
              {statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(news)}
            aria-label="Open full article details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={news.title || 'Untitled article'}>{news.title || 'Untitled article'}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(news.created_at)}
          </p>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Globe} label="Source" value={hostLabel} />
        <DetailLine icon={Tag} label="Category" value={news.category || 'General'} />
        <DetailLine icon={Clock} label="Published" value={formatDate(news.created_at)} />
        <DetailLine icon={Eye} label="Link" value={news.source_url_valid ? 'Valid link' : 'No valid link'} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(news)}
          data-state={viewOpening ? 'opening' : 'idle'}
          aria-busy={viewOpening}
        >
          <Eye className="mr-2 h-5 w-5" />
          {viewOpening ? 'Opening' : 'View details'}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {/* Writing stays backend-owned (fail-closed by design): the console never creates,
            publishes, imports, or deletes a source the app cannot reconcile. */}
        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="h-4 w-4 shrink-0" />
          Writing, publish changes, imports, and deletion stay locked until the content receiver is proved.
        </div>
      </div>
    </DetailRailShell>
  );
};
