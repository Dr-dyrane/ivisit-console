import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';

export const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const isArticlePublished = (article) => {
  if (typeof article?.published === 'boolean') return article.published;
  if (typeof article?.is_published === 'boolean') return article.is_published;
  const status = String(article?.status || '').toLowerCase();
  if (status) return status === 'published';
  return false;
};

export const categoryLabel = (value) => {
  const text = String(value || 'general').replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const mobileHealthNewsDateLabel = (value) => {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const healthNewsOrbClass = (published) => (
  published
    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
    : 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
);

export const hasActiveNewsFilters = (filters = {}) => Boolean(
  filters?.search
  || (filters?.kpiFilter && filters.kpiFilter !== 'all')
  || filters?.category
  || filters?.source
  || filters?.published !== undefined
  || filters?.created_at
);

export const buildMobileHealthNewsKpis = ({ stats, articleCount }) => [
  { id: 'all', label: 'Articles', value: metricValue(stats?.total, articleCount), color: 'hsl(var(--muted-foreground))', delta: 'Current', direction: 'flat' },
  { id: 'published', label: 'Published', value: metricValue(stats?.published, 0), color: 'hsl(162 94% 24%)', delta: 'Current', direction: 'flat' },
  { id: 'medical', label: 'Medical', value: metricValue(stats?.medical, 0), color: 'hsl(192 91% 36%)', delta: 'Current', direction: 'flat' },
  { id: 'recent', label: 'Recent', value: metricValue(stats?.recent, 0), color: 'hsl(200 98% 39%)', delta: 'Current', direction: 'flat' },
  { id: 'draft', label: 'Drafts', value: metricValue(stats?.draft, 0), color: 'hsl(26 90% 37%)', delta: 'Locked', direction: 'flat' },
];

export const getMobileHealthNewsScopeCount = ({ filters, stats, articleCount }) => {
  const kpiToKey = {
    all: 'total',
    published: 'published',
    medical: 'medical',
    recent: 'recent',
    draft: 'draft',
  };
  const activeKpi = filters?.kpiFilter || 'all';
  return activeKpi === 'all'
    ? metricValue(stats?.total, articleCount)
    : metricValue(stats?.[kpiToKey[activeKpi]], 0);
};

export const getMobileHealthNewsGroups = (articles) => resolveAdaptiveGroups(articles, [
  {
    key: 'category',
    assign: (article) => article.category || 'general',
    labelFor: (key) => categoryLabel(key),
    orphanLabel: 'General',
  },
  {
    type: 'coarse-recency',
    key: 'published',
    getDate: (article) => article.created_at,
  },
]);
