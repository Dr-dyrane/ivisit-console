import { useState, useEffect, useCallback } from 'react';

export const useViewMode = (pageKey, defaultView = 'grid') => {
  const [viewMode, setViewMode] = useState(defaultView);
  const storageKey = `view-mode-${pageKey}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setViewMode(saved);
    }
  }, [storageKey]);

  const handleViewModeChange = useCallback((newMode) => {
    setViewMode(newMode);
    localStorage.setItem(storageKey, newMode);
  }, [storageKey]);

  return {
    viewMode,
    setViewMode: handleViewModeChange,
  };
};
