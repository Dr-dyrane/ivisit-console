import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { useFeedback } from '../../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';
import { useStableList } from '../useStableList';
import { useLoadMoreControl } from '../useLoadMoreControl';
import {
  buildMobileOrganizationKpis,
  getMobileOrganizationScopeCount,
  getOrganizationReadinessLabel,
  hasActiveMobileOrganizationFilters,
  isFundedOrganization,
} from './mobileOrganizationsModel';

export const useMobileOrganizationsController = ({
  organizations,
  statistics,
  filters,
  selectionEnabled,
  hasMore,
  onLoadMore,
  page,
  loading,
  isFetching,
  isPlaceholderData,
  warmingUp,
}) => {
  const observerTarget = useRef(null);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const { triggerFromEvent } = useFeedback();
  const sourceOrganizations = useMemo(
    () => (Array.isArray(organizations) ? organizations : []),
    [organizations]
  );
  const busy = loading || isFetching;
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: busy,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore || busy) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [busy, hasMore, triggerLoad]);

  const filterSignature = JSON.stringify({
    search: filters.search || '',
    kpi: filters.kpiFilter || 'all',
  });
  const accumulatorRef = useRef({
    signature: null,
    order: [],
    byId: new Map(),
    lastSource: null,
    lastPlaceholder: null,
  });
  const organizationRows = useMemo(() => {
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
      reset();
      store.lastSource = null;
      store.lastPlaceholder = null;
    }

    if (store.lastSource !== sourceOrganizations || store.lastPlaceholder !== isPlaceholderData) {
      store.lastSource = sourceOrganizations;
      store.lastPlaceholder = isPlaceholderData;
      if (!isPlaceholderData) {
        if (page === 1) reset();
        sourceOrganizations.forEach(absorb);
      }
    }

    return store.order.map((id) => store.byId.get(id));
  }, [filterSignature, isPlaceholderData, page, sourceOrganizations]);

  const { displayItems: displayOrganizations, isBuffering } = useStableList(
    organizationRows,
    loading
  );
  const showTopSectionLoading = warmingUp
    || ((loading || isPlaceholderData) && displayOrganizations.length === 0);

  const organizationKPIs = buildMobileOrganizationKpis(statistics, sourceOrganizations);
  const activeKpi = filters.kpiFilter || 'all';
  const scopeCount = getMobileOrganizationScopeCount({
    activeKpi,
    statistics,
    sourceOrganizations,
  });
  const hasFilter = hasActiveMobileOrganizationFilters(filters);

  const {
    selectedIds,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
  } = useRowSelection(displayOrganizations);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;

  useEffect(() => {
    if (!selectionEnabled) clearSelection();
  }, [clearSelection, selectionEnabled]);

  const { groups: organizationGroups } = useMemo(() => resolveAdaptiveGroups(
    displayOrganizations,
    [
      {
        key: 'payout-readiness',
        assign: (organization) => (
          isFundedOrganization(organization) ? 'funded' : 'payout_gap'
        ),
        labelFor: getOrganizationReadinessLabel,
        order: (keys) => keys.slice().sort((a, b) => (
          a === 'funded' ? -1 : b === 'funded' ? 1 : 0
        )),
      },
      {
        type: 'coarse-recency',
        key: 'added',
        getDate: (organization) => organization.created_at || organization.updated_at,
      },
    ]
  ), [displayOrganizations]);

  const handleCopyOrganizationId = useCallback((event, organizationId) => {
    navigator.clipboard?.writeText(String(organizationId))?.catch(() => {});
    triggerFromEvent(event, {
      variant: FEEDBACK_TYPES.SUCCESS,
      color: 'hsl(var(--spark))',
      haptic: true,
      sound: true,
    });
  }, [triggerFromEvent]);

  return {
    observerTarget,
    activeOrganization,
    setActiveOrganization,
    sourceOrganizations,
    busy,
    armed,
    requestLoad,
    displayOrganizations,
    isBuffering,
    showTopSectionLoading,
    organizationKPIs,
    activeKpi,
    scopeCount,
    hasFilter,
    selectedIds,
    selectedIdSet,
    selectionMode,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    organizationGroups,
    handleCopyOrganizationId,
  };
};
