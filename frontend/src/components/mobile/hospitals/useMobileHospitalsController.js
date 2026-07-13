import { useEffect, useMemo, useRef, useState } from 'react';
import { useSkeletonWarmup } from '../canon';
import { useFeedback } from '../../../hooks/useFeedback';
import { useStableList } from '../useStableList';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';
import {
  accumulateHospitalRows,
  createHospitalAccumulator,
  createHospitalFilterSignature,
  getActiveHospitalStatusFilter,
  getHospitalScopeCount,
  getMobileHospitalKpis,
  getMobileHospitalTotals,
  hasCapacitySignal,
  hasMobileHospitalFilters,
} from './mobileHospitalsModel';

export const useMobileHospitalsController = ({
  hospitals,
  loading,
  statistics,
  filters,
  setFilters,
  hasMore,
  onLoadMore,
  isFetching,
  isAdmin,
  isOrgAdmin,
  selectionEnabled,
  selectedIds,
}) => {
  const observerTarget = useRef(null);
  const accumulatorRef = useRef(createHospitalAccumulator());
  const [activeHospital, setActiveHospital] = useState(null);
  const { triggerFromEvent } = useFeedback();
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;
  const sourceHospitals = useMemo(() => (Array.isArray(hospitals) ? hospitals : []), [hospitals]);
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

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

  const hospitalTotals = useMemo(
    () => getMobileHospitalTotals(statistics, sourceHospitals),
    [sourceHospitals, statistics]
  );
  const kpis = useMemo(() => getMobileHospitalKpis(hospitalTotals), [hospitalTotals]);
  const filterSignature = createHospitalFilterSignature(filters);
  const hospitalRows = useMemo(() => accumulateHospitalRows(
    accumulatorRef.current,
    sourceHospitals,
    filterSignature
  ), [sourceHospitals, filterSignature]);
  const { displayItems: displayHospitals, isBuffering } = useStableList(hospitalRows, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayHospitals.length === 0);
  const refetching = isFetching || false;
  const canManage = isAdmin || isOrgAdmin;
  const activeStatusFilter = getActiveHospitalStatusFilter(filters);
  const scopeCount = getHospitalScopeCount(hospitalTotals, activeStatusFilter);
  const hasFilter = hasMobileHospitalFilters(filters);

  const hospitalGroups = useMemo(() => resolveAdaptiveGroups(displayHospitals, [
    {
      key: 'capacity',
      assign: (hospital) => (hasCapacitySignal(hospital) ? 'reporting' : 'silent'),
      labelFor: (key) => (key === 'reporting' ? 'Reporting capacity' : 'No capacity reported'),
      order: (keys) => ['reporting', 'silent'].filter((key) => keys.includes(key)),
    },
    {
      type: 'coarse-recency',
      key: 'freshness',
      getDate: (hospital) => hospital.last_availability_update || hospital.updated_at,
    },
  ]).groups, [displayHospitals]);

  const handleStatusFilter = (id) => {
    setFilters((previous) => {
      const nextFilters = { ...previous };
      if (id === 'all') {
        delete nextFilters.status;
      } else {
        nextFilters.status = id;
      }
      return nextFilters;
    });
  };

  return {
    observerTarget,
    activeHospital,
    setActiveHospital,
    triggerFromEvent,
    selectedIdSet,
    selectionMode,
    armed,
    requestLoad,
    kpis,
    displayHospitals,
    isBuffering,
    refetching,
    showTopSectionLoading,
    canManage,
    activeStatusFilter,
    scopeCount,
    hasFilter,
    hospitalGroups,
    handleStatusFilter,
  };
};
