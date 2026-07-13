import { useEffect, useMemo, useRef, useState } from 'react';
import { useStableList } from '../useStableList';
import { useLoadMoreControl } from '../useLoadMoreControl';
import {
  buildMobileSupportKpis,
  createMobileSupportAccumulator,
  deletedTicketIdSet,
  getMobileSupportFilterSignature,
  getMobileSupportScopeCount,
  groupMobileSupportTickets,
  hasActiveMobileSupportFilters,
  reconcileMobileSupportAccumulator,
  ticketIdKey,
} from './mobileSupportModel';

export const useMobileSupportTicketsController = ({
  tickets,
  stats,
  filters,
  canEditTicket,
  canManage,
  hasMore,
  loading,
  isFetching,
  onLoadMore,
  currentPage,
  confirmedDeletedTicketIds,
}) => {
  const observerTarget = useRef(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const refetching = isFetching || false;
  const sourceTickets = useMemo(() => (Array.isArray(tickets) ? tickets : []), [tickets]);
  const editAllowed = (ticket) => (
    typeof canEditTicket === 'function' ? canEditTicket(ticket) : canManage
  );

  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading,
    onLoadMore,
  });

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

  const filterSignature = getMobileSupportFilterSignature(filters);
  const accumulatorRef = useRef(createMobileSupportAccumulator());
  const ticketRows = useMemo(() => reconcileMobileSupportAccumulator({
    accumulator: accumulatorRef.current,
    signature: filterSignature,
    pageKey: currentPage,
    sourceTickets,
    confirmedDeletedTicketIds,
  }), [confirmedDeletedTicketIds, currentPage, filterSignature, sourceTickets]);
  const confirmedDeletedIds = useMemo(
    () => deletedTicketIdSet(confirmedDeletedTicketIds),
    [confirmedDeletedTicketIds]
  );

  useEffect(() => {
    if (!activeTicket) return;
    const activeId = ticketIdKey(activeTicket.id);
    if (activeId && confirmedDeletedIds.has(activeId)) setActiveTicket(null);
  }, [activeTicket, confirmedDeletedIds]);

  const { displayItems: displayTickets, isBuffering } = useStableList(ticketRows, loading);
  const ticketKPIs = buildMobileSupportKpis(stats, sourceTickets);
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = getMobileSupportScopeCount(stats, sourceTickets, activeKpi);
  const hasFilter = hasActiveMobileSupportFilters(filters);
  const { groups: ticketGroups } = useMemo(
    () => groupMobileSupportTickets(displayTickets),
    [displayTickets]
  );

  return {
    activeKpi,
    activeTicket,
    armed,
    displayTickets,
    editAllowed,
    hasFilter,
    isBuffering,
    observerTarget,
    refetching,
    requestLoad,
    scopeCount,
    setActiveTicket,
    ticketGroups,
    ticketKPIs,
  };
};
