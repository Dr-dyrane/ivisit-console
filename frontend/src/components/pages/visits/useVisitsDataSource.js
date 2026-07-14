import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { isQueryAbortError } from '../../../services/queryAbort';
import { getVisitQueryScopeKey } from '../../../services/visits/pageProjection';
import { getScheduledVisitsPageData, getVisitsPageData } from '../../../services/visitsService';
import { handleApiError } from '../../../utils/errorHandler';
import { getDefaultVisitKpi } from './visitPageModel';

const VISIT_REALTIME_REFRESH_DEBOUNCE_MS = 250;

export const useVisitsDataSource = ({ filters, kpiFilter, pagination, sortConfig, viewMode = 'all' }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [visitPageStats, setVisitPageStats] = useState(null);
  const [visitPageError, setVisitPageError] = useState(null);
  const [visitPageSnapshot, setVisitPageSnapshot] = useState(null);
  const [focusedVisitId, setFocusedVisitId] = useState(null);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const fetchAbortControllerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const { paginationRange, setTotalCount } = pagination;
  const selectedKpiFilter = React.useMemo(
    () => kpiFilter || getDefaultVisitKpi(visitPageStats),
    [kpiFilter, visitPageStats],
  );
  const queryScopeKey = React.useMemo(() => getVisitQueryScopeKey({
    filters,
    kpiFilter: selectedKpiFilter,
    sortConfig,
    viewMode,
  }), [filters, selectedKpiFilter, sortConfig, viewMode]);
  const focusedVisit = React.useMemo(() => (
    visits.find((visit) => visit.id === focusedVisitId) || visits[0] || null
  ), [visits, focusedVisitId]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
      fetchAbortControllerRef.current?.abort();
      fetchAbortControllerRef.current = null;
    };
  }, []);

  const fetchVisits = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    fetchAbortControllerRef.current?.abort();
    const requestController = new AbortController();
    fetchAbortControllerRef.current = requestController;

    try {
      if (isMountedRef.current) {
        if (!hasLoadedRef.current) setLoading(true);
        setIsFetching(true);
        setVisitPageError(null);
      }

      const pageData = await (viewMode === 'scheduled' ? getScheduledVisitsPageData : getVisitsPageData)({
        filters,
        kpiFilter: selectedKpiFilter,
        range: paginationRange,
        sortConfig,
        quiet: true,
        abortSignal: requestController.signal,
      });

      if (!isMountedRef.current || fetchRequestRef.current !== requestId) return;

      const nextVisits = pageData.visits || [];
      const totalCount = Number.isFinite(pageData.count) ? pageData.count : 0;
      setTotalCount(totalCount);
      setVisitPageStats(pageData.stats || null);
      setVisits(nextVisits);
      setVisitPageSnapshot({
        end: paginationRange.start + Math.max(nextVisits.length - 1, 0),
        requestId,
        scopeKey: queryScopeKey,
        start: paginationRange.start,
        totalCount,
      });
      setVisitPageError(null);
    } catch (error) {
      if (isQueryAbortError(error)) return;
      if (!isMountedRef.current || fetchRequestRef.current !== requestId) return;

      setVisitPageError(viewMode === 'scheduled'
        ? 'Scheduled visits could not load. Try again.'
        : 'Visits could not load. Try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (fetchAbortControllerRef.current === requestController) {
        fetchAbortControllerRef.current = null;
      }
      if (isMountedRef.current && fetchRequestRef.current === requestId) {
        hasLoadedRef.current = true;
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [filters, selectedKpiFilter, paginationRange, queryScopeKey, setTotalCount, sortConfig, viewMode]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits, pagination.currentPage]);

  useEffect(() => {
    if (!visits.length) {
      if (focusedVisitId !== null) setFocusedVisitId(null);
      return;
    }

    if (!visits.some((visit) => visit.id === focusedVisitId)) {
      setFocusedVisitId(visits[0].id);
    }
  }, [visits, focusedVisitId]);

  useEffect(() => {
    if (!focusedVisitId) return undefined;

    let active = true;
    let refreshTimer = null;
    const channel = supabase
      .channel(`visits_page_focus_${focusedVisitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
          filter: `id=eq.${focusedVisitId}`,
        },
        () => {
          if (!active || !isMountedRef.current) return;
          if (refreshTimer) window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => {
            if (active && isMountedRef.current) fetchVisits();
          }, VISIT_REALTIME_REFRESH_DEBOUNCE_MS);
        },
      )
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchVisits, focusedVisitId]);

  return {
    fetchVisits,
    focusedVisit,
    focusedVisitId,
    isFetching,
    loading,
    selectedKpiFilter,
    setFocusedVisitId,
    visitPageError,
    visitPageSnapshot,
    visitPageStats,
    visits,
  };
};
