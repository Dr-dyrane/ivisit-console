import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ConsoleCopilotOrchestrator } from './components/ConsoleCopilotOrchestrator';
import { useConsoleCopilotController } from './hooks/useConsoleCopilotController';

const UNAVAILABLE_COPILOT = Object.freeze({
  available: false,
  phase: 'idle',
  isOpen: false,
  isPreparing: false,
  proposal: null,
  error: null,
  openCopilot: async () => null,
  closeCopilot: () => {},
});

const ConsoleCopilotContext = createContext(UNAVAILABLE_COPILOT);

export const ConsoleCopilotProvider = ({ children }) => {
  const controller = useConsoleCopilotController();
  const {
    close,
    error,
    isOpen,
    isPreparing,
    open,
    phase,
    proposal,
  } = controller;
  const { isDesktop } = useBreakpoint();
  const { isContextPanelOpen, closeContextPanel } = useLayout();
  const location = useLocation();

  const openCopilot = useCallback((request) => {
    closeContextPanel();
    return open(request);
  }, [closeContextPanel, open]);

  useEffect(() => {
    if (isContextPanelOpen && isOpen) close();
  }, [close, isContextPanelOpen, isOpen]);

  useEffect(() => {
    close();
  }, [close, location.pathname]);

  const value = useMemo(() => ({
    available: true,
    phase,
    isOpen,
    isPreparing,
    proposal,
    error,
    openCopilot,
    closeCopilot: close,
  }), [close, error, isOpen, isPreparing, openCopilot, phase, proposal]);

  return (
    <ConsoleCopilotContext.Provider value={value}>
      {children}
      {!isDesktop && <ConsoleCopilotOrchestrator controller={controller} />}
    </ConsoleCopilotContext.Provider>
  );
};

export const useConsoleCopilot = () => {
  return useContext(ConsoleCopilotContext);
};
