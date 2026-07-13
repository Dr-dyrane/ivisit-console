import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AnalyticsModal } from './AnalyticsModal';

jest.mock('../ui/button', () => ({
  Button: ({ children, variant: _variant, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock('../ui/ModalShell', () => ({
  ModalShell: ({ children, footer, icon: _icon, isOpen, onClose, subtitle, title }) => (
    isOpen ? (
      <section data-testid="modal-shell">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <button type="button" onClick={onClose}>Dismiss shell</button>
        {children}
        <footer>{footer}</footer>
      </section>
    ) : null
  ),
}));

jest.mock('framer-motion', () => {
  const ActualReact = require('react');
  const MotionDiv = ActualReact.forwardRef(({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    whileTap: _whileTap,
    ...props
  }, ref) => ActualReact.createElement('div', { ...props, ref }));

  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: MotionDiv },
  };
});

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

const findButton = (container, label) => Array.from(container.querySelectorAll('button'))
  .find((button) => button.textContent === label);

describe('AnalyticsModal behavior', () => {
  let container;
  let onClose;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onClose = jest.fn();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('does not mount a shell without route-provided analytics', async () => {
    await act(async () => {
      root.render(<AnalyticsModal open onClose={onClose} analytics={null} type="emergency" />);
    });

    expect(container.innerHTML).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('preserves phase navigation and resets to the first phase when done', async () => {
    await act(async () => {
      root.render(
        <AnalyticsModal
          open
          onClose={onClose}
          type="emergency"
          analytics={{
            total: 1,
            completed: 1,
            byPriority: { normal: 1 },
            byStatus: { completed: 1 },
          }}
        />
      );
    });

    expect(container.textContent).toContain('Summary');
    expect(findButton(container, 'Close')).toBeTruthy();
    await click(findButton(container, 'Next'));
    expect(container.textContent).toContain('Priority');
    expect(findButton(container, 'Previous')).toBeTruthy();
    await click(findButton(container, 'Next'));
    expect(container.textContent).toContain('Status');
    await click(findButton(container, 'Done'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Summary');
    expect(findButton(container, 'Close')).toBeTruthy();
  });

  it('preserves empty distribution and detail states', async () => {
    await act(async () => {
      root.render(<AnalyticsModal open onClose={onClose} analytics={{}} type="news" />);
    });

    await click(findButton(container, 'Next'));
    expect(container.textContent).toContain('No data yet');
    await click(findButton(container, 'Next'));
    expect(container.textContent).toContain('No groups yet');
  });
});
