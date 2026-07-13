import { useEffect, useMemo, useRef, useState } from 'react';
import { useSkeletonWarmup } from '../canon';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { useStableList } from '../useStableList';
import {
  buildMobileDoctorKpis,
  buildMobileDoctorTotals,
  getMobileDoctorGroups,
  getMobileDoctorScopeCount,
  hasActiveDoctorFilters,
} from './mobileDoctorsModel';

export const useMobileDoctorsController = ({
  doctors,
  loading,
  statistics,
  filters,
  isAdmin,
  isOrgAdmin,
  hasMore,
  onLoadMore,
  isFetching = false,
  canManage: canManageOverride,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
}) => {
  const observerTarget = useRef(null);
  const [activeDoctor, setActiveDoctor] = useState(null);
  const canManage = Boolean(canManageOverride ?? (isAdmin || isOrgAdmin));
  const refetching = isFetching || false;
  const sourceDoctors = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);

  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const { displayItems: displayDoctors, isBuffering } = useStableList(sourceDoctors, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayDoctors.length === 0);

  const totals = useMemo(
    () => buildMobileDoctorTotals({ statistics, sourceDoctors }),
    [sourceDoctors, statistics]
  );
  const doctorKPIs = useMemo(() => buildMobileDoctorKpis(totals), [totals]);
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = getMobileDoctorScopeCount({ totals, activeKpi });
  const hasFilter = hasActiveDoctorFilters(filters);

  const canSelect = selectionEnabled && canManage && Boolean(onSelect);
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = canSelect && selectedIdSet.size > 0;
  const doctorGroups = useMemo(() => getMobileDoctorGroups(displayDoctors), [displayDoctors]);

  return {
    observerTarget,
    activeDoctor,
    setActiveDoctor,
    canManage,
    refetching,
    displayDoctors,
    isBuffering,
    showTopSectionLoading,
    totals,
    doctorKPIs,
    activeKpi,
    scopeCount,
    hasFilter,
    canSelect,
    selectedIdSet,
    selectionMode,
    doctorGroups,
    armed,
    requestLoad,
  };
};
