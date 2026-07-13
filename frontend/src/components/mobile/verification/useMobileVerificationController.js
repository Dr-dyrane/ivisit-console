import { useEffect, useMemo, useRef, useState } from 'react';
import { useStableList } from '../useStableList';
import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';
import {
  approveProvidersSequentially,
  buildMobileVerificationSummary,
} from './mobileVerificationModel';

export const useMobileVerificationController = ({
  queueType,
  providers,
  organizations,
  loading,
  stats,
  orgStats,
  filters,
  setFilters,
  canApprove,
  isFetching,
  selectedIds,
  onSelect,
  onSelectAll,
  onVerifyProvider,
  warmingUp,
}) => {
  const [activeItem, setActiveItem] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const setFiltersRef = useRef(setFilters);
  setFiltersRef.current = setFilters;

  useEffect(() => {
    const showPending = () => setFiltersRef.current?.((current) => ({ ...current, status: 'pending' }));
    window.addEventListener('approvalsReviewPending', showPending);
    return () => window.removeEventListener('approvalsReviewPending', showPending);
  }, []);

  const items = queueType === 'providers' ? providers : organizations;
  const sourceItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const { displayItems, isBuffering } = useStableList(sourceItems, loading);
  const showTopSectionLoading = warmingUp || (loading && displayItems.length === 0);
  const summary = useMemo(() => buildMobileVerificationSummary({
    queueType,
    stats,
    orgStats,
    filters,
    sourceLength: sourceItems.length,
  }), [queueType, stats, orgStats, filters, sourceItems.length]);

  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionEnabled = canApprove && queueType === 'providers';
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;
  const bulkApproving = bulkProgress !== null;

  const bulkApprove = async () => {
    if (!onVerifyProvider || bulkApproving) return;

    const ids = Array.from(selectedIdSet);
    if (ids.length === 0) return;

    setBulkProgress({ completed: 0, total: ids.length });
    try {
      const { succeededIds, failedIds } = await approveProvidersSequentially(
        ids,
        onVerifyProvider,
        setBulkProgress,
      );

      if (onSelect) {
        succeededIds.forEach((id) => onSelect(id, false));
      } else if (failedIds.length === 0) {
        onSelectAll?.(false);
      }
    } finally {
      setBulkProgress(null);
    }
  };

  const { groups } = useMemo(() => resolveAdaptiveGroups(displayItems, [
    { type: 'coarse-recency', key: 'applied', getDate: (item) => item.created_at },
  ]), [displayItems]);

  return {
    activeItem,
    setActiveItem,
    bulkProgress,
    bulkApproving,
    bulkApprove,
    displayItems,
    groups,
    isBuffering,
    refetching: Boolean(isFetching),
    showTopSectionLoading,
    selectedIdSet,
    selectionEnabled,
    selectionMode,
    ...summary,
  };
};
