import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { groupByMonth } from '../../../utils/groupByMonth';
import {
  formatCompactCurrency,
  hasWalletFilters,
  matchesMobileWalletActivity,
} from '../../pages/wallet/walletPageModel';
import { useLoadMoreControl } from '../useLoadMoreControl';

const readyColor = 'hsl(160 84% 39%)';
const neutralColor = 'hsl(215 16% 47%)';

const buildMonthGroups = (items) => {
  const groups = [];
  let current = null;
  groupByMonth(items, (entry) => entry?.created_at).forEach(({ item, header }) => {
    if (header || !current) {
      current = { key: header || 'undated', label: header || 'Date unavailable', items: [] };
      groups.push(current);
    }
    current.items.push(item);
  });
  return groups;
};

export const useMobileWalletController = ({
  loading,
  isFetching,
  wallet,
  readState,
  financeMetrics,
  financeMetricsStale,
  ledger,
  payments,
  activeTab,
  setActiveTab,
  search,
  filters,
  hasMore,
  isLoadingMore,
  onLoadMore,
  formatCurrency,
}) => {
  const observerTarget = useRef(null);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const sourceItems = activeTab === 'ledger' ? ledger : payments;
  const normalizedSearch = search.trim().toLowerCase();
  const hasFilter = hasWalletFilters(filters);
  const items = useMemo(() => sourceItems.filter((item) => matchesMobileWalletActivity({
    item,
    activeTab,
    filters,
    normalizedSearch,
  })), [activeTab, filters, normalizedSearch, sourceItems]);
  const {
    selectedIds,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
  } = useRowSelection(items);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectionMode = selectedIds.length > 0;
  const activityGroups = useMemo(() => buildMonthGroups(items), [items]);
  const activeReadState = readState?.[activeTab] || 'unavailable';
  const activeUnavailable = activeReadState !== 'ready';
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || isFetching || isLoadingMore,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) triggerLoad();
    }, { threshold: 0.1, rootMargin: '120px' });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  useEffect(() => {
    clearSelection();
  }, [activeTab, clearSelection, filters, normalizedSearch]);

  const handleTabChange = useCallback((tab) => {
    clearSelection();
    setActiveTab?.(tab);
  }, [clearSelection, setActiveTab]);

  const compactBalance = useMemo(() => formatCompactCurrency(
    Number(wallet?.balance || 0),
    wallet?.currency || 'USD',
  ), [wallet?.balance, wallet?.currency]);

  const ledgerTotalsAvailable = ['ready', 'stale'].includes(readState?.financeMetrics)
    && financeMetrics?.complete === true;
  const ledgerScopeLabel = ledgerTotalsAvailable
    ? financeMetricsStale ? 'Last confirmed ledger totals' : financeMetrics.scopeLabel
    : 'Ledger totals unavailable for this account';
  const kpis = useMemo(() => [
    {
      id: 'credit',
      label: 'Credits',
      value: ledgerTotalsAvailable ? formatCurrency(financeMetrics.credits, wallet?.currency) : 'Unavailable',
      color: readyColor,
    },
    {
      id: 'debit',
      label: 'Debits',
      value: ledgerTotalsAvailable ? formatCurrency(financeMetrics.debits, wallet?.currency) : 'Unavailable',
      color: neutralColor,
    },
  ], [financeMetrics, formatCurrency, ledgerTotalsAvailable, wallet?.currency]);

  return {
    activeEntry,
    activeUnavailable,
    activityGroups,
    armed,
    compactBalance,
    handleSelectAll,
    handleTabChange,
    handleToggleSelect,
    hasFilter,
    items,
    kpis,
    ledgerScopeLabel,
    normalizedSearch,
    observerTarget,
    requestLoad,
    selectedIds,
    selectedIdSet,
    selectionMode,
    setActiveEntry,
    setShowBalance,
    showBalance,
    clearSelection,
  };
};
