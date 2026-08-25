import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useListKeyboardNav } from '../../../hooks/useListKeyboardNav';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { hasWalletFilters, selectWalletActivity } from './walletPageModel';

export const usePaymentsDesktopController = ({
  activeTab,
  setActiveTab,
  ledger,
  payments,
  readState,
  loadError,
  search,
  filters,
  onPaymentOpen,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [focusedId, setFocusedIdState] = useState(searchParams.get('id'));
  const listScrollRef = useRef(null);
  const rawItems = activeTab === 'ledger' ? ledger : payments;
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const filtersActive = hasWalletFilters(filters);
  const isNarrowed = Boolean(normalizedSearch) || filtersActive;
  const activeItems = useMemo(() => selectWalletActivity({
    items: rawItems,
    activeTab,
    filters,
    search: normalizedSearch,
    sortDirection: sortConfig.direction,
  }), [activeTab, filters, normalizedSearch, rawItems, sortConfig.direction]);
  const focusedEntry = activeItems.find((item) => item.id === focusedId) || null;
  const activeReadState = readState?.[activeTab] || 'unavailable';
  const activeUnavailable = !['ready', 'stale'].includes(activeReadState);
  const failedEmpty = activeReadState === 'failed' && Boolean(loadError) && rawItems.length === 0;
  const itemNoun = activeTab === 'ledger' ? 'transactions' : 'patient payments';
  const pagination = useMemo(() => ({
    currentPage: 1,
    totalPages: 1,
    totalCount: activeItems.length,
    itemsPerPage: Math.max(activeItems.length, 1),
    prevPage: () => {},
    nextPage: () => {},
    hasPrevPage: false,
    hasNextPage: false,
  }), [activeItems.length]);
  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(activeItems);

  useEffect(() => {
    clearSelection();
  }, [activeTab, clearSelection, filters, normalizedSearch, pagination.currentPage]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'ledger' || requestedTab === 'payments') {
      setActiveTab(requestedTab);
    }
  }, [searchParams, setActiveTab]);

  useEffect(() => {
    const requestedId = searchParams.get('id');
    if (requestedId && activeItems.some((item) => item.id === requestedId)) {
      setFocusedIdState(requestedId);
      return;
    }
    setFocusedIdState((current) => (
      activeItems.some((item) => item.id === current) ? current : (activeItems[0]?.id || null)
    ));
  }, [activeItems, searchParams]);

  const setFocusedId = useCallback((id) => {
    setFocusedIdState(id);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', activeTab);
    if (id) nextParams.set('id', id);
    else nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  const handleTabChange = useCallback((tab) => {
    clearSelection();
    setActiveTab(tab);
    setFocusedIdState(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
  }, [clearSelection, searchParams, setActiveTab, setSearchParams]);

  const handleOpen = useCallback((item) => {
    setFocusedId(item.id);
    if (activeTab === 'payments') onPaymentOpen(item);
  }, [activeTab, onPaymentOpen, setFocusedId]);

  const handleSort = useCallback(() => {
    setSortConfig((current) => ({
      key: 'created_at',
      direction: current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleListKeyDown = useListKeyboardNav({
    items: activeItems,
    focusedItem: focusedEntry,
    setFocusedId,
    onOpen: handleOpen,
    scrollRef: listScrollRef,
    rowAttr: 'data-payment-row',
  });

  return {
    activeItems,
    activeUnavailable,
    allSelected,
    clearSelection,
    failedEmpty,
    filtersActive,
    focusedEntry,
    handleListKeyDown,
    handleOpen,
    handleSelectAll,
    handleSelectClick,
    handleSort,
    handleTabChange,
    handleToggleSelect,
    isNarrowed,
    itemNoun,
    listScrollRef,
    pagination,
    selectedIds,
    setFocusedId,
    someSelected,
    sortConfig,
  };
};
