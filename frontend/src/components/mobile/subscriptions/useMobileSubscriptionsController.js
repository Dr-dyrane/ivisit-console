import { useEffect, useMemo, useRef, useState } from 'react';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { useStableList } from '../useStableList';
import {
  buildMobileSubscriptionGroups,
  buildMobileSubscriptionKpis,
  getMobileSubscriptionScopeCount,
  hasActiveSubscriptionFilters,
  welcomeEmailStatusDistributes,
} from './mobileSubscriptionModel';

export const useMobileSubscriptionsController = ({
  subscribers,
  stats,
  filters,
  loading,
  isFetching,
  hasMore,
  onLoadMore,
  canManage,
  selectionEnabled,
  selectedIds,
  onSelect,
  warmingUp,
}) => {
  const observerTarget = useRef(null);
  const [activeSubscriber, setActiveSubscriber] = useState(null);
  const refetching = isFetching || false;
  const sourceSubscribers = useMemo(
    () => (Array.isArray(subscribers) ? subscribers : []),
    [subscribers]
  );

  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || refetching,
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

  const {
    displayItems: displaySubscribers,
    isBuffering,
  } = useStableList(sourceSubscribers, loading);
  const showTopSectionLoading = warmingUp || (loading && displaySubscribers.length === 0);
  const subscriberKPIs = buildMobileSubscriptionKpis(stats, sourceSubscribers.length);
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = getMobileSubscriptionScopeCount({
    stats,
    activeKpi,
    fallbackTotal: sourceSubscribers.length,
  });
  const hasFilter = hasActiveSubscriptionFilters(filters);
  const kpiEmptyCause = activeKpi !== 'all' && !filters?.search && !hasFilter;
  const activeKpiLabel = subscriberKPIs.find((item) => item.id === activeKpi)?.label || 'selected';
  const welcomeEmailDistributes = useMemo(
    () => welcomeEmailStatusDistributes(displaySubscribers),
    [displaySubscribers]
  );
  const selectionActive = selectionEnabled && canManage && Boolean(onSelect);
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionActive && selectedIdSet.size > 0;
  const subscriberGroups = useMemo(
    () => buildMobileSubscriptionGroups(displaySubscribers),
    [displaySubscribers]
  );

  return {
    activeSubscriber,
    setActiveSubscriber,
    observerTarget,
    refetching,
    displaySubscribers,
    isBuffering,
    showTopSectionLoading,
    subscriberKPIs,
    activeKpi,
    scopeCount,
    hasFilter,
    kpiEmptyCause,
    activeKpiLabel,
    welcomeEmailDistributes,
    selectionActive,
    selectedIdSet,
    selectionMode,
    subscriberGroups,
    armed,
    requestLoad,
  };
};
