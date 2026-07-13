import { useEffect, useMemo, useRef, useState } from 'react';
import { useStableList } from '../useStableList';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';
import {
  buildMobileFleetFilterSignature,
  getMobileAmbulanceStation,
  getMobileFleetKpis,
  getMobileFleetScopeCount,
  getMobileFleetTotals,
  hasMobileFleetFilters,
} from './mobileAmbulancesModel';

export const useMobileAmbulancesController = ({
  ambulances,
  loading,
  statistics,
  filters,
  kpiFilter,
  hasMore,
  onLoadMore,
  isFetching,
  isAdmin,
  isOrgAdmin,
  selectionEnabled,
  selectedIds,
  warmingUp,
}) => {
  const observerTarget = useRef(null);
  const accumulatorRef = useRef({
    signature: null,
    order: [],
    byId: new Map(),
    lastSource: null,
  });
  const [activeAmbulance, setActiveAmbulance] = useState(null);

  const canManage = isAdmin || isOrgAdmin;
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;
  const refetching = isFetching || false;
  const sourceAmbulances = useMemo(
    () => (Array.isArray(ambulances) ? ambulances : []),
    [ambulances]
  );

  const {
    armed,
    requestLoad,
    triggerLoad,
  } = useLoadMoreControl({ hasMore, loading, onLoadMore });

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

  const totals = useMemo(
    () => getMobileFleetTotals(statistics, sourceAmbulances),
    [statistics, sourceAmbulances]
  );
  const ambulanceKPIs = useMemo(() => getMobileFleetKpis(totals), [totals]);
  const filterSignature = buildMobileFleetFilterSignature(filters, kpiFilter);

  const ambulanceRows = useMemo(() => {
    const store = accumulatorRef.current;
    const reset = () => {
      store.order = [];
      store.byId = new Map();
    };
    const absorb = (row) => {
      const id = row?.id;
      if (id === null || id === undefined) return;
      if (!store.byId.has(id)) store.order.push(id);
      store.byId.set(id, row);
    };

    if (store.signature !== filterSignature) {
      store.signature = filterSignature;
      store.lastSource = sourceAmbulances;
      reset();
      sourceAmbulances.forEach(absorb);
    } else if (store.lastSource !== sourceAmbulances) {
      store.lastSource = sourceAmbulances;
      if (sourceAmbulances.length === 0) reset();
      else sourceAmbulances.forEach(absorb);
    }

    return store.order.map((id) => store.byId.get(id));
  }, [sourceAmbulances, filterSignature]);

  const {
    displayItems: displayAmbulances,
    isBuffering,
  } = useStableList(ambulanceRows, loading);
  const showTopSectionLoading = warmingUp || (loading && displayAmbulances.length === 0);
  const scopeCount = getMobileFleetScopeCount(totals, kpiFilter);
  const hasFilter = hasMobileFleetFilters(filters);

  const { groups: fleetGroups } = useMemo(() => resolveAdaptiveGroups(displayAmbulances, [
    {
      key: 'station',
      assign: getMobileAmbulanceStation,
      orphanLabel: 'Unassigned',
    },
    {
      type: 'coarse-recency',
      key: 'freshness',
      getDate: (ambulance) => ambulance.updated_at || ambulance.created_at,
    },
  ]), [displayAmbulances]);

  return {
    observerTarget,
    activeAmbulance,
    setActiveAmbulance,
    canManage,
    selectedIdSet,
    selectionMode,
    refetching,
    totals,
    ambulanceKPIs,
    displayAmbulances,
    isBuffering,
    showTopSectionLoading,
    scopeCount,
    hasFilter,
    fleetGroups,
    armed,
    requestLoad,
  };
};
