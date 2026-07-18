import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { COPILOT_ACTION_IDS } from './model/copilotContracts';
import { useConsoleCopilotController } from './hooks/useConsoleCopilotController';
import { createDashboardExplainRequest } from './routeRequests';

const request = {
  actionId: COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
  context: { dashboard: { evidence: [{ label: 'Open requests', value: 2 }] } },
};

describe('useConsoleCopilotController', () => {
  let container;
  let latest;
  let root;
  let frame;
  let originalRequestAnimationFrame;
  let executeCommand;

  const Harness = () => {
    latest = useConsoleCopilotController({ executeCommand });
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    originalRequestAnimationFrame = window.requestAnimationFrame;
    executeCommand = jest.fn();
    window.requestAnimationFrame = jest.fn((callback) => { frame = callback; return 1; });
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('shows preparation before a deterministic proposal is ready', async () => {
    let opening;
    act(() => { opening = latest.open(request); });

    expect(latest).toMatchObject({ phase: 'preparing', isOpen: true, isPreparing: true, proposal: null });

    await act(async () => {
      frame();
      await opening;
    });

    expect(latest).toMatchObject({ phase: 'ready', isOpen: true, isPreparing: false });
    expect(latest.proposal.actionId).toBe(COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN);
  });

  it('drops a proposal that resolves after close', async () => {
    let opening;
    act(() => { opening = latest.open(request); });
    act(() => latest.close());

    await act(async () => {
      frame();
      await opening;
    });

    expect(latest).toMatchObject({ phase: 'idle', isOpen: false, proposal: null, error: null });
  });

  it('requires preparation and prevents duplicate execution while confirmation is pending', async () => {
    const guidedRequest = createDashboardExplainRequest({
      today: { headline: 'Today', status: 'Ready' },
      live: true,
      roleKind: 'admin',
    });
    let finishExecution;
    executeCommand.mockImplementation(() => new Promise((resolve) => {
      finishExecution = resolve;
    }));

    let opening;
    act(() => { opening = latest.open(guidedRequest); });
    await act(async () => {
      frame();
      await opening;
    });

    const action = latest.proposal.suggestedActions[0];
    act(() => latest.prepareAction(action));
    expect(latest).toMatchObject({ phase: 'confirming', pendingAction: action });

    let firstConfirmation;
    let duplicateConfirmation;
    act(() => {
      firstConfirmation = latest.confirmAction();
      duplicateConfirmation = latest.confirmAction();
    });
    expect(executeCommand).toHaveBeenCalledTimes(1);
    await expect(duplicateConfirmation).resolves.toBeNull();
    expect(latest).toMatchObject({ phase: 'executing', isExecuting: true });

    await act(async () => {
      finishExecution({ commandId: action.command.id });
      await firstConfirmation;
    });
    expect(latest).toMatchObject({
      phase: 'completed',
      isExecuting: false,
      pendingAction: null,
      executionError: null,
    });
  });
});
