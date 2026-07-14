import React, { createContext, useContext, useState, useEffect } from 'react';
import { DESKTOP_BREAKPOINT, getViewportState } from '../config/breakpoints';

const NavigationContext = createContext({});

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  // Lazy-init from the real viewport so the FIRST frame is already correct.
  // useState(false) + measure-in-effect gave every mobile mount one desktop-tree
  // frame (desktop entrances started, then the isMobile fork replaced them — the
  // "stacking/skew on mount" defect). typeof window guard keeps tests/SSR safe.
  const [viewport, setViewport] = useState(() => getViewportState(
    typeof window === 'undefined' ? null : window.innerWidth,
  ));
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' || window.innerWidth >= DESKTOP_BREAKPOINT
  ));
  const [currentPage, setCurrentPage] = useState('');

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = getViewportState(window.innerWidth);
      setViewport(nextViewport);

      if (nextViewport.isDesktop) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const value = {
    ...viewport,
    sidebarOpen,
    setSidebarOpen,
    currentPage,
    setCurrentPage,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
