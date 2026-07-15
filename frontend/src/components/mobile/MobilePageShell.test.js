import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { MobilePageShell } from './MobilePageShell';

const mountedRoots = [];

const renderShell = (props = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MobilePageShell animatePageLoad={false} kpiStrip={<div data-testid="kpis">KPIs</div>} {...props}>
        <div data-testid="content">Content</div>
      </MobilePageShell>,
    );
  });

  mountedRoots.push({ container, root });
  return container;
};

describe('MobilePageShell phone presentation contract', () => {
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    while (mountedRoots.length) {
      const { container, root } = mountedRoots.pop();
      act(() => root.unmount());
      container.remove();
    }
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('owns only the phone page slots', () => {
    const container = renderShell();
    const shell = container.querySelector('[data-compact-size="phone"]');

    expect(shell).not.toBeNull();
    expect(shell.classList.contains('min-h-screen')).toBe(true);
    expect(container.querySelector('[data-mobile-page-kpis] [data-testid="kpis"]')).not.toBeNull();
    expect(container.querySelector('[data-mobile-page-content] [data-testid="content"]')).not.toBeNull();
  });

  it('does not expose tablet layout ownership', () => {
    const container = renderShell();
    const shell = container.querySelector('[data-compact-size="phone"]');

    expect(shell.hasAttribute('data-tablet-layout')).toBe(false);
    expect(shell.hasAttribute('data-tablet-navigation')).toBe(false);
    expect(container.querySelector('[data-tablet-primary-pane]')).toBeNull();
    expect(container.querySelector('[data-tablet-detail-pane]')).toBeNull();
  });
});
