import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLayout } from '../../contexts/LayoutContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ConsoleCopilotOrchestrator } from './components/ConsoleCopilotOrchestrator';
import { useConsoleCopilotController } from './hooks/useConsoleCopilotController';
import { executeCopilotCommand } from './services/consoleCopilotExecutionService';

const UNAVAILABLE_COPILOT = Object.freeze({
  available: false,
  phase: 'idle',
  isOpen: false,
  isPreparing: false,
  proposal: null,
  error: null,
  pendingAction: null,
  isExecuting: false,
  executionError: null,
  openCopilot: async () => null,
  closeCopilot: () => {},
  prepareCopilotAction: () => {},
  cancelCopilotAction: () => {},
  confirmCopilotAction: async () => null,
});

const ConsoleCopilotContext = createContext(UNAVAILABLE_COPILOT);

export const ConsoleCopilotProvider = ({ children }) => {
  const navigate = useNavigate();
  const runCommand = useCallback(async (command, metadata) => {
    const receipt = await executeCopilotCommand(command, {
      ...metadata,
      navigate,
    });
    toast.success('Opening workflow');
    return receipt;
  }, [navigate]);
  const controller = useConsoleCopilotController({ executeCommand: runCommand });
  const {
    close,
    error,
    isOpen,
    isPreparing,
    isExecuting,
    open,
    phase,
    proposal,
    pendingAction,
    executionError,
    prepareAction,
    cancelAction,
    confirmAction,
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
    pendingAction,
    isExecuting,
    executionError,
    openCopilot,
    closeCopilot: close,
    prepareCopilotAction: prepareAction,
    cancelCopilotAction: cancelAction,
    confirmCopilotAction: confirmAction,
  }), [
    cancelAction,
    close,
    confirmAction,
    error,
    executionError,
    isExecuting,
    isOpen,
    isPreparing,
    openCopilot,
    pendingAction,
    phase,
    prepareAction,
    proposal,
  ]);

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
