import { useEffect, useMemo, useRef, useState } from 'react';
import { useSkeletonWarmup } from '../canon';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { useStableList } from '../useStableList';
import {
  buildMobileHealthNewsKpis,
  getMobileHealthNewsGroups,
  getMobileHealthNewsScopeCount,
  hasActiveNewsFilters,
} from './mobileHealthNewsModel';

export const useMobileHealthNewsController = ({
  articles,
  stats,
  filters,
  loading,
  isFetching,
  hasMore,
  onLoadMore,
}) => {
  const observerTarget = useRef(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const refetching = isFetching || false;
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const sourceArticles = useMemo(() => (Array.isArray(articles) ? articles : []), [articles]);
  const { displayItems: displayArticles, isBuffering } = useStableList(sourceArticles, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayArticles.length === 0);
  const newsKPIs = buildMobileHealthNewsKpis({
    stats,
    articleCount: sourceArticles.length,
  });
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = getMobileHealthNewsScopeCount({
    filters,
    stats,
    articleCount: sourceArticles.length,
  });
  const hasFilter = hasActiveNewsFilters(filters);
  const { groups: articleGroups } = useMemo(
    () => getMobileHealthNewsGroups(displayArticles),
    [displayArticles]
  );

  return {
    activeArticle,
    activeKpi,
    armed,
    articleGroups,
    displayArticles,
    hasFilter,
    isBuffering,
    newsKPIs,
    observerTarget,
    refetching,
    requestLoad,
    scopeCount,
    setActiveArticle,
    showTopSectionLoading,
  };
};
