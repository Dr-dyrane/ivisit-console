import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { isQueryAbortError } from '../../../services/queryAbort';
import { getVisitsPageData } from '../../../services/visitsService';
import { handleApiError } from '../../../utils/errorHandler';
import { getDefaultVisitKpi } from './visitPageModel';

export const useVisitsDataSource = ({ filters, kpiFilter, pagination, sortConfig }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [visitPageStats, setVisitPageStats] = useState(null);
  const [visitPageError, setVisitPageError] = useState(null);
  const [focusedVisitId, setFocusedVisitId] = useState(null);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const fetchAbortControllerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const lastInsertToastAtRef = useRef(0);
  const { paginationRange, setTotalCount } = pagination;
  const selectedKpiFilter = React.useMemo(
    () => kpiFilter || getDefaultVisitKpi(visitPageStats),
    [kpiFilter, visitPageStats],
  );
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

      const pageData = await getVisitsPageData({
        filters,
        kpiFilter: selectedKpiFilter,
        range: paginationRange,
        sortConfig,
        quiet: true,
        abortSignal: requestController.signal,
      });

      if (!isMountedRef.current || fetchRequestRef.current !== requestId) return;

      setTotalCount(pageData.count || 0);
      setVisitPageStats(pageData.stats || null);
      setVisits(pageData.visits || []);
      setVisitPageError(null);
    } catch (error) {
      if (isQueryAbortError(error)) return;
      if (!isMountedRef.current || fetchRequestRef.current !== requestId) return;

      console.error('Error fetching visits:', error);
      setVisitPageError('Visits could not load. Try again.');
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
  }, [filters, selectedKpiFilter, paginationRange, setTotalCount, sortConfig]);

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
    let active = true;
    const channel = supabase
      .channel('visits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => {
          if (active && isMountedRef.current) {
            fetchVisits();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        (payload) => {
          if (!active || !isMountedRef.current || payload?.eventType !== 'INSERT') return;
          const now = Date.now();
          if (now - lastInsertToastAtRef.current < 10000) return;
          lastInsertToastAtRef.current = now;
          const typeLabel = payload?.new?.type || null;
          toast('New visit scheduled', typeLabel ? { description: typeLabel } : undefined);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchVisits]);

  return {
    fetchVisits,
    focusedVisit,
    focusedVisitId,
    isFetching,
    loading,
    selectedKpiFilter,
    setFocusedVisitId,
    visitPageError,
    visitPageStats,
    visits,
  };
};
