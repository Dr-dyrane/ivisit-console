import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useModalChromeSuppression } from './useModalChromeSuppression';

const HookHarness = ({ isOpen }) => {
  useModalChromeSuppression(isOpen);
  return null;
};

describe('useModalChromeSuppression', () => {
  let container;
  let root;
  let shellChrome;
  let bottomBar;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement('div');
    shellChrome = document.createElement('div');
    shellChrome.dataset.modalChrome = 'true';
    shellChrome.style.opacity = '0.75';
    shellChrome.setAttribute('aria-hidden', 'false');

    bottomBar = document.createElement('div');
    bottomBar.id = 'dynamic-bottom-bar';
    bottomBar.style.pointerEvents = 'auto';

    document.body.append(container, shellChrome, bottomBar);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    shellChrome.remove();
    bottomBar.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('hides mounted app chrome while open and restores every prior value on close', () => {
    const onModalOpened = jest.fn();
    window.addEventListener('modal-opened', onModalOpened);

    act(() => root.render(<HookHarness isOpen />));

    expect(onModalOpened).toHaveBeenCalledTimes(1);
    for (const node of [shellChrome, bottomBar]) {
      expect(node.style.opacity).toBe('0');
      expect(node.style.pointerEvents).toBe('none');
      expect(node.style.visibility).toBe('hidden');
      expect(node.getAttribute('aria-hidden')).toBe('true');
    }

    act(() => root.render(<HookHarness isOpen={false} />));

    expect(shellChrome.style.opacity).toBe('0.75');
    expect(shellChrome.style.pointerEvents).toBe('');
    expect(shellChrome.style.visibility).toBe('');
    expect(shellChrome.getAttribute('aria-hidden')).toBe('false');
    expect(bottomBar.style.opacity).toBe('');
    expect(bottomBar.style.pointerEvents).toBe('auto');
    expect(bottomBar.style.visibility).toBe('');
    expect(bottomBar.hasAttribute('aria-hidden')).toBe(false);

    window.removeEventListener('modal-opened', onModalOpened);
  });
});
