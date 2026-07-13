import { useEffect, useMemo, useRef, useState } from 'react';
import { useStableList } from '../useStableList';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { getInsuranceMetric } from '../../pages/insurance/insurancePageModel';
import {
  buildMobileInsuranceGroups,
  buildMobileInsuranceHeading,
  buildMobileInsuranceKpis,
  hasActiveMobileInsuranceFilters,
} from './mobileInsuranceModel';

export const useMobileInsuranceController = ({
  policies,
  filters,
  stats,
  count,
  loading,
  denied,
  error,
  isFetching,
  hasMore,
  onLoadMore,
  isLoadingMore,
  selectionEnabled,
  selectedIds,
  onSelect,
  warmingUp,
}) => {
  const observerTarget = useRef(null);
  const [activePolicy, setActivePolicy] = useState(null);
  const selectionActive = selectionEnabled && Boolean(onSelect);
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionActive && selectedIdSet.size > 0;
  const refetching = isFetching || false;
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || refetching || isLoadingMore,
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

  const { displayItems: displayPolicies, isBuffering } = useStableList(policies, loading);
  const showTopSectionLoading = warmingUp || (loading && displayPolicies.length === 0);
  const kpis = useMemo(
    () => buildMobileInsuranceKpis(stats, policies.length),
    [policies.length, stats]
  );
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = getInsuranceMetric(count, policies.length);
  const headingSummary = buildMobileInsuranceHeading({
    loading: showTopSectionLoading,
    denied,
    error: Boolean(error),
    visibleCount: displayPolicies.length,
    scopeCount,
  });
  const hasFilter = hasActiveMobileInsuranceFilters(filters);
  const kpiEmptyCause = activeKpi !== 'all' && !filters?.search && !hasFilter;
  const activeKpiLabel = kpis.find((item) => item.id === activeKpi)?.label || 'selected';
  const policyGroups = useMemo(
    () => buildMobileInsuranceGroups(displayPolicies).groups,
    [displayPolicies]
  );

  return {
    observerTarget,
    activePolicy,
    setActivePolicy,
    selectionActive,
    selectedIdSet,
    selectionMode,
    refetching,
    armed,
    requestLoad,
    displayPolicies,
    isBuffering,
    showTopSectionLoading,
    kpis,
    activeKpi,
    scopeCount,
    headingSummary,
    hasFilter,
    kpiEmptyCause,
    activeKpiLabel,
    policyGroups,
  };
};
