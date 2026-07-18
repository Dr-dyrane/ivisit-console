import { useCallback, useRef, useState } from 'react';
import { createLocalCopilotProposal } from '../services/consoleCopilotProposalService';

const INITIAL_STATE = Object.freeze({
  phase: 'idle',
  isOpen: false,
  isPreparing: false,
  proposal: null,
  error: null,
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
export const useConsoleCopilotController = () => {
  const [state, setState] = useState(INITIAL_STATE);
  const requestSequenceRef = useRef(0);

  const open = useCallback(async (request) => {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setState({ phase: 'preparing', isOpen: true, isPreparing: true, proposal: null, error: null });
    // Allow the pressed/loading state to paint before deterministic preparation.
    await yieldForPresentation();

    if (requestSequence !== requestSequenceRef.current) return null;

    try {
      const proposal = createLocalCopilotProposal(request);
      if (requestSequence !== requestSequenceRef.current) return null;
      setState({ phase: 'ready', isOpen: true, isPreparing: false, proposal, error: null });
      return proposal;
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return null;
      setState({ phase: 'error', isOpen: true, isPreparing: false, proposal: null, error });
      return null;
    }
  }, []);

  const close = useCallback(() => {
    requestSequenceRef.current += 1;
    setState(INITIAL_STATE);
  }, []);

  return { ...state, open, close };
};
