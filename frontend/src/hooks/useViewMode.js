import { useState, useEffect, useCallback } from 'react';

const allowedViewModes = new Set(['grid', 'list', 'table']);

export const useViewMode = (pageKey, defaultView = 'grid') => {
  const [viewMode, setViewMode] = useState(defaultView);
  const storageKey = `view-mode-${pageKey}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (allowedViewModes.has(saved)) {
      setViewMode(saved);
    }
  }, [storageKey]);

  const handleViewModeChange = useCallback((newMode) => {
    if (!allowedViewModes.has(newMode)) {
      return;
    }

    setViewMode(newMode);
    localStorage.setItem(storageKey, newMode);
  }, [storageKey]);

  return {
    viewMode,
    setViewMode: handleViewModeChange,
  };
};
