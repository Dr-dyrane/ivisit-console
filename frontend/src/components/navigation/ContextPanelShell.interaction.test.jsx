import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockLayout = {
  isContextPanelOpen: true,
  closeContextPanel: jest.fn(),
};
const mockCopilot = {
  isOpen: false,
  closeCopilot: jest.fn(),
  proposal: null,
  isPreparing: false,
  error: null,
};

jest.mock('../../contexts/NavigationContext', () => ({
  useNavigation: () => ({ isDesktop: true, usesCompactNavigation: false }),
}));

jest.mock('../../contexts/LayoutContext', () => ({
  useLayout: () => mockLayout,
}));

jest.mock('../../features/copilot', () => ({
  useConsoleCopilot: () => mockCopilot,
}));

jest.mock('../../features/copilot/variants/DesktopCopilotRail', () => ({
  DesktopCopilotRail: () => (
    <button type="button" data-context-panel-terminal="true">Close Copilot action</button>
  ),
}));

jest.mock('./ContextPanel', () => ({
  ContextPanel: () => (
    <>
      <button type="button">Keep panel open</button>
      <button type="button" data-context-panel-terminal="true">Complete action</button>
    </>
  ),
}));

import { MemoryRouter } from 'react-router-dom';
import { ContextPanelShell } from './ResponsiveSidebar';

describe('ContextPanelShell interactions', () => {
  let appRoot;
  let mountNode;
  let root;
  let originalRaf;
  let previousActEnvironment;

  beforeEach(() => {
    previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback();
      return 0;
    };
    mockLayout.isContextPanelOpen = true;
    mockLayout.closeContextPanel.mockReset();
    mockCopilot.isOpen = false;
    mockCopilot.closeCopilot.mockReset();
    appRoot = document.createElement('div');
    appRoot.id = 'root';
    mountNode = document.createElement('div');
    appRoot.appendChild(mountNode);
    document.body.appendChild(appRoot);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => root.unmount());
    appRoot.remove();
    window.requestAnimationFrame = originalRaf;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('owns focus, inerts the app, restores focus, and only closes marked terminal actions', () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    document.body.appendChild(trigger);
    trigger.focus();

    act(() => {
      root.render(
        <MemoryRouter>
          <ContextPanelShell />
        </MemoryRouter>,
      );
    });

    const dialog = document.querySelector('[data-context-panel-shell="true"]');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(dialog);
    expect(appRoot.inert).toBe(true);
    expect(appRoot.getAttribute('aria-hidden')).toBe('true');

    act(() => {
      dialog.querySelector('button').click();
    });
    expect(mockLayout.closeContextPanel).not.toHaveBeenCalled();

    act(() => {
      dialog.querySelector('[data-context-panel-terminal="true"]').click();
    });
    expect(mockLayout.closeContextPanel).toHaveBeenCalledTimes(1);

    mockLayout.isContextPanelOpen = false;
    act(() => {
      root.render(
        <MemoryRouter>
          <ContextPanelShell />
        </MemoryRouter>,
      );
    });

    expect(document.querySelector('[data-context-panel-shell="true"]')).toBeNull();
    expect(Boolean(appRoot.inert)).toBe(false);
    expect(appRoot.hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('uses the Copilot close owner when the desktop Copilot rail is active', () => {
    mockLayout.isContextPanelOpen = false;
    mockCopilot.isOpen = true;

    act(() => {
      root.render(
        <MemoryRouter>
          <ContextPanelShell />
        </MemoryRouter>,
      );
    });

    const dialog = document.querySelector('[data-context-panel-shell="true"]');
    expect(dialog.getAttribute('data-context-panel-mode')).toBe('copilot');

    act(() => {
      dialog.querySelector('[data-context-panel-terminal="true"]').click();
    });

    expect(mockCopilot.closeCopilot).toHaveBeenCalledTimes(1);
    expect(mockLayout.closeContextPanel).not.toHaveBeenCalled();
  });
});
