import {
  AlertCircle,
  Clock,
  Eye,
  File,
  Newspaper,
  Tag,
} from 'lucide-react';

export const HEALTH_NEWS_CATEGORIES = [
  'general',
  'medical',
  'research',
  'wellness',
  'emergency',
  'policy',
];

export const HEALTH_NEWS_SOURCES = [
  'Hospital Update',
  'Medical Journal',
  'Health Authority',
  'Research Institute',
  'Government Health',
  'WHO Update',
  'CDC Alert',
  'Medical News',
];

// health_news has no published_at column, so the read projection uses created_at.
export const RECENT_NEWS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const HEALTH_NEWS_EMPTY_STATS = {
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

export const NEWS_KPI_OPTIONS = [
  { id: 'all', label: 'Feed', icon: Newspaper, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'published', label: 'Readable', icon: Eye, countKey: 'published', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'medical', label: 'Medical', icon: Tag, countKey: 'medical', colorClass: 'text-cyan-700 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200' },
  { id: 'recent', label: 'Recent', icon: Clock, countKey: 'recent', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'draft', label: 'Drafts', icon: File, countKey: 'draft', colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]' },
];

export const NEWS_KPI_IMPORTANCE = {
  all: 0,
  medical: 1,
  recent: 2,
  published: 3,
  draft: 4,
};

export const PINNED_NEWS_KPI_IDS = ['recent'];

export const newsToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  danger: 'bg-destructive/12 text-destructive shadow-e2',
};

export const NEWS_GRID_COLS = 'grid-cols-[minmax(200px,1.9fr)_minmax(120px,1fr)_minmax(96px,auto)_minmax(96px,auto)_minmax(112px,auto)_96px]';

export const HEALTH_NEWS_FILTER_SCHEMA = [
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
    options: HEALTH_NEWS_CATEGORIES.map((category) => ({
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
    })),
  },
  {
    key: 'source',
    type: 'select',
    label: 'Source',
    options: HEALTH_NEWS_SOURCES.map((source) => ({ value: source, label: source })),
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
];

export const normalizeCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const getStatusMeta = (published) => (published === false
  ? { label: 'Draft', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' }
  : { label: 'Published', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' });

export const buildVisibleHealthNewsStats = (rows = [], reason = 'stats_query_failed') => {
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

export const hasAppliedFilters = (filters = {}, kpiFilter = 'all') => Boolean(
  filters.search
  || filters.published !== undefined
  || filters.category
  || filters.source
  || filters.created_at
  || (kpiFilter && kpiFilter !== 'all')
);

export const getStateCount = ({ id, stats, news }) => {
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

export const getNewsSignal = ({ stats, news, kpiFilter, loadError, hasAny }) => {
  if (loadError && !hasAny) {
    return {
      icon: AlertCircle,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Health news did not load',
      subhead: 'Retry to load the published feed.',
    };
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

export const formatHealthNewsDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getHealthNewsRoleKind = ({ admin, orgAdmin }) => (
  admin ? 'admin' : (orgAdmin ? 'org_admin' : 'viewer')
);

export const buildHealthNewsQueryFilter = ({
  filters,
  kpiFilter,
  itemsPerPage,
  offset,
  sortConfig,
}) => {
  const routeFilters = { ...filters, kpiFilter };
  const statsFilter = { ...routeFilters };
  delete statsFilter.kpiFilter;
  delete statsFilter.published;

  return {
    ...routeFilters,
    statsFilter,
    limit: itemsPerPage,
    offset,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    quiet: true,
  };
};

export const buildHealthNewsAnalytics = ({ rows, stats, statsUnavailable }) => {
  const visibleRows = Array.isArray(rows) ? rows : [];
  const bySource = {};
  const byCategory = {};

  visibleRows.forEach((item) => {
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
    visibleCount: visibleRows.length,
  };
};

export const mergeMobileNewsFeed = ({ previousRows, pageRows, currentPage }) => {
  const previous = Array.isArray(previousRows) ? previousRows : [];
  const nextPage = Array.isArray(pageRows) ? pageRows : [];
  if (currentPage === 1) return nextPage;
  return [
    ...previous,
    ...nextPage.filter((item) => !previous.some((existing) => existing.id === item.id)),
  ];
};

export const buildHealthNewsPanelContext = ({
  newsRows,
  focusedNews,
  stats,
  pagination,
  filters,
  kpiFilter,
  loading,
  healthNewsError,
  statsUnavailable,
}) => ({
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
});
