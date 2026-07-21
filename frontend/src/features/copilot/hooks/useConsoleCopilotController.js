import { useCallback, useRef, useState } from 'react';
import { createLocalCopilotProposal } from '../services/consoleCopilotProposalService';

const INITIAL_STATE = Object.freeze({
  phase: 'idle',
  isOpen: false,
  isPreparing: false,
  proposal: null,
  error: null,
  pendingAction: null,
  isExecuting: false,
  executionError: null,
});

const yieldForPresentation = () => new Promise((resolve) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => resolve());
    return;
  }
  queueMicrotask(resolve);
});

/**
 * Ephemeral Copilot presentation state only. Route-owned server truth stays in
 * its existing query owner; callers pass a bounded, already-rendered context.
 */
export const useConsoleCopilotController = ({ executeCommand } = {}) => {
  const [state, setState] = useState(INITIAL_STATE);
  const requestSequenceRef = useRef(0);
  const executionLockRef = useRef(false);
  const lastRequestRef = useRef(null);

  const open = useCallback(async (request) => {
    lastRequestRef.current = request;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setState({
      phase: 'preparing',
      isOpen: true,
      isPreparing: true,
      proposal: null,
      error: null,
      pendingAction: null,
      isExecuting: false,
      executionError: null,
    });
    // Allow the pressed/loading state to paint before deterministic preparation.
    await yieldForPresentation();

    if (requestSequence !== requestSequenceRef.current) return null;

    try {
      const proposal = createLocalCopilotProposal(request);
      if (requestSequence !== requestSequenceRef.current) return null;
      setState({
        phase: 'ready',
        isOpen: true,
        isPreparing: false,
        proposal,
        error: null,
        pendingAction: null,
        isExecuting: false,
        executionError: null,
      });
      return proposal;
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return null;
      setState({
        phase: 'error',
        isOpen: true,
        isPreparing: false,
        proposal: null,
        error,
        pendingAction: null,
        isExecuting: false,
        executionError: null,
      });
      return null;
    }
  }, []);

  const close = useCallback(() => {
    requestSequenceRef.current += 1;
    executionLockRef.current = false;
    lastRequestRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const retry = useCallback(() => {
    if (!lastRequestRef.current) return null;
    return open(lastRequestRef.current);
  }, [open]);

  const prepareAction = useCallback((action) => {
    if (action?.availability !== 'available' || !action.command) return;
    setState((current) => ({
      ...current,
      phase: 'confirming',
      pendingAction: action,
      executionError: null,
    }));
  }, []);

  const cancelAction = useCallback(() => {
    executionLockRef.current = false;
    setState((current) => ({
      ...current,
      phase: 'ready',
      pendingAction: null,
      isExecuting: false,
      executionError: null,
    }));
  }, []);

  const confirmAction = useCallback(async () => {
    if (executionLockRef.current || state.isExecuting || !state.pendingAction?.command || typeof executeCommand !== 'function') return null;
    executionLockRef.current = true;
    const action = state.pendingAction;
    setState((current) => ({
      ...current,
      phase: 'executing',
      isExecuting: true,
      executionError: null,
    }));
    try {
      const receipt = await executeCommand(action.command, { actionId: action.id });
      executionLockRef.current = false;
      setState((current) => ({
        ...current,
        phase: 'completed',
        isExecuting: false,
        pendingAction: null,
        executionError: null,
      }));
      return receipt;
    } catch (executionError) {
      executionLockRef.current = false;
      setState((current) => ({
        ...current,
        phase: 'confirming',
        isExecuting: false,
        executionError,
      }));
      return null;
    }
  }, [executeCommand, state.isExecuting, state.pendingAction]);

  return {
    ...state,
    open,
    close,
    retry,
    prepareAction,
    cancelAction,
    confirmAction,
  };
};
