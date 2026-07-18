import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { COPILOT_ACTION_IDS } from './model/copilotContracts';
import { useConsoleCopilotController } from './hooks/useConsoleCopilotController';

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

  const Harness = () => {
    latest = useConsoleCopilotController();
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    originalRequestAnimationFrame = window.requestAnimationFrame;
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
});
