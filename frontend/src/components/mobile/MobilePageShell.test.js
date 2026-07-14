import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { NavigationProvider } from '../../contexts/NavigationContext';
import { MobilePageShell } from './MobilePageShell';

const setViewportWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
};

const mountedRoots = [];

const renderShell = (props = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <NavigationProvider>
        <MobilePageShell animatePageLoad={false} kpiStrip={<div>KPIs</div>} {...props}>
          <div>Content</div>
        </MobilePageShell>
      </NavigationProvider>,
    );
  });

  mountedRoots.push({ container, root });
  return container;
};

describe('MobilePageShell tablet layout contract', () => {
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
    setViewportWidth(390);
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('keeps ordinary tablet lists at a phone-like readable width', () => {
    setViewportWidth(834);
    const container = renderShell();

    const shell = container.querySelector('[data-compact-size="tablet"]');
    const content = container.querySelector('[data-mobile-page-content]');
    const kpis = container.querySelector('[data-mobile-page-kpis]');

    expect(shell.getAttribute('data-tablet-layout')).toBe('readable');
    expect(shell.getAttribute('data-tablet-navigation')).toBe('dock');
    expect(shell.getAttribute('data-content-origin')).toBe('top-leading');
    expect(content.classList.contains('max-w-lg')).toBe(true);
    expect(kpis.classList.contains('max-w-lg')).toBe(true);
    expect(content.classList.contains('max-w-4xl')).toBe(false);
    expect(content.classList.contains('!pb-8')).toBe(true);
  });

  it('uses the wide guide only when a page opts into recomposition', () => {
    setViewportWidth(1194);
    const container = renderShell({ tabletLayout: 'wide' });

    const shell = container.querySelector('[data-compact-size="tablet"]');
    const content = container.querySelector('[data-mobile-page-content]');

    expect(shell.getAttribute('data-tablet-layout')).toBe('wide');
    expect(shell.getAttribute('data-tablet-navigation')).toBe('rail');
    expect(content.classList.contains('max-w-5xl')).toBe(true);
    expect(content.classList.contains('!pb-8')).toBe(true);
  });

  it('centers finite tablet content within the available page height', () => {
    setViewportWidth(834);
    const container = renderShell({ tabletLayout: 'wide', tabletVerticalAlign: 'center' });

    const shell = container.querySelector('[data-compact-size="tablet"]');
    const content = container.querySelector('[data-mobile-page-content]');

    expect(shell.getAttribute('data-content-origin')).toBe('center');
    expect(content.classList.contains('justify-center')).toBe(true);
    expect(content.classList.contains('flex-col')).toBe(true);
    expect(shell.classList.contains('min-h-[calc(100dvh-10rem-var(--safe-bottom))]')).toBe(true);
    expect(content.classList.contains('!min-h-[calc(100dvh-10rem-var(--safe-bottom))]')).toBe(true);
  });

  it('composes a tablet-only primary and detail split without widening either pane', () => {
    setViewportWidth(834);
    const container = renderShell({ tabletPane: <aside data-testid="owned-detail">Details</aside> });

    const shell = container.querySelector('[data-compact-size="tablet"]');
    const split = container.querySelector('[data-tablet-split-shell]');
    const primary = container.querySelector('[data-tablet-primary-pane]');
    const detail = container.querySelector('[data-tablet-detail-pane]');
    const content = container.querySelector('[data-mobile-page-content]');

    expect(shell.getAttribute('data-tablet-layout')).toBe('split');
    expect(split).not.toBeNull();
    expect(primary).not.toBeNull();
    expect(detail.querySelector('[data-testid="owned-detail"]')).not.toBeNull();
    expect(content.classList.contains('max-w-lg')).toBe(false);
    expect(content.classList.contains('!min-h-0')).toBe(true);
  });

  it('does not apply tablet width guides to phone composition', () => {
    setViewportWidth(390);
    const container = renderShell({
      tabletLayout: 'wide',
      tabletPane: <aside data-testid="owned-detail">Details</aside>,
    });

    const shell = container.querySelector('[data-compact-size="phone"]');
    const content = container.querySelector('[data-mobile-page-content]');
    const kpis = container.querySelector('[data-mobile-page-kpis]');

    expect(shell.hasAttribute('data-tablet-layout')).toBe(false);
    expect(shell.hasAttribute('data-tablet-navigation')).toBe(false);
    expect(shell.classList.contains('min-h-screen')).toBe(true);
    expect(kpis.classList.contains('contents')).toBe(true);
    expect(content.classList.contains('max-w-lg')).toBe(false);
    expect(content.classList.contains('max-w-5xl')).toBe(false);
    expect(content.classList.contains('!pb-8')).toBe(false);
    expect(container.querySelector('[data-tablet-detail-pane]')).toBeNull();
    expect(container.querySelector('[data-testid="owned-detail"]')).toBeNull();
  });
});
