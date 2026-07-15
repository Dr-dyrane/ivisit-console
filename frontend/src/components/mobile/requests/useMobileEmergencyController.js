import { useEffect, useMemo, useRef, useState } from 'react';
import { useFeedback } from '../../../hooks/useFeedback';
import { useEmergencyRequestQuery } from '../../../hooks/useEmergencyQuery';
import { useReverseGeocode } from '../../../hooks/useReverseGeocode';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import { buildEmergencyRenderProjection } from '../../../utils/emergencyRequestMapper';
import { useStableList } from '../useStableList';
import { useLoadMoreControl } from '../useLoadMoreControl';
import { LOAD_MORE_ROOT_MARGIN } from '../canon/constants';
import {
  getMobileRequestKpiValue,
  hasMobileRequestFilters,
  MOBILE_REQUEST_KPIS,
} from './mobileEmergencyModel';

const mergeEmergencyPage = (accumulated, incoming) => {
  const indexById = new Map(accumulated.map((request, index) => [request.id, index]));
  let next = accumulated;

  incoming.forEach((request) => {
    const index = indexById.get(request.id);
    if (index === undefined) {
      if (next === accumulated) next = [...accumulated];
      indexById.set(request.id, next.length);
      next.push(request);
      return;
    }
    if (next[index] !== request) {
      if (next === accumulated) next = [...accumulated];
      next[index] = request;
    }
  });

  return next;
};

export const useMobileEmergencyController = ({
  emergencies,
  loading,
  statistics,
  filters,
  setFilters,
  filterSheetOpen,
  analyticsOpen,
  hasMore,
  onLoadMore,
  currentPage,
  kpiFilter,
  selectionEnabled,
  selectedIds,
  warmingUp,
}) => {
  const observerTarget = useRef(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const { triggerFromEvent } = useFeedback();
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;
  const accumulatorRef = useRef([]);
  if (!loading && Array.isArray(emergencies)) {
    if (currentPage <= 1) {
      accumulatorRef.current = emergencies;
    } else {
      accumulatorRef.current = mergeEmergencyPage(accumulatorRef.current, emergencies);
    }
  }
  const accumulatedActiveRequest = activeRequestId
    ? accumulatorRef.current.find((request) => request.id === activeRequestId) || null
    : null;
  const activeRequestQuery = useEmergencyRequestQuery(activeRequestId);
  const serverActiveRequest = activeRequestQuery.request?.id === activeRequestId
    ? activeRequestQuery.request
    : null;
  const activeRequest = activeRequestQuery.isSuccess
    ? serverActiveRequest
    : accumulatedActiveRequest;
  const accumulatedRequests = accumulatorRef.current;
  const requestItems = useMemo(() => {
    if (!activeRequestId || !activeRequestQuery.isSuccess) return accumulatedRequests;
    const activeIndex = accumulatedRequests.findIndex((request) => request.id === activeRequestId);
    if (activeIndex < 0) return accumulatedRequests;
    if (!serverActiveRequest) {
      return accumulatedRequests.filter((request) => request.id !== activeRequestId);
    }
    if (accumulatedRequests[activeIndex] === serverActiveRequest) return accumulatedRequests;
    const nextRequests = [...accumulatedRequests];
    nextRequests[activeIndex] = serverActiveRequest;
    return nextRequests;
  }, [
    accumulatedRequests,
    activeRequestId,
    activeRequestQuery.isSuccess,
    serverActiveRequest,
  ]);

  useEffect(() => {
    if (activeRequestId && activeRequestQuery.isSuccess && !serverActiveRequest) {
      accumulatorRef.current = accumulatorRef.current.filter(
        (request) => request.id !== activeRequestId
      );
      setActiveRequestId(null);
    }
  }, [activeRequestId, activeRequestQuery.isSuccess, serverActiveRequest]);

  const { displayItems } = useStableList(requestItems, loading);
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });
  const showSkeleton = warmingUp || (loading && displayItems.length === 0);
  const filterTriggerState = filterSheetOpen
    ? 'open'
    : hasMobileRequestFilters(filters) ? 'filtered' : 'idle';
  const analyticsTriggerState = analyticsOpen ? 'open' : 'idle';
  const [searchDraft, setSearchDraft] = useState(filters?.search || '');

  useEffect(() => {
    setSearchDraft(filters?.search || '');
  }, [filters?.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters?.((previous) => {
        if ((previous?.search || '') === searchDraft) return previous;
        return { ...previous, search: searchDraft };
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft, setFilters]);

  const activeCoordinates = useMemo(() => (
    activeRequest
      ? buildEmergencyRenderProjection(activeRequest).locationDisplay.coordinates
      : null
  ), [activeRequest]);
  const { place: activePlace } = useReverseGeocode(activeCoordinates);

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: LOAD_MORE_ROOT_MARGIN }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const kpis = useMemo(() => MOBILE_REQUEST_KPIS.map((item) => ({
    ...item,
    value: getMobileRequestKpiValue({ id: item.id, statistics, emergencies }),
  })), [emergencies, statistics]);
  const totalRequests = getMobileRequestKpiValue({
    id: kpiFilter || 'pending',
    statistics,
    emergencies,
  });
  const kpiEmptyCause = Boolean(kpiFilter && kpiFilter !== 'all')
    && !filters?.search
    && !hasMobileRequestFilters(filters);
  const kpiEmptyLabel = MOBILE_REQUEST_KPIS.find((item) => item.id === kpiFilter)?.label || 'selected';

  const clearSearch = () => {
    setSearchDraft('');
    setFilters?.((previous) => ({ ...previous, search: '' }));
  };

  const triggerFilterFeedback = (event) => {
    triggerFromEvent(event, {
      variant: FEEDBACK_TYPES.INFO,
      color: 'hsl(var(--foreground))',
      haptic: true,
      sound: true,
    });
  };

  const triggerAnalyticsFeedback = (event) => {
    triggerFromEvent(event, {
      variant: FEEDBACK_TYPES.CLICK,
      color: 'hsl(var(--foreground))',
      haptic: true,
      sound: true,
    });
  };

  return {
    observerTarget,
    activeRequestId,
    activeRequest,
    setActiveRequestId,
    activePlace,
    triggerFromEvent,
    selectedIdSet,
    selectionMode,
    displayItems,
    armed,
    requestLoad,
    showSkeleton,
    filterTriggerState,
    analyticsTriggerState,
    searchDraft,
    setSearchDraft,
    clearSearch,
    triggerFilterFeedback,
    triggerAnalyticsFeedback,
    kpis,
    totalRequests,
    kpiEmptyCause,
    kpiEmptyLabel,
  };
};
