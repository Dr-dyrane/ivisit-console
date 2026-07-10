import { useCallback, useRef, useState } from 'react';

// Row selection (donor: Requests / Users-page parity): checkbox toggle with
// shift-range support, select-all over every visible row, indeterminate state.
// The checkbox onClick (which fires first) stashes shiftKey in a ref; the toggle
// then reads it -- Radix's onCheckedChange does not expose the mouse event.
export const useRowSelection = (items = []) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const shiftSelectRef = useRef({ shiftKey: false, lastIndex: -1 });

  const handleSelectClick = useCallback((event) => {
    shiftSelectRef.current.shiftKey = Boolean(event?.shiftKey);
  }, []);

  const handleToggleSelect = useCallback((id, checked) => {
    const index = items.findIndex((row) => row.id === id);
    const { shiftKey, lastIndex } = shiftSelectRef.current;
    shiftSelectRef.current = { shiftKey: false, lastIndex: index };

    if (shiftKey && index !== -1 && lastIndex !== -1 && lastIndex !== index) {
      const start = Math.min(lastIndex, index);
      const end = Math.max(lastIndex, index);
      const rangeIds = items.slice(start, end + 1).map((row) => row.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((rangeId) => {
          if (checked) next.add(rangeId);
          else next.delete(rangeId);
        });
        return Array.from(next);
      });
      return;
    }

    setSelectedIds((prev) => (
      checked
        ? (prev.includes(id) ? prev : [...prev, id])
        : prev.filter((selectedId) => selectedId !== id)
    ));
  }, [items]);

  // Select-all covers EVERY visible row; bulk actions then act on their legal
  // subset (the Requests bulk-cancel idiom).
  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? items.map((row) => row.id) : []);
  }, [items]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const allSelected = items.length > 0 && items.every((row) => selectedIds.includes(row.id));
  const someSelected = !allSelected && selectedIds.length > 0;

  return {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  };
};
